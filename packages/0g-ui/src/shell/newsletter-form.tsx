"use client";

import { type FormEvent, useState } from "react";

import { Button } from "./button";
import { ArrowRightIcon } from "./glyphs";

/**
 * The footer's newsletter signup (design system 2026, footer): a 140px
 * email pill and a round submit. It posts `{ email }` as JSON to
 * `endpoint` and reads `{ ok, error }`, the contract of 0g.ai's
 * `/api/newsletter`, which every site posts to so there is one list. It
 * says "signed up" only for a signup the server accepted, and shows the
 * server's own reason when it gives one (a list not open yet, a bad
 * address), else `failed`.
 */
type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function NewsletterForm({
  endpoint,
  id,
  labels,
}: {
  endpoint: string;
  /** The field's id, unique on the page. */
  id: string;
  labels: { email: string; submit: string; done: string; failed: string };
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
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: unknown };
      if (res.ok && body.ok !== false) setState({ kind: "done" });
      else setState({ kind: "error", message: typeof body.error === "string" ? body.error : labels.failed });
    } catch {
      setState({ kind: "error", message: labels.failed });
    }
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="text-[14px] leading-[1.4] font-light tracking-normal text-ink">
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
          className="h-[32px] w-[140px] rounded-full border border-hairline-strong bg-control px-[12px] text-[14px] leading-[1.4] font-light tracking-normal text-on-control outline-none placeholder:text-on-control/40 focus-visible:border-ink-muted"
        />
        <Button type="submit" variant="secondary" size="small" round aria-label={labels.submit} disabled={state.kind === "sending"}>
          <ArrowRightIcon />
        </Button>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="max-w-[220px] text-[12px] leading-[1.5] font-light tracking-normal text-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
