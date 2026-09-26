/**
 * The phone shell's scroll state (#428): the header hides on a scroll
 * down and the tab bar compacts; a scroll up brings both back. Pure, so
 * the arithmetic is testable; `scroll-driver.tsx` drives the DOM.
 *
 * The header: at the top of the page it is in the flow and scrolls off
 * with the content; nothing here touches it. Once it is fully off, a
 * scroll up at speed (HEADER_SPEED for HEADER_SPEED_FRAMES) pins it and
 * slides it in over the content; a scroll down past DEADBAND slides it
 * out and returns it to the flow. Reaching the top of the page returns
 * it to the flow whatever it was doing, so an overscroll bounce moves
 * it with the content. Frames during a header commit are otherwise
 * ignored.
 *
 * The tab bar: one number, `nav`, 0 expanded to 1 compact, drives every
 * part of the pill. A change has two stages in either direction. The
 * finger drives the first: the first NAV_STAGE_PX of travel move `nav`
 * by NAV_STAGE_SHARE, 1:1 and reversible, from the first pixel, and no
 * further however fast the frame, so the timer always has the same
 * remainder to cover in the same time; let go
 * there and the bar returns to the end it came from, a return the next
 * gesture takes over from wherever it has got to. Past that travel the
 * rest runs on a timer (`navTarget`, NAV_MS) and does not reverse until
 * it settles. A header reveal opens the bar the same
 * way. Instagram's model, measured, with the finger
 * stage on both sides so the bar is already moving when the browser's
 * own bar animates: docs/spec/phone-shell-measurements-2026-09-21.md.
 */

/** The phone header row, h-14. */
export const HEADER_HEIGHT = 56;
/** Downward travel that hides a revealed header. */
export const DEADBAND = 8;
/** Upward speed, px per frame, held for HEADER_SPEED_FRAMES frames, that
 *  reveals the header: a flick, not a scroll. */
export const HEADER_SPEED = 15;
export const HEADER_SPEED_FRAMES = 3;
/** Travel the finger drives the bar through, either direction. */
export const NAV_STAGE_PX = 16;
/** How much of the bar's change that travel covers. */
export const NAV_STAGE_SHARE = 0.2;
/** The bar's timed stage, run by the driver a frame at a time. */
export const NAV_MS = 400;
/** The header's slide in and out; the CSS carries the same figures. */
export const REVEAL_MS = 280;
export const HIDE_MS = 320;
/** The glass fades in over this much scroll from the top of the page. */
export const FADE_DISTANCE = 48;
/** Below this scroll position the page counts as at the top (the
 *  driver decides `atTop` from it). */
export const TOP = 2;

export type HeaderState = "flow" | "revealing" | "revealed" | "hiding";

export type ShellState = {
  header: HeaderState;
  /** A reveal asked for while the hide animates: it follows the settle. */
  queued: boolean;
  /** Accumulated travel in the current direction, signed, down positive. */
  travel: number;
  /** Consecutive frames so far at HEADER_SPEED upward, for the speed rule. */
  fast: number;
  /** The bar's compaction, 0 expanded to 1 compact. */
  nav: number;
  /** Where the bar's timed stage is heading; null while the finger drives. */
  navTarget: 0 | 1 | null;
  /** The timed stage is a return after letting go, which a new gesture may take over. */
  navReturning: boolean;
  /** The end the finger's stage started from; it never moves `nav` further
   *  than NAV_STAGE_SHARE from it. */
  navOrigin: 0 | 1;
};

export type ShellEvent =
  /** One coalesced scroll frame: `y` clamped to the page, `dy` since the
   *  last, `atTop` whether the page is at its top, `nav` the bar's value
   *  as currently drawn (mid-animation it is ahead of the state's). */
  | { type: "scroll"; dy: number; y: number; atTop: boolean; nav?: number }
  /** The scroll has rested: the gesture is over, its travel is spent. */
  | { type: "rest" }
  /** The header's commit animation finished. */
  | { type: "settled" }
  /** The bar's timed stage finished. */
  | { type: "navSettled" }
  /** Something needs the header on screen (focus landed inside it). */
  | { type: "reveal"; y: number };

