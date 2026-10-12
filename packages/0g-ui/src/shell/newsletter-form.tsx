"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "./button";
import { ArrowRightIcon } from "./glyphs";
import { loadTurnstile, type TurnstileApi } from "./turnstile";

/**
 * The footer's newsletter signup (design system 2026, footer): a 140px
 * email pill and a round submit. It posts `{ email }` as JSON to
 * `endpoint` and reads `{ ok }` and the status, the contract of 0g.ai's
 * `/api/newsletter`, which every site posts to so there is one list. It
 * says "signed up" only for a signup the server accepted. A refusal is
 * told by its status in the site's own words (`labels`), not in the
 * server's English, since the hub translates.
 *
 * Each submit ends in one outcome, and the form announces it on `window`
 * as a `NEWSLETTER_EVENT` with `{ outcome }` as its detail, so a site can
 * count signups (the hub must, ADR-0010) from a client component of its
 * own while SiteFooter stays a server component, which no callback prop
 * can cross (0g-ui#18). The detail is the outcome and nothing else: the
 * address never goes in it, and a listener must not add it.
 *
 * For 0G's newsletter worker (`newsletter.turnstile`): the form renders a
 * Cloudflare Turnstile widget, invisible unless Cloudflare wants an
 * interaction, and sends its one-time token as `turnstileToken`, waiting
 * for it if the submit comes first. A token is single-use, so the widget
 * resets after every submit. Every submit also sends a honeypot field,
 * `website`, that people never see or fill, and `source` when the site
 * names one. A refusal is read from the worker's `error` code first
 * (`invalid_email`, `captcha_failed`, `rate_limited`), then from the
 * status as before. No cookies and no header beyond Content-Type, which
 * is all the worker's CORS allows.
 */
type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** What a signup came to: accepted, or refused and why. */
export type NewsletterOutcome = "done" | "invalid" | "verification" | "limited" | "closed" | "failed";

/** The event the form dispatches on `window`, once per submit. */
export const NEWSLETTER_EVENT = "0g-ui:newsletter";

export type NewsletterEventDetail = { outcome: NewsletterOutcome };

declare global {
  interface WindowEventMap {
    "0g-ui:newsletter": CustomEvent<NewsletterEventDetail>;
  }
}

/** Tells the page how a submit ended. The outcome only. */
export function announceOutcome(outcome: NewsletterOutcome): void {
  const detail: NewsletterEventDetail = { outcome };
  window.dispatchEvent(new CustomEvent(NEWSLETTER_EVENT, { detail }));
}

/** The field's and button's names, and the reply to each outcome. */
export type NewsletterLabels = {
  email: string;
  submit: string;
} & Record<NewsletterOutcome, string>;

/** A refused signup's outcome, by the route's status: 400 the address
 *  was refused, 429 too many attempts, 503 no list behind the route yet,
 *  anything else (the network included) failed. */
export function refusal(status: number): Exclude<NewsletterOutcome, "done" | "verification"> {
  if (status === 400) return "invalid";
  if (status === 429) return "limited";
  if (status === 503) return "closed";
  return "failed";
}

/** How a response ends a submit: accepted, or refused by the worker's
 *  `error` code where it gives one (`captcha_failed` is the bot check, not
 *  the address), else by status. */
export function outcomeOf(status: number, body: { ok?: unknown; error?: unknown }): NewsletterOutcome {
  if (status >= 200 && status < 300 && body.ok !== false) return "done";
  switch (body.error) {
    case "invalid_email":
      return "invalid";
    case "captcha_failed":
      return "verification";
    case "rate_limited":
      return "limited";
    case "invalid_body":
    case "origin_not_allowed":
      return "failed";
  }
  return refusal(status >= 200 && status < 300 ? 0 : status);
}

/** How long a submit waits for the bot check before giving up. */
const TOKEN_WAIT_MS = 15_000;

