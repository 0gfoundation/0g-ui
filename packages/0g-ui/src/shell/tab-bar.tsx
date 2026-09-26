"use client";

import { cx } from "./cx";
import { isActive, MAX_ITEMS, type ShellItem } from "./items";
import { useShell } from "./provider";

/**
 * Phone navigation (mobile draft 2026-09-19, #409): a floating glass
 * pill, inset from the sides and resting on the safe-area edge, up to
 * five entries with the draft's icon over a label; an outbound entry
 * opens in a new tab. Every target is thumb-reachable, and nothing
 * competes with the page's content for vertical space. From lg the
 * header bar carries the nav instead.
 *
 * Geometry from the draft (390pt frame): 324 wide, 61 tall, 33 in from
 * each side, its bottom edge 34 from the frame's, which is exactly the
 * home-indicator inset, so the pill sits on the safe area where there is
 * one and 16px above the browser's toolbar where there is not (8px on
 * Safari 26; see the doc below). Active: brand-900 on icon and label,
 * the label a weight up (never colour alone).
 *
 * Glass: the tokens (bg-glass, border-glass-line, shadow-glass) over a
 * backdrop blur, so the content scrolls under it legibly in both themes.
 *
 * Compact (#428): one number, `--shell-nav` on <html> from
 * scroll-driver.tsx, takes the pill from 60px to 48px, narrower and
 * icons only. The finger drives the first part of any change and a
 * timer the rest. The glass is its own layer scaled by a transform, the
 * tabs slide towards the centre, the icons recentre and the labels fade,
 * so it all runs on the compositor; the links keep their 60px hit area
 * and their names (shell.css, `.shell-pill`, `.shell-tab`,
 * `.shell-tab-icon`, `.shell-tab-label`). Why transforms, and the Safari
 * bottom offset: docs/spec/phone-shell-measurements-2026-09-21.md.
 */
export function TabBar({ items, label }: { items: readonly ShellItem[]; label: string }) {
  const { Link, pathname } = useShell();
  if (items.length > MAX_ITEMS) {
    throw new Error(`TabBar takes at most ${MAX_ITEMS} items, got ${items.length}`);
  }

  const item =
    "flex h-full flex-col items-center justify-center gap-1 rounded-full text-[11px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500";

  return (
    <nav
      aria-label={label}
      // The bottom offset lives in shell.css (`.shell-nav`).
      className="shell-nav fixed inset-x-6 z-40 mx-auto h-[60px] max-w-sm lg:hidden"
    >
      <div
        aria-hidden
        className="shell-pill absolute inset-0 rounded-full border border-glass-line bg-glass shadow-glass backdrop-blur-xl"
      />
      <ul className="relative flex h-full items-stretch px-1">
        {items.map((entry) => {
          const Icon = entry.icon;
          const text = entry.shortLabel ?? entry.label;
          if (entry.external) {
            return (
              <li key={entry.href} className="shell-tab flex-1">
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(item, "text-ink")}
                >
                  <Icon className="shell-tab-icon size-6" />
                  <span className="shell-tab-label">{text}</span>
                </a>
              </li>
            );
          }
          const active = isActive(pathname, entry);
          return (
            <li key={entry.href} className="shell-tab flex-1">
              <Link
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={cx(item, active ? "font-medium text-brand-900" : "text-ink")}
              >
                <Icon className="shell-tab-icon size-6" />
                <span className="shell-tab-label">{text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
