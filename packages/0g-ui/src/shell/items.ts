import type { ComponentType } from "react";

/** A glyph for an item, painted with currentColor at the size its slot sets. */
export type ShellIcon = ComponentType<{ className?: string }>;

/**
 * One navigation entry, shared by the desktop bar and the phone tab bar
 * so the two lists cannot drift. Labels are plain strings: translation
 * is the host's.
 */
export type ShellItem = {
  href: string;
  label: string;
  /** The phone tab's label where the full one does not fit five tabs. */
  shortLabel?: string;
  icon: ShellIcon;
  /** Opens in a new tab, marked outbound, never active. */
  external?: boolean;
};

/** The phone pill was measured with five tabs and its CSS slides
 *  exactly five (shell.css, `.shell-tab:nth-child`); more do not fit a
 *  324px pill with labels. */
export const MAX_ITEMS = 5;

/** A link inside a group's panel. No icon: the panels are text lists. */
export type ShellLinkItem = {
  href: string;
  label: string;
  /** A line under the title in the desktop panel and the phone menu. */
  description?: string;
  /** Secondary links in a row under the description ("About", "Storage
   *  Scan"): smaller, in the brand colour, each with its own chevron. */
  links?: readonly { href: string; label: string; external?: boolean }[];
  /** Opens in a new tab, never active. */
  external?: boolean;
};

/**
 * A desktop-bar entry that opens a panel instead of navigating (0g.ai's
 * Ecosystem). Sections split the panel under optional small-caps
 * headings. A group is never a tab: TabBar takes ShellItem only.
 */
export type ShellGroup = {
  label: string;
  sections: readonly { heading?: string; items: readonly ShellLinkItem[] }[];
};

/** What the header's nav takes: links and, optionally, groups. */
export type ShellNavEntry = ShellItem | ShellLinkItem | ShellGroup;

export function isGroup(entry: ShellNavEntry): entry is ShellGroup {
  return "sections" in entry;
}

/**
 * Active means the path is under the item's href; outbound items never
 * are. The root "/" is active on the root alone, or it would be active
 * on every page.
 */
export function isActive(pathname: string, item: ShellLinkItem): boolean {
  if (item.external) return false;
  if (item.href === "/") return pathname === "/";
  return pathname.startsWith(item.href);
}

/** A group is active when any link in it is. */
export function isGroupActive(pathname: string, group: ShellGroup): boolean {
  return group.sections.some((s) => s.items.some((item) => isActive(pathname, item)));
}
