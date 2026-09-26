import { describe, expect, it } from "vitest";

import {
  DEADBAND,
  HEADER_HEIGHT,
  HEADER_SPEED,
  HEADER_SPEED_FRAMES,
  INITIAL,
  NAV_STAGE_PX,
  NAV_STAGE_SHARE,
  reduceShell,
  type ShellEvent,
  type ShellState,
} from "./scroll";

const run = (start: ShellState, ...events: ShellEvent[]) =>
  events.reduce(reduceShell, start);

const scroll = (dy: number, y = 300): ShellEvent => ({ type: "scroll", dy, y, atTop: y <= 2 });
const rest: ShellEvent = { type: "rest" };
const settled: ShellEvent = { type: "settled" };
const navSettled: ShellEvent = { type: "navSettled" };
const reveal = (y = 300): ShellEvent => ({ type: "reveal", y });
/** Per pixel of travel, how far the finger moves the bar. */
const PER_PX = NAV_STAGE_SHARE / NAV_STAGE_PX;

/** Scrolled well past the header, in flow, bar compact and settled. */
const off = run(INITIAL, scroll(300, 300), navSettled);
/** A flick up: enough fast frames to reveal the header. */
const flick = (from: number): ShellEvent[] =>
  Array.from({ length: HEADER_SPEED_FRAMES }, (_, i) => scroll(-HEADER_SPEED, from - HEADER_SPEED * (i + 1)));
/** Revealed mid-page with the bar open. */
const revealed = run(off, ...flick(300), settled, navSettled);

describe("reduceShell (#428): the tab bar", () => {
  it("the finger drives the first stage from the first pixel, 1:1 and reversible", () => {
    expect(run(INITIAL, scroll(8, 8)).nav).toBeCloseTo(8 * PER_PX);
    expect(run(INITIAL, scroll(8, 8)).navTarget).toBeNull();
    expect(run(INITIAL, scroll(8, 8), scroll(-4, 4)).nav).toBeCloseTo(4 * PER_PX);
    expect(run(INITIAL, scroll(8, 300), scroll(-20, 280)).nav).toBe(0);
    // Back at the top of the page the timer opens whatever is left.
    expect(run(INITIAL, scroll(8, 8), scroll(-8, 0)).navTarget).toBe(0);
  });

  it("the finger's stage stops at its share however fast the frame, so the timer keeps its remainder", () => {
    const fastDown = run(INITIAL, scroll(40, 40));
    expect(fastDown.nav).toBeCloseTo(NAV_STAGE_SHARE);
    expect(fastDown.navTarget).toBe(1);
    const fastUp = run(off, scroll(-60, 240));
    expect(fastUp.nav).toBeCloseTo(1 - NAV_STAGE_SHARE);
    expect(fastUp.navTarget).toBe(0);
    // Reversing within the stage cannot overshoot the origin either.
    expect(run(INITIAL, scroll(8, 300), scroll(-40, 260)).nav).toBe(0);
  });

  it("past the stage's travel the rest runs on the timer and does not reverse", () => {
    const committed = run(INITIAL, scroll(NAV_STAGE_PX, NAV_STAGE_PX));
    expect(committed.navTarget).toBe(1);
    expect(committed.nav).toBeCloseTo(NAV_STAGE_SHARE);
    expect(reduceShell(committed, scroll(-10, 6)).nav).toBeCloseTo(NAV_STAGE_SHARE);
    expect(reduceShell(committed, scroll(-10, 6)).navTarget).toBe(1);
    const done = reduceShell(committed, navSettled);
    expect(done.nav).toBe(1);
    expect(done.navTarget).toBeNull();
  });

  it("compact, the bar starts opening on the first pixel up and commits after the stage", () => {
    expect(run(off, scroll(-1, 299)).nav).toBeCloseTo(1 - PER_PX);
    expect(run(off, scroll(-1, 299)).navTarget).toBeNull();
    const opening = run(off, scroll(-NAV_STAGE_PX, 300 - NAV_STAGE_PX));
    expect(opening.navTarget).toBe(0);
    expect(opening.nav).toBeCloseTo(1 - NAV_STAGE_SHARE);
  });

  it("already at the target, more travel that way starts no timer", () => {
    expect(reduceShell(off, scroll(40, 340)).navTarget).toBeNull();
    expect(reduceShell(off, scroll(40, 340)).nav).toBe(1);
    const open = run(INITIAL, scroll(-40, 260));
    expect(open.navTarget).toBeNull();
    expect(open.nav).toBe(0);
  });

  it("let go inside the finger's stage, the bar returns to the end it came from", () => {
    const nudgedUp = run(off, scroll(-4, 296), rest);
    expect(nudgedUp.navTarget).toBe(1);
    expect(reduceShell(nudgedUp, navSettled).nav).toBe(1);
    const nudgedDown = run(INITIAL, scroll(6, 6), rest);
    expect(nudgedDown.navTarget).toBe(0);
    expect(reduceShell(nudgedDown, navSettled).nav).toBe(0);
    // Settled at an end, rest leaves the bar alone.
    expect(reduceShell(off, rest).navTarget).toBeNull();
    expect(reduceShell(off, rest).nav).toBe(1);
    expect(run(INITIAL, scroll(-3, 300), rest)).toEqual(INITIAL);
  });

  it("a new gesture takes a return over from where it has got to", () => {
    const returning = run(INITIAL, scroll(6, 6), rest);
    expect(returning.navReturning).toBe(true);
    // The driver reports the drawn value mid-return; the finger resumes from it.
    const resumed = reduceShell(returning, { type: "scroll", dy: 4, y: 10, atTop: false, nav: 0.03 });
    expect(resumed.navTarget).toBeNull();
    expect(resumed.navReturning).toBe(false);
    expect(resumed.nav).toBeCloseTo(0.03 + 4 * PER_PX);
    expect(resumed.navOrigin).toBe(0);
    // A committed stage is not taken over.
    const committed = run(INITIAL, scroll(NAV_STAGE_PX, NAV_STAGE_PX));
    expect(committed.navReturning).toBe(false);
    expect(reduceShell(committed, { type: "scroll", dy: -4, y: 12, atTop: false, nav: 0.6 }).navTarget).toBe(1);
    // A return that settles is over.
    expect(reduceShell(returning, navSettled).navReturning).toBe(false);
  });

  it("the timed stage ignores navSettled when nothing is running", () => {
    expect(reduceShell(off, navSettled)).toBe(off);
  });
});

