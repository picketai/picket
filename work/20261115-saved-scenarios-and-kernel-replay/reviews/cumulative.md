## Review: 20261115-saved-scenarios-and-kernel-replay · cumulative

Approved: every request sentence and every plan criterion has code and test evidence, T-5.6 is deferred by the plan, and the five findings are all Minor.

Requirements: PASS (15)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "a card in words over recorded steps, with the header `id`, `kind`, `covers`, `intent` and optionally `flow`, `supersedes`, `status`, and `format: 1`" | request.md:3 | PASS | src/lib/shared/scenarios/format.mts:5,34,57-67 |
| S-2 | "Step words are a closed list: `request`, `expect`, `capture`, `wait`... An unknown word fails with its name." | request.md:3 | PASS | format.mts:4,153 |
| S-3 | "The HTTP engine (Node's `fetch`) sits behind an adapter with a line budget that a test enforces, and so does the core." | request.md:3 | PASS | scenarios/http.mts:10-19; test/timing/budgets.test.mjs:22-23,80-85 |
| S-4 | "...becomes a saved scenario... replays it once from the start on its own, and keeps it only when that replay passes." | request.md:5 | PASS | keep.mts:76-85; verbs/env/replay.mts:129-140; route.mts keepsOf filters `passed` |
| S-5 | "A captured secret is stored by name, never by value." | request.md:5 | PASS | rules.mts:57-84; drive-log.mts maskedBody; keep.mts:80 |
| S-6 | "A fixed date is refused in favour of a relative one." | request.md:5 | PASS | rules.mts:34; keep.mts:40-42 |
| S-7 | the three safety rules, "checked by the kernel before it runs a file" | request.md:7 | PASS | scenarios/replay.mts:29-32,47-49; rules.mts:38-46; values.mts:26-33 |
| S-8 | "A verb replays saved scenarios... with no model... names the commit it ran on, and is stored" | request.md:9 | PASS | verbs/env/replay.mts:108-127; results.mts:9-22 |
| S-9 | "a scenario already failing at the base is reported as failing before the item and is not blamed on it" | request.md:9 | PASS | compare.mts:8-23; base-run.mts:165-177 |
| S-10 | "A failure counts only after a second run confirms it; a scenario that flips is marked unstable." | request.md:9 | PASS | scenarios/replay.mts:38-43 (row `unstable: true`); see Minor 1 |
| S-11 | "the fast lane replays the saved scenarios that call a service whose source the change touched and compares with the last known results" | request.md:11 | PASS | scenarios/replay.mts:62-66; close.mts:117-128 |
| S-12 | "A change meant to alter tested behaviour leaves the fast lane for the order lane." | request.md:11 | PASS | src/skills/expediting/SKILL.md Rules; close.mts refusal text |
| S-13 | "the old one gets `status: deprecated` and `superseded_by`, the new one `supersedes`; ids are never reused and files never deleted" | request.md:13 | PASS | keep.mts:108-158; files.mts:59-65 |
| S-14 | "The architect names a foreseen replacement in the plan and the user approves it at the gate" | request.md:13 | PASS | work/gate.mts:150-158; src/agents/architect.md |
| S-15 | "A scenario changed by hand is noticed by its fingerprint, checked against the safety rules, replayed, and reported as changed by hand." | request.md:13 | PASS | files.mts:39; verbs/env/replay.mts:123,170 |

One requirement was left out to stay within the 15-row cap: "not tied to one runtime or one database". It passes, because the format speaks only HTTP to named services.

Alignment: PASS (64 PASS, 1 DEFERRED: T-5.6, owner operations, the release workflow's test job)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 5 minor
- [Minor] src/lib/shared/scenarios/compare.mts:15: when a run fails and then passes, `classify` returns `passed` before it checks `unstable`. The printed line and the summary say `passed`, and only the stored row carries `unstable: true` (replay.mts:42). This is the order phase 3 asks for, so it is a note for the architect: either print a flipped pass as `unstable` (still not blamed), or say in D-004 that the flag lives on the row.
- [Minor] src/lib/shared/scenarios/base-run.mts:104: `proveBuilds`, `hostUrl` (line 113) and `endpoints` copy start.mts's private helpers (Dr1, Rf6). D-003 says stack work reuses start.mts, but phase 5's touch set left start.mts out. Export the helpers from start.mts and remove the copies.
- [Minor] src/lib/verbs/close/close.mts:120: the fast-lane close accepts the latest `affected` run without checking its key against the working tree. If the code is edited after the replay, the close still passes. This matches D-008's wording, so it is a note for the architect: compare `run.key` with the working key the way verify does.
- [Minor] src/lib/shared/route/apply.mts:137: kept scenario files are written before `commitPhase`. If the root commit then fails (for example, a pre-commit hook rejects it), the new card and the deprecated old card stay uncommitted and are hidden by the `.picket/` bookkeeping prefix (OQ-003). Write the files only after the commit succeeds, or restore them when it fails.
- [Minor] src/lib/shared/scenarios/replay.mts:65: `affected` drops a scenario whose card does not parse, so `--affected` never reports a hand-broken card as `blocked`. Keep scenarios with `card === null` in the affected set.

Classes: none
Checked: rule 1 bypass through `{orders}@evil.example/x` (Node's `new Request` refuses URLs with credentials); forged candidate files (guard.scope denies agent writes under `.picket/state/`); rule 3 coverage (BRACED covers every PLACEHOLDER match); the guard closure under symlinks and `../`; no guard deleted or weakened; budget numbers recomputed (core 554 lines, adapter 21); mutation killed; silenced list empty; both budget comments approved in comments.jsonl.

APPROVED