export const INITIAL: ShellState = {
  header: "flow",
  queued: false,
  travel: 0,
  fast: 0,
  nav: 0,
  navTarget: null,
  navReturning: false,
  navOrigin: 0,
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Returns the same object when nothing changes, so the driver can skip. */
export function reduceShell(state: ShellState, event: ShellEvent): ShellState {
  switch (event.type) {
    case "scroll": {
      const { dy, y, atTop } = event;
      const travel =
        dy === 0 ? state.travel : Math.sign(dy) === Math.sign(state.travel) ? state.travel + dy : dy;
      const fast = dy <= -HEADER_SPEED ? state.fast + 1 : 0;
      let header = state.header;
      let nav = state.nav;
      let navTarget = state.navTarget;
      let navReturning = state.navReturning;
      let navOrigin = state.navOrigin;
      if (navReturning && dy !== 0) {
        // A new gesture takes the return over from where it has got to;
        // the end it was returning to is the stage's origin.
        nav = event.nav ?? nav;
        navOrigin = navTarget ?? navOrigin;
        navTarget = null;
        navReturning = false;
      }
      if (atTop) {
        header = "flow";
        if (navTarget === null && nav !== 0) navTarget = 0;
      } else {
        if (header === "flow" && y >= HEADER_HEIGHT && fast >= HEADER_SPEED_FRAMES) {
          header = "revealing";
        } else if (header === "revealed" && travel > DEADBAND) {
          header = "hiding";
        }
        if (navTarget === null && dy !== 0) {
          const origin = navOrigin;
          nav = clamp01(
            Math.min(
              origin + NAV_STAGE_SHARE,
              Math.max(origin - NAV_STAGE_SHARE, nav + (dy * NAV_STAGE_SHARE) / NAV_STAGE_PX),
            ),
          );
          if (travel >= NAV_STAGE_PX && nav !== 1) navTarget = 1;
          else if (travel <= -NAV_STAGE_PX && nav !== 0) navTarget = 0;
        }
        if (header === "revealing" && state.header !== "revealing" && nav !== 0) navTarget = 0;
      }
      if (
        travel === state.travel &&
        fast === state.fast &&
        header === state.header &&
        nav === state.nav &&
        navTarget === state.navTarget &&
        navReturning === state.navReturning &&
        navOrigin === state.navOrigin
      ) {
        return state;
      }
      return {
        ...state,
        // A header commit consumes the travel: the next needs a fresh run.
        travel: header === state.header ? travel : 0,
        fast,
        header,
        nav,
        navTarget,
        navReturning,
        navOrigin,
      };
    }
    case "rest": {
      // Let go inside the finger's stage: the bar goes back to the end it
      // came from, on the timer.
      const navTarget =
        state.navTarget === null && state.nav > 0 && state.nav < 1
          ? state.nav < 0.5
            ? 0
            : 1
          : state.navTarget;
      if (state.travel === 0 && state.fast === 0 && navTarget === state.navTarget) return state;
      return {
        ...state,
        travel: 0,
        fast: 0,
        navTarget,
        navReturning: navTarget !== state.navTarget ? true : state.navReturning,
      };
    }
    case "settled": {
      if (state.header === "hiding") {
        return { ...state, header: state.queued ? "revealing" : "flow", queued: false, travel: 0 };
      }
      if (state.header === "revealing") return { ...state, header: "revealed", travel: 0 };
      return state;
    }
    case "navSettled": {
      if (state.navTarget === null) return state;
      return {
        ...state,
        nav: state.navTarget,
        navTarget: null,
        navReturning: false,
        navOrigin: state.navTarget,
      };
    }
    case "reveal": {
      if (state.header === "flow" && event.y >= HEADER_HEIGHT) {
        return {
          ...state,
          header: "revealing",
          travel: 0,
          navTarget: state.nav !== 0 ? 0 : state.navTarget,
        };
      }
      if (state.header === "hiding" && !state.queued) return { ...state, queued: true };
      return state;
    }
  }
}
