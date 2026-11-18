## Review: 20261118-mock-format-stub-server-data-catalog · cumulative

Approved: every request sentence and all 47 testable criteria are met with tests and the two drives. One Major does not block: the new SQL approval ledger can be forged through Bash.

Requirements: PASS (8)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "a service with the role mock in .picket/env/ is defined in Picket's own small definition format" | request.md:3 | PASS | src/lib/shared/mocks/definition.mts:152; definition.test.mts T-1.1, T-1.2 |
| S-2 | "served by a stub server Picket provides, behind an adapter with a line budget" | request.md:3 | PASS | src/lib/shared/mocks/stub-server.mjs:49, stub.mts:68; test/timing/budgets.test.mjs stub_server_lines 100, mock_adapter_lines 150 |
| S-3 | "A format change is handled by recording again, never by a migration script." | request.md:3 | PASS | src/lib/shared/mocks/definition.mts:56 |
| S-4 | "A pass through a mock stays flagged on the result, on the flow and on the item's closing line, which names the real services no test reached." | request.md:3 | PASS | src/lib/shared/scenarios/replay.mts:61, src/lib/verbs/env/replay.mts mockedFlows/flowText, src/lib/verbs/close/close.mts:285-291 |
| S-5 | "a catalog names how each kind of test data is obtained" | request.md:5 | PASS | src/lib/shared/catalog/entry.mts:12, 127 |
| S-6 | "the kernel runs a SQL file the user approved, through the database's own client, with a connection string the developer enters by hand" | request.md:5 | PASS | src/lib/verbs/data/run.mts:57-77, approve.mts:12; live database run DEFERRED as T-8.6 |
| S-7 | "they create or find their own data and write only to records they created" | request.md:5 | PASS | src/lib/shared/catalog/entry.mts:87-94, src/lib/shared/scenarios/keep.mts:90-96 |
| S-8 | "Not tied to one database engine or runtime" | request.md:11 | PASS | there is no driver; the client is the data service's (run.mts:58); connection.mts:35 reads both the key=value form and the URL form |

Alignment: PASS (47; T-2.7 and T-8.6 DEFERRED: QA, release QA pass)
Decisions: HONOURED
Regression: 1 unrequested behaviour change. guard.bash `leadOnlyWrapped` (src/lib/hooks/guard/bash/payloads.mts:164-176) now refuses a spawned agent's `picket drive --run` whose payload holds `$(` or a backtick and names picket. Probed: `picket drive --run "echo $(date) picket"` is allowed at base and denied at HEAD. This is a tightening, reported in phase 7's Root cause.
Sources: none
Questions: none
Findings: 0 critical, 1 major, 3 minor
- [Major] src/lib/verbs/data/run.mts:41: `approvedFile` trusts `approvalStatus` (src/lib/shared/data/approvals.mts:33-40), which reads `.picket/state/data/approvals.jsonl`. A spawned developer can append to that file through Bash: guardOutput as `abcd-developer` allows `echo '{...}' >> .picket/state/data/approvals.jsonl`, `tee -a`, `cp` and `node -e appendFileSync`. guard.scope, which D-006 relies on, covers only Edit and Write. Scenario: the developer writes data/cleanup.sql and a sql entry, then appends a row holding that file's sha256. After the tester blocks with "its SQL file runs with picket data run", the lead runs `picket data run <id> cleanup`, and SQL the user never read runs against a real database. The same gap exists before this change for comments.jsonl and waivers.jsonl. Fix: make guard.bash deny agent writes under `.picket/state/` (at least `data/`), with closure seeds. Likelihood: low. Leave it: SQL approvals stop Edit/Write forgery only; a Bash append by an agent still counts as approval until guard.bash covers .picket/state.
- [Minor] work/20261118-mock-format-stub-server-data-catalog/design.md:36: phase 1's must_have grep `'"E12"'` in src/lib/verbs/env/check.mts no longer matches at HEAD, so `picket verify 1` would fail. Phase 2 moved the id to src/lib/shared/mocks/definition.mts:12 (`MOCK_RULE`) and reported the move in its block. Amend the grep to definition.mts `MOCK_RULE = "E12"`.
- [Minor] src/lib/shared/catalog/resolve.mts:18: `stepTexts` repeats src/lib/shared/catalog/entry.mts:81-85 word for word. `readFront` at src/lib/shared/mocks/definition.mts:36 repeats entry.mts:47. The `{data:<entry>.<capture>}` grammar is written in entry.mts:41, resolve.mts:8, scenarios/rules.mts (`CATALOG_VALUE`) and keep.mts:91 (Dr1, Rf2). Export one `stepTexts` and one data-reference pattern.
- [Minor] src/lib/verbs/data/run.mts:73: the run row's sha256 is read again after the run, not taken from the approved digest. If the file changes during the run, the row records an unapproved digest without saying so. Record the digest that `approvedFile` checked.

Classes: Se4
Checked: ran the T-1.5 and T-5.5 drives (exit 2, "E12 fraud-mock", "E13 open-order"). Compared developer drive and `$PWD` forms against the guard at base and HEAD. dist stub-server `--health` runs standalone. craft-lint is clean. The scenario core is 560 of 600 lines. Mutation killed, silenced empty. Approve/show path escapes (`../compose.yaml`, `/etc/hosts`, `data/../compose.yaml`) are tested. The connection value never appears in compose args or the runs row.

APPROVED
