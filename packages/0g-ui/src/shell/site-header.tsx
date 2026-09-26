import type { ReactNode } from "react";

import type { ShellItem } from "./items";
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
 */
export function SiteHeader({
  logo,
  title,
  items,
  navLabel,
  controls,
}: {
  logo: ReactNode;
  title?: ReactNode;
  items: readonly ShellItem[];
  /** The nav's accessible name ("Main"). */
  navLabel: string;
  controls?: ReactNode;
}) {
  return (
    <header data-shell-header className="shell-header sticky top-0 z-40 lg:px-8 lg:pt-6">
      <div className="shell-header-row flex h-14 items-center px-4 lg:mx-auto lg:max-w-[1000px] lg:rounded-[20px] lg:border lg:border-glass-line lg:bg-glass lg:px-3.5 lg:shadow-glass lg:backdrop-blur-xl">
        {logo}
        {title}
        <div className="ml-auto flex items-center gap-1.5 lg:gap-4">
          <div className="hidden lg:block">
            <TopNav items={items} label={navLabel} />
          </div>
          <div className="flex items-center gap-1.5">{controls}</div>
        </div>
      </div>
    </header>
  );
}
