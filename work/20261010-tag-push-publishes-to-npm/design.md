---
kind: design
lane: design
title: Tag push publishes to npm
date: 2026-10-10
audience: developer
sources: request.md; package.json; package-lock.json; core/.claude-plugin/plugin.json; CONTRIBUTING.md; test/kernel/plugin-layout.test.mjs; tests that commit (hooks, close, drive, git, pr, review, route, sources) and their identity setup; tests guarded by process.platform; local node v20.11.1, npm 10.4.0
phases:
  - n: 1
    files:
      - package.json
      - .github/scripts/release.mjs
      - test/release.test.mjs
    greps:
      - path: package.json
        pattern: '"version": "node \.github/scripts/release\.mjs sync-version && git add core/\.claude-plugin/plugin\.json"'
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - .github/workflows/release.yml
      - .github/scripts/release.mjs
      - test/release.test.mjs
    greps:
      - path: .github/workflows/release.yml
        pattern: 'id-token: write'
      - path: .github/workflows/release.yml
        pattern: 'release\.mjs dist-tag'
      - path: .github/workflows/release.yml
        pattern: 'merge-base --is-ancestor'
      - path: .github/workflows/release.yml
        pattern: 'npm publish --dry-run'
      - path: .github/workflows/release.yml
        pattern: 'node-version: 22'
      - path: .github/workflows/release.yml
        pattern: 'git config --global user\.email'
    tests: true
    drive: true
    security: true
  - n: 3
    files:
      - CONTRIBUTING.md
    greps:
      - path: CONTRIBUTING.md
        pattern: '^## Releasing$'
      - path: CONTRIBUTING.md
        pattern: 'npm version prerelease --preid alpha'
      - path: CONTRIBUTING.md
        pattern: 'git push origin trunk --follow-tags'
    tests: true
    drive: false
    security: false
---
# Design: Tag push publishes to npm

## Problem

`@picketai/picket` 1.0.0-alpha.1 is published by hand once. Every later release should go out when a `v*` tag reaches GitHub, with no long-lived npm token (npm trusted publishing over OIDC). The version lives in two files, `package.json` and `core/.claude-plugin/plugin.json`, and `test/kernel/plugin-layout.test.mjs` already fails when they differ. So one `npm version` command must bump both in one commit and tag. `npm test` has only ever run on Windows, the workflow runs on Linux, and the bash guard stops any agent from running `git push` or `npm publish`. Every check that can run locally must therefore live in a script the workflow calls, not in inline YAML.

## Decisions

### D-001: npm's `version` lifecycle script copies the version into the plugin manifest
**Decision:** Infrastructural decision. `package.json` gains `"version": "node .github/scripts/release.mjs sync-version && git add core/.claude-plugin/plugin.json"`. During `npm version`, npm writes the new version into `package.json` and `package-lock.json` and then runs this script. Then it stages the files it wrote and commits and tags (`v<version>`), so the plugin manifest joins the same commit. `sync-version` reads the new version from `package.json` on disk; it does not trust `npm_package_version`. It rewrites only the one `"version": "<x>"` value in `core/.claude-plugin/plugin.json` as text, so the file keeps its layout (the one-line `"author"` object stays one line). It fails when the manifest holds zero or two version values. The module lives at `.github/scripts/release.mjs`, beside the workflow that also calls it, and outside `files`, so it never ships.
**Instead of:** dropping `version` from `plugin.json`: Claude Code reads the plugin's own manifest to tell an update from a reinstall, and an installed plugin sees no `package.json` above `core/` through the marketplace.
**Risks:**
- **RISK-001** `JSON.stringify` rewrites the manifest's layout and the diff gets noisy. Mitigation: text replace of the one value, with a test that every other byte stays the same.

