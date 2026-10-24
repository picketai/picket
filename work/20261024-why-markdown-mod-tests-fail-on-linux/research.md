---
kind: report
title: Why the markdown mod tests fail on Linux
date: 2026-10-24
audience: developer
sources:
  - work/20261024-why-markdown-mod-tests-fail-on-linux/request.md
  - .picket/state/scratch/ci-mods.log
  - src/mods/markdown/hooks/index.tsx
  - src/mods/markdown/hooks/data.ts
  - src/mods/markdown/hooks/links.ts
  - src/mods/markdown/hooks/tree.ts
  - src/mods/markdown/hooks/actions.ts
  - src/mods/markdown/hooks/index.test.tsx
  - src/mods/markdown/hooks/picket-markdown.test.tsx (lines 1 to 140)
  - src/mods/shared/kernel.ts
confidence: low
---
# Report: Why the markdown mod tests fail on Linux

## Summary
All six failing tests depend on `$.fs.stat` finding a `D:/repo/...` path through the test's own `fs.stat` handler; the status mod, which uses no fs call, passes (`ci-mods.log:261-293`, `hooks/index.tsx:12`) [VERIFIED]. The most likely root cause is that the test engine on a POSIX host does not hand the handler the string `D:/repo/...` unchanged (for example it resolves it against the process cwd, as `D:` is not an absolute path there), so the handler's lookup misses and answers `ENOENT` [INFERRED]. With every stat denied, `existing()` returns an empty set, no link is made, and the reply is left to the engine, which explains the missing `reply` Markdown and the `undefined` pane and pressableLinks results [INFERRED]. The engine's path handling was not read in this pass, so the cause itself is not confirmed [ASSUMED]. A candidate failing test for Windows is to log or assert the `e.path` the `fs.stat` handler receives, or to have the handler throw when the path is not exactly `D:/repo/...` (see deep pass) [ASSUMED].

## Context
Question: why 6 tests of picket-markdown fail on the Ubuntu 24.04 runner (Node 24.21.0, Claude Code 2.1.310) and pass on Windows. In scope: the CI log, the markdown hooks, the shared kernel and the two test files. Not read in this pass: `view.tsx`, `markdown.ts`, `scripts/test.mjs`, `release.yml`, the engine's own source and the rest of `picket-markdown.test.tsx` (lines 140 to 405).

## Structure
Pending deep pass. Short version: `index.tsx` registers hooks; `data.ts` holds atoms, `existing()` (stat-based path check) and `workOf()`; `links.ts` turns text into candidate paths and hrefs; `actions.ts` shows, refreshes and navigates.

## Findings
- **R-001** [VERIFIED] The 6 failures are `index.test.tsx` x2 and `picket-markdown.test.tsx` x4; 11 other tests pass, including the pure `links.ts` tests and all 4 `kernel.test.ts` tests. `ci-mods.log:261-303`.
- **R-002** [VERIFIED] Two failure shapes: an assertion that a value is undefined/0 (`index.test.tsx` x2, the report test, the last `toBeDefined` test), and `HooksError: no Markdown ... keyed "reply" is drawn` (outline, work status). `ci-mods.log:261-293`.
- **R-003** [VERIFIED] A reply is only linked if `$.fs.stat(absolute)` returns `kind: 'file'`; any throw is swallowed and the path counts as missing. `data.ts:138-150`, `data.ts:190-194`; with no hrefs the render hook returns `next(e)`, so no `reply` Markdown. `index.tsx:55-57`.
- **R-004** [VERIFIED] `/md` loads through `load()`: `$.fs.stat` and `$.fs.read` on the resolved path; a throw gives a doc with `error` and no work status. `data.ts:245-254`. `workSignature` returns null when `state.yaml` stat fails, so `picket state` is never asked (Received 0 calls). `data.ts:212-217`, `data.ts:236-237`.
- **R-005** [VERIFIED] The tests key every mocked file by the exact string `D:/repo/...` after replacing backslashes, and answer `ENOENT` for any other string. `index.test.tsx:44-48`, `picket-markdown.test.tsx:51-59`.
- **R-006** [VERIFIED] `resolvePath` is pure string code and treats `D:/` as absolute on any host, so it returns `D:/repo/...` on Linux too. `links.ts:23-40`; the passing test at `picket-markdown.test.tsx:16-22` shows it.
- **R-007** [INFERRED] The failures come from what the engine passes to the `fs.stat` handler for a drive-letter path on a POSIX host, since R-005 and R-006 leave no other difference in the code under test. Not confirmed; the engine was not read.
- **R-008** [VERIFIED] The `cmd /c picket` fallback is not involved: the fake `process.run` answers every call and `kernel.test.ts` passes on Linux. `index.test.tsx:50-53`, `ci-mods.log:218-221`.

## Dependencies and relationships
Pending deep pass: the `claude-code/testing` engine (mocked `fs.*`, `session.cwd`, `process.run`) bundled with Claude Code 2.1.310.

## Risks and unknowns
- [UNKNOWN] What path string the engine gives the `fs.stat` handler on Linux for `D:/repo/...`.
- [UNKNOWN] Whether `fs.stat` is denied by the engine itself before the handler (permission or absolute-path check).
- [ASSUMPTION] Only 12 files read in the outline pass; `view.tsx` and the second half of the long test are unread.

## Recommendations
Pending deep pass: the smallest failing test on Windows, if one exists.

## Sources for the deep pass
- `node_modules/claude-code/` (or the installed `@anthropic-ai/claude-code` testing entry): how the engine normalises or validates `fs.*` paths on POSIX.
- `scripts/test.mjs` (mods step): how `claude plugin test` is invoked, with which cwd.
- `.github/workflows/release.yml` (mods job): runner setup and any env differences.
- `src/mods/markdown/hooks/view.tsx`: `renderReply` and the `reply` key, the second failure shape.
- `src/mods/markdown/hooks/picket-markdown.test.tsx` lines 140 to 405: the outline and work status tests.
- The plugin-authoring skill: the fake fs and process semantics the lead pointed to.
- A local experiment: a throwaway test whose `fs.stat` handler records `e.path`, run on Windows, to compare with a Linux run if one is available.