export function NewsletterForm({
  endpoint,
  id,
  labels,
  turnstile,
  source,
}: {
  endpoint: string;
  /** The field's id, unique on the page. */
  id: string;
  labels: NewsletterLabels;
  /** Cloudflare Turnstile, for an endpoint that checks a token. */
  turnstile?: { siteKey: string; theme?: "light" | "dark" | "auto" };
  /** Where the form is, for the list ("0g.ai-footer"). */
  source?: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const token = useRef("");
  const waiting = useRef<Array<(token: string) => void>>([]);
  const siteKey = turnstile?.siteKey;
  const theme = turnstile?.theme ?? "auto";

  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    loadTurnstile()
      .then((api) => {
        if (gone || !box.current) return;
        const widgetId = api.render(box.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          theme,
          callback: (t) => {
            token.current = t;
            for (const resolve of waiting.current.splice(0)) resolve(t);
          },
          "expired-callback": () => {
            token.current = "";
          },
          "error-callback": () => {
            token.current = "";
          },
        });
        widget.current = { api, id: widgetId };
      })
      .catch(() => {
        // no script: a submit waits, then ends as `verification`
      });
    return () => {
      gone = true;
      widget.current?.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [siteKey, theme]);

  /** The widget's token, waiting for one if it has none yet. */
  function nextToken(): Promise<string> {
    if (token.current) return Promise.resolve(token.current);
    return new Promise((resolve) => {
      waiting.current.push(resolve);
      setTimeout(() => resolve(""), TOKEN_WAIT_MS);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "sending") return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const website = String(data.get("website") ?? "");
    setState({ kind: "sending" });
    let outcome: NewsletterOutcome;
    try {
      const turnstileToken = siteKey ? await nextToken() : undefined;
      if (siteKey && !turnstileToken) {
        outcome = "verification";
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, website, ...(source ? { source } : {}), ...(turnstileToken ? { turnstileToken } : {}) }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: unknown; error?: unknown };
        outcome = outcomeOf(res.status, body);
      }
    } catch {
      outcome = "failed";
    }
    if (siteKey) {
      // a token is good for one submit
      token.current = "";
      if (widget.current) widget.current.api.reset(widget.current.id);
    }
    setState(outcome === "done" ? { kind: "done" } : { kind: "error", message: labels[outcome] });
    announceOutcome(outcome);
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="text-[14px] leading-[1.4] font-light tracking-normal text-footer-title">
        {labels.done}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative flex flex-col gap-2">
      <div className="flex w-[180px] items-start gap-2">
        <label htmlFor={id} className="sr-only">
          {labels.email}
        </label>
        <input
          id={id}
          name="email"
          type="email"
          required
          maxLength={256}
          autoComplete="email"
          placeholder={labels.email}
          className="h-[32px] w-[140px] rounded-full border border-field-line bg-field px-[12px] text-[14px] leading-[1.4] font-light tracking-normal text-on-control outline-none placeholder:text-field-placeholder focus-visible:border-footer-text"
        />
        {/* The honeypot: off-screen rather than display:none, which some
            bots skip, and out of the tab order and the accessibility
            tree, so a person never fills it. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px" />
        {/* The secondary look on the field-submit tokens: white in both
            footers, where secondary itself is plum in dark. */}
        <span className="contents [--color-control:var(--color-field-submit)] [--color-control-hover:color-mix(in_srgb,var(--color-field-submit-ink)_4%,var(--color-field-submit))] [--color-hairline:var(--color-field-submit-line)] [--color-on-control:var(--color-field-submit-ink)]">
          <Button type="submit" variant="secondary" size="small" round aria-label={labels.submit} disabled={state.kind === "sending"}>
            <ArrowRightIcon />
          </Button>
        </span>
      </div>
      {siteKey && <div ref={box} />}
      {state.kind === "error" && (
        <p role="alert" className="max-w-[220px] text-[12px] leading-[1.5] font-light tracking-normal text-footer-title">
          {state.message}
        </p>
      )}
    </form>
  );
}
