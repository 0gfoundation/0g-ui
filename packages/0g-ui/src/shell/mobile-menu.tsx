"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "./cx";
import { ChevronRightIcon, CloseIcon, MenuIcon } from "./glyphs";
import { isActive, isGroup, isGroupActive, type ShellGroup, type ShellNavEntry } from "./items";
import { PanelLink } from "./nav-dropdown";
import { useShell } from "./provider";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500";

/**
 * The phone menu (design system 2026, "header mobile" and "dropdown
 * panel mobile"): for a host whose nav does not fit five tabs, a round
 * menu button in the header row below lg that opens the nav full
 * screen. Under the lockup and a close mark, a hairline, then one row
 * per entry: a group opens in place (its chevron turns down) to its
 * links as small titles with their descriptions. `aside` follows the
 * list (the socials), `footer` stays at the bottom over a hairline (the
 * calls to action). A host with a TabBar passes no menu.
 *
 * A modal dialog: portalled to <body> (the header row's transform and
 * backdrop filter would otherwise be the fixed panel's containing
 * block), the page's scroll locked while open, focus moved in and kept
 * in, Escape or the close button returning it to the menu button. It
 * closes on navigation, on any link followed inside it, and when the
 * viewport reaches lg, where the bar carries the nav again.
 */
export function MobileMenu({
  logo,
  items,
  label,
  closeLabel,
  aside,
  footer,
}: {
  logo: ReactNode;
  items: readonly ShellNavEntry[];
  /** The menu button's and the dialog's accessible name ("Menu"). */
  label: string;
  /** The close button's accessible name ("Close menu"). */
  closeLabel: string;
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  const { Link, pathname } = useShell();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  // A link followed from anywhere in the dialog closes it, the lockup
  // home from home and the host's own links included.
  const onClick = (event: ReactMouseEvent) => {
    if ((event.target as Element).closest("a")) setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("[data-shell-menu-close]")?.focus();
    const desktop = window.matchMedia("(width >= 64rem)");
    const onChange = () => desktop.matches && setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => {
      root.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialog.current) return;
    const focusables = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const row = cx(
    "flex h-10 w-full items-center justify-between text-left text-[20px] leading-none font-normal text-ink",
    focus,
  );

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className={cx(
          "inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-nav-line bg-control text-ink lg:hidden",
          focus,
        )}
      >
        <MenuIcon />
      </button>
      {open &&
        createPortal(
          <div
            ref={dialog}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onKeyDown={onKeyDown}
            onClick={onClick}
            className="shell-menu fixed inset-0 z-50 flex flex-col bg-control text-ink lg:hidden"
          >
            <div className="mx-4 flex h-14 shrink-0 items-center border-b border-nav-line">
              {logo}
              <button
                type="button"
                data-shell-menu-close
                aria-label={closeLabel}
                onClick={close}
                className={cx(
                  "-mr-2 ml-auto inline-flex size-10 cursor-pointer items-center justify-center",
                  focus,
                )}
              >
                <CloseIcon size={26} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-6">
              <nav aria-label={label} className="flex flex-col">
                {items.map((item) => {
                  if (isGroup(item)) return <MenuGroup key={item.label} group={item} row={row} />;
                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={row}
                      >
                        {item.label}
                      </a>
                    );
                  }
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(row, active && "text-nav-title")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              {aside && <div className="mt-6">{aside}</div>}
            </div>
            {footer && (
              <div className="mx-4 shrink-0 border-t border-nav-line pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                {footer}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A group as a disclosure; open from the start when the page is in it.
 *  Its sections run on under one another, a gap between them. */
function MenuGroup({ group, row }: { group: ShellGroup; row: string }) {
  const { pathname } = useShell();
  const active = isGroupActive(pathname, group);
  const [open, setOpen] = useState(active);
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cx(row, "cursor-pointer")}
      >
        {group.label}
        <ChevronRightIcon
          size={22}
          className={cx("text-nav-chevron transition-transform", open && "rotate-90")}
        />
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-3 pt-1 pb-3 pl-6">
        {group.sections.map((section, i) => (
          <ul key={section.heading ?? i} aria-label={section.heading} className="flex flex-col">
            {section.items.map((item) => (
              <li key={item.href + item.label}>
                <PanelLink item={item} size="menu" />
                {item.description && (
                  <p className="-mt-0.5 mb-1.5 text-[11px] leading-4 text-nav-muted">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
