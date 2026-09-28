# @0gfoundation/0g-ui

The shared 0G site shell (ADR-0012 in `0gfoundation/0g-hub`). Four
entries:

- `@0gfoundation/0g-ui/shell` — `SiteHeader`, `TabBar`, `TopNav`,
  `ShellScroll`, `ShellProvider`, the five nav icons, `SHELL_BOOTSTRAP`
- `@0gfoundation/0g-ui/tailwind.css` — the styles for a host on
  Tailwind 4: imported after `@import "tailwindcss"`, the host generates
  the shell's utilities with its own
- `@0gfoundation/0g-ui/shell.css` — the same styles compiled, for a host
  without Tailwind
- `@0gfoundation/0g-ui/theme` — `THEME_BOOTSTRAP`, `useTheme`,
  `ThemeButton`, for a site with no theme system of its own

Peer `react >=18`. No framework import: routing and labels are the
host's.

## Install

As a git dependency pinned to a release tag, with pnpm:

```json
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.1.0&path:packages/0g-ui"
```

pnpm is required. `&path:packages/0g-ui` is a pnpm extension, and npm
ignores it and installs this repository's root package, which exports
nothing, without an error. An npm site moves to pnpm first (`0g-site#52`
did, in one PR).

Not from GitHub Packages, though `publish.yml` puts every tag there. Its
npm registry only takes classic personal access tokens from outside
Actions, and the org forbids them, so no Vercel build can read it
(0g-hub#308).

### The clone needs a token

This repository is private, and a workflow's own `GITHUB_TOKEN` cannot
clone a sibling repository. Every place that installs maps a
fine-grained token with Contents read on this repository into git before
the install:

```bash
git config --global url."https://x-access-token:${GH_PACKAGES_TOKEN}@github.com/".insteadOf "https://github.com/"
```

In GitHub Actions that is a step with
`GH_PACKAGES_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}`. On Vercel it goes
at the front of `installCommand` in `vercel.json`, with the token set as
an environment variable on the project. Locally your own git credentials
do the clone. The hub and `0g-site` both have it, in `ci.yml` and
`vercel.json`.

The secret is called `GH_PACKAGES_TOKEN` but holds a clone token, not a
packages one (named in 0g-hub#465, `GH_MARKET_DATA_TOKEN` before
2026-09-26).

### `prepare` builds `dist`

A git install gets the repository tree, which carries no `dist`, so the
package's `prepare` script builds it on install. pnpm asks first, and
keys the approval on the resolved commit, not the tag, so the key
changes with every repin (`pnpm install` prints the one it wants):

```yaml
# pnpm-workspace.yaml
allowBuilds:
  '@0gfoundation/0g-ui@git+https://github.com/0gfoundation/0g-ui.git#<sha>&path:packages/0g-ui': true
```

### Unreleased work: pin the PR's commit

A site that needs shell work still in review pins that PR's head commit
in place of the tag, and stays in draft. Every push to a PR here
rewrites a comment on it with the pin line and the `allowBuilds` key for
its current head.

When the PR merges and is tagged, the site repins to the tag. Each site's
CI fails on a commit pin once its PR is out of draft, because the
squash-merge makes a new commit and the pinned one is not what shipped
(`docs/adr/0001`).

## Use

```tsx
import {
  DiscoverIcon,
  ExplorerIcon,
  ShellProvider,
  ShellScroll,
  SiteHeader,
  SwapIcon,
  TabBar,
  type ShellItem,
} from "@0gfoundation/0g-ui/shell";

const items: ShellItem[] = [
  { href: "/discover", label: "Discover", icon: DiscoverIcon },
  { href: "/swap", label: "Bridge & Swap", shortLabel: "Swap", icon: SwapIcon },
  { href: "https://chainscan.0g.ai", label: "Explorer", icon: ExplorerIcon, external: true },
];

<ShellProvider Link={Link} pathname={usePathname()}>
  <SiteHeader logo={<Logo />} items={items} navLabel="Main" controls={<Controls />} />
  <main>…</main>
  <TabBar items={items} label="Main" />
  <ShellScroll />
</ShellProvider>;
```

`items` is shared by the two navs so they cannot drift: `href`, `label`,
`icon`, `external?`, `shortLabel?` for the phone tab, five at most, the
width the pill was measured for. `ShellProvider` takes the host's `Link`
and pathname; without it the shell renders `<a>` and reads
`window.location.pathname`.

Two strings go inline, first in the document's body, before anything
paints: `THEME_BOOTSTRAP` (from `./theme`, if the site takes the theme
entry) and then `SHELL_BOOTSTRAP` (the Safari stamp the phone tab bar's
bottom offset needs).

### CSS: one entry or the other, never both

A host on Tailwind 4 imports the source entry after its own Tailwind
import, in the stylesheet Tailwind builds:

```css
@import "tailwindcss";
@import "@0gfoundation/0g-ui/tailwind.css";
```

The entry carries the tokens, the `dark` variant, the base-layer
defaults, the behaviour CSS and an `@source` for the package's shipped
modules, so the host's Tailwind generates the shell's utilities beside
its own, one definition per class. The compiled file must not be
imported beside a host's Tailwind output: it puts a second copy of
`.hidden` and friends in the utilities layer, the minifier merges each
pair at the later position, and the host's `hidden md:*` elements stay
hidden (the hub's desktop footer vanished, 0g-hub #463).

A host without Tailwind imports the compiled file anywhere:

```ts
import "@0gfoundation/0g-ui/shell.css";
```

It holds the same pieces compiled: token defaults in `@layer theme`,
the utilities the components use in `@layer utilities` with Tailwind's
default theme inlined, the behaviour rules unlayered. No preflight in
either entry: the element defaults the shell's own markup needs (list,
link, button, box sizing) sit in `@layer base`, scoped under
`.shell-header` and `.shell-nav`, a no-op beside preflight. The shell
inherits the body's font.

The tokens it reads, with the 0G values as defaults and the dark values
keyed on `[data-theme="dark"]`: `--color-brand-900`, `--color-brand-500`,
`--color-bg`, `--color-ink`, `--color-line`, `--color-control`,
`--color-control-hover`, `--color-on-control`, `--color-glass`,
`--color-glass-line`, `--shadow-glass`. A site with its own colours
redefines them in its own `@theme` or on `:root`; the package's are
`@theme default`, so the site's win whatever the import order. Colours
are never props.

### Theme

One thing owns `data-theme` on a page. A site with no theme system takes
the entry whole: `THEME_BOOTSTRAP` inline, `ThemeButton` in `controls`
(with `onChange` for the site's analytics), `useTheme` for its own
settings row. The stored key is `0g.theme`. A site that already stamps
`data-theme` (Docusaurus does) skips the entry and the shell's dark
tokens key off the existing attribute.