### D-002: the tag check and the dist-tag choice are pure functions with a CLI
**Decision:** Infrastructural decision. `.github/scripts/release.mjs` exports three functions:
- `syncPluginVersion(manifestText, version) → string`;
- `checkTag(refName, version)`, which throws unless `refName === "v" + version`;
- `distTag(version) → string`, which returns `latest` for a stable version and the first prerelease identifier otherwise (`1.0.0-alpha.2` gives `alpha`, `1.1.0-beta.1` gives `beta`). It throws when that identifier is not lowercase letters, for example `1.0.0-0`.

The CLI verbs are `sync-version` and `dist-tag [<refName>]`. `dist-tag` reads `package.json`, runs `checkTag` when a ref is given, and prints the dist-tag. On any failure it prints one line on stderr and exits 1. The workflow calls the CLI, so the logic is unit-tested and driven locally.
**Instead of:** inline bash in `release.yml`: no test can run it, and no agent can drive it, because of the guard.
**Risks:**
- **RISK-002** A prerelease with another identifier (for example `rc`) publishes under a new dist-tag the user did not expect. Mitigation: that is npm's normal meaning of a dist-tag, and CONTRIBUTING names `--preid alpha` as the release command.

### D-003: trusted publishing over OIDC, no token anywhere
**Decision:** Infrastructural decision on secret handling. The publish job has `permissions: { contents: read, id-token: write }`, and the workflow default is `contents: read`. The job upgrades npm to `npm@11` (11.5.1 or later is required for trusted publishing) before publishing. `actions/setup-node` gets no `registry-url`, so it writes no `.npmrc` with a `NODE_AUTH_TOKEN` placeholder that could shadow the OIDC exchange. The publish step runs `npm publish --access public --tag <dist-tag>`. Values reach `run:` lines through `env:`, never through `${{ }}` inside the script text. Each publish is [IRREVERSIBLE]: npm never accepts the same version number twice, even after an unpublish.
**Instead of:** an `NPM_TOKEN` repository secret: a long-lived credential to rotate and to leak, and the request forbids it.
**Risks:**
- **RISK-003** The trusted-publisher entry on npmjs.com is missing or names another workflow file, so publish fails with 404 or 403. Mitigation: the publish step is last, so nothing half-ships. CONTRIBUTING gives the exact values to enter (OQ-001).

### D-004: tag push publishes; a manual run is a full dry run
**Decision:** Infrastructural decision. `release.yml` runs on `push: tags: ['v*']` and on `workflow_dispatch`. Both paths run the same steps: checkout with `fetch-depth: 0`, Node setup, `npm@11`, a git identity for the test run, `npm ci`, `npm test`, then `release.mjs dist-tag`. Only a tag push passes the ref to `dist-tag`, then checks that the tagged commit is an ancestor of `origin/trunk`, then publishes. A manual run ends with `npm publish --dry-run`. The job sits in `concurrency: { group: release, cancel-in-progress: false }`, so two tags never publish at once.
**Instead of:** a separate CI workflow on every push: wider than the request. The manual dry run gives the first Linux `npm test` on demand, before any tag.
**Risks:**
- **RISK-004** A tag pushed from a branch other than trunk publishes unreviewed code. Mitigation: the ancestry check fails the run before publish.

### D-005: Node 22 on `ubuntu-latest`, with a git identity for the tests
**Decision:** Infrastructural decision. Use `node-version: 22`. Node 20, the local version, reached end of life on 2026-04-30, and npm 11.5.1 needs Node 20.17 or later anyway. The job sets a global `user.name` and `user.email` before `npm test`. Every test that commits sets its own identity today, but a runner without one turns any missed case into a failure that has nothing to do with the release.
**Instead of:** a matrix of Node 20, 22 and 24: three times the minutes for a product whose users run one Claude Code host, and it says nothing about the publish.
**Risks:**
- **RISK-005** A test depends on Windows behaviour and fails on Linux (OQ-002). Mitigation: the dry run surfaces it before any tag, and `npm test` precedes publish.

## Scope

**In:**
- the `version` script and `.github/scripts/release.mjs` with its tests;
- `.github/workflows/release.yml`;
- a "Releasing" section in CONTRIBUTING.md.

