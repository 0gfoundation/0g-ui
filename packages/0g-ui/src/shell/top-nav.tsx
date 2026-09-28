"use client";

import { useCallback, useState } from "react";

import { cx } from "./cx";
import { OutboundIcon } from "./glyphs";
import { isActive, isGroup, type ShellNavEntry } from "./items";
import { NavDropdown } from "./nav-dropdown";
import { useShell } from "./provider";

/**
 * The desktop header's navigation (drafts 2026-09-19, #409): the items
 * as plain text links in the bar, an outbound one marked by an arrow.
 * The active item reads in brand-900 (Hero Purple, Mild Purple on the
 * dark ground) and carries aria-current; the rest are ink. Replaced the
 * sidebar, whose pills and icons the drafts do not have. A group
 * (ShellGroup) renders as a NavDropdown in the same row, one open at a
 * time.
 */
export function TopNav({
  items,
  label,
  capPanels = false,
}: {
  items: readonly ShellNavEntry[];
  label: string;
  /** Keep group panels at most 1000px, under the nav at the bar's end:
   *  set when the bar itself runs wider (SiteHeader's `width="grow"`). */
  capPanels?: boolean;
}) {
  const { Link, pathname } = useShell();
  // One group open at a time, closed by navigation.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpenGroup(null);
  }
  const onOpenChange = useCallback(
    (label: string, open: boolean) =>
      setOpenGroup((current) => (open ? label : current === label ? null : current)),
    [],
  );
  const link =
    "rounded-full px-2.5 py-1.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
  return (
    <nav aria-label={label} className="flex items-center">
      {items.map((item) => {
        if (isGroup(item)) {
          return (
            <NavDropdown
              key={item.label}
              group={item}
              open={openGroup === item.label}
              capped={capPanels}
              onOpenChange={(open) => onOpenChange(item.label, open)}
            />
          );
        }
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
