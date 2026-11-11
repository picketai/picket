---
kind: design
lane: design
title: One-click release from GitHub Actions
date: 2026-11-11
audience: developer
sources: work/20261111-one-click-release-from-github-actions/request.md, .github/workflows/release.yml, .github/scripts/release.mjs, test/repo/release.test.mjs, CONTRIBUTING.md, CHANGELOG.md, package.json, scripts/test.mjs, npm 11.20.0 and 11.21.0 sources (lib/commands/dist-tag.js, lib/utils/oidc.js), npm view @picketai/picket dist-tags (2026-11-11)
phases:
  - n: 1
    files: [.github/scripts/release.mjs, test/repo/release.test.mjs]
    greps:
      - path: .github/scripts/release.mjs
        pattern: '"changelog-check"'
      - path: .github/scripts/release.mjs
        pattern: '"changelog-rename"'
      - path: .github/scripts/release.mjs
        pattern: 'not released yet'
      - path: test/repo/release.test.mjs
        pattern: 'changelog-rename'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [.github/workflows/release.yml, test/repo/release.test.mjs]
    greps:
      - path: .github/workflows/release.yml
        pattern: 'retag_latest:'
      - path: .github/workflows/release.yml
        pattern: 'dry_run:'
      - path: .github/workflows/release.yml
        pattern: 'npm dist-tag add \S*@picketai/picket@\S+ latest'
      - path: .github/workflows/release.yml
        pattern: 'npm version prerelease --preid alpha'
      - path: .github/workflows/release.yml
        pattern: 'git push --atomic'
      - path: .github/workflows/release.yml
        pattern: 'changelog-rename'
      - path: .github/workflows/release.yml
        pattern: 'contents: write'
    tests: true
    drive: true
    security: true
  - n: 3
    files: [CONTRIBUTING.md]
    greps:
      - path: CONTRIBUTING.md
        pattern: 'retag_latest'
      - path: CONTRIBUTING.md
        pattern: 'dry_run'
      - path: CONTRIBUTING.md
        pattern: '\bin four jobs\b'
        absent: true
    tests: true
    drive: false
    security: false
---
# Design: One-click release from GitHub Actions

## Problem
A release today needs a local checkout, a hand edit of `CHANGELOG.md`, `npm version` and a tag push (`CONTRIBUTING.md:146-156`), and the npm `latest` dist-tag never moves: on 2026-11-11 `npm view @picketai/picket dist-tags` reads `latest: 1.0.0-alpha.5`, `alpha: 1.0.0-alpha.6`. The whole release must run from one manual start of `.github/workflows/release.yml`, because the npm trusted publisher is bound to that file and a tag pushed with `GITHUB_TOKEN` starts no other workflow (the request's premise, matching GitHub's documented rule). A pushed `v` tag must keep releasing as it does today (`.github/workflows/release.yml:3-6`, publish steps at lines 123-137), and init installs from the `alpha` dist-tag (`test/repo/release.test.mjs`, the T-6.1 test), so `alpha` must keep moving on every publish.

## Decisions

### D-001: One workflow; a `version` job hands every later job a commit and a tag
**Decision:** Infrastructural decision. `release.yml` gains a first job, `version`, with two outputs: `ref` (the commit sha to test and publish) and `tag` (`v<version>`, or empty for a dry run). `test`, `build-on-22` and `mods` need `version` and check out `needs.version.outputs.ref`; `publish` needs all four and publishes only when `tag` is not empty. On a tag push `version` only echoes `GITHUB_SHA` and the tag name, so the tag path keeps today's behaviour; on a manual run it makes the release commit and tag itself. Every later job reads one shape, whatever started the run.
**Instead of:** a separate bump workflow that pushes the tag and lets the tag push start `release.yml`: a tag pushed with `GITHUB_TOKEN` starts no workflow, so it would need a personal token or an app secret, which the request rules out.
**Risks:**
- **RISK-001** A job after `version` fails once the commit and tag are pushed, leaving a tag with no published version. Mitigation: "Re-run failed jobs" in the Actions tab reuses the succeeded `version` job's outputs and publishes the same commit; CONTRIBUTING.md says so (phase 3).
- **RISK-002** The `version` job holds `contents: write` even on a tag push, where it writes nothing. Mitigation: it runs no checkout in that mode, so the token reaches no step that pushes; the cost is accepted for one uniform job graph.

