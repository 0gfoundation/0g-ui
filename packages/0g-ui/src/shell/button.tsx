"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cx } from "./cx";
import { useShell } from "./provider";

/**
 * The pill buttons (design system 2026, "buttons"; 0g-ui#9): the black
 * `primary`, the white-with-a-hairline `secondary`, each at the design's
 * two heights, as a pill with a label or `round` around an icon. 0g.ai
 * drew these four times and the hub once; this is the one copy.
 *
 * The height is fixed and the content centred in it, so a button never
 * resizes when its content changes (label to spinner): an inline spinner
 * has no text baseline and grew the hub's from 40px to 44px mid-flow
 * (the hub's Button, carried over).
 *
 * - `size`: "default" is 48px, every desktop pill in both designs and the
 *   hub's calls to action; "small" is 32px; "adaptive" is 32px below md
 *   and 48px from md, as 0g.ai's pages draw their pills (the mobile
 *   design's 32px, the desktop's 48px). 32px meets WCAG 2.5.8 (24px, AA)
 *   and not 2.5.5 (44px, AAA).
 * - `round`: an icon-only circle of the same height. It needs an
 *   `aria-label`.
 * - `fullWidth`: fills its container (the hub's swap panel), still at its
 *   fixed height. No `className`: a different look is a named option.
 *
 * Colours are the tokens (`ink` / `on-ink` for primary, `control` and
 * `hairline` for secondary), so dark mode and a site's surface follow.
 */
export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "default" | "small" | "adaptive";

type Look = { variant?: ButtonVariant; size?: ButtonSize; round?: boolean; fullWidth?: boolean };

// shell-button scopes the base-layer element defaults (tailwind.css) to a
// button rendered outside the header and footer, for a host without
// Tailwind's preflight.
const BASE =
  "shell-button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border font-bold leading-[1.4] tracking-normal whitespace-nowrap [text-box:trim-both_cap_alphabetic] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-on-ink hover:bg-ink/80",
  secondary: "border-hairline bg-control text-on-control hover:bg-control-hover",
};

const SIZES: Record<ButtonSize, { pill: string; round: string }> = {
  default: { pill: "h-[48px] gap-2 px-[18px] text-[16px]", round: "size-[48px]" },
  small: { pill: "h-[32px] gap-1 px-[12px] text-[14px]", round: "size-[32px]" },
  adaptive: {
    pill: "h-[32px] gap-1 px-[12px] text-[14px] md:h-[48px] md:gap-2 md:px-[18px] md:text-[16px]",
    round: "size-[32px] md:size-[48px]",
  },
};

/** The classes for a look, for a host element the package does not draw
 *  (a form's own submit inside a site's markup). */
export function buttonClasses({ variant = "primary", size = "default", round = false, fullWidth = false }: Look = {}): string {
  return cx(BASE, VARIANTS[variant], round ? SIZES[size].round : SIZES[size].pill, fullWidth && !round && "w-full");
}

/** A <button>. `type` defaults to "button", not the browser's "submit". */
export function Button({
  variant,
  size,
  round,
  fullWidth,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> & Look) {
  return <button type={type} {...props} className={buttonClasses({ variant, size, round, fullWidth })} />;
}

/**
 * A link that looks like a Button. In-app paths go through the host's
 * `Link` (ShellProvider); `external` opens a new tab, as the nav's
 * outbound links do.
 */
export function ButtonLink({
  href,
  external = false,
  children,
  variant,
  size,
  round,
  fullWidth,
  "aria-label": ariaLabel,
}: Look & { href: string; external?: boolean; children: ReactNode; "aria-label"?: string }) {
  const { Link } = useShell();
  const className = buttonClasses({ variant, size, round, fullWidth });
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}
