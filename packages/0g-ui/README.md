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

From GitHub Packages, where every release is published with `dist`
already built. The registry is restricted, so the scope needs a token:

```
# .npmrc
@0gfoundation:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
```

```json
"@0gfoundation/0g-ui": "0.1.0"
```

`GH_PACKAGES_TOKEN` is a personal access token (classic) with
`read:packages`. GitHub Packages' npm registry does not accept
fine-grained tokens, so the Contents-read token the hub clones with will
not do, even under the same secret name. It goes
in the consumer's CI secrets, in its hosting project's environment
variables (Vercel exposes those to the install step), and in a
developer's own shell. npm expands `${VAR}` in `.npmrc` from the
environment, so the file holds a reference and never a value.

Nothing else is needed: no clone of this repository, so no Contents
token and no `insteadOf` rewrite, and no `prepare` build on install.
npm and pnpm consumers do the same thing.

A git dependency is not an option for an npm consumer. The
`&path:packages/0g-ui` fragment the hub uses is a pnpm extension, and
npm ignores it and installs this repository's root package instead,
silently (`docs/adr/0001`).

### Unreleased work: prereleases

A site that needs shell work still in review pins a prerelease. Every
push to an open PR here publishes one, named for the PR and the run:

```json
"@0gfoundation/0g-ui": "0.2.0-pr.2.7"
```

The PR comments its own current pin line. Prereleases go out under the
`pr` dist-tag, never `latest`, and semver keeps them below the release
they are built from.

They are deleted when the PR closes, so a site repins to the released
version before it merges. Each site enforces that with a CI job that
fails on a prerelease pin once its PR is out of draft.

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
