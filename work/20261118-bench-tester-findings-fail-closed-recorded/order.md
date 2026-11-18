---
kind: order
lane: order
title: Bench tester findings fail closed, recorded
date: 2026-11-18
audience: developer
sources: [work/20261118-bench-tester-findings-fail-closed-recorded/request.md, work/20261118-planted-defect-benchmark-measures-the-tester/reviews/cumulative.md, work/20261118-planted-defect-benchmark-measures-the-tester/order.md, bench/run.mjs, bench/lib/tester-stop-hook.mjs, bench/selfcheck.mjs, bench/lib/tasks.mjs, bench/lib/spend.mjs, bench/lib/fixture.mjs, bench/adapters/trunk.mjs, bench/adapters/plugin.mjs, bench/test/tasks.test.mjs, bench/test/tester-stop-hook.test.mjs, bench/hidden/test-01-negative-quantity/key.json, bench/tasks/test-01-negative-quantity.json, scripts/test.mjs]
phases:
  - n: 1
    files:
      - bench/lib/tasks.mjs
      - bench/test/tasks.test.mjs
      - bench/run.mjs
    greps:
      - path: bench/lib/tasks.mjs
        pattern: 'export function testerRefusal'
      - path: bench/run.mjs
        pattern: 'testerRefusal\([\s\S]*buildTemplate\(\{'
    tests: true
    drive:
      - covers: T-1.1
        command: node bench/run.mjs --harness trunk --harness-root . --tasks test-01-negative-quantity --dry
        exit_code: 1
        contains: ["refused: tester task test-01-negative-quantity needs a harness with a plugin directory"]
  - n: 2
    files:
      - bench/lib/tester-stop-hook.mjs
      - bench/test/tester-stop-hook.test.mjs
    greps:
      - path: bench/lib/tester-stop-hook.mjs
        pattern: 'export function hookAnswer'
    tests: true
    drive:
      - covers: T-2.1
        command: echo not-json | node bench/lib/tester-stop-hook.mjs
        exit_code: 0
        contains: ["permissionDecision", "deny", "end your turn"]
  - n: 3
    files:
      - bench/lib/key-outcome.mjs
      - bench/test/key-outcome.test.mjs
      - bench/selfcheck.mjs
    greps:
      - path: bench/lib/key-outcome.mjs
        pattern: 'export function keyOutcome'
      - path: bench/lib/key-outcome.mjs
        pattern: 'key failed to load'
      - path: bench/selfcheck.mjs
        pattern: 'from "\./lib/key-outcome\.mjs"'
      - path: bench/selfcheck.mjs
        pattern: '\bfunction keyOutcome\b'
        absent: true
    tests: true
    drive: true
---
# Order: Bench tester findings fail closed, recorded

## Problem
The cumulative review of item 20261118-planted-defect-benchmark-measures-the-tester left three Minor findings that each let a paid tester run go wrong quietly. `bench/run.mjs:118` learns that the harness has no plugin directory only after the paid session, then throws with no record and no `spend.log` line. `bench/lib/tester-stop-hook.mjs:24-31` swallows a parse failure and prints nothing, which allows the send (checked on the base: `echo not-json | node bench/lib/tester-stop-hook.mjs` prints nothing and exits 0). `bench/selfcheck.mjs:36` counts any key run that is not green as a live defect, so a key test that fails to load reads as `ok`. No paid run is part of this item.

## Decisions

### D-001: Refuse a tester task on a harness without a plugin directory before anything is built
**Decision:** `bench/lib/tasks.mjs` exports `TESTER_KIND` and a pure `testerRefusal(tasks, pluginDir)` that returns `tester task <id> needs a harness with a plugin directory; use --harness plugin` for the first selected task of kind `tester` when `pluginDir` is not set, else `null`. `main` in `bench/run.mjs` calls it right after the `no tasks match` check, with `adapter.pluginDir?.(harnessRoot)`, and refuses in the form the spend refusal already uses (`refused: <reason>` on stderr, exit code 1, return). It runs before `buildTemplate`, so `--dry` refuses too and the drive needs no fixture cache or spend. The refusal looks at every selected tester task, recorded runs included, as `taskBudgetRefusal` does. The logic lives in `bench/lib/` because `run.mjs` runs `main` at import. This gives up a dry plan for tester tasks on the trunk harness, a plan that could never run.
**Instead of:** record a failed run after the paid session, as the request also allows: it still spends up to the $10 `budget_usd` of `bench/tasks/test-01-negative-quantity.json` to learn a fact known before the first call.
**Risks:**
- **RISK-001** The check at `bench/run.mjs:118` still throws after a session when a plugin directory exists but lacks the kernel readers. Mitigation: it stays as the last guard; the plugin adapter builds `dist/` before the loop, so the readers exist on every run that reaches it.