**Out:**
- the first publish of 1.0.0-alpha.1 (by hand);
- a CI workflow for pushes and pull requests;
- GitHub environments or branch protection;
- `bench/results/plugin-alpha.json` (a run in progress, never staged);
- `engines` in `package.json`.

## Phase 1: One command bumps both manifests

**Touch set:**
- `package.json`: add the `version` script
- `.github/scripts/release.mjs`: new, `syncPluginVersion` and `sync-version`
- `test/release.test.mjs`: new, unit tests for the module

**Changes:** Per D-001. `release.mjs` is Node ESM with built-ins only. Phase 1 needs `syncPluginVersion(manifestText, version)` and the `sync-version` verb. The verb takes an optional `--root <dir>` (default: the working folder), reads `<root>/package.json`, rewrites `<root>/core/.claude-plugin/plugin.json`, and exits 1 with one stderr line on a missing file or a manifest without exactly one version. The CLI dispatch is a small `switch` on `process.argv[2]` behind a main-module check, so the tests import the functions without running the CLI.

The tests cover three cases:
- the value changes and every other byte is identical;
- zero and two version values both throw;
- the CLI run against a temp folder rewrites the file.

Drive with a script `.picket/state/scratch/drive.mjs` run through `picket drive --run`. It builds a throwaway git repository in the OS temp folder with its own identity, in which:
1. it copies `package.json`, `package-lock.json`, `core/.claude-plugin/plugin.json` and `.github/scripts/release.mjs` into the repository, then commits them;
2. it runs the real `npm version prerelease --preid alpha` inside that repository;
3. it prints the new tag and the files of the new commit.

That commit is in the temp repository, never in this one.

**Done when:**
- **T-1.1** In the drive, `npm version prerelease --preid alpha` exits 0 and creates tag `v1.0.0-alpha.2`. The tagged commit changes exactly `package.json`, `package-lock.json` and `core/.claude-plugin/plugin.json`, and both manifests read `1.0.0-alpha.2`.
- **T-1.2** In the drive, `git diff HEAD~1 -- core/.claude-plugin/plugin.json` shows one changed line, the version line.
- **T-1.3** `node .github/scripts/release.mjs sync-version --root <dir with a manifest holding two version values>` exits 1 and prints one line on stderr.
- **T-1.4** `test/release.test.mjs` covers the three cases above and passes.
- **T-1.5** `npm pack --dry-run --json` lists no path under `.github/`.
- **T-1.6** `npm test` passes.

## Phase 2: The release workflow

**Touch set:**
- `.github/workflows/release.yml`: new, tag push and dry run
- `.github/scripts/release.mjs`: add `checkTag`, `distTag`, `dist-tag`
- `test/release.test.mjs`: tests for the two functions

**Changes:** Per D-002 to D-005. Add `checkTag` and `distTag` and the `dist-tag [<refName>]` verb to `release.mjs`. The workflow, `name: release`, has:
- triggers `push: tags: ['v*']` and `workflow_dispatch`;
- top-level `permissions: contents: read`;
- `concurrency` as in D-004;
- one job `publish` on `ubuntu-latest` with `permissions: { contents: read, id-token: write }`.

The job runs these steps in order:
1. `actions/checkout@v4` with `fetch-depth: 0`.
2. `actions/setup-node@v4` with `node-version: 22` and no `registry-url`.
3. `npm install -g npm@11`, then `npm --version` to log it.
4. `git config --global user.name` and `user.email`, set to `release-bot` and `release-bot@users.noreply.github.com`.
5. `npm ci`, then `npm test`.
6. Step `id: dist`. It runs `node .github/scripts/release.mjs dist-tag "$REF"`, with `REF` from `env:` set to `github.ref_name` on a tag push and empty on a manual run (the CLI treats an empty ref as none). It writes `tag=<value>` to `$GITHUB_OUTPUT`.
7. On a tag push only: `git merge-base --is-ancestor "$GITHUB_SHA" origin/trunk`.
8. On a tag push only: `npm publish --access public --tag "$DIST_TAG"`. [IRREVERSIBLE]
9. On a manual run only: the same command with `--dry-run`.

