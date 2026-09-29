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
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.3.0&path:packages/0g-ui"
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

### Groups and the phone menu (a site with no tab bar)

A site whose nav does not fit five tabs (0g.ai) passes groups among its
items and a `menu` instead of rendering a `TabBar`:

```tsx
const items: ShellNavEntry[] = [
  { href: "/product", label: "Products" },
  {
    label: "Ecosystem",
    sections: [
      { heading: "Newsroom", items: [{ href: "/blog", label: "Blog", description: "…" }] },
    ],
  },
];

<SiteHeader
  logo={<Logo />}
  items={items}
  navLabel="Main"
  width="grow"
  controls={<Buttons />}
  menu={{ label: "Menu", closeLabel: "Close menu", aside: <Socials />, footer: <Buttons /> }}
/>;
```

- A `ShellGroup` (`label` plus `sections`) renders in the bar as a
  trigger opening a panel the bar's width: one column per section under
  its optional heading, each link a title with a chevron over an
  optional `description` and an optional row of secondary `links`, a
  close button at the corner. One group is open at a time; hover opens
  it for a mouse, click and keyboard for everything else, Escape and a
  click outside close it.
- `menu` adds a round menu button below lg that opens the same items as
  a modal dialog over the dimmed page, as tall as its content: a sheet
  from the top on phones, a 380px card at the corner from sm. Groups
  are disclosures with their section headings, `aside` follows the list,
  `footer` closes the sheet. It locks the page's scroll, keeps focus
  inside, and closes on navigation, a followed link, Escape, a tap on
  the dimmed page, and when the viewport reaches lg. It is portalled to
  `<body>`, hence the `react-dom` peer.
- `width="grow"` keeps the drafts' 1000px bar up to their 1440px frame
  and then grows it at the drafts' proportion of the page (70%), for a
  site whose content runs full width; group panels always span the bar,
  so their edges line up. The default, `"fixed"`, is 1000px at every width.
- `collapse="md"` keeps the bar down to 768px instead of 1024px, for a
  nav that fits a tablet; the menu button, the phone scroll behaviour
  and the menu's close-on-resize all move with it, so pass the same
  value to `ShellScroll`. Between 768 and 1024 group panels show at most
  two columns. The default, `"lg"`, is the drafts'.
- `isActive` treats `/` as active on `/` alone.

Without groups, `menu`, `width` or `collapse` the header renders exactly
as in 0.1.0.

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
`.shell-header`, `.shell-nav` and `.shell-menu`, a no-op beside preflight. The shell
inherits the body's font.

The tokens it reads, with the 0G values as defaults and the dark values
keyed on `[data-theme="dark"]`: `--color-brand-900`, `--color-brand-500`,
`--color-bg`, `--color-ink`, `--color-line`, `--color-control`,
`--color-control-hover`, `--color-on-control`, `--color-glass`,
`--color-glass-line`, `--shadow-glass`, and for the groups and the phone
menu only `--color-nav-title`, `--color-nav-title-hover`,
`--color-nav-muted`, `--color-nav-heading`, `--color-nav-line`,
`--color-nav-chevron`, `--color-nav-link-hover`, `--shadow-nav-panel`. A site with its own colours
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
