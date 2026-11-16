## Review: 20261115-close-saved-scenario-review-follow-ups · cumulative

Approved: all eight requested follow-ups are in the code with tests that check them. Every behaviour change the request did not ask for was ordered by the design record and listed there as a risk.

Requirements: PASS (8)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Narrow the match so those keys pass while real secret names ... are still masked and refused." | request.md:3 | PASS | config-entries.mts:95-103; config-entries.test.mts T-1.1, drive-log.test.mts T-1.2, rules.test.mts T-1.3; new rules.variants.test.mts closure test |
| S-2 | "Refuse it at any depth, as the drive log's mask already does." | request.md:4 | PASS | rules.mts:63-70 over mapSecretLeaves (config-entries.mts:107-116); rules.test.mts T-2.2 |
| S-3 | "Print and summarise it as `unstable`, still not blamed on the change." | request.md:5 | PASS | compare.mts:15; verbs/env/replay.test.mts checks "S-0001 unstable ... 1 unstable" with ok true; BLAMED at compare.mts:6 unchanged |
| S-4 | "Export them from `start.mts` and remove the copies." | request.md:6 | PASS | The helpers are exported from shared/env/stack-start.mts, not start.mts. D-004 chose this because shared code may not import verbs (test/repo/conventions.test.mjs:141). The copies are gone from start.mts and base-run.mts |
| S-5 | "Compare the keys the way verify does and refuse a stale replay." | request.md:7 | PASS | close.mts:129-150; close/index.test.mts stale and cannot-be-checked cases |
| S-6 | "Write them only after the commit succeeds, or restore them when it fails." | request.md:8 | PASS | apply.mts:98-101, keep.mts:170-179; two failed-commit tests in route/index.test.mts |
| S-7 | "Keep such scenarios in the affected set." | request.md:9 | PASS | replay.mts:65; replay.test.mts null-card case; the verb test prints "S-0002 blocked" |
| S-8 | "`replay.test.mts` gains the missing `affected` case with no container engine, and the error casts in the scenario code check `instanceof Error`." | request.md:10 | PASS | no-engine affected test in verbs/env/replay.test.mts; format.mts:201, http.mts:10-13, base-run.mts:143, commit.mts:71; no `as Error` or `as {` left under src/lib/shared/scenarios |

Alignment: PASS (37)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: I tried to break each fix and could not:
- **Ordinary code names hiding secrets:** `authorization_code`, `oauth.code`, `X-Auth-Code`, `device_code` and `countryCodeSecret` still count as secret names.
- **Extra matches:** a few more snake_case names now match (for example `status_as_of` matches `sas`). The plan accepted that cost under RISK-002 and OQ-003.
- **Restore after a failed commit:** `commitOwned` stages into a private index, so `restoreKept` leaves the shared index clean, and the sha is null only after a throw or an empty commit.
- **Stale replay key:** the key close compares is built the same way replay builds it (replay.mts:111,119), and the result rows sit outside the environment hash.
- **Replay with a recorded reason:** close still accepts it early. That is the earlier D-008, which D-005 keeps.
- **Phase 4 refactor:** the `TimeoutError` (a `DOMException`) still narrows as an `Error`. The start, base-run and http tests are unchanged, so the refactor is pinned (Pb1 ok).
- **Project checks:** craft lint found 0 errors and 0 candidates, the summary's `silenced` list is empty, and the mutant was killed.

APPROVED