`DIST_TAG` comes from `steps.dist.outputs.tag` through `env:`. Tag-only steps use `if: github.ref_type == 'tag'`; the dry run uses `if: github.event_name == 'workflow_dispatch'`. The workflow has no `secrets.` reference and no `NODE_AUTH_TOKEN`.

The drive runs the CLI as the workflow will, through `picket drive --run`. It does not push a tag, run `npm publish`, or run the workflow.

**Done when:**
- **T-2.1** Drive: `node .github/scripts/release.mjs dist-tag v1.0.0-alpha.1` prints `alpha` and exits 0 against the current `package.json`. `dist-tag v1.0.0-alpha.9` exits 1 with one stderr line naming both versions. `dist-tag` with no ref prints `alpha`.
- **T-2.2** `test/release.test.mjs` covers four cases and passes: `distTag("1.2.0")` is `latest`, `distTag("1.0.0-beta.3")` is `beta`, `distTag("1.0.0-0")` throws, and `checkTag("1.0.0-alpha.1", "1.0.0-alpha.1")` throws (no `v`).
- **T-2.3** `release.yml` grants `id-token: write` only at job level, holds no `secrets.` and no `NODE_AUTH_TOKEN`, and holds no `${{` inside any `run:` block.
- **T-2.4** In `release.yml`, `npm test` comes before the `dist-tag` step, which comes before the ancestry check, which comes before both publish steps. Each publish step carries its `if:`.
- **T-2.5** `npm test` passes.
- **T-2.6** Per D-005, `release.yml` runs the job on `ubuntu-latest`, sets `node-version: 22` on the `actions/setup-node` step, and runs `git config --global user.name` and `git config --global user.email` in a step before `npm test`.

## Phase 3: How to release, in CONTRIBUTING.md

**Touch set:**
- `CONTRIBUTING.md`: new `## Releasing` section before `## Folders outside the product`

**Changes:** Write a short section in the file's existing prose style. It covers:
- **Per release:** on `trunk` with a clean tree, run `npm version prerelease --preid alpha`, which bumps both manifests and commits and tags `v<version>`, then `git push origin trunk --follow-tags`. The tag push starts `.github/workflows/release.yml`, which publishes under the `alpha` dist-tag.
- **One-time setup:** on npmjs.com, open the package settings of `@picketai/picket` and add a trusted publisher for GitHub Actions: organization `picketai`, repository `picket`, workflow file `release.yml`, no environment. This needs the hand-published first version to exist.
- **Dry run:** start the `release` workflow by hand from the Actions tab. It runs the tests on Linux and `npm publish --dry-run`.

Name `.github/workflows/release.yml` and `.github/scripts/release.mjs` as backticked paths so `test/markdown-paths.test.mjs` checks them.

**Done when:**
- **T-3.1** CONTRIBUTING.md has a `## Releasing` heading holding both commands exactly as written above, and the four trusted-publisher values.
- **T-3.2** The section cites `.github/workflows/release.yml` and `.github/scripts/release.mjs` in backticks, and `test/markdown-paths.test.mjs` passes.
- **T-3.3** The section holds no em or en dash, and no line of it names a token, secret or `NPM_TOKEN`.
- **T-3.4** `npm test` passes.

## Open questions

- **OQ-001** The trusted-publishing contract comes from npm's documentation as of 2025: npm CLI 11.5.1 or later, `id-token: write`, GitHub-hosted runners, a publisher entry with organization, repository and workflow file, provenance generated automatically. It is not checked against the live npmjs.com settings page. Owner: user, when adding the publisher entry. Fallback: the first tagged release is the check, and a mismatch fails at the last step with nothing published.
- **OQ-002** Does `npm test` pass on Linux with Node 22? Only Windows with Node 20.11.1 has run it. Owner: user, with one manual run of the `release` workflow after Phase 2 is merged and pushed. Fallback: failures found there become a fast change before the first tag. No phase criterion rests on a Linux run.

## Revision log
