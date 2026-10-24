---
kind: design
lane: design
title: Restore the bin mode in build-on-22
date: 2026-10-24
audience: developer
sources: request.md; .github/workflows/release.yml; test/repo/release.test.mjs; test/cli/lane-check.test.mjs; scripts/build.mjs; src/bin/picket; package.json; git ls-files -s src; .picket/state/scratch/ci-build-on-22.log (job log, read for facts only)
phases:
  - n: 1
    files:
      - .github/workflows/release.yml
      - test/repo/release.test.mjs
    greps:
      - path: .github/workflows/release.yml
        pattern: 'run: chmod \+x dist/bin/picket\b'
      - path: test/repo/release.test.mjs
        pattern: 'chmod'
    tests: true
    drive: false
    security: false
---
# Design: Restore the bin mode in build-on-22

## Problem

The `build-on-22` job in `.github/workflows/release.yml` downloads the `dist` artifact that the Node 24 `test` job uploads, and `actions/upload-artifact` stores it as a zip, which drops file modes. `dist/bin/picket` (a `#!/bin/sh` wrapper, mode 100755 in git as `src/bin/picket`) arrives without its executable bit, so test 93 at `test/cli/lane-check.test.mjs:51`, which puts `dist/bin` on PATH and runs `picket` through `bash -c`, exits 126 with `Permission denied` (log lines 708 to 723; 215 of 216 pass). The Node 24 `test` job builds `dist/` itself through `copySource` in `scripts/build.mjs`, whose `copyFileSync` keeps the source mode, so it passes. The fix must stay inside the workflow, keep `build-on-22` testing the Node 24 build unchanged (no rebuild, no `npm ci`, as `test/repo/release.test.mjs` pins), and cannot be proven by a local run.

## Decisions

### D-001: Restore the one mode after the download

**Decision:** Infrastructural decision. Add one step to `build-on-22`, between the `actions/download-artifact` step and `Test the build`, that runs `chmod +x dist/bin/picket`. It is the only file the job needs executable: `git ls-files -s src` lists `src/bin/picket` as the only 100755 file; `dist/bin/picket.mjs` and the skill scripts with shebangs (`src/skills/documenting/scripts/export.mjs`, `filename.mjs`, `src/skills/reviewing/scripts/lint.craft.mjs`) are run through `node` by every test (`test/support/cli.mts:18`, `test/cli/lint-craft.test.mjs:23`), and the hooks run as `node <file>`. The step names its file explicitly, so the job's shape stays as readable as the rest of the workflow.
**Instead of:** archiving `dist/` with `tar` before upload and extracting it after download, which keeps every mode, including any future one: it changes two jobs and the artifact format the release test pins (`include-hidden-files`, `path: dist/`), and it adds a pack and an unpack step to fix a single file.
**Risks:**
- **RISK-001** A file added to `dist/` later that must be executable loses its mode the same way. Mitigation: the failure is loud (exit 126 in the test that runs it, as here), and T-1.5 records the current list so a reviewer sees when it grows; a second such file is the point to switch to the `tar` route.

### D-002: Pin the step in the release workflow test

**Decision:** Infrastructural decision. Extend the existing `build-on-22` assertions in `test/repo/release.test.mjs` so they require the download step, then the `chmod +x dist/bin/picket` step, then the test step, in that order. This test runs in `npm test`, locally and in the Node 24 job, so removing or reordering the step fails before any CI run reaches `build-on-22`.
**Instead of:** no test, relying on the next CI run: a later edit to the workflow could drop the step and nothing local would notice; the failure would only show on a tag push, which is when publishing is blocked.
**Risks:**
- **RISK-002** The assertion pins text, not behaviour, so it proves the step exists but not that it fixes the job. Mitigation: OQ-001 has the user prove the behaviour with one CI run.

## Scope

**In:**
- One new step in the `build-on-22` job of `.github/workflows/release.yml`.
- The matching assertion in `test/repo/release.test.mjs`.

**Out:**
- The `test`, `mods` and `publish` jobs. `publish` builds `dist/` itself through the `prepack` script (`package.json:45`), so it never sees the zipped artifact.
- The mode of `dist/bin/picket.mjs`: npm sets the bin target's mode on install, and no test runs it without `node`.
- `scripts/build.mjs`: it already keeps the mode when it copies `src/bin/picket`.

## Phase 1: Restore the executable bit after the download

**Touch set:**
- `.github/workflows/release.yml`: add the restore step
- `test/repo/release.test.mjs`: pin the step and its order
- `test/cli/lane-check.test.mjs`: read only, the failing test
- `scripts/build.mjs`: read only, `copySource` keeps modes
- `src/bin/picket`: read only, the 100755 wrapper

**Changes:**
- In the `build-on-22` job, insert a step after the `actions/download-artifact` step (whose `with:` block stays as it is) and before `Test the build`, with a `name:` that says it restores the executable bit and `run: chmod +x dist/bin/picket`. Indent it like the job's other steps. No other job or step changes.
- In the test `the release workflow tests on Node 24, checks the build on Node 22, ...` in `test/repo/release.test.mjs`, extend the `build-on-22` assertions so one pattern matches the download step's `with:` block, then `run: chmod +x dist/bin/picket`, then the `node --test` run line, in that order. Keep every existing assertion; the `uses:` pin check needs no change, since the new step has no `uses:`.
- Write the edits with the Edit tool. `guard.bash` denies `chmod` as a command, so do not try the command in Bash; nothing here needs it run.

**Done when:**
- **T-1.1** In `.github/workflows/release.yml`, the `build-on-22` job has exactly one step running `chmod +x dist/bin/picket`, placed after the `actions/download-artifact` step and before the `Test the build` step.
- **T-1.2** `git diff` of `.github/workflows/release.yml` adds lines only inside the `build-on-22` job and removes none.
- **T-1.3** `test/repo/release.test.mjs` asserts the order download, `chmod +x dist/bin/picket`, `node --test`; with the new step deleted from a scratch copy of the workflow text, that assertion's pattern no longer matches.
- **T-1.4** `npm test` passes.
- **T-1.5** `git ls-files -s src` lists `src/bin/picket` as the only file with mode 100755.

## Open questions

- **OQ-001** Does a release workflow run (a `workflow_dispatch`, which only dry-runs the publish) pass `build-on-22` with all 216 tests once phase 1 is pushed? Owner: the user; no agent pushes or starts a workflow run. Fallback: phase 1 ships on the local `npm test` and T-1.1 to T-1.5; if the run still fails with exit 126 or finds another mode, amend D-001 to the `tar` route.

## Revision log
