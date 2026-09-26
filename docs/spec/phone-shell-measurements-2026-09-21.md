# Phone shell on scroll (#428): what ships, and what it rests on

Moved from `0gfoundation/0g-hub` (`docs/spec/`, at `50a661b`) with the
behaviour it measures (ADR-0012). Issue numbers are the hub's.

The hide-on-scroll header and the compacting tab bar below `lg`, built
in PR #429 over 2026-09-21 and 22 against real phones and Instagram.
The first half of this note is the behaviour as shipped; the second is
the evidence each rule came from, so the code can carry a sentence and
a pointer instead of the reasoning. Code: `packages/0g-ui/src/shell/scroll.ts`
(state machine, tested), `scroll-driver.tsx` (the one listener),
`playground/src/probe.tsx` (the readout used below), `bootstrap.ts`
(the Safari stamp), the styles in `shell.css` beside them.

## What ships

**The tab bar changes in two stages, in either direction.**

- Scrolling down, the bar contracts. In the first stage it contracts
  slowly, in step with the finger, for the first few pixels: 16px of
  travel cover 20% of the change. Let go during this stage and it
  returns to fully expanded. Keep going and it enters the second stage,
  which covers the remaining 80% over a fixed 400ms, however fast the
  scroll, and cannot be reversed once it starts.
- Scrolling up, the opposite: it expands slowly with the finger for the
  first few pixels, returns to compact if you stop there, and past that
  expands over the same fixed 400ms. This starts on the first pixel up,
  not after a dead distance, because the browser's own bottom bar
  animates at that same moment and a bar that is already moving reads
  better than one that jumps later.
- A gesture that starts during a return takes it over from wherever it
  has got to. A gesture during the second stage changes nothing.
- The finger never moves the bar beyond its 20% in one stage, however
  large a frame's travel, so the timer always has the same 80% to
  cover.

**The header appears on the velocity of a scroll up, not its distance.**
At the top of the page it is an ordinary element in the flow and
scrolls off with the content. Once it is fully off, a scroll up at
flick speed (15px a frame held for three frames, roughly 900px a
second) pins it and slides it in over the content in 280ms. You can
scroll up forever with the bar expanded and never see it if you do not
scroll fast. Once up it stays until 8px of scroll down, which slides it
out in 320ms and unpins it. Reaching the top of the page returns it to
the flow from any state, so an overscroll bounce carries it with the
content.

**Everything moves by transform or opacity, one number for the bar.**
Nothing in the shell changes layout or scrolls the page. The bar's
compaction is one number, `--shell-nav`, that the driver writes every
frame of a change, finger stage and timed stage alike; the glass, the
five tabs, the icons and the labels all derive from it.

**The bar's bottom offset** is the safe-area inset, or 16px above the
browser's toolbar. On Safari 26 for iPhone, stamped before first paint,
it is 8px when Safari reports no inset, because Safari ends its layout
viewport short of its floating bar. No transition on the offset.

**Reduced motion** switches every state without animation.

## Evidence

### 1. Programmatic scrolls land late on iOS

The first build collapsed the header's slot as it hid and called
`scrollBy` for the same distance in the same frame, so nothing on screen
would move. Two colleagues on iOS saw the header pop back in mid-scroll
and a jump; the owner reproduced it with an overscroll at the top of the
page followed by a scroll down. While iOS is running its own scroll
animation (a momentum coast in Chrome, the overscroll bounce in Safari)
a programmatic scroll is applied late: the collapse showed as a jump,
and when the shift landed it read as an upward delta that revealed the
header. Rule since: nothing in the shell changes layout or scrolls the
page while it moves.

### 2. Instagram, measured

Five screen recordings by the owner (iOS, 60fps). The first two were
read frame by frame; the last three were analysed per frame with a
pixel row through the bar's icons for its width, a content column
cross-correlated frame to frame for scroll displacement, and the
wordmark region for the header. Recording px are 0.68 CSS px.

- **At the top of the feed the header is in flow** and scrolls off with
  the content.
- **Mid-feed the header is an overlay** that slides in at a fixed
  speed. In a fast flick the feed changes completely between frames
  while the header takes the same few frames to arrive as in a slow
  one, and the post's caption shows through the half-arrived bar. The
  content is not attached and is not pushed. (The mock that settled the
  spec had offered "page moves with the header" as Instagram's model;
  it is not, and the page-offset bookkeeping that model needed went
  with it.)
- **The header is speed-triggered.** Scrolls peaking at 3 recording px
  a frame never revealed it however far they went; it appeared on runs
  of 8 to 13 px a frame, three times. Ours is set well above that range
  after a first setting at its bottom (5 CSS px a frame, two frames)
  revealed on nearly every real scroll and collided with the bar's
  expansion.
