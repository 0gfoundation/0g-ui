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

/** Active means the path is under the item's href; outbound items never are. */
export function isActive(pathname: string, item: ShellItem): boolean {
  return !item.external && pathname.startsWith(item.href);
}
