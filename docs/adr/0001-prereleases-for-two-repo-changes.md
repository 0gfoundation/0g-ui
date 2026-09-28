# ADR-0001: Consumers install from the registry, and a PR publishes a prerelease

**Status: accepted (2026-09-28).** Amends the consumption rules of
ADR-0012 in `0gfoundation/0g-hub`, which created this repository.

## Context

A change to the shell is two pull requests: one here that adds the
capability, one in the site that uses it. The site's PR has to build. A
reviewer needs its Vercel preview to render the new header, and CI has
to typecheck against the API the site is calling. Both need a version of
this package that does not exist yet, because it is still in review.

ADR-0012 took the consumption pattern from `@0gfoundation/0g-market-data`
(ADR-0011): a git dependency pinned to a release tag, with a
Contents-read token mapped into each consumer's clones. For the unreleased
half of a two-repo change, this repository's `AGENTS.md` said the site
"pins by sha, then by tag before merge".

That rule holds for exactly one consumer. The dependency string is

```
git+https://github.com/0gfoundation/0g-ui.git#<ref>&path:packages/0g-ui
```

and `&path:` is a pnpm extension. The hub is pnpm, so it works there.
`0g-site` is npm, and npm has no subdirectory support for git
dependencies at all: it ignores the fragment and installs the repository
root, which is `private`, version `0.0.0`, and exports nothing. It does
not fail. The lockfile records `"name": "0g-ui", "version": "0.0.0"` and
the first import is a module-not-found at build time (0g-site#51).

So the escape hatch for two-repo changes existed only for pnpm
consumers, and the mechanism it hangs off was already carrying more than
it needed to: a git install clones a private repository and runs
`prepare`, which builds `dist` with the full toolchain on every
consumer, in CI and on every preview deploy.

## Decision

### 1. Consumers install from GitHub Packages, not from git

The publish workflow already puts every release on GitHub Packages, with
`dist` built. Consumers take it from there:

```
# .npmrc
@0gfoundation:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
```

```json
"@0gfoundation/0g-ui": "0.2.0"
```

`GH_PACKAGES_TOKEN` is a fine-grained token with Packages read, set as a
CI secret and as an environment variable on the hosting project. The
`.npmrc` holds a reference to it, never a value.

This is the same for npm and pnpm, which the git dependency was not. It
also drops three pieces of machinery: no `insteadOf` rewrite to
authenticate a clone, no `prepare` build on install, and no pnpm
`allowBuilds` key that has to be repinned to a sha every time the
dependency moves. The tarball is prebuilt and the lockfile gets an
integrity hash.

The claim in `packages/0g-ui/README.md` that the sites cannot read
GitHub Packages outside Actions is withdrawn. Vercel exposes a project's
environment variables to the install step, and npm expands `${VAR}` in
`.npmrc` from the environment.

### 2. A pull request publishes a prerelease

`.github/workflows/prerelease.yml` publishes on every push to an open
PR, at the version in `packages/0g-ui/package.json` with a prerelease
identifier naming the PR and the run:

```
0.2.0-pr.2.7
```

Published under the `pr` dist-tag, never `latest`. Semver orders any
prerelease below the release it is built from, so `0.2.0` always wins
over `0.2.0-pr.2.7` once it exists.

The workflow comments the exact pin line on the PR, so the site's author
copies it rather than constructing it.

A PR bumps `version` to the release it is heading for as its first
commit. Without that the prereleases carry the version already published
and sort below it, which is harmless for an exact pin but misleading to
read.

### 3. A site cannot merge on a prerelease pin

Each consuming site runs a CI job that fails when its `package.json`
pins a prerelease of this package, skipped while the PR is a draft:

```yaml
if: ${{ !github.event.pull_request.draft }}
```

Draft means the pair is still in flight and a prerelease pin is the
point. Marking the PR ready to review turns the check on, and it clears
when the site repins to the released version. A prerelease is deleted
when its PR closes, so a site that merged on one would break the next
time its lockfile was resolved from scratch.

### 4. Prereleases are deleted when their PR closes

`.github/workflows/prerelease-cleanup.yml` deletes every
`<version>-pr.<n>.*` of a PR when it closes, merged or not.

## Consequences

- The order of a two-repo change is fixed: the PR here opens first and
  publishes a prerelease, the site pins it and gets a working preview,
  this PR merges and is tagged, the site repins to the tag and merges.
  The site's last commit before merge is a version bump.
- A site's preview deploy renders unreleased shell work, which is what
  this is for. A preview is now a real test of the pair.
- GitHub Packages accumulates a version per push to an open PR. They are
  small, they never take the `latest` tag, and they are pruned on close.
- The hub still installs by git dependency. Moving it to the registry is
  a follow-up, not a prerequisite: nothing here changes for a consumer
  until it opts in.
- The sites each need `GH_PACKAGES_TOKEN`. `0g-site` has it as of
  2026-09-28.
