# ADR-0001: Sites install with pnpm, and preview unreleased work by commit

**Status: accepted (2026-09-28).** Amends the consumption rules of
ADR-0012 in `0gfoundation/0g-hub`, which created this repository.

## Context

A change to the shell is two pull requests: one here that adds the
capability, one in the site that uses it. The site's has to build before
this one merges. A reviewer needs its Vercel preview to render the new
header, and CI has to typecheck against the API the site calls. Both need
a version of this package that has no release yet.

ADR-0012 took the consumption pattern from `@0gfoundation/0g-market-data`
(ADR-0011): a git dependency pinned to a release tag, cloned with a
fine-grained Contents-read token mapped into each consumer's clones. For
the unreleased half of a two-repo change, this repository's `AGENTS.md`
said the site "pins by sha, then by tag before merge".

That rule held for one consumer. The dependency string ends in
`&path:packages/0g-ui`, a pnpm extension. The hub is pnpm. `0g-site` was
npm, which ignores the fragment and installs this repository's root
package, `private`, version `0.0.0` and exporting nothing, without an
error. It surfaced as a module-not-found in `0g-site#51`.

GitHub Packages looks like the way round it, and was tried again while
diagnosing that. It is not. Its npm registry only accepts classic
personal access tokens from outside Actions, and the org forbids classic
tokens. Fine-grained tokens have no Packages permission and App
installation tokens are refused (0g-hub#308, verified 2026-09-10). No
Vercel build can read it.

## Decision

### 1. Every site is pnpm and installs the package from git

The ADR-0012 pattern, unchanged, for every consumer:

```json
"@0gfoundation/0g-ui": "git+https://github.com/0gfoundation/0g-ui.git#0g-ui-v0.2.0&path:packages/0g-ui"
```

A site on npm moves to pnpm first, as `0g-site` did (`0g-site#52`). The
lockfile imports from `package-lock.json` with every resolved version
unchanged, and Vercel reads the pnpm version from `packageManager` with
no project setting.

No tag is published to a registry. A site installs from git, and that is
the only install path.

### 2. Unreleased work is pinned by commit

While a pair is in flight the site pins this PR's head commit in place of
the tag, and stays in draft. pnpm keys a git dependency's build approval
on the resolved commit, so each repin also changes the site's
`allowBuilds` key.

`.github/workflows/pin-comment.yml` rewrites one comment on every push to
a PR here with both lines for the current head, ready to copy. It
publishes nothing.

### 3. A site cannot leave draft on a commit pin

Each site's CI fails when an `@0gfoundation/*` dependency is pinned to
anything but a release tag, once the PR is out of draft and on `main`
(`scripts/check-shared-pins.mjs` in `0g-site`). The commit on a PR here
is not what ships. The squash-merge makes a new commit, often with
review changes the pinned one lacks, and a sha says nothing about which
release the site runs.

The order is fixed: the PR here opens, the site pins its commit and gets
a working preview, this merges and is tagged, the site repins to the tag
and leaves draft.

## Consequences

- A site's preview renders unreleased shell work, which is what this is
  for. `0g-site#51` was the first, pinned to 0g-ui#2.
- Every install clones this repository and runs `prepare`, which builds
  `dist`. Slower than a prebuilt tarball, and the price of a registry the
  sites cannot reach.
- A consumer's `allowBuilds` key churns with every repin. `pnpm install`
  prints the one it wants, and the PR comment carries it.
- Each site needs `GH_PACKAGES_TOKEN`, fine-grained, Contents read on this
  repository, in CI and on its hosting project. Despite the name it is a
  clone token (0g-hub#465). No longer true since 2026-10-03: this
  repository is public and clones without a token. A site keeps the token
  only for another private dependency (the hub's `0g-market-data`).
- A site stack that cannot use pnpm, if one appears, has no way to install
  this package and needs its own decision.