### D-002: The stop hook denies input it cannot read
**Decision:** `bench/lib/tester-stop-hook.mjs` exports a pure `hookAnswer(raw)`: when `raw` does not parse as JSON, or the parsed value has no string `hook_event_name` (empty input, `null`, an array, a bare object), it returns the same denial `stopAnswer` gives a developer send, with `STOP_REASON`; otherwise it returns `stopAnswer(parsed)`. `main` writes `hookAnswer(raw)` when it is not `null`, as today. The hook is registered only on `PreToolUse` with matcher `Agent|Task`, so a denial can only stop a send, and an unreadable send fails closed. This gives up telling an unreadable input from a developer send in the transcript: both carry one reason.
**Instead of:** exit 2 with a stderr line: a second answer shape to pin, where the JSON denial is the shape the hook's spawn test already proves the host reads.
**Risks:**
- **RISK-002** A host input without `hook_event_name` would now deny the tester send as well, ending the run before the verdict. Mitigation: the run then records `found: false` with `STOP_REASON` in its texts, a visible FAIL rather than a silent overrun; `stopAnswer` already needs that field to deny anything.

### D-003: The key outcome moves to a library and reports a load failure first
**Decision:** a new `bench/lib/key-outcome.mjs` exports `isGreen(run)` (moved unchanged) and `keyOutcome(kind, keyRun)`. For kinds `defect` and `trap`, a key run that is `null`, `missing`, or has `suitesFailed > 0` returns `{ ok: false, label: "key failed to load" }` before any other rule. After that, `defect` returns `{ ok: keyRun.failed > 0, label: "defect live" }` and `trap` returns `{ ok: isGreen(keyRun), label: "trap holds" }`; any other kind stays `{ ok: true, label: "seeded" }`. `bench/selfcheck.mjs` imports both and drops its own copies, so its printed line keeps today's shape with the new label in place. This gives up the old reading that a defect key with no failing test but no load error (zero tests) is live: it now prints `BAD`.
**Instead of:** export `keyOutcome` from `selfcheck.mjs` behind the main guard `tester-stop-hook.mjs:34` uses: it wraps about twenty top-level lines in a function only to open a test seam, where every other tested bench rule already lives in `bench/lib/`.

## Scope
**In:**
- The tester refusal in `bench/run.mjs` and `bench/lib/tasks.mjs` (D-001).
- The unreadable input denial in `bench/lib/tester-stop-hook.mjs` (D-002).
- The key outcome in `bench/lib/key-outcome.mjs` and `bench/selfcheck.mjs` (D-003).
- Their unit tests under `bench/test/`.

**Out:**
- Any paid benchmark run, and any drive that reaches the run loop.
- `bench/README.md`, the tester agent and skill, the setting `testing`, SDR 00004 items TF-006 to TF-009.
- `bench/lib/ask-probe-hook.mjs:31`, which the review names as the same pattern; the brief does not list it.
- The review's two other Minor findings (the test-01 table and `test/repo/markdown-paths.test.mjs`).

## Phase 1: A tester task on the trunk harness is refused before any spend
**Touch set:**
- `bench/lib/tasks.mjs`: add TESTER_KIND and testerRefusal
- `bench/test/tasks.test.mjs`: pin the refusal rule
- `bench/run.mjs`: call the refusal in main
- `bench/adapters/trunk.mjs`: read only, no pluginDir export
- `bench/lib/spend.mjs`: read only, refusal form to match

**Changes:** per D-001. `run.mjs` imports `TESTER_KIND` and `testerRefusal` from `./lib/tasks.mjs` and deletes its own `TESTER_KIND` constant (line 23). The refusal block sits directly after `if (!tasks.length) throw …` (line 327), before `buildTemplate`. `gradeTesterRun` and its check at line 118 stay as they are. Unit tests in `tasks.test.mjs` call `testerRefusal` with tasks from `loadTasks` and with `pluginDir` from the real adapters (`trunk.pluginDir?.("/r")` is `undefined`, `plugin.pluginDir("/r")` a path).

