# @0gfoundation/0g-ui

The shared 0G site shell (ADR-0012 in `0gfoundation/0g-hub`). Four
entries:

- `@0gfoundation/0g-ui/shell` — `SiteHeader`, `TabBar`, `TopNav`,
  `ShellScroll`, `ShellProvider`, the five nav icons, `SHELL_BOOTSTRAP`,
  `SiteFooter` with its shared content, `Button` and `ButtonLink`
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
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.6.1&path:packages/0g-ui"
```

The repository is public, so the clone needs no token.

pnpm is required. `&path:packages/0g-ui` is a pnpm extension, and npm
ignores it and installs this repository's root package, which exports
nothing, without an error. An npm site moves to pnpm first (`0g-site#52`
did, in one PR).

Git is the only install path. No version is published to a registry
(ADR-0001 has why).

### `prepare` builds `dist`

A git install gets the repository tree, which carries no `dist`, so the
package's `prepare` script builds it on install. pnpm asks first, and
keys the approval on the resolved commit, not the tag, so the key
changes with every repin (`pnpm install` prints the one it wants). The
repository is public, so pnpm fetches the commit as a codeload tarball
rather than cloning it, and the key names that tarball, whatever the
dependency line in `package.json` says:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  '@0gfoundation/0g-ui@https://codeload.github.com/0gfoundation/0g-ui/tar.gz/<sha>#path:packages/0g-ui': true
```

A key in the older `git+https://…#<sha>&path:packages/0g-ui` form, from
before the repository was public, keeps working for the lockfile that
recorded it, and fails the install (`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`)
on the next repin.

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
  <SiteHeader product="Hub" items={items} navLabel="Main" controls={<Controls />} />
  <main>…</main>
  <TabBar items={items} label="Main" />
  <ShellScroll />
</ShellProvider>;
```

The lockup is the package's: the 0G mark, and with `product` a divider
and the product's name (Hub 2026, `302:12752` and `302:12702`). Without
`product` it is the mark alone. It links to `/` through the provider's
`Link`, named "0G Hub" with a product and "0G" without, and takes its
desktop size (mark 64×31, name 16/22) wherever the bar is, so it moves
with `collapse`. On phones the mark is 48×23 and the name 14/20, with no
divider. The divider reads `--color-lockup-rule`. A site with a lockup of
its own passes `logo`, which wins over `product`. The default is
exported as `Lockup` (`<Lockup product="Hub" />`) for a site that wraps
it.

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
- `menu` adds a round menu button below lg (or md, see `collapse`) that
  opens the same items full screen as a modal dialog: groups are
  disclosures with their section headings and the links as titles only
  (descriptions and secondary links stay in the desktop panels), `aside`
  follows the list, `footer` stays at the bottom over a hairline. It
  locks the page's scroll, keeps focus inside, and closes on navigation,
  a followed link, Escape, and when the viewport reaches the bar. It is
  portalled to `<body>`, hence the `react-dom` peer.
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

Without groups, `menu`, `width` or `collapse`, and with `logo`, the
header renders exactly as in 0.1.0.

### The footer

`SiteFooter` is one layout at three widths, the same on every 0G site:
the design's 300px row from lg; on tablets every column in one row, then
on the same grid the newsletter under the first column and the socials
under the first of the right half; on phones the
columns in pairs, as equal halves with the right one never under the
172px four social boxes need (a column with `phone: false`, Enterprise,
is left out there). The columns, socials and legal row are shared content in
the package (`FOOTER_CONTENT`, `footer-content.ts`); a site states only
how its footer differs:

```tsx
import { SiteFooter } from "@0gfoundation/0g-ui/shell";
import { manifest } from "./0g-ui.manifest";

<SiteFooter
  logo={<Logo />}                                   // the site's lockup
  changes={manifest.footer.changes}                 // { remove, add, columns, socials }
  newsletter={{ endpoint: "https://0g.ai/api/newsletter" }}
  origin="https://0g.ai"                            // its own links render in-app
  labels={labels}                                   // its strings by id, if translated
  background={<Landscape />}                        // art behind it, if any
  before={<BackToTop />}                            // slots: above the links,
  after={undefined}                                 // and above the legal row