### D-002: The run mode comes from the event and two `workflow_dispatch` inputs
**Decision:** Infrastructural decision. Four modes: a `v*` tag push releases that tag; a manual run with `retag_latest` set only moves `latest` (job `retag`; `version` and everything after it are skipped); a manual run with `dry_run: true` checks the changelog, tests the dispatched commit and ends in `npm publish ./dist --dry-run` (today's manual run, plus the changelog check); a manual run with neither releases. `retag_latest` wins over `dry_run`. Inputs: `dry_run` (boolean, default false), `retag_latest` (string, default empty).
**Instead of:** dropping the dry run, as the request allows: a real publish cannot be undone, and the dry run is the only rehearsal that prints the packed file list before it.
**Risks:**
- **RISK-003** Someone starts a plain manual run expecting today's dry run and publishes. Mitigation: the run refuses unless the newest `CHANGELOG.md` heading ends `(not released yet)`, which only a release preparation writes; the input's description says what a plain run does.

### D-003: Changelog check and rename are pure functions behind two verbs of `release.mjs`
**Decision:** Infrastructural decision, following the existing pattern of `syncPluginVersion` and `checkTag` (`.github/scripts/release.mjs:8-16`): `releaseVersion(changelogText)` returns the version of the newest `## ` heading when it reads `## <version> (not released yet)` and throws otherwise; `renameRelease(changelogText, version)` returns the text with only that heading turned into `## <version>`, and throws when the heading's version differs. Verbs `changelog-check [--root <dir>]` (prints the version, writes nothing) and `changelog-rename <version> [--root <dir>]` (writes the file). The version job then proves that the version `npm version prerelease --preid alpha` produced equals the heading's version with the existing `dist-tag "v<version>"` verb (`checkTag`), before anything is pushed. Checked with npm's own semver on 2026-11-11: `1.0.0-alpha.6` bumps to `1.0.0-alpha.7`, so the heading to prepare now is `## 1.0.0-alpha.7 (not released yet)`.
**Instead of:** computing the next version up front inside `release.mjs`: it copies npm's semver increment rules, which can drift; checking after the local bump costs nothing because nothing has been pushed yet.
**Risks:**
- **RISK-004** The heading names a version other than the bump (`1.0.0-alpha.8`). Mitigation: the `checkTag` step fails the job before the push; the runner's local commits are discarded with it.

### D-004: Push last, atomically, and only from `trunk`
**Decision:** Infrastructural decision. In release mode the `version` job refuses unless `GITHUB_REF` is `refs/heads/trunk`, checks out `trunk` with full history, commits the changelog rename (`docs(changelog): release <version>`, the message used in fdc1687), runs `npm version prerelease --preid alpha` (its `version` script syncs `src/.claude-plugin/plugin.json`, `package.json:38`), and as its last step pushes branch and tag together with `git push --atomic origin HEAD:refs/heads/trunk refs/tags/v<version>`. The push is [IRREVERSIBLE] once later jobs publish; just before it the step prints `git ls-remote origin refs/heads/trunk` (the trunk sha before the release), so the two commits and the tag can be undone by hand while nothing is published. Only `version` gets `contents: write`; the workflow default stays `contents: read`.
**Instead of:** `git push origin trunk --follow-tags` as in CONTRIBUTING.md: it is not atomic, so a rejected branch push can still leave a pushed tag.
**Risks:**
- **RISK-005** `trunk` moves between the dispatch and the push. Mitigation: the atomic push is rejected as non-fast-forward, the job fails, and nothing lands; start the run again.

### D-005: `latest` follows every publish, and `retag_latest` moves it alone
**Decision:** Infrastructural decision. After `npm publish` the `publish` job runs `npm dist-tag add "@picketai/picket@<version>" latest`; the `retag` job runs the same command for the input's version. Both run under OIDC with `id-token: write` and npm 11.21.0, which the workflow already installs (`.github/workflows/release.yml:107-110`). That pin is load-bearing: the 11.21.0 tarball's `lib/commands/dist-tag.js` runs the OIDC token exchange before `add` (lines 105 and 210 to 218), while 11.20.0 calls it only from `publish`, so a separate `dist-tag` process there has no token. Before publishing and before moving `latest`, each job prints `npm view @picketai/picket dist-tags --json`, the evidence for undoing by hand with `npm dist-tag add @picketai/picket@<old> latest`. Publishing itself is [IRREVERSIBLE]: npm never accepts a version twice.
**Instead of:** publishing with `--tag latest` for a prerelease: `alpha` would then stop moving, and init installs from `alpha`.
**Risks:**
- **RISK-006** The registry refuses the dist-tag call for the trusted publisher token (the request asserts it is allowed; only a live run shows it). Mitigation: OQ-001; run `retag_latest: 1.0.0-alpha.6` first, which tests exactly that before any one-click release.

### D-006: Inputs and job outputs reach a shell only through `env`
**Decision:** Infrastructural decision on secret and input handling. No `run:` block in `release.yml` contains `${{`; `inputs.*`, `needs.*.outputs.*` and `github.ref_name` are passed as `env:` values and quoted in the shell, as the existing `dist` step does (`.github/workflows/release.yml:115-121`). A test pins it.
**Instead of:** inline expressions in `run:`: the text is pasted into the script before the shell parses it, so an input such as `1.0.0; curl ...` would run.
**Risks:**
- **RISK-007** A later edit adds an inline expression. Mitigation: the phase 2 test fails on any `${{` inside a run block.

## Scope
**In:**
- `.github/scripts/release.mjs`: `changelog-check` and `changelog-rename` verbs with unit tests in `test/repo/release.test.mjs`.
- `.github/workflows/release.yml`: `version` job, `dry_run` and `retag_latest` inputs, `latest` after every publish, `retag` job, and the workflow tests that pin them.
- `CONTRIBUTING.md`: the Releasing section and the CI job sentence at line 45.

**Out:**
- Generated changelogs (release-please, semantic-release), PR-based releases, branch protection, other workflows.
- The npm trusted publisher settings on npmjs.com.
- A changelog check on the tag-push path (it releases as today).

## Phase 1: Changelog check and rename verbs
**Touch set:**
- `.github/scripts/release.mjs`: add two pure functions, two verbs
- `test/repo/release.test.mjs`: unit and CLI tests for both
- `CHANGELOG.md`: read only, the drive's real input

**Changes:**
- `releaseVersion(changelogText: string): string`. The newest heading is the first line starting `## `. It must read `## <version> (not released yet)`, with `<version>` one run of non-space characters; return `<version>`. Throw `newest CHANGELOG.md heading "<that line>" does not end "(not released yet)"` when it does not, and a distinct message when no `## ` line exists.
- `renameRelease(changelogText: string, version: string): string`. Uses `releaseVersion`; throws when the parsed version differs from `version`, naming both; otherwise returns the text with that one line replaced by `## <version>`. Every other byte stays, the line's own line ending included.
- CLI: `changelog-check [--root <dir>]` reads `<root>/CHANGELOG.md` and prints the version; `changelog-rename <version> [--root <dir>]` writes the renamed file and prints nothing. `--root` defaults to the working directory, through the existing `rootOption`. A failure is one stderr line and exit 1, through the existing `main` wrapper. The unknown-verb message lists all four verbs.
- Tests build their changelog text inline and write files only inside `withProject` temp roots, as the `sync-version` test does.

**Done when:**
- **T-1.1** `releaseVersion` on `"# Changelog\n\n## 1.0.0-alpha.7 (not released yet)\n\n- x\n\n## 1.0.0-alpha.6\n"` returns `1.0.0-alpha.7`; on the same text with the first heading `## 1.0.0-alpha.7` it throws a message naming that heading; on a text with no `## ` line it throws.
- **T-1.2** `renameRelease(text, "1.0.0-alpha.7")` returns exactly `text` with `## 1.0.0-alpha.7 (not released yet)` replaced by `## 1.0.0-alpha.7` and nothing else changed, the older `## 1.0.0-alpha.6` heading included; with `"1.0.0-alpha.8"` it throws a message naming both versions.
- **T-1.3** CLI test in a temp root: `changelog-check --root <root>` exits 0 and prints `1.0.0-alpha.7`, and the file's bytes are unchanged; `changelog-rename 1.0.0-alpha.7 --root <root>` exits 0 and the file then holds `## 1.0.0-alpha.7` as its newest heading.
- **T-1.4** CLI test: `changelog-rename 1.0.0-alpha.8 --root <root>` and `changelog-check` on a released heading each exit 1 with exactly one stderr line, and the file's bytes are unchanged.
- **T-1.5** Drive: in the repository, whose newest heading is `## 1.0.0-alpha.6`, `node .github/scripts/release.mjs changelog-check` exits 1 with one stderr line naming `## 1.0.0-alpha.6`, and `git status --porcelain CHANGELOG.md` prints nothing afterwards.
- **T-1.6** `node --test test/repo/release.test.mjs` passes, the existing tests unchanged, and `npm test` passes.

## Phase 2: One-click release, latest and retag in release.yml
**Touch set:**
- `.github/workflows/release.yml`: inputs, version and retag jobs
- `test/repo/release.test.mjs`: pin the new job graph
- `.github/scripts/release.mjs`: read only, verbs from phase 1

**Changes:**
- `on.workflow_dispatch.inputs`: `dry_run` (boolean, default false) and `retag_latest` (string, not required, default empty), each with a one-line description of what a run with it does (D-002).
- New first job `version` with `if: ${{ !inputs.retag_latest }}`, `permissions: contents: write`, and `outputs: ref, tag`. Modes, chosen from `GITHUB_EVENT_NAME`, `GITHUB_REF` and the `dry_run` input passed through `env`:
  - tag push: no checkout; `ref` is `GITHUB_SHA`, `tag` is the tag name.
  - dry run: checkout of the dispatched commit, setup-node 24, `changelog-check`; `ref` is `GITHUB_SHA`, `tag` empty.
  - release: refuse unless `GITHUB_REF` is `refs/heads/trunk`; checkout `ref: trunk` with `fetch-depth: 0`; setup-node 24; git identity `github-actions[bot]`, `41898282+github-actions[bot]@users.noreply.github.com`; then in order: `changelog-check` gives the version, `changelog-rename "$VERSION"`, commit `CHANGELOG.md` as `docs(changelog): release <version>`, `npm version prerelease --preid alpha`, `node .github/scripts/release.mjs dist-tag "v$VERSION"` (fails on a mismatch, D-003), print `git ls-remote origin refs/heads/trunk`, and last `git push --atomic origin HEAD:refs/heads/trunk "refs/tags/v$VERSION"` [IRREVERSIBLE once publish runs] (D-004). `ref` is `git rev-parse HEAD`, `tag` is `v$VERSION`.
- `test` needs `version`; `build-on-22` needs `[version, test]`; `mods` needs `version`. Each checkout gets `with: ref: ${{ needs.version.outputs.ref }}`.
- `publish` needs `[version, test, build-on-22, mods]` and checks out `needs.version.outputs.ref` with `fetch-depth: 0`. The `dist` step's `REF` becomes `needs.version.outputs.tag`; "Tagged commit is on trunk", "Publish" and the new steps run when that tag is not empty, and "Publish dry run" when it is empty. The ancestor check uses the `ref` output instead of `GITHUB_SHA`. Before "Publish", a step prints `npm view @picketai/picket dist-tags --json`; after it, "Move latest" runs `npm dist-tag add "@picketai/picket@$VERSION" latest` with the version taken from the tag (D-005). Both `run: npm publish` lines stay byte for byte as they are.
- New last job `retag` with `if: ${{ inputs.retag_latest }}`, `permissions: contents: read, id-token: write`: setup-node 24, npm 11.21.0, print the dist-tags, then `npm dist-tag add "@picketai/picket@$VERSION" latest` with `VERSION` from the input through `env`. No checkout.
- No `run:` block holds `${{` (D-006).
- Tests: update the job list, `needs` and checkout assertions of the D-006 test of the earlier item; add tests for permissions, the version job's step order, the move of `latest`, the retag job, and the `${{` ban.

**Done when:**
- **T-2.1** A test asserts the job keys are exactly `version, test, build-on-22, mods, publish, retag` in that order, that `test`, `build-on-22` and `mods` list `version` in `needs` and check out `${{ needs.version.outputs.ref }}`, and that `publish` needs `[version, test, build-on-22, mods]`.
- **T-2.2** A test asserts the top-level permissions are `contents: read`, only `version` holds `contents: write`, and only `publish` and `retag` hold `id-token: write`.
- **T-2.3** A test asserts that no `run:` block in `release.yml` contains `${{`, and that `dry_run` and `retag_latest` are declared under `workflow_dispatch.inputs`.
- **T-2.4** A test asserts the release-mode commands of `version` appear in this order: `changelog-check`, `changelog-rename`, `npm version prerelease --preid alpha`, `dist-tag "v$`, `git push --atomic`; that `publish` runs `npm dist-tag add` after `npm publish ./dist --access public`; and that `retag` runs `npm dist-tag add` with `npm@11.21.0` installed first.
- **T-2.5** The existing test "both publish steps publish ./dist under the chosen dist-tag, and only ./dist (T-5.5)" passes unchanged, the before-image of the tag-push publish, and `npm test` passes.
- **T-2.6** Drive on a scratch copy, never the real remote: bare-clone the repository into a scratch folder as `origin`, clone it, set the newest heading to `## 1.0.0-alpha.7 (not released yet)` and push that to the scratch `origin`, then run the release-mode `run:` blocks of `version` with `GITHUB_REF=refs/heads/trunk` and a scratch `GITHUB_OUTPUT`. The scratch `origin` then has `trunk` two commits ahead (`docs(changelog): release 1.0.0-alpha.7`, then `1.0.0-alpha.7`), tag `v1.0.0-alpha.7` on the second, and `src/.claude-plugin/plugin.json` at `1.0.0-alpha.7`. Repeated with `## 1.0.0-alpha.8 (not released yet)`, the blocks exit non-zero and the scratch `origin` gains no commit and no tag.
- **T-2.7** [DEFERRED: the product owner, the first retag run] A manual run with `retag_latest: 1.0.0-alpha.6` ends green and `npm view @picketai/picket dist-tags` shows `latest: 1.0.0-alpha.6` (before-image read 2026-11-11: `latest: 1.0.0-alpha.5`, `alpha: 1.0.0-alpha.6`).
- **T-2.8** [DEFERRED: the product owner, the first one-click release] A plain manual run on `trunk` publishes the next version with `alpha` and `latest` both pointing at it, and no second `release` run starts for the pushed tag.

## Phase 3: Release section of CONTRIBUTING.md
**Touch set:**
- `CONTRIBUTING.md`: Releasing section and line 45
- `.github/workflows/release.yml`: read only, the jobs described

**Changes:**
- Line 45: describe the six jobs as phase 2 left them (`version`, `test`, `build-on-22`, `mods`, `publish`, `retag`), including that `publish` needs `mods` too, which the current sentence already gets wrong.
- Releasing: preparation is a commit on `trunk` whose newest `CHANGELOG.md` heading is `## <next version> (not released yet)`, the next version being what `npm version prerelease --preid alpha` makes of `package.json`'s version; then start `release` from the Actions tab on `trunk` with no input. Say what the run does, in the order of D-004 and D-005, and that it refuses without the heading.
- Releasing: `dry_run` replaces the old "start the workflow by hand" check, with the same advice to read the packed file list for `.test.`; `retag_latest: <version>` moves only `latest` to a published version; run it once before the first one-click release, which proves the trusted publisher may move dist-tags.
- Releasing: a pushed `v` tag still releases, with the local steps kept as the fallback; a run that fails after the push is finished with "Re-run failed jobs".
- Keep the trusted-publisher setup paragraph and the "Publish only from the workflow" paragraph as they are.

**Done when:**
- **T-3.1** The Releasing section names the heading form `(not released yet)`, a manual start of `release` on `trunk`, and the inputs `dry_run` and `retag_latest`, each with what it does.
- **T-3.2** The CI sentence near line 45 names all six jobs and no longer says `in four jobs`.
- **T-3.3** `git diff 8c7a903 -- CONTRIBUTING.md` changes only the paragraph at line 45 and the Releasing section; the trusted-publisher paragraph and the "Publish only from the workflow" paragraph are byte-identical to the base 8c7a903, the before-image.
- **T-3.4** `npm test` passes, including `test/repo/dashes.test.mjs`, `test/repo/names.test.mjs` and `test/repo/docs.test.mjs`, which scan `CONTRIBUTING.md`.

## Open questions
- **OQ-001** Does the npm registry let the trusted publisher's OIDC token move a dist-tag? The npm 11.21.0 client sends the exchange (verified in its source); the server side is the request's premise. Owner: the product owner. Fallback: phase 2 ships as designed; if the retag run fails, `publish` still publishes and only "Move latest" goes red, and `latest` is moved by hand with a local login.
- **OQ-002** Released headings differ: `## 1.0.0-alpha.5 (2026-11-02)` and older carry a date, `## 1.0.0-alpha.6` does not, and the request asks for the bare version. Owner: the product owner. Fallback: the bare version, as the request and `CONTRIBUTING.md:148` say.

## Revision log
