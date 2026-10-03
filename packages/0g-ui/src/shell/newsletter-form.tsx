"use client";

import { type FormEvent, useState } from "react";

import { Button } from "./button";
import { ArrowRightIcon } from "./glyphs";

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
 */
type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** What a signup came to: accepted, or refused and why. */
export type NewsletterOutcome = "done" | "invalid" | "limited" | "closed" | "failed";

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
export function refusal(status: number): Exclude<NewsletterOutcome, "done"> {
  if (status === 400) return "invalid";
  if (status === 429) return "limited";
  if (status === 503) return "closed";
  return "failed";
}

export function NewsletterForm({
  endpoint,
  id,
  labels,
}: {
  endpoint: string;
  /** The field's id, unique on the page. */
  id: string;
  labels: NewsletterLabels;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setState({ kind: "sending" });
    let outcome: NewsletterOutcome;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      outcome = res.ok && body.ok !== false ? "done" : refusal(res.ok ? 0 : res.status);
    } catch {
      outcome = "failed";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
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
        {/* The secondary look on the field-submit tokens: white in both
            footers, where secondary itself is plum in dark. */}
        <span className="contents [--color-control:var(--color-field-submit)] [--color-control-hover:color-mix(in_srgb,var(--color-field-submit-ink)_4%,var(--color-field-submit))] [--color-hairline:var(--color-field-submit-line)] [--color-on-control:var(--color-field-submit-ink)]">
          <Button type="submit" variant="secondary" size="small" round aria-label={labels.submit} disabled={state.kind === "sending"}>
            <ArrowRightIcon />
          </Button>
        </span>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="max-w-[220px] text-[12px] leading-[1.5] font-light tracking-normal text-footer-title">
          {state.message}
        </p>
      )}
    </form>
  );
}
