---
kind: design
lane: design
title: Fix six follow-ups from Separate
date: 2026-10-06
audience: developer
sources: [request, work/20261005-separate-core-paths-state-and-config/design.md, work/20261005-separate-core-paths-state-and-config/verdicts.jsonl, work/20261005-separate-core-paths-state-and-config/phases/7.block.md, work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md, spike/run.mjs, spike/out/9.jsonl, .claude/lib/hooks/guard.scope.mjs, .claude/lib/migrate.mjs, .claude/lib/paths.mjs, .claude/lib/verify.mjs, .claude/settings.json, .claude/lib/hooks/route.verdict.mjs, .claude/lib/transcript.mjs, .claude/lib/route.mjs, .claude/agents/reviewer.md, .claude/lib/hooks/emit.ledger.mjs, .claude/lib/git.mjs, .claude/lib/preflight.mjs, .claude/bin/harness.mjs, test/kernel/packet.test.mjs, .claude/skills/branching/templates/manifest.example.yaml, .claude/lib/hooks/inject.state.mjs, .claude/lib/hook.mjs, .claude/lib/work.mjs, .claude/bin/statusline.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/budgets.test.mjs, test/markdown-paths.test.mjs]
phases:
  - n: 1
    files: [.claude/lib/hooks/guard.scope.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/lib/hooks/guard.scope.mjs
        pattern: "LEGACY\\.stateDir"
      - path: .claude/lib/hooks/guard.scope.mjs
        pattern: "toLowerCase\\(\\)"
      - path: test/hooks/handlers.test.mjs
        pattern: "ledger-notes"
    tests: true
    drive: true
    security: true
  - n: 2
    files: [.claude/lib/transcript.mjs, .claude/lib/hooks/route.verdict.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/lib/transcript.mjs
        pattern: "export function latestHints\\("
      - path: .claude/lib/hooks/route.verdict.mjs
        pattern: "latestHints\\("
      - path: .claude/lib/hooks/emit.ledger.mjs
        pattern: "spawnHints\\("
      - path: test/hooks/hooks.test.mjs
        pattern: "scope: checkpoint"
    tests: true
    drive: false
    security: false
  - n: 3
    files: [.claude/lib/git.mjs, .claude/lib/preflight.mjs, .claude/skills/branching/templates/manifest.example.yaml, test/kernel/git.test.mjs, test/kernel/packet.test.mjs, test/kernel/paths.test.mjs]
    greps:
      - path: .claude/lib/git.mjs
        pattern: "\\.trimEnd\\(\\)"
      - path: .claude/lib/preflight.mjs
        pattern: "const out = \\{ test: null"
      - path: test/kernel/packet.test.mjs
        pattern: "const withComments = \\(value\\) =>"
      - path: test/kernel/git.test.mjs
        pattern: "dirtyPaths"
      - path: test/kernel/paths.test.mjs
        pattern: "\\.claude/agents"
    tests: true
    drive: true
    security: false
  - n: 4
    files: [.claude/lib/work.mjs, .claude/lib/hooks/inject.state.mjs, test/kernel/work.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: .claude/lib/work.mjs
        pattern: "export function listOpenWork\\("
      - path: .claude/lib/hooks/inject.state.mjs
        pattern: "listOpenWork"
      - path: test/kernel/work.test.mjs
        pattern: "listOpenWork"
    tests: true
    drive: true
    security: false
---
# Design: Fix six follow-ups from Separate

## Problem

The cumulative review of `20261005-separate-core-paths-state-and-config` and its last phases left six follow-ups. One is a security hole: `guard.scope` stopped denying model writes under the legacy state folder `.claude/ledger/`, and `harness migrate` (auto-allowed) appends any `.jsonl` it finds there into `.tether/state/`, so a forged `drive-log.jsonl` row becomes drive evidence for `harness verify`. One misroutes a verdict: `route.verdict` reads phase hints only from an agent's first message, so a reviewer continued for a checkpoint recorded its verdict on the wrong phase. The other four are a trimmed first character in `dirtyPaths`, a stale path in a template comment, two lost spaces, and an `inject.state` cold start of about 81 ms against a 56 ms spike figure. Binding constraints: `npm test` stays green after every phase, each item gets a test or a measured result, no comments are written, and a stale comment is deleted rather than reworded (`.claude/rules/comments.md`).

## Decisions

### D-001: guard.scope denies the legacy state folder, case-insensitively
**Decision:** Infrastructural decision. The hole is the model write, not the move, so the fix sits in the guard. `guardScope` denies any Write or Edit whose repo-relative path lies under `LEGACY.stateDir + "/"` (`.claude/ledger/`), compared on the lowercased path, because NTFS and APFS resolve `.Claude/Ledger/` to the same folder. The existing hook-only state check (`isHookOnlyState`) gets the same lowercased comparison, against the lowercased `MODEL_WRITABLE_STATE_FILES`, since it is the same bypass one folder over. `migrate.mjs` does not change: it must still carry a real pre-upgrade ledger and drive log into `.tether/state/`.
**Instead of:** making `harness migrate` refuse to append legacy `.jsonl` rows: it would drop genuine history on upgrade, and the forged file would still sit on disk waiting for any later reader of the legacy folder.
**Risks:**
- **RISK-001** A Bash redirect such as `echo ... >> .claude/ledger/drive-log.jsonl` still writes the file. Mitigation: verified that `guard.bash` never auto-allows a write redirect outside `.tether/state/*.log` (`isSanctionedLogSink`, `fallThrough("write-redirect")`), so that path reaches the user's permission prompt; the existing test `guard.bash sinks test logs into the new state folder only (T-4.4)` already pins it.
- **RISK-002** `KERNEL_OWNED` (`work/<id>/...`) is still compared case-sensitively. Mitigation: out of scope here and named in Scope; it is not on the migrate path, so it opens no evidence bypass.

### D-002: route.verdict takes hints from the latest instruction message
**Decision:** Infrastructural decision. `transcript.mjs` gains `latestHints(path)`: the same four fields `spawnHints` returns (`work_id`, `phase`, `lane`, `scope`), parsed from the last user text message in the agent transcript that carries a `work:` line. A continuation arrives in the agent transcript as a user text message (verified in this session's reviewer transcript: `The coordinator sent a message while you were working:` followed by `work:`, `scope: checkpoint`, `phase: 4`). Both functions share one private parser of a message text. `route.verdict` switches to `latestHints`; the block heading still wins over hints, unchanged. `emit.ledger` keeps `spawnHints`, because it reads the lead's main transcript, where the first message is the right anchor.
**Instead of:** adding `checkpoint n` to the reviewer heading in `.claude/agents/reviewer.md` and capturing it in the heading regex: it changes an agent contract, relies on the model writing the number, and leaves the same misroute open for any other continued agent whose heading names no phase.
**Risks:**
- **RISK-003** A teammate's message to the reviewer that quotes a `work:` line would become the latest hints. Mitigation: hints are only a fallback behind the heading; the lead's continuation always comes last before the review it asks for, and the test pins the continuation case.

### D-003: git() trims trailing whitespace only
**Decision:** Infrastructural decision. The private `git()` helper in `git.mjs` returns `trimEnd()` output instead of `trim()`. Porcelain status lines start with a status column that may be a space (` M path`); a leading trim shifts the first line so `slice(3)` eats a character, and the shortened path (`claude/bin/harness.mjs`) then also escapes the bookkeeping filter. No other caller reads output that starts with whitespace (`rev-parse`, `worktree list --porcelain`, `merge-base`, `symbolic-ref`, `log -1 --format`, `diff --name-only|--numstat|--cached`, `ls-files` all start with a non-space).
**Instead of:** a second untrimmed helper used only by `dirtyPaths`: two code paths for one subprocess call, and the next porcelain reader would hit the same trap.
**Risks:**
- **RISK-004** A caller compared output with surrounding whitespace removed. Mitigation: every caller listed above was read; `isRepo` compares `"true"`, which `trimEnd` still yields; `npm test` covers the rest.

### D-004: the stale template comment is deleted, and a test keeps legacy paths out of prompts
**Decision:** Infrastructural decision. Line 1 of `manifest.example.yaml` (`# Annotated example of .claude/branching/manifest.yaml`) is stale, so it is deleted together with the bare `#` separator on line 2 that only served it; no replacement line is written. A kernel test asserts that no file under `.claude/skills/`, `.claude/agents/` or `.claude/rules/` names any entry of `LEGACY_LOCATIONS`, so the next stale path fails the suite instead of a review.
**Instead of:** rewording the line to `.tether/state/branching.yaml`: the comments rule forbids rewording a stale comment.
**Risks:**
- **RISK-005** A future skill must mention a legacy path on purpose (a migration guide). Mitigation: the test lists its scanned folders explicitly; such a document lives outside them or the test gains a named exception.

### D-005: inject.state filters on state.yaml status before deriving
**Decision:** Infrastructural decision. Measured before writing this (median of 9 spawns, `{}` on stdin): the code at the spike commit `a934a52` runs 81.3 ms in this repository and the code just before the shell commit (`f853627~1`) 83 to 85 ms, the same as today (85 ms, bare `node -e 0` at 41 to 44 ms). The shells caused no regression. The spike's 56 ms came from an empty bench fixture with no work items; today's code runs 62 to 64 ms there. In this repository, in-process timing splits the work into imports 12 ms, `listWork` 2 ms, `deriveState` over all 19 items 15 ms, `next` 0.6 ms, `loadConfig` 0.9 ms. `deriveState` reads each artifact and its phase markers, but the hook needs them only for open or blocked items. `work.mjs` gains `listOpenWork(root)`: the ids from `listWork` whose `readState(id).status` is `open` or `blocked`, in the same order. `inject.state` derives state only for those. The target, restated against bare node so machines compare: the spike ran 19.9 ms above bare, so "within 20 ms of 56 ms" means at most 40 ms above bare.
**Instead of:** lazy imports in the handler: the import cost is 12 ms and every module it loads (`work`, `next`, `config`, `paths`, and through them `yaml-lite`, `repos`, `git`, `sources`, `gate`, `unsafe`) is needed on the path that has an open item, so laziness saves little; the cost that grows with the repository is deriving closed items.
**Risks:**
- **RISK-006** A malformed `state.yaml` of a closed item now throws in `readState` as before and drops the whole open-items part. Mitigation: unchanged behaviour (`collectParts` already swallows it); no criterion changes it.
- **RISK-007** The measurement is noisy on a loaded machine. Mitigation: the criterion compares against bare node in the same run, and the phase block reports both repositories.

### D-006: the closed item's stray marker and verdict row stay
**Decision:** Infrastructural decision. `work/20261005-separate-core-paths-state-and-config/phases/5.reviewed` and verdict row 10 (`APPROVED`, phase 5, checkpoint) are left as they are. The cumulative review at 16:13Z marked every phase reviewed, so a `5.reviewed` marker would exist on the closed item either way, and the verdict row is append-only history that honestly records the misroute this item fixes. Both paths are kernel-owned and `guard.scope` denies a model write to them.
**Instead of:** deleting the marker and the row: it rewrites the history of a closed, committed item for no change in its derived state.
**Risks:**
- **RISK-008** A later reader of `verdicts.jsonl` counts two checkpoint approvals. Mitigation: the second row (phase 4) follows within 30 seconds and this design names the cause.

## Scope

**In:**
- Deny model writes under `.claude/ledger/`, and case variants of it and of `.tether/state/` (item 1).
- Route a continued agent's verdict with the phase from its latest instruction message (item 2).
- Keep the first character of the first porcelain line in `dirtyPaths` (item 3).
- Delete the stale header comment of `manifest.example.yaml` and add a legacy-path test (item 4).
- Restore the two lost spaces in `preflight.mjs:17` and `packet.test.mjs:101` (item 5).
- Measure `inject.state` before and after, and stop deriving closed items (item 6).

**Out:**
- Case-insensitive matching for `KERNEL_OWNED` paths under `work/`.
- `MultiEdit` and `NotebookEdit` in the `guard.scope` matcher (`.claude/settings.json` matches `Write|Edit`).
- `statusline.mjs`, which repeats the derive-then-filter pattern; it can adopt `listOpenWork` later.
- A `checkpoint n` form in the reviewer heading.
- Any edit under `work/20261005-separate-core-paths-state-and-config/` (D-006).

## Phase 1: Deny writes under the legacy state folder

**Touch set:**
- `.claude/lib/hooks/guard.scope.mjs`: add the legacy-state denial
- `.claude/lib/paths.mjs`: read only, `LEGACY.stateDir`, `MODEL_WRITABLE_STATE_FILES`
- `.claude/lib/migrate.mjs`: read only, stays unchanged
- `test/hooks/handlers.test.mjs`: handler-level guard cases
- `test/hooks/hooks.test.mjs`: spawned-hook deny case

**Changes:** In `guard.scope.mjs`, import `LEGACY` from `../paths.mjs` and add a predicate `isLegacyState(rel)` that is true when the lowercased `rel` starts with the lowercased `${LEGACY.stateDir}/`. `guardScope` checks it right after `isHookOnlyState` and denies with a reason naming the path, the legacy folder `.claude/ledger/`, and that only `harness migrate` moves files out of it. `isHookOnlyState` compares the lowercased `rel` against the lowercased state prefix and the lowercased model-writable list, so `.tether/state/branching.yaml` in any case stays writable. No other decision of the guard changes. In `handlers.test.mjs`, add one test calling `guardScope` directly; in `hooks.test.mjs`, add one test spawning `guard.scope.mjs`.

**Done when:**
- **T-1.1** `guardScope` returns `deny` for a Write and for an Edit to `.claude/ledger/drive-log.jsonl`, and for a Write to `.claude/ledger/ledger.jsonl`; the reason contains `.claude/ledger/` and `harness migrate`.
- **T-1.2** `guardScope` returns `deny` for a Write to `.Claude/Ledger/drive-log.jsonl` and to `.TETHER/State/drive-log.jsonl`.
- **T-1.3** `guardScope` returns `null` for a Write to `.tether/state/branching.yaml`, to `.Tether/State/Branching.yaml`, and to `.claude/ledger-notes.md`.
- **T-1.4** The spawned hook `.claude/hooks/guard.scope.mjs`, given a PreToolUse Write event for `.claude/ledger/drive-log.jsonl`, prints `permissionDecision` `deny`.
- **T-1.5** Driven: `harness drive --run` piping that Write event into `node .claude/hooks/guard.scope.mjs` exits 0 and its captured output contains `"permissionDecision":"deny"`.
- **T-1.6** `npm test` passes.

## Phase 2: Route a continued agent's verdict with its latest hints

**Touch set:**
- `.claude/lib/transcript.mjs`: add `latestHints`, share the parser
- `.claude/lib/hooks/route.verdict.mjs`: call `latestHints` instead of `spawnHints`
- `.claude/lib/hooks/emit.ledger.mjs`: read only, keeps `spawnHints`
- `.claude/lib/route.mjs`: read only, `phase_reviewed` writes one marker
- `test/hooks/handlers.test.mjs`: hint parsing cases
- `test/hooks/hooks.test.mjs`: spawned checkpoint routing case

**Changes:** In `transcript.mjs`, extract the field parsing of `spawnHints` into a private function from message text to `{ work_id, phase, lane, scope }`, with the regexes unchanged. `spawnHints(path)` keeps its selection (the first user message with text) and its output. Add `latestHints(path)`: over `entries(path, Infinity)`, take the user messages with text content (a string, or an array with `text` parts, joined as `spawnHints` joins them), keep those whose text matches `^\s*work:\s*[a-z0-9-]+` on some line, and parse the last one; with none, return the same all-null shape. In `route.verdict.mjs`, `routeTurn` calls `latestHints(agentTranscript(event))`; `applyVerdict`, `HEADINGS` and the precedence of heading over hints do not change. Add the tests below; the transcript fixtures use the continuation text verified in this session: a user text message starting `The coordinator sent a message while you were working:` with `work:`, `scope: checkpoint` and `phase: 4` on their own lines.

**Done when:**
- **T-2.1** For a transcript holding a spawn message (`work: <id>`, `scope: crosscheck`) and then the continuation message above, `latestHints` returns `work_id` `<id>`, `phase` 4 and `scope` `checkpoint`.
- **T-2.2** On the same transcript, `spawnHints` still returns `phase` null and `scope` `crosscheck`.
- **T-2.3** When a later user text message carries no `work:` line (a skill body containing `phase: <n>` and `scope: checkpoint` as prose), `latestHints` still returns the continuation's hints.
- **T-2.4** The spawned hook `.claude/hooks/route.verdict.mjs`, on a design item with 6 phases of which 1 to 4 are done and approved, given that transcript ending in a reviewer block headed `## Review: <id> · checkpoint (phases 1 to 4, base b5cc4bb to HEAD 4840897)` with `APPROVED` on the last line, writes `phases/4.reviewed` and no `phases/5.reviewed`.
- **T-2.5** The verdict row that T-2.4 appends to `verdicts.jsonl` has `phase` 4 and `scope` `checkpoint`.
- **T-2.6** `npm test` passes with every existing `route.verdict` and `emit.ledger` test unchanged.

## Phase 3: Porcelain paths, a stale template line and two spaces

**Touch set:**
- `.claude/lib/git.mjs`: `git()` trims the end only
- `.claude/bin/harness.mjs`: read only, the other `dirtyPaths` caller
- `.claude/lib/preflight.mjs`: line 17 spacing; prints the dirty paths
- `test/kernel/packet.test.mjs`: line 101 spacing
- `.claude/skills/branching/templates/manifest.example.yaml`: delete lines 1 to 2
- `.claude/lib/paths.mjs`: read only, `LEGACY_LOCATIONS`
- `test/kernel/git.test.mjs`: new, temporary-repository cases
- `test/kernel/paths.test.mjs`: legacy-path scan test

**Changes:** In `git.mjs`, `git()` returns `execFileSync(...).trimEnd()`; nothing else in the file changes. New `test/kernel/git.test.mjs` creates a temporary repository with `git init`, a committed file, then a modification, and calls the exported helpers. In `preflight.mjs:17` write `const out = { test: null, ...`; in `packet.test.mjs:101` write `const withComments = (value) =>`. In `manifest.example.yaml`, delete line 1 (`# Annotated example of .claude/branching/manifest.yaml`) and the bare `#` on line 2; the file then starts with `# GENERATED and SELF-HEALED`, and no line is reworded. In `paths.test.mjs`, add a test that walks `.claude/skills/`, `.claude/agents/` and `.claude/rules/` and asserts that no file contains any entry of `LEGACY_LOCATIONS`, naming each offending file and entry in the failure message.

**Done when:**
- **T-3.1** In a temporary repository whose only change is a modified tracked `src/a.txt` (porcelain ` M src/a.txt`), `dirtyPaths(root)` returns `["src/a.txt"]`.
- **T-3.2** In a temporary repository whose only change is a modified tracked `.claude/x.mjs`, `dirtyPaths(root)` returns `[]`.
- **T-3.3** In that repository `isRepo(root)` is `true` and `head(root)` matches `^[0-9a-f]{7,}$`.
- **T-3.4** No line of `.claude/skills/branching/templates/manifest.example.yaml` contains `.claude/branching`, and its first line starts with `# GENERATED`.
- **T-3.5** The legacy-path scan test in `test/kernel/paths.test.mjs` passes, and it fails when line 1 of the template is restored.
- **T-3.6** `preflight.mjs` contains `const out = { test: null` and `packet.test.mjs` contains `const withComments = (value) =>`.
- **T-3.7** Driven: with a tracked file outside `work/`, `.claude/` and `.tether/` modified, `harness preflight 20261006-fix-six-follow-ups-from-separate` prints a `tree` line whose every listed path exists on disk relative to the repository root.
- **T-3.8** `npm test` passes.

## Phase 4: SessionStart derives only open items

**Touch set:**
- `.claude/lib/work.mjs`: add `listOpenWork`
- `.claude/lib/hooks/inject.state.mjs`: derive only open and blocked ids
- `.claude/hooks/inject.state.mjs`: read only, the shell being measured
- `test/kernel/work.test.mjs`: `listOpenWork` cases
- `test/hooks/handlers.test.mjs`: closed item not listed
- `test/budgets.test.mjs`: read only, the 200 ms budget stays

**Changes:** First measure the "before" figures (T-4.4). In `work.mjs`, add `listOpenWork(root = projectRoot())`: `listWork(root)` filtered to ids whose `readState(id, root).status` is `open` or `blocked`, order kept. In `inject.state.mjs`, `openItemsPart` maps `listOpenWork(root)` through `deriveState` and drops its own status filter; `SHOWN_ITEMS`, the line format and the other parts do not change. Then measure "after". Method, same as phase 7 of the previous item: median of 9 spawns of `node .claude/hooks/inject.state.mjs` with `{}` on stdin, and median of 9 spawns of `node -e 0`, in the same run. Run it twice: with this repository as cwd, and with an empty temporary project holding only `.claude/` as cwd and `CLAUDE_PROJECT_DIR`. If T-4.5 misses, end with `PHASE STALLED` and report the in-process split (imports, `listOpenWork`, `deriveState`, `next`, `loadConfig`) so the lead can record why.

**Done when:**
- **T-4.1** `listOpenWork(root)` returns the ids of open and blocked items in `listWork` order, and omits done and abandoned items.
- **T-4.2** `injectState({}, { root })` on a project with one open, one blocked and one done item lists the open and blocked ids and not the done id.
- **T-4.3** `inject.state.mjs` imports `listOpenWork` and no longer imports `listWork`.
- **T-4.4** The phase block reports the before and after medians of the hook and of bare node for both working directories.
- **T-4.5** In this repository the after median of the hook is at most 40 ms above the bare median of the same run.
- **T-4.6** Driven: `harness drive --run "node .claude/hooks/inject.state.mjs"` exits 0 and its output contains `# Open work items` and `20261006-fix-six-follow-ups-from-separate`.
- **T-4.7** `npm test` passes, including `hooks start cold under the budget` with `hook_cold_ms` still 200.

## Open questions

- **OQ-001** `CLAUDE.md` (Project facts) still says sources are declared in `.claude/harness.json`; the config now lives in `.tether/config.json`. Should this item correct that line and add `CLAUDE.md` to the phase 3 scan? Owner: lead, with the user. Fallback: phase 3 scans only `.claude/skills/`, `.claude/agents/` and `.claude/rules/`, and `CLAUDE.md` stays as it is.

## Revision log