- **Expansion on a slow scroll up** starts after 65 to 100 recording px
  of travel and runs about 200ms at a fixed speed, the same on a slow
  and a medium scroll. Ours starts on the first pixel instead, for the
  browser-bar reason above, and runs 400ms.
- **Contraction is two-stage.** About 10% of the bar's change tracks
  the first 15 px of downward travel 1:1, then the remaining 90% runs
  about 230ms with the finger still, and that stage does not reverse.
  A nudge and a stop changes nothing in the end.

### 3. Why the header is never driven from scroll events

The spec's "attached" phase moved the header with the page 1:1 for the
first 32px by setting its transform on each scroll event. On iOS the
compositor scrolls a frame before that runs, so the header visibly
lagged and caught up every frame. Colleagues called it jiggle. Only an
element the browser moves itself (in flow) or an animation with its own
clock (the overlay reveal) is free of it.

### 4. Why the bar animates by transform, and why the driver writes every frame

The pill's first compaction transitioned height, insets and widths.
Those run on the main thread, which is busy during a scroll, so the
pill visibly lagged the header's compositor-driven transform. The pill
became a scaled glass layer, the tabs slide towards the centre by 12%
of their own width per step from the middle (exactly the layer's scale
about its centre), the icons recentre by a transform and the labels
fade.

The timed stage was then a CSS transition on a registered custom
property on `<html>`. Chrome interpolated everything derived from it.
Safari interpolated the transforms but resolved the labels'
`opacity: calc(1 - var(...))` straight to its end value, so the text
popped in fully while the pill was still narrow (the owner's
recordings, Safari against Chrome). The driver now writes the number
every frame of the timed stage as well, an eased rAF loop, with no
transition or registration, and both browsers render the same frames.

### 5. Safari's layout viewport and the bar's bottom offset

Measured with `?probe` on the owner's iPhone (screen 874 CSS px), iOS
26. `viewport bottom` is the layout viewport's bottom edge; "chrome" is
the top of the browser's own bar. All CSS px.

| Browser and state                              | Inset | Viewport | Viewport to chrome |
| ---------------------------------------------- | ----- | -------- | ------------------ |
| Safari, top address bar layout, bar expanded   | 0     | 660      | ~14                |
| Safari, top address bar layout, collapsed      | 34    | 768      | home indicator     |
| Safari, compact layout, expanded               | 0     | 714      | ~17                |
| Safari, compact layout, collapsed              | 0     | 754      | ~30 to mini pill   |
| Safari, bottom address bar layout, expanded    | 0     | 654      | ~28                |
| Safari, bottom address bar layout, collapsed   | 0     | 754      | ~30 to mini pill   |
| In-app Safari view (Slack link), expanded      | 0     | 682      | 0                  |
| In-app Safari view, collapsed                  | 0     | 787      | screen edge, 0     |
| Chrome, expanded                               | 0     | 684      | 0                  |

- A pill 16px above the viewport is 16px above Chrome's toolbar and
  30 to 44px above Safari's floating bar. The difference is Safari's own
  margin between its viewport and its bar; no inset reports it, and
  `viewport-fit=cover` applied at runtime changed none of the numbers.
- Safari 26 freezes the OS number in its user agent (`iPhone OS 18_7`
  on an iOS 26 phone). Its `Version/26.0` token is the reliable signal;
  CSS anchor positioning is the feature fallback.
- The in-app Safari view sends Safari's exact user agent and ends its
  viewport at its toolbar, so any correction Safari gets, it gets too.
  Hence 8px rather than the 2px that would match Chrome inside Safari:
  Safari's layouts land 22 to 36px above their bar, the in-app pill 8px
  above its toolbar, nothing touches.
- Collapsed, the in-app view runs the viewport to the screen edge with
  a zero inset, so the pill sits over the home indicator. Safari's
  misreport, unfixable from CSS, noted so nobody chases it.
- iOS 18 and earlier keep the plain 16px on the assumption that their
  flat toolbar ends the viewport at its own edge, unverified for want
  of a device.
- In the top-address-bar layout Safari moves a fixed element with its
  viewport as its bar animates and switches the inset in one step at
  the end. A transition on the offset to soften that step was tried and
  reverted: during a slow scroll up Safari changes what it reports in
  small steps with every nudge, and the transition turned each into a
  lagging bob. The offset follows Safari's steps instantly; the pill
  only ever moves when Safari moves it.

## Taking a measurement

Run the playground (`pnpm dev`, served on the LAN so a phone can open
it) and open `/discover?probe` on the phone. The panel reports the
browser and its user agent, whether the Safari stamp fired, the
safe-area insets, the layout and visual viewport heights, and where the
pill's bottom edge sits against the viewport's. Screenshot with the
browser's bar expanded and again after a scroll has collapsed it.
`?probe=cover` applies `viewport-fit=cover` first.
