"use client";

import { cx } from "./cx";
import { isActive, type ShellItem } from "./items";
import { useShell } from "./provider";

/**
 * The desktop header's navigation (drafts 2026-09-19, #409): the items
 * as plain text links in the bar, an outbound one marked by an arrow.
 * The active item reads in brand-900 (Hero Purple, Mild Purple on the
 * dark ground) and carries aria-current; the rest are ink. Replaced the
 * sidebar, whose pills and icons the drafts do not have.
 */
export function TopNav({ items, label }: { items: readonly ShellItem[]; label: string }) {
  const { Link, pathname } = useShell();
  const link =
    "rounded-full px-2.5 py-1.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
  return (
    <nav aria-label={label} className="flex items-center">
      {items.map((item) => {
        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(link, "inline-flex items-center gap-1 text-ink/80 hover:text-ink")}
            >
              {item.label}
              <OutboundIcon />
            </a>
          );
        }
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(link, active ? "text-brand-900" : "text-ink/80 hover:text-ink")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Outbound, not a chevron (owner, 2026-09-20: the draft's chevron reads
 *  as "more", and an outbound link leaves the site). The same arrow the
 *  hub's Discover doors and Activity links wear, at label size. */
function OutboundIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={13}
      height={13}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