/>;
```

- Every column, link and label has a stable `id` beside its English
  text. `changes.remove` goes by id (a social's is `socials.<network>`),
  `changes.add` appends links to a shared column by its id,
  `changes.columns` and `changes.socials` append the site's own.
  `checkFooterChanges` reports an id that does not exist, and the
  consumer diff runs it on every site.
- `labels` maps ids to the site's strings (the hub's translations), the
  ids of `FOOTER_LABELS` and of any column or link; English where absent.
  The entity, "Zero Gravity Labs Inc.", is not translated.
- The newsletter posts `{ email }` as JSON to `endpoint` and reads
  `{ ok }` and the status, the contract of 0g.ai's `/api/newsletter`,
  the one list. It says "signed up" only for a signup the server
  accepted, and words a refusal by status in the site's `labels`.
  Without `newsletter` the footer has none.
- Each submit ends in one `NewsletterOutcome` (`done`, `invalid`,
  `limited`, `closed`, `failed`), dispatched on `window` as a
  `NEWSLETTER_EVENT` (`"0g-ui:newsletter"`) whose detail is
  `{ outcome }`. A site counts signups from a client component of its
  own, since `SiteFooter` is a server component and no callback prop
  reaches the form:

  ```tsx
  useEffect(() => {
    const onOutcome = (e: CustomEvent<NewsletterEventDetail>) => track("newsletter", e.detail);
    window.addEventListener(NEWSLETTER_EVENT, onOutcome);
    return () => window.removeEventListener(NEWSLETTER_EVENT, onOutcome);
  }, []);
  ```

  The detail is the outcome and nothing else. Never add the address to
  what a listener sends.
- Shared links are absolute, since the hub links to 0g.ai's pages; one on
  `origin` renders as an in-app path through the provider's `Link`, the
  rest open in a new tab.
- The surface is token override, a token per element the designs colour
  on their own: `footer-title` (the newsletter heading and its replies),
  `footer-heading`, `footer-text` (links and the legal row),
  `footer-tagline`, `footer-rule`, `footer-social-line`, `footer-glyph`,
  and for the email field `field`, `field-line`, `field-placeholder`,
  `field-submit`, `field-submit-ink`, `field-submit-line`. In light they
  are the neutrals, in dark the hub's dark footer. A site redefines them
  on `.shell-footer`, never `ink` and its kin, which the slots read too.
  0g.ai sets them white over its landscape:

  ```css
  .shell-footer {
    --color-footer-title: #ffffff;
    --color-footer-heading: #ffffff;
    --color-footer-text: #ffffff;
    --color-footer-tagline: #ffffff;
    --color-footer-rule: #ffffff;
    --color-footer-social-line: #dcdfe4;
    --color-footer-glyph: #ffffff;
  }
  ```

  A different arrangement is a named option in a release, never a
  `className`.

A server component: its links and the form are the client pieces.

### Buttons

`Button` (a `<button>`, `type="button"` by default) and `ButtonLink` (an
in-app path through the provider's `Link`, or `external`) draw the
design's pills: `variant` `"primary"` (black) or `"secondary"` (white
with a hairline), `size` `"default"` (48px), `"small"` (32px) or `"adaptive"` (32px below md, 48px from md, as 0g.ai draws its pills), `round`
for an icon-only circle of the same height (give it an `aria-label`),
`fullWidth` to fill a container. The height is fixed and the content
centred, so a button never resizes when its label becomes a spinner.
`buttonClasses(look)` returns the classes for an element of the host's
own. No `className`: a new look is a named option here.

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
`.shell-header`, `.shell-nav`, `.shell-menu`, `.shell-footer` and
`.shell-button`, a no-op beside preflight. The shell
inherits the body's font.

The tokens it reads, with the 0G values as defaults and the dark values
keyed on `[data-theme="dark"]`: `--color-brand-900`, `--color-brand-500`,
`--color-bg`, `--color-ink`, `--color-line`, `--color-lockup-rule`,
`--color-control`, `--color-control-hover`, `--color-on-control`, `--color-glass`,
`--color-glass-line`, `--shadow-glass`, the neutrals the footer and
buttons read, `--color-ink-soft`, `--color-ink-muted`, `--color-hairline`,
`--color-hairline-strong`, `--color-on-ink`, the footer's surface,
`--color-footer-title`, `--color-footer-heading`, `--color-footer-text`,
`--color-footer-tagline`, `--color-footer-rule`,
`--color-footer-social-line`, `--color-footer-glyph`, `--color-field`,
`--color-field-line`, `--color-field-placeholder`, `--color-field-submit`,
`--color-field-submit-ink`, `--color-field-submit-line`, and for the groups and the
phone menu only `--color-nav-title`, `--color-nav-title-hover`,
`--color-nav-muted`, `--color-nav-heading`, `--color-nav-line`,
`--color-nav-chevron`, `--color-nav-link-hover`, `--shadow-nav-panel`.
Four of those are aliases: `nav-muted`, `nav-heading`, `nav-line` and
`nav-chevron` are `ink-muted`, `ink-soft`, `hairline` and
`hairline-strong` under the panels' names, so a site that redefines a
neutral moves both, and one that redefined a `nav-*` value still wins. A site with its own colours
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
