---
kind: order
lane: order
title: Status tests resolve fixture paths portably
date: 2026-11-08
audience: developer
sources: work/20261108-fix-25-failing-status-mod-tests/request.md; src/mods/status/hooks/index.test.tsx; src/mods/status/hooks/session-files.ts; src/mods/status/hooks/sessions.ts; src/mods/status/hooks/index.tsx; scripts/test.mjs; claude plugin test probe run 2026-11-08
phases:
  - n: 1
    files:
      - src/mods/status/hooks/index.test.tsx
    greps:
      - path: src/mods/status/hooks/index.test.tsx
        pattern: 'fixturePath\(e\.path\)'
      - path: src/mods/status/hooks/index.test.tsx
        pattern: 'e\.path\.replace\('
        absent: true
    tests: true
    drive: false
---
# Order: Status tests resolve fixture paths portably

## Problem
The 25 failures share one cause, and it is in the test fixtures, not the status mod. `paneWorld` in `src/mods/status/hooks/index.test.tsx:216-335` uses Windows drive roots (`D:/home/.claude`, `D:/repo`). Those are relative paths on Linux, and the `claude plugin test` engine resolves a relative `fs.list`, `fs.read`, `fs.write` or `fs.stat` path against the plugin root before the test's handler sees it. A probe plugin run on this host (Claude Code 2.1.319, 2026-11-08) showed `$.fs.list('D:/home/.claude/projects/D--repo')` reaching the handler as `<plugin root>/D:/home/.claude/projects/D--repo`, the same for read, write and stat, while `process.run` argv arrived untouched. So the handler at `index.test.tsx:311` never matches `PROJECT`, no transcript is listed, and every test that needs a session row or the `D:/repo/work` listing fails (T-6.4 expects 2 list runs and gets 1). The request blames version 2.1.319; the probe shows the trigger is the POSIX host, and whether 2.1.316 on Linux also failed was not checked. Production paths come from `CLAUDE_CONFIG_DIR`, `HOME` or `USERPROFILE` and `$.session.root()` (`session-files.ts:17-29`), which are absolute, so the mod needs no change.

## Decisions
### D-001: Fix the fixtures, leave the status mod unchanged
**Decision:** The change is confined to `src/mods/status/hooks/index.test.tsx`. The mod passes absolute paths in production, and the engine only rewrites paths that are relative on the host, so making the mod resolve or rewrite paths would change shipped behaviour to suit a fixture, which the brief rules out.
**Instead of:** having `session-files.ts` and `watch.ts` normalise every path before calling `$.fs`: it changes production code for a defect only the test world has.

### D-002: One `fixturePath` helper maps an engine path back to its fixture form
**Decision:** Add a module-level helper `fixturePath(enginePath: string): string` to the test file. It turns backslashes into slashes (what the handlers already do inline) and drops anything before the last occurrence of the fixture drive marker `D:/`, so `<plugin root>/D:/repo/work` and `D:\repo\work` both read as `D:/repo/work`. Every `paneWorld` fs handler matches on its result. The fixture constants (`CONFIG`, `PROJECT`, the `D:/repo` root, `START.cwd`) keep their values, so the Windows behaviour the tests were written on stays as it is. Maintenance cost: every path fixture must start at that one marker; a new root on another drive, or one without a drive, falls outside the helper.
**Instead of:** switching the fixtures to POSIX roots (`/home/.claude`, `/repo`, slug `-repo`): how the engine resolves a drive-less root on Windows is not verifiable here (a resolution to `D:\home\...` would move the failure to Windows), while the helper holds whatever base the engine resolves against.
**Risks:**
- **RISK-001** A developer "fixes" a test by loosening an expectation instead of the handler. Mitigation: T-1.4 requires that no `expect(` line changes.

## Scope
**In:**
- `paneWorld`'s `fs.list`, `fs.read`, `fs.write` and `fs.stat` handlers and the new helper in `src/mods/status/hooks/index.test.tsx`.

**Out:**
- Any status mod source file, the markdown mod and its tests, other mods, verbs.
- The deferred T-7.5 of work item 20261107-plugin-only-install-without-global-npm; that item closes it on its own.
- The `world()` fixture (`index.test.tsx:11-28`): its `fs.list` answers `[]` for any path, so resolution does not affect it.

## Phase 1: Route the pane world's fs handlers through fixturePath
**Touch set:**
- `src/mods/status/hooks/index.test.tsx`: fixture handlers miss resolved paths
- `src/mods/status/hooks/session-files.ts`: read only, paths the mod builds
- `src/mods/status/hooks/watch.ts`: read only, work folder listing
- `scripts/test.mjs`: read only, npm test steps

**Changes:**
- Add `fixturePath(enginePath: string): string` beside the `CONFIG` and `PROJECT` constants (`index.test.tsx:216-217`), with the behaviour D-002 gives.
- In `paneWorld` (`index.test.tsx:293-336`), the `fs.stat`, `fs.list`, `fs.read` and `fs.write` handlers take `fixturePath(e.path)` in place of `e.path.replace(/\\/g, '/')`. `w.reads` and the keys of `w.written` therefore hold fixture paths, which the assertions at `index.test.tsx:754`, `:760` and `:880` already expect.
- Leave `unlinked` (`index.test.tsx:765`) as it is: `process.run` argv is not resolved by the engine.
- No test is added, removed or renamed, and no `expect(` line changes.

**Done when:**
- **T-1.1** After `npm run build`, `claude plugin test dist` ends with `130 pass` and `0 fail` on this Linux host. Before-image, captured at base 8583b01 on 2026-11-08: `105 pass`, `25 fail`, all 25 in `hooks/mods/status/hooks/index.test.tsx`.
- **T-1.2** `npm test` exits 0 on this host, with typecheck, unit, build, product, timing and mods each reporting exit 0. At base, typecheck, unit, product and timing exit 0 (run 2026-11-08) and only mods fails.
- **T-1.3** In `src/mods/status/hooks/index.test.tsx`, `fixturePath(e.path)` appears in the `paneWorld` fs handlers and no line reads `e.path.replace(` (both greps in the frontmatter).
- **T-1.4** `git diff --name-only 8583b01 -- src` names only `src/mods/status/hooks/index.test.tsx`, and `git diff 8583b01 -- src/mods/status/hooks/index.test.tsx | grep -E '^[-+].*expect\(|^[-+]test\('` prints nothing.
- **T-1.5** `CONFIG`, `PROJECT`, `START.cwd` and the `session.root` answers in the test file keep their base values (`D:/home/.claude`, `${CONFIG}/projects/D--repo`, `D:/repo`).
- **T-1.6** [DEFERRED: QA, the release QA pass on a Windows host] `claude plugin test dist` on Windows reports 0 fail in `hooks/mods/status/hooks/index.test.tsx`.

## Open questions
none

## Revision log
