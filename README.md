# 0g-ui

`@0gfoundation/0g-ui`, the shared 0G site shell (ADR-0012 in
`0gfoundation/0g-hub`): the header, the phone tab bar and their scroll
behaviour, with the tokens they read and the theme mechanism as an
optional entry. One design and one behaviour on every 0G site, each site
with its own colours, menu, title and lockup.

- `packages/0g-ui/` — the package ([README](packages/0g-ui/README.md))
- `playground/` — a Vite page that renders the shell over sample items,
  where the phone measurements are taken
- `docs/spec/phone-shell-measurements-2026-09-21.md` — what the phone
  shell does on scroll and the evidence for each rule

## Working on it

```bash
pnpm install --frozen-lockfile
pnpm dev          # the playground on http://localhost:5173, also on the LAN
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

The playground renders the package's sources, aliased in, so a change
shows without a build. `pnpm build` is what proves `dist`.

### Measuring the phone shell

Open the playground on a phone over the LAN, at
`http://<your-ip>:5173/discover?probe`. The panel reports the browser,
whether the Safari stamp fired, the safe-area insets, the layout and
visual viewport heights and where the pill's bottom edge sits. Screenshot
with the browser's bar expanded and again after a scroll has collapsed
it. `?probe=cover` applies `viewport-fit=cover` first. The numbers to
compare against, and why each rule is what it is, are in the
measurements document.

## Releasing

Bump `version` in `packages/0g-ui/package.json`, merge to `main`, then
tag `0g-ui-v<version>`. The tag publishes the package to GitHub Packages
and is what the sites pin as a git dependency, `0g-market-data` style:

```
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.1.0&path:packages/0g-ui"
```

The package's `prepare` script builds `dist` on a git install. A private
repository of the org needs a Contents-read token mapped into the
consumer's CI and hosting clones, the way the hub maps
`GH_MARKET_DATA_TOKEN`.
