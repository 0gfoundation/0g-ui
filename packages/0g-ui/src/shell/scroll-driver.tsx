"use client";

import { useEffect } from "react";

import {
  FADE_DISTANCE,
  HEADER_HEIGHT,
  HIDE_MS,
  INITIAL,
  NAV_MS,
  reduceShell,
  REVEAL_MS,
  type ShellEvent,
  type ShellState,
  TOP,
} from "./scroll";

/** No scroll event for this long ends the gesture: its travel is spent. */
const REST_MS = 150;

/**
 * Drives the phone shell on scroll (#428) and renders nothing. Phone
 * only (below lg): from lg the listener is off and the root carries no
 * shell state, so the desktop bar is untouched by construction.
 *
 * One passive scroll listener on the window, coalesced by rAF, feeding
 * `reduceShell`; the state lands on <html> and the header and the tab
 * bar react in CSS. Transforms and opacity only: nothing here changes
 * layout or scrolls the page, ever
 * (docs/spec/phone-shell-measurements-2026-09-21.md §1 has why).
 *
 * - `data-shell-pin`: `on` while the header is pinned (sticky) for a
 *   reveal; otherwise it is in flow and scrolls natively.
 * - `--shell-t`: the header row's translate up, within its pin.
 * - `--shell-fade`: the glass, 0 at the top of the page to 1 at 48px.
 * - `data-shell-motion`: `reveal` or `hide` while the header animates,
 *   `off` otherwise so other writes jump.
 * - `--shell-nav`: the tab bar's compaction, 0 to 1, written per frame:
 *   by the finger through the first stage, by a rAF loop here through
 *   the timed stage. Not a CSS transition: Safari resolved the labels'
 *   opacity, derived from the transitioning property, straight to its
 *   end value while the transforms interpolated, so the text popped in
 *   ahead of the pill (docs/spec/phone-shell-measurements-2026-09-21.md
 *   §4).
 */
export function ShellScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia("(width < 64rem)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let state: ShellState = INITIAL;
    let lastY = 0;
    let frame = 0;
    let settleTimer = 0;
    let navFrame = 0;
    let restTimer = 0;
    /** The bar's value as last written, ahead of the state's mid-animation. */
    let navNow = 0;

    const clampedY = () => {
      // Clamped to the page so iOS rubber-banding never reads as travel.
      const max = Math.max(0, root.scrollHeight - window.innerHeight);
      return Math.max(0, Math.min(max, window.scrollY));
    };
    const setHeader = (t: number) => {
      root.style.setProperty("--shell-t", `${t}px`);
    };
    const setMotion = (mode: "reveal" | "hide" | "off") => {
      root.dataset.shellMotion = mode;
    };
    const setPin = (on: boolean) => {
      root.dataset.shellPin = on ? "on" : "off";
    };
    const setNav = (n: number) => {
      navNow = n;
      root.style.setProperty("--shell-nav", n.toFixed(4));
    };
    // A synchronous style flush, so a jump written before it and an
    // animated write after it land in different transitions.
    const flush = () => void root.offsetHeight;
    const after = (ms: number) => (reduced.matches ? 0 : ms + 20);

    const settleLater = (ms: number) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        apply(reduceShell(state, { type: "settled" }));
        const y = clampedY();
        apply(reduceShell(state, { type: "scroll", dy: 0, y, atTop: y <= TOP, nav: navNow }));
      }, after(ms));
    };
    // The bar's timed stage: from where the finger left it to the target
    // over NAV_MS, eased out, one write a frame.
    const runNav = (from: number, to: number) => {
      cancelAnimationFrame(navFrame);
      if (reduced.matches) {
        setNav(to);
        apply(reduceShell(state, { type: "navSettled" }));
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / NAV_MS);
        const eased = 1 - (1 - t) ** 3;
        setNav(from + (to - from) * eased);
        if (t < 1) {
          navFrame = requestAnimationFrame(step);
        } else {
          navFrame = 0;
          apply(reduceShell(state, { type: "navSettled" }));
        }
      };
      navFrame = requestAnimationFrame(step);
    };
    const startReveal = () => {
      setMotion("reveal");
      setHeader(0);
      settleLater(REVEAL_MS);
    };

    function apply(next: ShellState) {
      const prev = state;
      if (next === prev) return;
      state = next;

      // The bar: the finger's writes land as they come; the timed stage
      // runs from wherever the finger left it.
      if (next.navTarget !== prev.navTarget) {
        if (next.navTarget === null) {
          cancelAnimationFrame(navFrame);
          navFrame = 0;
          setNav(next.nav);
        } else {
          runNav(next.nav, next.navTarget);
        }
      } else if (next.navTarget === null && next.nav !== prev.nav) {
        setNav(next.nav);
      }

      if (next.header === prev.header) return;
      if (prev.header === "flow" && next.header === "revealing") {
        // Pin the header off screen without motion, then slide it in.
        setMotion("off");
        setPin(true);
        setHeader(HEADER_HEIGHT);
        flush();
        startReveal();
        return;
      }
      if (next.header === "revealing") {
        startReveal();
        return;
      }
      if (next.header === "hiding") {
        // The header ends where flow will put it, so the switch after
        // the settle is silent.
        setMotion("hide");
        setHeader(Math.min(HEADER_HEIGHT, clampedY()));
        settleLater(HIDE_MS);
        return;
      }
      if (next.header === "flow") {
        // Settled hidden, or back at the top of the page from any state
        // (an animation in flight is cut: at the top the flow position
        // is the visible one, and the overscroll bounce must carry the
        // header with the content).
        window.clearTimeout(settleTimer);
        setMotion("off");
        setPin(false);
        setHeader(0);
        return;
      }
      if (next.header === "revealed") setMotion("off");
    }

    const dispatch = (event: ShellEvent) => apply(reduceShell(state, event));

    const restLater = () => {
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(() => dispatch({ type: "rest" }), REST_MS);
    };
    const onFrame = () => {
      frame = 0;
      const y = clampedY();
      const dy = y - lastY;
      lastY = y;
      root.style.setProperty("--shell-fade", String(Math.min(1, y / FADE_DISTANCE)));
      dispatch({ type: "scroll", dy, y, atTop: y <= TOP, nav: navNow });
      restLater();
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(onFrame);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-shell-header]")) {
        dispatch({ type: "reveal", y: clampedY() });
      }
    };

    const disarm = () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(navFrame);
      window.clearTimeout(restTimer);
      frame = 0;
      navFrame = 0;
      navNow = 0;
      state = INITIAL;
      for (const name of ["--shell-t", "--shell-fade", "--shell-nav"]) {
        root.style.removeProperty(name);
      }
      delete root.dataset.shellPin;
      delete root.dataset.shellMotion;
    };
    const arm = () => {
      if (!phone.matches) {
        disarm();
        return;
      }
      lastY = clampedY();
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("focusin", onFocusIn);
      onFrame();
    };

    arm();
    phone.addEventListener("change", arm);
    return () => {
      phone.removeEventListener("change", arm);
      disarm();
    };
  }, []);
  return null;
}