**Done when:**
- **T-1.1** `node bench/run.mjs --harness trunk --harness-root . --tasks test-01-negative-quantity --dry` exits 1 and prints `refused: tester task test-01-negative-quantity needs a harness with a plugin directory; use --harness plugin`.
- **T-1.2** `testerRefusal(loadTasks("kind:tester"), trunk.pluginDir?.("/r"))` returns exactly the reason of T-1.1 (test-01 sorts first), and `testerRefusal(loadTasks("kind:tester"), plugin.pluginDir("/r"))` returns `null`.
- **T-1.3** `testerRefusal(loadTasks("all"), undefined)` returns `null`, so the 18 request tasks still run on the trunk harness.
- **T-1.4** In `bench/run.mjs` the `testerRefusal(` call comes before the `buildTemplate({` call (the phase grep), and the refusal path sets `process.exitCode = 1` and returns before `adapter.build` and the run loop.
- **T-1.5** `node bench/run.mjs --harness plugin --tasks test-01-negative-quantity --dry --out bench/.runs/none.json` exits 0 and prints `planned $10.00 for 1 run(s)` (one run at the task's `budget_usd` 10; the path holds no file, so no run counts as recorded).
- **T-1.6** `npm test` exits 0.

## Phase 2: The stop hook ends the run when its input does not parse
**Touch set:**
- `bench/lib/tester-stop-hook.mjs`: add hookAnswer, main uses it
- `bench/test/tester-stop-hook.test.mjs`: pin unreadable input denial

**Changes:** per D-002. `stopAnswer`, `stopSettings`, `TESTER`, `STOP_REASON` and `SEND_TOOLS` keep their signatures and results. `main` reads stdin as today and hands the whole text to `hookAnswer`. New tests call `hookAnswer` directly and spawn the hook file with a non-JSON stdin, as the existing spawn test does.

**Done when:**
- **T-2.1** `echo not-json | node bench/lib/tester-stop-hook.mjs` exits 0 and prints the `PreToolUse` denial whose `permissionDecisionReason` is `STOP_REASON` (it holds `end your turn`).
- **T-2.2** `hookAnswer` returns the denial `DENIAL` of the test file, deep-equal, for each of `""`, `"not json"`, `"null"`, `"[]"` and `'{"tool_name":"Agent"}'`.
- **T-2.3** `hookAnswer` of a JSON developer send through `Agent` returns `DENIAL`, and of a JSON tester send returns `null`.
- **T-2.4** Spawned with stdin `not json`, the hook exits 0 and its stdout parses to `DENIAL`.
- **T-2.5** The four tests in `bench/test/tester-stop-hook.test.mjs` at base 4e67fa6d pass with their bodies unedited: `git diff 4e67fa6d -- bench/test/tester-stop-hook.test.mjs` shows added lines only.
- **T-2.6** `npm test` exits 0.

## Phase 3: The self check reports a key test that fails to load
**Touch set:**
- `bench/lib/key-outcome.mjs`: new, isGreen and keyOutcome
- `bench/test/key-outcome.test.mjs`: new, pin each outcome branch
- `bench/selfcheck.mjs`: import both, drop own copies
- `bench/hidden/test-01-negative-quantity/key.json`: read only, kinds in use

**Changes:** per D-003. `selfcheck.mjs` deletes `isGreen` and `keyOutcome` (lines 31-39), imports them from `./lib/key-outcome.mjs`, and keeps every call site and printed line as it is. Before the first edit, capture the before-image on the base: `node bench/selfcheck.mjs > <scratch>/selfcheck.base.txt` (exit 0 expected). Each unit test asserts both `ok` and `label`.

**Done when:**
- **T-3.1** `keyOutcome("defect", r)` returns `{ ok: false, label: "key failed to load" }` for `r` = `{ passed: 0, failed: 0, total: 0, suitesFailed: 1 }`, for `{ passed: 0, failed: 0, total: 0, missing: true }`, and for `null`.
- **T-3.2** `keyOutcome("defect", { passed: 2, failed: 1, total: 3, suitesFailed: 0 })` returns `{ ok: true, label: "defect live" }`; with `{ passed: 3, failed: 0, total: 3, suitesFailed: 0 }` it returns `{ ok: false, label: "defect live" }`.
- **T-3.3** `keyOutcome("trap", { passed: 0, failed: 0, total: 0, suitesFailed: 1 })` returns `{ ok: false, label: "key failed to load" }`; `keyOutcome("trap", { passed: 2, failed: 0, total: 2, suitesFailed: 0 })` returns `{ ok: true, label: "trap holds" }`; `keyOutcome("silent", null)` returns `{ ok: true, label: "seeded" }`.
- **T-3.4** `bench/selfcheck.mjs` imports `isGreen` and `keyOutcome` from `./lib/key-outcome.mjs` and defines neither (the phase greps).
- **T-3.5** `node bench/selfcheck.mjs` exits 0, and `diff` of its output against the base capture is empty once any `building fixture template` line is dropped from both.
- **T-3.6** `npm test` exits 0.

## Open questions
none

## Revision log
