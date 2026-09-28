"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef } from "react";

import { cx } from "./cx";
import { ChevronIcon, ChevronRightIcon, CloseIcon } from "./glyphs";
import { isActive, isGroupActive, type ShellGroup, type ShellLinkItem } from "./items";
import { useShell } from "./provider";

/** How long the pointer may be off trigger and panel before it closes,
 *  so a move from one to the other does not drop it. */
const LEAVE_MS = 120;

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

/**
 * A group in the desktop bar (design system 2026, "dropdown panel web"):
 * a text trigger with a chevron that opens a panel the bar's full width
 * under it, one column per section, each under a small-caps heading,
 * each link a title with a chevron over an optional description. A
 * close button sits at the panel's corner.
 *
 * Controlled by TopNav, which keeps one group open at a time. Opens on
 * click, and on hover for a mouse; Escape closes it and returns focus to
 * the trigger, as does a click outside or focus leaving the group. The
 * panel hangs from the header row (`lg:relative` there), not from the
 * trigger. It is solid, not glass: a backdrop filter inside the bar's
 * own blurs the bar, not the page.
 */
export function NavDropdown({
  group,
  open,
  capped = false,
  onOpenChange,
}: {
  group: ShellGroup;
  open: boolean;
  /** At most 1000px from the bar's right edge, for a bar wider than that. */
  capped?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pathname } = useShell();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const leaveTimer = useRef(0);
  // A mouse reaches the trigger before it clicks it: the hover opened the
  // panel, so that first click must not toggle it shut again.
  const hoverOpened = useRef(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(leaveTimer.current);
    if (!open) hoverOpened.current = true;
    onOpenChange(true);
  };
  const onPointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      hoverOpened.current = false;
      onOpenChange(false);
    }, LEAVE_MS);
  };

  const active = isGroupActive(pathname, group);
  const close = () => {
    onOpenChange(false);
    trigger.current?.focus();
  };

  return (
    <div
      ref={root}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) onOpenChange(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (hoverOpened.current) {
            hoverOpened.current = false;
            return;
          }
          onOpenChange(!open);
        }}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[15px] font-medium transition-colors",
          focusRing,
          active ? "text-brand-900" : open ? "text-ink" : "text-ink/80 hover:text-ink",
        )}
      >
        {group.label}
        <ChevronIcon open={open} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cx("absolute top-full z-10 pt-2", capped ? "right-0 w-full max-w-[1000px]" : "inset-x-0")}
      >
        <div className="shell-panel relative rounded-2xl border border-nav-line bg-control p-[30px] shadow-nav-panel">
          <div
            className="grid gap-x-8 pr-10"
            style={{ gridTemplateColumns: `repeat(${group.sections.length}, minmax(0, 1fr))` }}
          >
            {group.sections.map((section, i) => (
              <div key={section.heading ?? i}>
                {section.heading && (
                  <p className="mb-[26px] text-[12px] leading-4 font-medium tracking-[0.02em] text-nav-heading uppercase">
                    {section.heading}
                  </p>
                )}
                <ul className="flex flex-col gap-[22px]">
                  {section.items.map((item) => (
                    <li key={item.href + item.label}>
                      <PanelLink item={item} onNavigate={() => onOpenChange(false)} />
                      {item.description && (
                        <p className="mt-1 max-w-[280px] text-[12px] leading-[17px] text-nav-muted">
                          {item.description}
                        </p>
                      )}
                      <SubLinks item={item} onNavigate={() => onOpenChange(false)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* After the links, so Tab reaches them first; drawn at the corner. */}
          <button
            type="button"
            aria-label={`Close ${group.label}`}
            onClick={close}
            className={cx(
              "absolute top-[22px] right-[22px] inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink",
              focusRing,
            )}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A panel link: the title with its chevron, in the nav title colour;
 *  the router's Link in-app, a new tab otherwise. `size` picks the
 *  desktop panel's rows or the phone menu's 40px tap rows. */
export function PanelLink({
  item,
  onNavigate,
  size = "panel",
}: {
  item: ShellLinkItem;
  onNavigate?: () => void;
  size?: "panel" | "menu";
}) {
  const { Link, pathname } = useShell();
  const className = cx(
    "inline-flex items-center font-medium transition-colors hover:text-nav-title-hover",
    focusRing,
    size === "panel" ? "gap-2 text-[16px] leading-6" : "min-h-10 gap-1.5 text-[16px] leading-5",
  );
  const chevron = <ChevronRightIcon size={size === "panel" ? 16 : 14} />;
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={cx(className, "text-nav-title")}
      >
        {item.label}
        {chevron}
      </a>
    );
  }
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cx(className, active ? "text-nav-title-hover" : "text-nav-title")}
    >
      {item.label}
      {chevron}
    </Link>
  );
}

/** A link's secondary row (its `links`): small brand-colour titles with
 *  chevrons, in the desktop panel and the phone menu alike. */
export function SubLinks({ item, onNavigate }: { item: ShellLinkItem; onNavigate?: () => void }) {
  const { Link } = useShell();
  if (!item.links?.length) return null;
  const className = cx(
    "inline-flex min-h-6 items-center gap-1 text-[14px] font-medium text-brand-900 transition-colors hover:text-nav-link-hover",
    focusRing,
  );
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
      {item.links.map((link) =>
        link.external ? (
          <a
            key={link.href + link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className={className}
          >
            {link.label}
            <ChevronRightIcon size={12} />
          </a>
        ) : (
          <Link key={link.href + link.label} href={link.href} onClick={onNavigate} className={className}>
            {link.label}
            <ChevronRightIcon size={12} />
          </Link>
        ),
      )}
    </div>
  );
}
