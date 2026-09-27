import type { ReactNode } from "react";

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
 * at the bottom. Without it the header
 * renders exactly as before.
 */
export function SiteHeader({
  logo,
  title,
  items,
  navLabel,
  controls,
  menu,
  navAlign = "end",
  fit = false,
}: {
  logo: ReactNode;
  title?: ReactNode;
  items: readonly ShellNavEntry[];
  /** The nav's accessible name ("Main"). */
  navLabel: string;
  controls?: ReactNode;
  /** Where the desktop nav sits: at the controls ("end", the drafts'),
   *  or just after the lockup with the controls at the corner ("start"). */
  navAlign?: "start" | "end";
  /** From lg, the bar as wide as its content (up to 1000px) rather than
   *  always 1000px, so a short nav leaves no empty stretch. */
  fit?: boolean;
  menu?: {
    label: string;
    closeLabel: string;
    /** Under the list, in its scroll (the socials). */
    aside?: ReactNode;
    /** Kept at the bottom over a hairline (the calls to action). */
    footer?: ReactNode;
  };
}) {
  return (
    <header data-shell-header className="shell-header sticky top-0 z-40 lg:px-8 lg:pt-6">
      <div
        className={cx(
          "shell-header-row flex h-14 items-center px-4 lg:relative lg:mx-auto lg:max-w-[1000px] lg:rounded-[20px] lg:border lg:border-glass-line lg:bg-glass lg:px-3.5 lg:shadow-glass lg:backdrop-blur-xl",
          fit && "lg:w-fit",
        )}
      >
        {logo}
        {title}
        <div
          className={
            navAlign === "start"
              ? cx("flex flex-1 items-center gap-1.5 lg:ml-8", fit ? "lg:gap-8" : "lg:gap-4")
              : cx("ml-auto flex items-center gap-1.5", fit ? "lg:gap-8" : "lg:gap-4")
          }
        >
          <div className="hidden lg:block">
            <TopNav items={items} label={navLabel} />
          </div>
          <div className={cx("flex items-center gap-1.5", navAlign === "start" && "ml-auto")}>
            {controls}
            {menu && <MobileMenu logo={logo} items={items} {...menu} />}
          </div>
        </div>
      </div>
    </header>
  );
}