describe("reduceShell (#428): the header", () => {
  it("reveals on a run of frames at flick speed, not on distance", () => {
    const short = flick(300).slice(0, HEADER_SPEED_FRAMES - 1);
    expect(run(off, ...short).header).toBe("flow");
    expect(run(off, ...flick(300)).header).toBe("revealing");
    // One slow frame breaks the run.
    expect(run(off, ...short, scroll(-(HEADER_SPEED - 1), 260)).header).toBe("flow");
    expect(run(off, ...short, scroll(-(HEADER_SPEED - 1), 260), scroll(-HEADER_SPEED, 245)).header).toBe("flow");
    // A long slow scroll never does.
    let slow = off;
    for (let i = 0; i < 100; i++) slow = reduceShell(slow, scroll(-3, 600 - 3 * i));
    expect(slow.header).toBe("flow");
    // The bar opened on the timer after the finger's stage.
    expect(slow.navTarget).toBe(0);
    expect(reduceShell(slow, navSettled).nav).toBe(0);
  });

  it("a reveal opens the bar", () => {
    const revealing = run(off, ...flick(300));
    expect(revealing.header).toBe("revealing");
    expect(revealing.navTarget).toBe(0);
    expect(revealing.travel).toBe(0);
  });

  it("waits until the header is fully off; in flow it is on screen already", () => {
    const near = run(INITIAL, scroll(50, 50));
    expect(run(near, ...flick(50)).header).toBe("flow");
    const start = HEADER_HEIGHT + HEADER_SPEED * HEADER_SPEED_FRAMES;
    const at = run(INITIAL, scroll(start, start));
    expect(run(at, ...flick(start)).header).toBe("revealing");
  });

  it("frames during a commit are ignored, settling lands the state", () => {
    const revealing = run(off, ...flick(300));
    expect(reduceShell(revealing, scroll(100, 355)).header).toBe("revealing");
    expect(reduceShell(revealing, settled).header).toBe("revealed");
    const hiding = run(revealed, scroll(20, 308));
    expect(hiding.header).toBe("hiding");
    expect(reduceShell(hiding, scroll(-100, 208)).header).toBe("hiding");
    expect(reduceShell(hiding, settled).header).toBe("flow");
    expect(reduceShell(hiding, settled).travel).toBe(0);
  });

  it("revealed, a scroll down past the deadband hides", () => {
    expect(run(revealed, scroll(DEADBAND, 296)).header).toBe("revealed");
    expect(run(revealed, scroll(DEADBAND + 1, 297)).header).toBe("hiding");
  });

  it("reaching the top drops any header state into the flow and opens the bar", () => {
    expect(run(revealed, scroll(-288, 0)).header).toBe("flow");
    const revealing = run(off, ...flick(300));
    expect(reduceShell(revealing, scroll(-255, 0)).header).toBe("flow");
    const hiding = run(revealed, scroll(20, 308));
    expect(reduceShell(hiding, scroll(-308, 0)).header).toBe("flow");
    const top = reduceShell(off, scroll(-300, 0));
    expect(top.navTarget).toBe(0);
  });

  it("focus inside the header reveals it, queued if the hide is still animating", () => {
    const focused = reduceShell(off, reveal());
    expect(focused.header).toBe("revealing");
    expect(focused.navTarget).toBe(0);
    const near = run(INITIAL, scroll(30, 30));
    expect(reduceShell(near, reveal(30))).toBe(near);
    const hiding = run(revealed, scroll(20, 308));
    const queued = reduceShell(hiding, reveal());
    expect(queued).toEqual({ ...hiding, queued: true });
    expect(reduceShell(queued, reveal())).toBe(queued);
    expect(reduceShell(queued, settled).header).toBe("revealing");
    expect(reduceShell(revealed, reveal())).toBe(revealed);
  });

  it("rest spends the travel and the speed run", () => {
    const short = flick(300).slice(0, HEADER_SPEED_FRAMES - 1);
    const moving = run(off, ...short);
    expect(moving.fast).toBe(HEADER_SPEED_FRAMES - 1);
    expect(run(moving, rest).fast).toBe(0);
    expect(run(moving, rest).travel).toBe(0);
    expect(run(moving, rest, scroll(-HEADER_SPEED, 255)).header).toBe("flow");
  });
});
