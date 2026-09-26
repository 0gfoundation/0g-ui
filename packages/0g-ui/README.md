# @0gfoundation/0g-ui

The shared 0G site shell (ADR-0012 in `0gfoundation/0g-hub`). Three
entries:

- `@0gfoundation/0g-ui/shell` — `SiteHeader`, `TabBar`, `TopNav`,
  `ShellScroll`, `ShellProvider`, the five nav icons, `SHELL_BOOTSTRAP`
- `@0gfoundation/0g-ui/shell.css` — the compiled styles: the utilities
  the components use, the token defaults, the scroll behaviour
- `@0gfoundation/0g-ui/theme` — `THEME_BOOTSTRAP`, `useTheme`,
  `ThemeButton`, for a site with no theme system of its own

Peer `react >=18`. No framework import: routing and labels are the
host's.

## Install

As a git dependency pinned to a release tag (the sites cannot read
GitHub Packages outside Actions):

```json
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.1.0&path:packages/0g-ui"
```

The package's `prepare` script builds `dist` on install, so `pnpm` needs
to be allowed to build it. Also published to GitHub Packages on the same
tag for Actions consumers.

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
import "@0gfoundation/0g-ui/shell.css";

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

### CSS

`shell.css` carries its token defaults in `@layer theme`, its utilities
in `@layer utilities`, and the behaviour rules unlayered. A Tailwind
consumer imports it after its own `@import "tailwindcss"`, so the layer
order is Tailwind's. Any other consumer imports it anywhere. No
preflight is included: the element defaults the shell's own markup
needs (list, link, button, box sizing) sit in `@layer base`, scoped
under `.shell-header` and `.shell-nav`, a no-op beside preflight. The
shell inherits the body's font.

The tokens it reads, with the 0G values as defaults and the dark values
keyed on `[data-theme="dark"]`: `--color-brand-900`, `--color-brand-500`,
`--color-bg`, `--color-ink`, `--color-line`, `--color-control`,
`--color-control-hover`, `--color-on-control`, `--color-glass`,
`--color-glass-line`, `--shadow-glass`. A site with its own colours
redefines them on `:root` after the import. Colours are never props.

### Theme

One thing owns `data-theme` on a page. A site with no theme system takes
the entry whole: `THEME_BOOTSTRAP` inline, `ThemeButton` in `controls`
(with `onChange` for the site's analytics), `useTheme` for its own
settings row. The stored key is `0g.theme`. A site that already stamps
`data-theme` (Docusaurus does) skips the entry and the shell's dark
tokens key off the existing attribute.
