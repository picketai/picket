## Review: 20261114-standard-test-environment-and-env-verbs · cumulative

Approved: every request sentence and every plan criterion that is not deferred has code and tests behind it. One Major remains: closing an item can delete the test stack of another open item that shares its ticket key.

Requirements: PASS (12)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "`.picket/env/` at the umbrella root on the Compose Specification, run by Docker or Podman with Linux containers" | request.md:3 | PASS | src/lib/shared/env/engine.mts:101-106, :162-167, :180-186 |
| S-2 | "service roles app, dependency, mock, shared, data and optional seed" | request.md:3 | PASS | src/lib/shared/env/standard.mts:8; shared is `x-picket.shared` per D-002, src/lib/shared/env/model.mts:103 |
| S-3 | "the check rules that verify an environment follows the standard" | request.md:3 | PASS | src/lib/shared/env/rules.mts:17-56 (E1 to E8), instep.mts:70-78 (E9), trial.mts:82-88 (E10) |
| S-4 | "`picket env init` ... checks the machine, scans ... decides each one with the user and creates a work item whose request lists every step, writing no environment files itself" | request.md:3 | PASS | src/lib/verbs/env/init.mts:51-71; decisions.mts:117-131; T-4.4 and T-4.5 in test/cli/env.test.mjs |
| S-5 | "build a changed service from its worktree and the others from the root checkout" | request.md:3 | PASS | src/lib/shared/env/build-plan.mts:51-58 through `locate`; T-5.1 |
| S-6 | "image name picket/<service>-<item>:<commit>" | request.md:3 | PASS | src/lib/shared/env/standard.mts:28; a dirty context adds `-t<tree7>` after the commit (D-006) |
| S-7 | "start" | request.md:3 | PASS | src/lib/verbs/env/start.mts:86-103 |
| S-8 | "stop at session end" | request.md:3 | PASS | src/lib/hooks/env/stacks/index.mts:33-36 |
| S-9 | "purge at item close" | request.md:3 | PASS | src/lib/verbs/close/close.mts:222-232, :247, :256 (see the Major) |
| S-10 | "a fixture system in this repository to test it against" | request.md:3 | PASS | test/fixtures/env/umbrella/, fake-engine.mjs, test/env/*.engine.mjs |
| S-11 | "do not limit the standard to them; any other runtime must be accommodated" | request.md:5 | PASS | src/lib/shared/env/profiles.mts:61-67 |
| S-12 | "the standard must not be tied to one database engine or one connection type" | request.md:5 | PASS | src/lib/shared/env/config-entries.mts:13-18; T-3.1 covers SQL Server, Postgres, Mongo, Oracle, JDBC and Redis forms |

Alignment: PASS (60 PASS, 6 DEFERRED: T-2.7 and T-10.1 to T-10.3 to operations at the release test job; T-10.4 and T-10.5 to QA)
Decisions: HONOURED
Regression: none (close's new context fields have one caller, close/index.mts:12; verify's optional runner has no caller outside the verb; the SessionStart group gains only env.stacks)
Sources: none
Questions: none
Findings: 0 critical, 1 major, 0 minor
- [Major] src/lib/verbs/close/close.mts:212-216: `itemStack` falls back to `stackName(itemKey(state))` when no stacks.json entry names the closing item, without checking whether that stack is recorded for another item. Two items opened from the same ticket (`--source PROJ-481`) share the stack `picket-proj-481` (D-006 naming). If B runs `env start` after A, that overwrites A's entry, and closing A then runs `down --volumes` on B's stack while B is open. I probed this from a scratchpad script against src: B's status was `open`, its container and its volume `orders-data-of-b` were in `environment.removed`, and B's stacks.json entry was dropped. This breaks D-007's RISK-012 mitigation ("only `close` purges an item it is closing"). The fix: in `itemStack`, return null (or a warning) when stacks.json records that stack name for a different item, or when `labelledItem` names another item that is open or blocked. Also make `env start` refuse a stack recorded for another open item. Likelihood: low. Leave it: "Two open items from the same ticket share one test stack; closing either one removes the other's stack and volumes."
Classes: Rf3
Checked: secret masking in scan, request and scan.json (T-3.5, T-4.4); the PICKET_ENGINE allow-list in findEngine and in the hook's rebuilt stop command (stacks.mts:35-45); the purge order with evidence written before down (purge.mts:75-84); the phase 6 bug fix has a test that runs the changed code (build-plan.test.mts:57); silenced is empty; the mutant at src/lib/hooks/env/stacks/index.mts:22 was killed; lint.craft's TK2 hit at config-entries.test.mts:59 is a false positive on the literal "K6"; the timing test walks every hook bundle (budgets.test.mjs:91).

APPROVED
