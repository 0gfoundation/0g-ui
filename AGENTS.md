# 0g-ui

The shared 0G site shell as a package, `@0gfoundation/0g-ui`. Born from
`0gfoundation/0g-hub` ADR-0012 (read it first: `docs/adr/0012-shared-site-shell.md`
there, work in hub issue #457). The hub is one consumer; `0g-site` is the
next.

## Boundary

The package ships the header's layout, the desktop text nav, the phone
tab bar with its icons, the scroll behaviour, the `.shell-*` CSS with the
tokens it reads, and the theme mechanism as its own entry. A consumer
passes its lockup, its nav items and its controls as props and its labels
as strings, and reads `Link` and `pathname` from `ShellProvider`. Nothing
in the package knows about wallets, chains, prices, analytics or fonts.

Three rules keep it portable (ADR-0012 §2):

- No framework import in the package. `eslint.config.mjs` forbids `next`,
  `next-intl`, `react-router` and `@docusaurus` under `packages/0g-ui/src`.
  Peer `react >=18`, nothing newer than `useEffect` and
  `useSyncExternalStore`.
- Two CSS entries, one per host kind, never both (ADR-0012 §2 as
  amended 2026-09-26, 0g-hub #463). A Tailwind 4 host imports
  `src/tailwind.css` after its own `@import "tailwindcss"`: tokens as
  `@theme default`, the `dark` variant, the base-layer defaults scoped
  under `.shell-header` and `.shell-nav`, the behaviour CSS, and an
  `@source` for the shipped `dist`, so the host generates the utilities
  itself. A host without Tailwind imports `dist/shell.css`, which the
  Tailwind CLI compiles from `src/shell.source.css`: Tailwind's theme
  inlined and its utilities over that same entry, no preflight. The
  compiled file beside a host's own Tailwind output duplicates
  utilities, and the minifier merges each pair at the later position.
  Measured geometry is pixel values (`h-[60px]`), never the spacing
  scale. No hand-named styling classes and no prefix, so one JSX serves
  both entries.
- Theming is token override. The defaults are the 0G tokens, dark keyed
  on `[data-theme="dark"]`. A site redefines `--color-brand-900` and
  friends on `:root`. Colours are never props.

## Layout

- `packages/0g-ui/src/shell/` — the shell, moved from the hub's
  `src/shell/` at `50a661b` unchanged: `site-header.tsx`, `top-nav.tsx`,
  `tab-bar.tsx`, `icons.tsx`, `items.ts`, `provider.tsx`, `scroll.ts` (the
  reducer, tested), `scroll-driver.tsx` (the one listener),
  `bootstrap.ts` (the Safari stamp), `shell.css` (the behaviour),
  `nav-dropdown.tsx` (a group's desktop panel), `mobile-menu.tsx` (the
  phone menu for a site with no tab bar), `glyphs.tsx` (their stroke
  marks), and
  `theme/` (the `./theme` entry: bootstrap string, hook, `ThemeButton`)
- `packages/0g-ui/src/tailwind.css` — the Tailwind source entry: the
  tokens, the `dark` variant, the shadow routing, the base-layer
  defaults, the behaviour CSS, the `@source` for `dist`
- `packages/0g-ui/src/shell.source.css` — the compiled file's input:
  Tailwind's theme and utilities over `tailwind.css`
- `packages/0g-ui/tsdown.config.ts` — the JS build, unbundled so every
  module keeps its own `"use client"`
- `playground/` — a Vite page that renders the header and tab bar over
  sample items and content, the package's sources aliased in, where the
  phone measurements are taken (`?probe`). It runs on the source entry
  as a Tailwind host, or on the compiled file with `?css=compiled`;
  `/compare` shows both and diffs every computed style in the shell
- `docs/spec/phone-shell-measurements-2026-09-21.md` — what the phone
  shell does and the evidence for each rule, moved with the behaviour

## Laws

- `strict` stays on. CI runs typecheck, lint, tests and the build on
  every PR.
- The scroll behaviour is measured, not designed: a change to
  `scroll.ts`, `scroll-driver.tsx` or `shell.css` re-runs the phone probe
  against the measurements document, iOS Safari included, before it
  merges.
- Nothing in the shell changes layout or scrolls the page while it
  moves: transforms and opacity only (the document's §1).
- The tokens the shell reads are the documented set in
  `shell.source.css` and nothing else.
- A visual change is a package release plus a tag bump in each site.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev          # the playground, on the LAN so a phone can open it
pnpm typecheck · pnpm lint · pnpm test · pnpm build
```

`pnpm build` emits `packages/0g-ui/dist` (JS, declarations, `shell.css`)
and builds the playground. The package's `prepare` script runs the same
build, so a git install of the package (what the sites do) gets `dist`.

## Release

Bump `version` in `packages/0g-ui/package.json`, merge, tag
`0g-ui-v<version>` on `main`. The tag publishes to GitHub Packages
(`.github/workflows/publish.yml`), but the sites pin the tag as a git
dependency, with pnpm:
`git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v<version>&path:packages/0g-ui`.
Never propose GitHub Packages as a site's install source: its registry
needs a classic token outside Actions and the org forbids them
(0g-hub#308). And never an npm consumer: `&path:` is pnpm-only, and npm
installs the wrong package without an error. `packages/0g-ui/README.md`
under Install has the clone token and the `allowBuilds` key a consumer
needs.

A change that spans this repo and a site is two PRs, and the site's has
to build first. The site pins this PR's head commit in draft, this
merges and is tagged, the site repins to the tag and leaves draft.
`.github/workflows/pin-comment.yml` keeps a comment on each PR with the
pin line and `allowBuilds` key for its head, and each site's CI rejects
a commit pin out of draft (`docs/adr/0001`).
