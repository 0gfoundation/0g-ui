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
 */
type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export type NewsletterLabels = {
  email: string;
  submit: string;
  done: string;
  /** 400: the address was refused. */
  invalid: string;
  /** 429: too many attempts from this visitor. */
  limited: string;
  /** 503: no list behind the route yet. */
  closed: string;
  /** Anything else, the network included. */
  failed: string;
};

/** The reply to a refused signup, by the route's status. */
export function refusal(status: number, labels: NewsletterLabels): string {
  if (status === 400) return labels.invalid;
  if (status === 429) return labels.limited;
  if (status === 503) return labels.closed;
  return labels.failed;
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
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && body.ok !== false) setState({ kind: "done" });
      else setState({ kind: "error", message: refusal(res.ok ? 0 : res.status, labels) });
    } catch {
      setState({ kind: "error", message: labels.failed });
    }
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
