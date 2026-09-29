import type { ReactNode } from "react";

import { COLLAPSE_CLASSES, type ShellCollapse } from "./collapse";
import { cx } from "./cx";
import type { ShellNavEntry } from "./items";
import { MobileMenu } from "./mobile-menu";
import { TopNav } from "./top-nav";

/**
 * The shell's header (drafts 2026-09-19, #409). One row at every width:
 * the host's lockup on the left, its controls on the right, and from lg
 * the nav between them, as text links in the bar.
 *
 * Phones: no bar. The row sits on the ground, 56px tall, in the page
 * flow (#428): it scrolls off with the content. Once it is fully off, a
 * scroll up pins it and slides it back in over the content on the
 * glass; a scroll down slides it out and unpins it. The glass fades out
 * at the top of the page over a soft scrim of the ground. Driven by
 * scroll-driver.tsx through `.shell-header` and `.shell-header-row` in
 * shell.css; `data-shell-header` is how focus landing inside it reveals
 * it. The behaviour's measurements:
 * docs/spec/phone-shell-measurements-2026-09-21.md.
 *
 * From lg: the draft's floating bar, 1000px wide and 56px tall under a
 * 24px top margin, on the glass tokens. Sticky too, with the margin
 * kept, so it floats over the content the way it floats over the ground
 * at the top. The drafts are static mocks; stickiness is ours (#409).
 *
 * `title` is for a host that keeps a heading in the header for assistive
 * tech (the drafts draw none); `controls` render in order after the nav,
 * so the host decides what sits at the corner.
 *
 * `items` may hold groups (ShellGroup), which the bar renders as
 * dropdowns. `menu` is for a host with no tab bar: below lg it adds a
 * menu button after the controls that opens the nav full screen
 * (mobile-menu.tsx), with `menu.aside` under the list and `menu.footer`
 * at its foot. Without groups, `menu` or `width` the header
 * renders exactly as in 0.1.0.
 */
export function SiteHeader({
  logo,
  title,
  items,
  navLabel,
  controls,
  menu,
  width = "fixed",
  collapse = "lg",
}: {
  logo: ReactNode;
  title?: ReactNode;
  items: readonly ShellNavEntry[];
  /** The nav's accessible name ("Main"). */
  navLabel: string;
  controls?: ReactNode;
  /** The desktop bar's width: "fixed" is the drafts' 1000px at every
   *  width; "grow" is the same 1000px up to the drafts' 1440px frame and
   *  then growing at the drafts' proportion of the page (70%, less 8px so
   *  1440 lands on exactly 1000), for a site whose
   *  content runs full width. A group's panel always spans the bar, so
   *  their edges line up at every width. */
  width?: "fixed" | "grow";
  /** Where the bar gives way to the phone row and its menu button:
   *  "lg" (1024px, the default) or "md" (768px) for a nav that fits a
   *  tablet. Pass the same value to ShellScroll. */
  collapse?: ShellCollapse;
  menu?: {
    label: string;
    closeLabel: string;
    /** Under the list, in its scroll (the socials). */
    aside?: ReactNode;
    /** Kept at the bottom over a hairline (the calls to action). */
    footer?: ReactNode;
  };
}) {
  const c = COLLAPSE_CLASSES[collapse];
  return (
    <header
      data-shell-header
      data-shell-collapse={collapse === "lg" ? undefined : collapse}
      className={cx("shell-header sticky top-0 z-40", c.header)}
    >
      <div
        className={cx(
          "shell-header-row flex h-14 items-center px-4",
          c.row,
          width === "grow" ? c.rowGrow : c.rowFixed,
          c.bar,
        )}
      >
        {logo}
        {title}
        <div className={cx("ml-auto flex items-center gap-1.5", c.gap)}>
          <div className={cx("hidden", c.showNav)}>
            <TopNav items={items} label={navLabel} collapse={collapse} />
          </div>
          {/* On the bar the menu button is hidden, so with no controls
              the slot would only add the gap before it. */}
          <div className={cx("flex items-center gap-1.5", !controls && c.hideOnDesktop)}>
            {controls}
            {menu && <MobileMenu logo={logo} items={items} collapse={collapse} {...menu} />}
          </div>
        </div>
      </div>
    </header>
  );
}
