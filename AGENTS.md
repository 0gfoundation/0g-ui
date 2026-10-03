# 0g-ui

The shared 0G site shell as a package, `@0gfoundation/0g-ui`. Born from
`0gfoundation/0g-hub` ADR-0012 (read it first: `docs/adr/0012-shared-site-shell.md`
there, work in hub issue #457). The sites that install it are listed in
`consumers.json`.

## Boundary

The package ships the header's layout, the desktop text nav, the phone
tab bar with its icons, the scroll behaviour, the footer with the content
every site's footer shares, the pill buttons, the `.shell-*` CSS with the
tokens it reads, and the theme mechanism as its own entry (0g-ui#9 added
the footer and buttons, once the hub became the footer's second site). A
consumer names its product for the default lockup (or passes its own),
passes its nav items and its controls as props and its labels as strings, states how its footer differs from the shared one,
and reads `Link` and `pathname` from `ShellProvider`. Nothing
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
  marks), `site-footer.tsx` (the footer's three layouts),
  `footer-content.ts` (its shared content and how a site's changes apply),
  `footer-link.tsx`, `newsletter-form.tsx` and `social-glyphs.tsx` (its
  pieces), `button.tsx` (the pills), `lockup.tsx` (the header's default
  lockup), and
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
- `consumers.json` — every site that installs the package: its repo, the
  ref to read, and the path of its manifest. Nothing about a site's header
  is copied here
- `tools/consumer-diff/` — reads each site's manifest from the site's
  repository (`gh`, or `GH_CONSUMERS_TOKEN` in CI), renders the site from
  two builds of the package and reports what changes for it: the header's
  and tab bar's markup, screenshots of every state, the gzipped JS and
  CSS, the declarations. `.github/workflows/consumer-diff.yml` posts it on
  every PR. The manifest's shape is `Manifest` in `src/registry.ts`, and
  the README has it annotated

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
- A site's shell config lives in its manifest, in the site's repository,
  and its header and footer read from it. Content every site shares may
  live here, as data with a stable id on each entry: the footer's columns,
  socials and legal row (`footer-content.ts`). One site's content may
  not: never copy a site's nav, its own links or labels, or its CSS into
  this repository. A site states how it differs from the shared content
  in its manifest (`footer.changes`), by id. A site that adopts the package adds a manifest
  and a row in `consumers.json`, and `GH_CONSUMERS_TOKEN` gains read on
  its repository. A change to the manifest's shape is a change to every
  site's manifest, so it lands in `registry.ts` with the sites' PRs.
- A manifest imports types and nothing else. The diff evaluates it on
  its own, with no site dependencies installed.
- Read the consumer diff's comment before merging. A difference is not a
  failure, but every one should be one the PR meant.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev          # the playground, on the LAN so a phone can open it
pnpm typecheck · pnpm lint · pnpm test · pnpm build
```

`pnpm build` emits `packages/0g-ui/dist` (JS, declarations, `shell.css`)
and builds the playground. The package's `prepare` script runs the same
build, so a git install of the package (what the sites do) gets `dist`.

```bash
pnpm consumer-diff                     # the working tree against its merge base with origin/main
pnpm consumer-diff --head <ref>        # a branch or commit instead of the working tree
pnpm consumer-diff --only hub --images all   # every state's picture, to check a manifest
pnpm consumer-diff --site hub=<branch>       # a site's manifest from a branch not yet merged
pnpm consumer-diff --local hub=../0g-hub     # or from a local checkout
```

The first run needs Chromium once:
`pnpm --filter @0gfoundation/0g-ui-consumer-diff exec playwright install chromium`.
The report and images land in `tools/consumer-diff/.work/report/`. The
base side builds in a throwaway worktree with its own install and is
kept until the base moves.

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
