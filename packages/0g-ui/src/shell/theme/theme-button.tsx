"use client";

import { flipTheme } from "./theme";
import { useTheme } from "./use-theme";

/**
 * The header's light/dark button (#385), a 34px circle on the control
 * tokens (border-line, bg-control, text-on-control), the same circle the
 * hub's settings gear wears so the header's controls read as one hand.
 * It was desktop only while the phone header carried a centred title;
 * the redesign's header has none (#409), so it shows at every width.
 *
 * It shows what is ON, not what is stored: with the setting on "system"
 * it wears whichever theme the OS resolved to. A click writes the
 * OPPOSITE of what is on as an explicit setting (flipTheme), so the
 * button never writes "system"; a host's settings row is the only way
 * back to it. Every control on the page reads the one store in
 * use-theme.ts, so none can show a state another does not.
 *
 * The glyph is painted from the `data-theme` stamp, not from React
 * state: the stamp is set before first paint and the store's server
 * snapshot is "light", so a JS-chosen glyph would show the sun for a
 * frame on every dark load. The label reads the store; a label
 * corrected on hydration is a text change, not a flash.
 *
 * Labels are the host's strings; `onChange` is where the host's
 * analytics go (the shell emits none, ADR-0012).
 */
export function ThemeButton({
  toDarkLabel,
  toLightLabel,
  onChange,
}: {
  /** The accessible name while light is on ("Switch to dark mode"). */
  toDarkLabel: string;
  /** The accessible name while dark is on. */
  toLightLabel: string;
  onChange?: (next: "light" | "dark") => void;
}) {
  const { resolved, setSetting } = useTheme();
  const next = flipTheme(resolved);
  return (
    <button
      type="button"
      aria-label={next === "dark" ? toDarkLabel : toLightLabel}
      onClick={() => {
        setSetting(next);
        onChange?.(next);
      }}
      className="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-full border border-line bg-control text-on-control transition-colors hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </button>
  );
}

// Feather Icons "sun" and "moon" (MIT) — the gear's set, at its size and
// stroke, so the three circles read as one hand.
const icon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SunIcon({ className }: { className: string }) {
  return (
    <svg {...icon} className={className} aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg {...icon} className={className} aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
