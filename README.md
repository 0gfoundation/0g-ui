# 0g-ui

`@0gfoundation/0g-ui`, the shared 0G site shell (ADR-0012 in
`0gfoundation/0g-hub`): the header, the phone tab bar and their scroll
behaviour, the footer and the buttons, with the tokens they read and the
theme mechanism as an optional entry. One design and one behaviour on
every 0G site, each site with its own colours, menu, title and lockup.

- `packages/0g-ui/` — the package ([README](packages/0g-ui/README.md))
- `playground/` — a Vite page that renders the shell over sample items,
  where the phone measurements are taken
- `docs/spec/phone-shell-measurements-2026-09-21.md` — what the phone
  shell does on scroll and the evidence for each rule
- `consumers.json` — the sites that install the package, and where each
  keeps its manifest
- `tools/consumer-diff/` — what a change does to each of those sites

## Working on it

```bash
pnpm install --frozen-lockfile
pnpm dev          # the playground on http://localhost:5173, also on the LAN
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

The playground renders the package's sources, aliased in, so a change
shows without a build, through the Tailwind source entry as a Tailwind
host would. `?css=compiled` runs it on the compiled `shell.css` instead
(the path for a host without Tailwind, built by `pnpm build` or the
package's `prepare` script), and `/compare` renders both side by side
at phone and desktop widths with a diff of every computed style in the
header and the tab bar.

### Measuring the phone shell

Open the playground on a phone over the LAN, at
`http://<your-ip>:5173/discover?probe`. The panel reports the browser,
whether the Safari stamp fired, the safe-area insets, the layout and
visual viewport heights and where the pill's bottom edge sits. Screenshot
with the browser's bar expanded and again after a scroll has collapsed
it. `?probe=cover` applies `viewport-fit=cover` first. The numbers to
compare against, and why each rule is what it is, are in the
measurements document.

## What a change does to the sites

Each site pins a release, so nothing here reaches it until it repins. The
consumer diff says what it will see when it does. On every PR it reads
each site's manifest from the site's own repository, renders that site
from the PR's merge result and from its base the way the site imports
the package, and comments with the difference:

- the header's, tab bar's and footer's markup, as a diff
- screenshots of every state at phone and desktop widths in each of the
  site's themes: the page top, after a scroll, each nav group's panel,
  the phone menu and each group in it, and the footer whole at phone,
  tablet and desktop widths. Base, head and pixel-diff images
  of every state that changed are in the run's artifact
- the change in the gzipped JS and CSS the site's page ships
- the change in the package's declarations

It never fails a PR. A difference is information: the PR should mean
every one. Run it locally with `pnpm consumer-diff` (the working tree
against `origin/main`) or `pnpm consumer-diff --head <ref>`.

A PR that touches none of `packages/0g-ui`, the lockfile,
`consumers.json` or `tools/consumer-diff`, Markdown aside, cannot change
what a site receives, so CI skips the render and the comment says so. States are
shot four at a time, each as soon as the page stops moving, so a full
run spends most of its time installing and building, not rendering.

It sees what a site passes the shell, not the site's own code meeting
it: its CSS beside the entry, its types, its build. Building each site
against a PR is #4, for when there are more sites than one person checks
by hand.

### The manifest

`consumers.json` only lists the sites: repository, the ref to read, and
the path of the site's manifest. Everything about a site's shell lives
in the site, in a TypeScript module that exports `manifest`:

```ts
export const manifest = {
  css: "tailwind.css",                 // or "shell.css" for a host without Tailwind
  themes: ["light", "dark"],           // "dark" only if something stamps data-theme
  messages: { file: "messages/en.json", namespace: "nav" }, // optional: labels are keys in it
  header: { navLabel, items, width, menu, product },  // what the site's header passes the shell
  tabBar: { label },                   // if it renders the phone tab bar
  footer: {                            // if it renders SiteFooter
    changes: { remove: ["faucet"], add: { build: [{ id, label, href }] } }, // vs the shared content
    newsletter: true,                  // whether it has the signup
    origin: "https://0g.ai",           // its shared links on this origin are in-app paths
    labels: { namespace: "footer" },   // optional: its strings by id, in `messages`
  },
  fixture: {                           // for the diff alone
    path: "/swap",                     // the page it stands on, for the active entry
    logo: { label, width, height },    // the site's own lockup as a block its size, unless header.product
    title, controls, layout, hostCss,  // controls as sized stubs, CSS that reaches the shell
    footerBackground: "linear-gradient(…)", // a stand-in for the footer's art
  },
} as const;
```

The site's header reads `header` and `tabBar` from this module, and its
footer reads `footer`, so what the diff renders is what the site
renders, and nothing can drift. The footer's links, socials and legal
row are not in it: they are the package's shared content
(`footer-content.ts`), and a manifest states only how the site differs,
by id. Icons
are named by their export (`"DiscoverIcon"`). The diff fetches the file
and evaluates it on its own, so it may import types and nothing else.
`fixture` is the one part the site keeps by hand: when its lockup,
controls or CSS change, it changes there, in the same PR.

The hub's is `src/components/shell/0g-ui.manifest.ts` and 0g-site's is
`src/components/0g-ui.manifest.ts`. A new site adds a manifest and a row
in `consumers.json`, and `GH_CONSUMERS_TOKEN` (a fine-grained token with
Contents read on each listed repository, in this repository's Actions
secrets) gains the new repository. A site that cannot be read shows in
the comment as not read, and the rest still run.

To see a site change before it merges, read its manifest from a branch
or a checkout:

```bash
pnpm consumer-diff --site hub=my-branch
pnpm consumer-diff --local hub=../0g-hub
```

## Releasing

Bump `version` in `packages/0g-ui/package.json`, merge to `main`, then
tag `0g-ui-v<version>`. The sites pin the tag as a git dependency, with
pnpm:

```json
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.1.0&path:packages/0g-ui"
```

The tag also publishes to GitHub Packages, but no site installs from
there: the registry needs a classic token outside Actions, and the org
forbids them (0g-hub#308). What a consumer needs, pnpm and a clone token
and a build approval, is in [the package's README](packages/0g-ui/README.md).

### A change that spans this repo and a site

Two pull requests, and the site's has to build before this one merges.
Every push to a PR here rewrites a comment on it with the line that pins
its head commit and the `allowBuilds` key pnpm wants for it. The site
pins that in draft, and its preview renders the unreleased shell.

The order is: open the PR here, the site pins its commit, this merges and
is tagged, the site repins to the tag and leaves draft. The site's CI
rejects a commit pin out of draft. `docs/adr/0001-previewing-unreleased-shell-work.md`
has the reasoning.
