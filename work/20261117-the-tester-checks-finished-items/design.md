---
kind: design
lane: design
title: The tester checks finished items
date: 2026-11-17
audience: developer
sources:
  - work/20261117-the-tester-checks-finished-items/request.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - work/20261115-saved-scenarios-and-kernel-replay/design.md
  - src/lib/shared/verdicts.mjs
  - src/lib/shared/route/route.mts
  - src/lib/shared/route/plan.mts
  - src/lib/shared/route/apply.mts
  - src/lib/shared/route/commit.mts
  - src/lib/hooks/route/verdict/index.mts
  - src/lib/shared/work/next-step.mts
  - src/lib/shared/work/send.mts
  - src/lib/shared/work/snapshot.mts
  - src/lib/shared/work/block.mts
  - src/lib/shared/work/declared-checks.mts
  - src/lib/shared/agent-name.mts
  - src/lib/shared/config.mjs
  - src/lib/shared/review-summary.mts
  - src/lib/shared/scenarios/files.mts
  - src/lib/shared/scenarios/keep.mts
  - src/lib/shared/scenarios/replay.mts
  - src/lib/shared/scenarios/results.mts
  - src/lib/verbs/env/replay.mts
  - src/lib/verbs/env/start.mts
  - src/lib/verbs/close/close.mts
  - src/lib/verbs/close/block.mts
  - src/lib/verbs/reply/table.mts
  - src/lib/verbs/reply/index.mts
  - src/lib/verbs/packet/packet.mjs
  - src/lib/hooks/guard/scope/index.mts
  - src/lib/hooks/guard/bash/payloads.mts
  - src/lib/hooks/guard/block/index.mts
  - src/lib/hooks.mts
  - src/agents/reviewer.md
  - src/agents/developer.md
  - test/repo/closures.test.mjs
phases:
  - n: 1
    files: [src/lib/shared/testing/results.mts, src/lib/shared/testing/results.test.mts, src/lib/shared/testing/derive.mts, src/lib/shared/testing/derive.test.mts, src/lib/shared/testing/report.mts, src/lib/shared/testing/report.test.mts]
    greps:
      - path: src/lib/shared/testing/results.mts
        pattern: \bCASE_KINDS\b
      - path: src/lib/shared/testing/derive.mts
        pattern: export function deriveVerdict\b
      - path: src/lib/shared/testing/derive.mts
        pattern: export function testedCriteria\b
      - path: src/lib/shared/testing/report.mts
        pattern: export function renderReport\b
    tests: true
    drive: false
    security: false
  - n: 2
    files: [src/lib/shared/config.mjs, src/lib/shared/config.schema.json, test/kernel/config.test.mjs, src/lib/shared/work/verdict-log.mts, src/lib/shared/testing/facts.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/brief.test.mts, src/lib/verbs/test/brief.mts, src/lib/verbs/test/report.mts, src/lib/verbs/test/classify.mts, src/lib/verbs/test/note.mts, src/lib/verbs/test/ask.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/config.mjs
        pattern: \btesting\b
      - path: src/lib/shared/config.schema.json
        pattern: '"testing"'
      - path: src/lib/cli/registry.mts
        pattern: '"test brief"'
      - path: src/lib/cli/registry.mts
        pattern: '"test ask"'
      - path: src/lib/shared/testing/brief.mts
        pattern: export function compileBrief\b
    tests: true
    drive:
      - covers: T-2.8
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 3
    files: [src/lib/shared/testing/cases.mts, src/lib/shared/testing/cases.test.mts, src/lib/verbs/test/case.mts, src/lib/verbs/test/rerun.mts, src/lib/verbs/test/case.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"test case"'
      - path: src/lib/cli/registry.mts
        pattern: '"test rerun"'
      - path: src/lib/shared/testing/cases.mts
        pattern: \breplayScenarios\b
      - path: src/lib/shared/testing/cases.mts
        pattern: \bserviceEndpoints\b
    tests: true
    drive:
      - covers: T-3.7
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 4
    files: [src/lib/hooks/guard/blackbox/index.mts, src/lib/hooks/guard/blackbox/index.test.mts, src/lib/hooks/guard/blackbox/index.variants.test.mts, src/lib/hooks.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/tester.variants.test.mts, src/lib/hooks/guard/scope/index.mts, src/lib/hooks/guard/scope/index.test.mts, src/lib/shared/agent-name.mts, src/lib/shared/agent-name.test.mts, test/repo/closures.test.mjs, test/repo/hook-list.test.mjs, test/hooks/guard.blackbox.test.mjs, docs/reference/hooks.md]
    greps:
      - path: src/lib/hooks.mts
        pattern: '"guard.blackbox"'
      - path: src/lib/hooks/guard/bash/payloads.mts
        pattern: \bTESTER_VERBS\b
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: test\.md
      - path: src/lib/shared/agent-name.mts
        pattern: \btester\b
      - path: test/repo/closures.test.mjs
        pattern: guard/blackbox/index\.variants\.test\.mts
    tests: true
    drive:
      - covers: T-4.8
        command: node scripts/test.mjs unit build product timing
        exit_code: 0
    security: true
  - n: 5
    files: [src/lib/shared/verdicts.mjs, src/lib/shared/route/route.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/route/apply.mts, src/lib/shared/work/block.mts, src/lib/shared/work/block.test.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/guard/block/index.test.mts, src/lib/hooks/guard/block/index.variants.test.mts, test/repo/closures.test.mjs, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/verdicts.mjs
        pattern: \bTESTER_VERDICTS\b
      - path: src/lib/shared/route/plan.mts
        pattern: \btested\b
      - path: src/lib/shared/work/block.mts
        pattern: 'Test:'
      - path: src/lib/hooks/guard/block/index.mts
        pattern: \bTESTER_VERDICTS\b
    tests: true
    drive:
      - covers: T-5.8
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 6
    files: [src/agents/tester.md, src/skills/testing/SKILL.md, src/skills/testing/steps/matrix.md, src/skills/testing/steps/cases.md, src/skills/testing/steps/results.md, src/.claude-plugin/plugin.json, src/lib/shared/views.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/lib/shared/extensions.mjs, test/repo/agents.test.mjs, test/repo/description-cases.json, docs/reference/agents.md, docs/reference/skills.md, .claude/rules/harness-authoring.md]
    greps:
      - path: src/skills/testing/SKILL.md
        pattern: ^name:\s*testing\b
      - path: src/lib/shared/work/send.mts
        pattern: '"picket:tester"'
      - path: src/lib/shared/work/action-text.mts
        pattern: \btest_item\b
      - path: docs/reference/agents.md
        pattern: ^## picket:tester\b
      - path: src/.claude-plugin/plugin.json
        pattern: skills/testing
    tests: true
    drive:
      - covers: T-6.7
        command: node scripts/test.mjs unit build product timing
        exit_code: 0
    security: false
  - n: 7
    files: [src/lib/shared/work/test-stage.mts, src/lib/shared/work/test-stage.test.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/agents/developer.md, src/agents/reviewer.md, test/repo/agents.test.mjs]
    greps:
      - path: src/lib/shared/work/test-stage.mts
        pattern: export function testStageStep\b
      - path: src/lib/shared/work/test-stage.mts
        pattern: export function testApplies\b
      - path: src/lib/shared/work/action-text.mts
        pattern: \bresolve_tests\b
      - path: src/lib/shared/work/action-text.mts
        pattern: \bapprove_fixes\b
      - path: src/agents/developer.md
        pattern: 'diagnose:'
    tests: true
    drive:
      - covers: T-7.8
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 8
    files: [src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/index.test.mts, src/lib/shared/work/replies.mts, src/lib/shared/work/test-stage.mts, src/lib/shared/work/test-stage.test.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/route/apply.mts, src/lib/verbs/route/index.test.mts, src/lib/shared/work/send.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/brief.test.mts, src/agents/tester.md, test/repo/agents.test.mjs, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/verbs/reply/table.mts
        pattern: \bresolve_tests\b
      - path: src/lib/verbs/reply/table.mts
        pattern: \bapprove_fixes\b
      - path: src/lib/shared/route/apply.mts
        pattern: \bcommit_fixes\b
      - path: src/lib/verbs/packet/packet.mjs
        pattern: \bresolve_tests\b
    tests: true
    drive:
      - covers: T-8.7
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 9
    files: [src/lib/shared/testing/keep-cases.mts, src/lib/shared/testing/keep-cases.test.mts, src/lib/shared/scenarios/keep.mts, src/lib/shared/scenarios/keep.test.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts]
    greps:
      - path: src/lib/verbs/close/block.mts
        pattern: 'Tested:'
      - path: src/lib/verbs/close/block.mts
        pattern: Not verified end to end
      - path: src/lib/shared/testing/keep-cases.mts
        pattern: \bkeepCandidates\b
    tests: true
    drive:
      - covers: T-9.7
        command: node scripts/test.mjs unit build product
        exit_code: 0
    security: false
  - n: 10
    files: [src/templates/claude-block.md, CLAUDE.md, README.md, package.json, src/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, docs/how-to.md, .claude/MEMORY.md]
    greps:
      - path: src/templates/claude-block.md
        pattern: Four lanes, five agents, one kernel\.
      - path: src/templates/claude-block.md
        pattern: \bfour agents\b
        flags: i
        absent: true
      - path: README.md
        pattern: \bfour agents\b
        flags: i
        absent: true
      - path: package.json
        pattern: \bfour agents\b
        flags: i
        absent: true
      - path: docs/how-to.md
        pattern: \bfour agents\b
        flags: i
        absent: true
      - path: docs/how-to.md
        pattern: \btesting\b
    tests: true
    drive:
      - covers: T-10.6
        command: node scripts/test.mjs unit build product timing
        exit_code: 0
    security: false
---
# Design: The tester checks finished items

## Problem

SDR 00004 (Ratified) binds build step 4, TF-004: a fifth agent checks a finished order or design item as a black box against the request (D-008), its results are data from which code derives the verdict (D-009), the user approves what changes, with a circuit breaker (D-010), and what was not proven is said plainly (D-011); the setting `testing` ships as `design` (D-012). Steps 1 to 3 are built: declared checks (`src/lib/shared/work/declared-checks.mts`), the item's stack (`src/lib/verbs/env/start.mts`), the card grammar and runner (`src/lib/shared/scenarios/`), and `picket env replay` with stored results. Four facts of the code shape this design: every verdict token names one agent in `VERDICTS` and `route` refuses any other (`verdictSpec` in `src/lib/shared/route/route.mts`); the stage after the cumulative review is `close` (`allApprovedStep` in `src/lib/shared/work/next-step.mts`); fixes after the cumulative review are committed by `picket close` with no gate (`itemOwner` in `src/lib/verbs/close/close.mts`); and most record criteria are unit-test facts no black box can see. The user's standing choices bind the shape: reuse tokens and routes, as few stops as possible, nothing committed by an agent without approval, nothing that grows into a framework.

## Decisions

### D-001: The tested criteria are the covers of declared HTTP checks
**Decision:** Infrastructural decision. The criteria the tester must prove are the `covers` ids of the item's HTTP declared checks, in record order and without repeats (`testedCriteria(phases)`); these are the criteria the architect gave a runtime surface. The request and story reach the tester through the brief as context for case kinds and questions, never as extra criteria. The test stage applies when all four hold: the setting `testing` (`all`, `design` or `off`, default `design` per SDR D-012) covers the lane, the record declares at least one HTTP check, `.picket/env/compose.yaml` exists, and the cumulative review approved. Otherwise the item closes as today, and the closing line says why it was not tested.
**Instead of:** every `T-N.x` of the record: most criteria name a unit test or a file, which a black box cannot read, so no item could ever reach `APPROVED` under SDR D-009.
**Risks:**
- **RISK-001** A request sentence with no declared check goes untested. Mitigation: OQ-001; the brief carries the request so the tester asks about it as a question.

### D-002: Results are kernel-written rows per round
**Decision:** Infrastructural decision. `work/<id>/test/results.jsonl` holds the tester's results; only `picket test` verbs append to it and `guard.scope` denies agents a direct write. A round is one tester session, numbered 1 plus the count of tester verdict rows. Row types: `case` (a run: case id `C-01` kept across rounds, criterion, kind, intent, the step text as a template, outcome `passed`, `failed` or `blocked` decided by the runner, attempts, `unstable`, detail, mocked services), `class` (the tester's `product`, `test` or `environment` for a failed case, with evidence), `cell` (a cell the tester did not run: `blocked`, `not run` or `not covered`, with why; "not applicable" is `not run` with that why), `question` (a criterion, the question, two to four choices, an optional default with its `Basis:`), and `untestable` (a criterion that cannot be tested as written). The case kinds are the draft's six (`normal`, `boundary`, `negative`, `permission`, `state`, `integration`; section 4.3). Code decides each run's outcome; the tester states only what code cannot know.
**Instead of:** the tester writing its own result table: SDR D-009 says code derives the verdict and generates the report, so numbers must come from rows the kernel wrote.
**Risks:**
- **RISK-002** The results file grows with every round. Mitigation: derivation reads only the current round's rows; earlier rounds stay for the breaker and the record.

### D-003: One case per call, run whole on the item's stack
**Decision:** Infrastructural decision. `picket test case <id> --criterion <T-N.x> --kind <kind> --intent <words>` reads the case's step lines in the saved-scenario grammar (`STEP_WORDS`, placeholders, `PKT-{run}`) on stdin, refuses any `scenarioProblems`, and runs them through `runScenario` against the endpoints of the stack `picket env start <id>` recorded; a failed run is run once more from the start and two failures confirm it, as `replayScenarios` does (draft section 10). Each case row lists the stack's `mock` services, since the kernel cannot see which app calls which mock until the stub log of TF-006 exists. `picket test rerun <id>` runs every case of the previous round again under the same case ids. The cap per round is six cases per tested criterion, one per case kind (draft section 4.3: one risk, one check); a case past it is refused with the advice to record a `not covered` cell.
**Instead of:** `picket env step`, one step per call with the tester naming steps to save (draft section 3.2): a case run whole from the start already proves it runs alone, and one call per case keeps the tester's Bash to a few verbs.
**Risks:**
- **RISK-003** Flagging every mock in the stack over-reports. Mitigation: the flag says "through a mock" only when the stack has one, and TF-006 narrows it with the stub's received log.

### D-004: Code derives the verdict and its route
**Decision:** Infrastructural decision. `deriveVerdict` reads the current round and returns a token and a route, first match wins: a case that passed in the previous round and now fails confirmed, or a saved scenario that passed in the previous round's replay and is now blamed, gives `CHANGES REQUIRED` route `breaker`; a failed case classed `product`, or a blamed class in the latest full replay, gives `CHANGES REQUIRED` route `fix`; an `untestable` row gives `DRIFT DETECTED`; an open question, a tested criterion with no `passed` case of its own, or no full replay since the previous round gives `CHANGES REQUIRED` route `user`; else `APPROVED`. A failed case with no `class` row is unclassified and blocks any verdict (SDR D-009: classified before it stands). `route` refuses a tester token that differs from the derived one, naming the derived token and its first reason, and writes `work/<id>/test.md` from the rows with each tester verdict, so the report always matches the recorded verdict.
**Instead of:** the tester judging the verdict from its own table: the model would round a blocked cell up to a pass, which SDR D-009 forbids.

### D-005: The black box is an allowlist
**Decision:** Security decision. For the agent `tester` only: `guard.bash` denies every command that is not a plain `picket` call to `test`, `env start`, `env replay`, `env status` or `state`, so no `cat`, `git diff`, substitution, wrapped `--run` or unquoted heredoc expansion reaches a file. A new hook, `guard.blackbox` on PreToolUse `Read|Grep`, denies a Read of any path the item owns (`itemOwnedPaths`: plan paths, block files, fix files) or under `work/<id>/` outside `work/<id>/test/`, and a Grep whose path holds such a path. The tester's item comes from the `work:` line of its send (`latestHints`); none found denies every Read and Grep (fail closed). Glob stays open, since it shows names only.
**Instead of:** a denylist of reading commands in `guard.bash`: the closure work on that guard (`work/20261115-in-place-guard-covers-more-interpreters`, `work/20261116-guard-closure-checks-derive-their-spellings`) shows how many spellings a denylist must close, while the tester needs five verbs.
**Risks:**
- **RISK-004** A changed file read through an unchanged one that includes it (a generated file, a copy). Mitigation: the brief names no paths, and the reviewer's cumulative check still reads the code.

### D-006: The tester reuses three tokens through its own map
**Decision:** Infrastructural decision. `verdicts.mjs` keeps `VERDICTS` as it is and adds `TESTER_VERDICTS`, mapping `APPROVED`, `CHANGES REQUIRED` and `DRIFT DETECTED` to one effect, `tested`, which records the row with `scope: "test"`, the round, the derived route and the latest full replay run id, and writes the report. The tester's block heading is `## Test: <id> · round <n>`, a new `BlockKind` `test` owned by the role `tester`. No token is added (SDR D-008).
**Instead of:** turning each `VERDICTS` entry into a list of agents: every reader of `.agent` (route, `guard.block`, the closure test, `agents.test.mjs`) would change shape for one role.

### D-007: The test stage is one state machine over existing routes
**Decision:** Infrastructural decision. `testStageStep(snap)` runs once the cumulative review approved and returns the next step from the rows after that approval. No tester row: `test_item`. Route `fix`: `fix_findings` with `review: work/<id>/test.md`, then the same cumulative reviewer re-reviews (`review_cumulative` with `fixes: test round <n>`), then the same tester retests; the third `fix` round goes to the existing `resolve_rejections` stop (draft section 5). Route `breaker`: the developer diagnoses (`fix_findings` with `diagnose:`), writes a red test and a root cause, and ends `PHASE STALLED`, which lands on the existing stall stop (continue with a fresh developer, redesign, abandon). Route `user`: a new stop, `resolve_tests`, answered with `t: <answers>` (the tester retests with them) or `n` (accept the unproved criteria as not verified, recorded like a waiver). `DRIFT DETECTED`: the existing `approve_amendment` stop, then the architect rewords, then the tester retests. After `APPROVED` or acceptance, a new stop `approve_fixes` commits every fix of the stage as one commit when code changed (SDR D-010), else `close`. A fix that needs a file outside the touch sets ends `PHASE STALLED`, as any phase does, and the stall stop's redesign is the plan amendment SDR D-010 asks for.
**Instead of:** the lead running `picket:debugging` at a trip (draft section 5): it runs in the main session with no verb to record its result, while the stall stop already carries a root cause and a red test.
**Risks:**
- **RISK-005** Phases 7 and 8 land the stops and their replies separately. Mitigation: no release is cut between them; Picket's own repository has no `.picket/env/compose.yaml`, so no item here enters the stage.

### D-008 (r2): The fifth agent, what it did not prove, and the cases it keeps
**Decision:** Infrastructural decision. The tester is a fifth agent shell, `src/agents/tester.md`, which preloads one new skill, `picket:testing` (the case matrix, the case card, classes, cells and questions as step files), and receives the `test_item` send (`work`, `round`, `brief`, later `answers`); the floor line becomes "four lanes, five agents, one kernel" wherever Picket describes itself (the CLAUDE.md block and its template, the README, the package, plugin and marketplace descriptions, `docs/how-to.md`, the project line of `.claude/MEMORY.md`), while design assets keep their text (SDR D-008). `picket close` adds `Tested:` to the closing block: the verdict and round with counts, or the user's acceptance with the criteria not verified, or why the item was not tested (`off for the order lane`, `no environment`, `no declared HTTP check`). When a case ran through a stack with mocks it adds `Not verified end to end: <service>` for each real service a mock stands in for (the name before `-mock`, draft section 2.8). Each case of the final round that passed, is stable, holds no `***` and writes only `PKT-` data is kept as the next `S-` scenario through `keepCandidates`, and the close commit carries the files, listed on a `Kept:` line. No saved scenario is replaced or rewritten by the tester. SDR D-011's flow-level mark waits for the flow label (draft section 3.1), so the result and the closing line carry the mock flag here and a kept case carries no flow mark yet.
**Instead of:** keeping cases at an extra approval stop: adding a passing scenario replaces nothing (SDR D-010 gates replacement), and every stop costs the user a turn.
**Risks:**
- **RISK-006** A kept case depends on data only this machine has. Mitigation: a case that failed or was unstable in the final round is never kept, and replay's own rules classify later failures.

## Scope

**In:**
- Results as rows, the tested criteria, the case cap, the derived verdict and route, the generated report (D-001, D-002, D-004).
- The setting `testing` and the `picket test` verbs: `brief`, `report`, `classify`, `note`, `untestable`, `ask`, `case`, `rerun` (D-001, D-002, D-003).
- The black-box guard on Bash, Read and Grep, and kernel ownership of the test folder (D-005).
- Tester verdict routing, the `## Test:` block, the role `tester` (D-006).
- The tester shell, the `picket:testing` skill, the tester send (D-008).
- The test stage, fix rounds, the three-round limit, the breaker, the user's stop, the fix approval and its commit (D-007).
- The `Tested:` and `Not verified end to end:` closing lines, kept cases, the floor text "four lanes, five agents, one kernel" (D-008).

**Out:**
- The planted-defect benchmark (TF-005); the mock format, stub server and data catalog (TF-006); the database guards (TF-007); known defects (TF-008); the browser adapter (TF-009).
- A dispute over a failure's class ruled by the reviewer with a kernel replay (draft section 4.4); the tester's class stands.
- Replacement of saved scenarios proposed by the tester (OQ-004), the fast lane (no tester, SDR D-008), the counted learning of draft section 7.

## Phase 1: Results, the derived verdict and the report

**Touch set:**
- `src/lib/shared/testing/results.mts`: new; row shapes, test folder
- `src/lib/shared/testing/results.test.mts`: new
- `src/lib/shared/testing/derive.mts`: new; criteria, cap, verdict
- `src/lib/shared/testing/derive.test.mts`: new
- `src/lib/shared/testing/report.mts`: new; renders `test.md`
- `src/lib/shared/testing/report.test.mts`: new
- `src/lib/shared/work/declared-checks.mts`: read only; `readChecks` for covers
- `src/lib/shared/scenarios/results.mts`: read only; replay rows, `replaySummary`
- `src/lib/shared/work/files.mts`: read only; `workDir`, `workRel`

**Changes:** `results.mts` exports `CASE_KINDS` (the six kinds of D-002, `as const`), `FAILURE_CLASSES` (`product`, `test`, `environment`), `CELL_OUTCOMES` (`blocked`, `not run`, `not covered`), `TEST_DIR = "test"`, and the row types of D-002, each with `ts` and `round`:
- `CaseRow = { type: "case"; case: string; criterion: string; kind: CaseKind; intent: string; steps: string; outcome: "passed" | "failed" | "blocked"; attempts: number; unstable: boolean; detail: string; mocks: string[] }`
- `ClassRow = { type: "class"; case: string; class: FailureClass; evidence: string }`
- `CellRow = { type: "cell"; criterion: string; kind: CaseKind; outcome: CellOutcome; why: string }`
- `QuestionRow = { type: "question"; criterion: string; question: string; choices: string[]; default: string | null; basis: string | null }`
- `UntestableRow = { type: "untestable"; criterion: string; why: string }`

It exports `testFolderRel(id)` (`work/<id>/test/`), `appendTestRow(root, id, row, now)`, `readTestRows(root, id)`, `testRound(verdicts)` (1 plus the rows whose `agent` is `tester`), `roundRows(rows, round)` and `nextCaseId(rows)` (`C-` and two digits, one above the highest in the file, from `C-01`).

`derive.mts` exports `testedCriteria(phases)` per D-001 (the `covers` of every check `readChecks` returns with a `path` key, in phase and check order, without repeats), `caseCap(criteria)` (`CASE_KINDS.length` times the count), `MAX_QUESTIONS = 3` (draft section 4.5), the types `TestRoute = "fix" | "breaker" | "user"` and `Derived = { verdict: "APPROVED" | "CHANGES REQUIRED" | "DRIFT DETECTED"; route: TestRoute | null; reasons: string[]; unclassified: string[] }`, and the pure `deriveVerdict(input: DeriveInput)`. `DeriveInput = { criteria: string[]; rows: TestRow[]; round: number; replay: { run: string | null; passed: string[]; blamed: string[] }; previousReplay: { run: string | null; passed: string[] } }`. It applies D-004's order. A case's own class is its latest `class` row of the same round; a confirmed failure is `failed` with `unstable` false. Reasons read like `C-03 T-2.1 boundary failed: product`, `T-2.3 has no passed case`, `S-0004 passed in round 1 and fails now`, `saved scenarios not replayed this round`.

`report.mts` exports `renderReport(input: { id: string; round: number; derived: Derived; rows: TestRow[]; criteria: string[] }): string`, a Markdown text: `# Test report: <id>`, a line `Round <n> · <verdict>` with the route, a counts line built from the round's rows (`3 passed, 1 failed, 1 blocked, 1 not covered`), one table row per case and cell (`| Criterion | Kind | Case | Outcome | Class | Mock | Detail |`), the reasons, the questions with their choices and `Basis:`, and `Through a mock: <names>` when any case lists one. Every number in it is counted from rows.

**Done when:**
- **T-1.1** `derive.test.mts`: phases whose HTTP checks cover `T-2.1` twice and `T-3.2`, and whose run check covers `T-1.7`, give `testedCriteria` `["T-2.1", "T-3.2"]` and `caseCap` 12.
- **T-1.2** A round where both criteria have a passed case, the replay run differs from the previous one and nothing is blamed gives `APPROVED` with route `null`; the same round with the previous replay run id gives `CHANGES REQUIRED`, route `user`, reason `saved scenarios not replayed this round`.
- **T-1.3** A failed case with a `class` row `product` gives route `fix` even beside an `untestable` row; a failed case with no `class` row gives `unclassified: ["C-03"]`.
- **T-1.4** `C-02` passed in round 1 and failed with `unstable: false` in round 2 gives route `breaker`; with `unstable: true` it does not; `S-0004` passed in the previous replay and blamed now gives `breaker`.
- **T-1.5** An `untestable` row alone gives `DRIFT DETECTED`; a criterion whose only rows are a `blocked` cell, or a failed case classed `environment`, gives route `user` with `T-2.3 has no passed case`; an open `question` row gives route `user`.
- **T-1.6** `results.test.mts`, in a temporary folder: a row of each type written by `appendTestRow` reads back equal through `readTestRows`; `nextCaseId` gives `C-04` after `C-01` to `C-03`, and `C-01` for an empty file; `testRound` gives 3 after two tester rows and one reviewer row.
- **T-1.7** `report.test.mts`: rows of two passed cases, one failed `product` case listing `payments-mock`, one `blocked` cell and one `not covered` cell render the line `2 passed, 1 failed, 1 blocked, 1 not covered`, five table rows, and `Through a mock: payments-mock`.

## Phase 2: The testing setting and the recording verbs

**Touch set:**
- `src/lib/shared/config.mjs`: `testing` key, default `design`
- `src/lib/shared/config.schema.json`: `testing` enum
- `test/kernel/config.test.mjs`: setting cases
- `src/lib/shared/work/verdict-log.mts`: optional tester row fields
- `src/lib/shared/testing/facts.mts`: new; derive input from disk
- `src/lib/shared/testing/brief.mts`: new; compiles the brief
- `src/lib/shared/testing/brief.test.mts`: new
- `src/lib/verbs/test/brief.mts`: new; `test brief`
- `src/lib/verbs/test/report.mts`: new; `test report`
- `src/lib/verbs/test/classify.mts`: new; `test classify`
- `src/lib/verbs/test/note.mts`: new; `test note`
- `src/lib/verbs/test/ask.mts`: new; `test ask`
- `src/lib/verbs/test/record.test.mts`: new; the four writing verbs
- `src/lib/verbs.mts`: the `test` group
- `src/lib/cli/registry.mts`: register the subverbs
- `src/lib/hooks/guard/bash/kernel.test.mts`: test verbs are kernel calls
- `docs/reference/cli.md`: regenerated by the build
- `src/lib/shared/scenarios/keep.mts`: read only; `criterionText`
- `src/lib/shared/scenarios/files.mts`: read only; `listScenarios`

**Changes:** `config.mjs` adds `testing` to `KNOWN_KEYS` and `CONFIG_DEFAULTS` (`"design"`), a `checkTesting(value, warn)` that keeps `all`, `design` or `off` and otherwise warns `testing must be all, design or off; using design`, and `testing` on `loadConfig`'s result; the schema adds the property with that enum and default. `VerdictRow` gains optional `round?: number`, `test_route?: "fix" | "breaker" | "user"` and `replay_run?: string` (written from phase 5).

`facts.mts` exports `testFacts(root, snap): DeriveInput`: the tested criteria, the rows of `readTestRows`, `testRound(snap.verdicts)`, the item's latest `full` replay (`replaySummary` over `readResults`, its run id, the scenarios of that run classed `passed`, the blamed ones) and the previous tester row's `replay_run` with the scenarios that run passed.

`brief.mts` exports `compileBrief(snap, facts, scenarios): string`, Markdown with these sections and nothing else: `# Test brief: <id> · round <n>`; `## Request` (the text of `request.md`, then `story.md` when present); `## Criteria` (`T-2.1: <criterionText>` per tested criterion); `## Approved checks` (`T-2.1 POST /orders: 201, contains "id"`, with `service` when set); `## Environment` (`run picket env start <id>; it prints PICKET_URL_<SERVICE> for each service`); `## Saved scenarios` (`S-0002 normal <covers>: <intent>` per active scenario); `## Earlier rounds` (the previous round's cases: id, criterion, kind, outcome); `## Limits` (`cases per round: at most <caseCap>`, `questions: <asked> of 3 asked`). It names no plan path and no decision.

The verbs, each refusing a done or abandoned item and an item whose record declares no HTTP check (`<id> declares no HTTP check, so it has no tested criteria`):
- `test brief <id> [--save]`: prints the brief; with `--save` writes `work/<id>/test/brief.md`. Not read-only.
- `test report <id>`: writes `work/<id>/test.md` with `renderReport` and prints the counts line and `verdict: <token> · route <route>`, or `unclassified: C-03; run picket test classify <id> C-03 <product|test|environment> --evidence <why>`.
- `test classify <id> <case> <product|test|environment> --evidence <text>`: refuses a case id absent from the current round (`no case C-09 in round 2`) and a case that did not fail (`C-01 passed; only a failed case takes a class`).
- `test note <id> <criterion> <kind> <blocked|not-run|not-covered> --why <text>`, or `test note <id> <criterion> untestable --why <text>`: refuses a criterion outside the tested list, naming the list.
- `test ask <id> <criterion> --question <text> --choices "<a> | <b>" [--default <choice> --basis <text>]`: two to four choices; a default must be one of them and needs `--basis`; the fourth question of the item is refused with `at most 3 questions per item (draft section 4.5)`.

`verbs.mts` adds the group `test` with the eight subverbs this design names (`case` and `rerun` registered in phase 3), all `readOnly: false`.

**Done when:**
- **T-2.1** `config.test.mjs`: `"testing": "all"` loads as `all`; a missing key loads as `design`; `"testing": "sometimes"` loads as `design` with the warning text.
- **T-2.2** `brief.test.mts`: a snapshot of a design record with one HTTP check covering `T-2.1` and a saved scenario `S-0002` gives a brief holding `T-2.1: ` with the criterion's text, the check line, the `S-0002` line and `cases per round: at most 6`, and holding none of the record's touch-set paths.
- **T-2.3** `record.test.mts`: `test classify` appends a `class` row for a failed case and refuses the unknown and the passed case with their texts.
- **T-2.4** `test note` appends a `cell` row with outcome `not covered` for `not-covered`, and an `untestable` row for `untestable`; a criterion outside the list is refused naming `T-2.1`.
- **T-2.5** `test ask` appends a `question` row; a fourth question, a default outside the choices, a default without `--basis`, and one choice are each refused with their own text.
- **T-2.6** `test report` on rows holding one failed `product` case writes `work/<id>/test.md` equal to `renderReport` of the same input and prints `verdict: CHANGES REQUIRED · route fix`.
- **T-2.7** `kernel.test.mts`: `kernelClass("test", "brief")`, `kernelClass("test", "classify")` and `kernelClass("test", "ask")` are `kernel`.
- **T-2.8** `node scripts/test.mjs unit build product` exits 0.

## Phase 3: Running cases on the item's stack

**Touch set:**
- `src/lib/shared/testing/cases.mts`: new; card, endpoints, run
- `src/lib/shared/testing/cases.test.mts`: new
- `src/lib/verbs/test/case.mts`: new; `test case`
- `src/lib/verbs/test/rerun.mts`: new; `test rerun`
- `src/lib/verbs/test/case.test.mts`: new; injected runner and adapter
- `src/lib/verbs.mts`: `case`, `rerun` subverbs
- `src/lib/cli/registry.mts`: register them
- `docs/reference/cli.md`: regenerated by the build
- `src/lib/shared/scenarios/replay.mts`: read only; `replayScenarios`
- `src/lib/shared/scenarios/format.mts`: read only; `parseScenario`, `KINDS`
- `src/lib/shared/scenarios/rules.mts`: read only; `scenarioProblems`
- `src/lib/shared/env/stack-start.mts`: read only; `serviceEndpoints`
- `src/lib/shared/env/stacks.mts`: read only; `readStacks`
- `src/lib/verbs/env/replay.mts`: read only; deps pattern, timeouts

**Changes:** `cases.mts` exports:
- `caseCard(item, { criterion, kind, intent }, steps): { card: Card } | { problems: string[] }`: a header with `id: S-0000` (`CANDIDATE_ID`), the kind, `covers: ["<item>/<criterion>"]`, the intent and `format: 1`, joined with the stdin step lines and read back through `parseScenario`.
- `stackOf(root, engine, state): { urls: Record<string, string>; services: string[]; mocks: string[] }`: the entry `readStacks` holds for `stackName(itemKey(state))`, the model through `readModel(readModelJson(engine, root))`, the services with no profiles, their endpoints through `serviceEndpoints` with the recorded files, and the services whose role is `mock`. No entry refuses `no stack for <id>: run picket env start <id>`.
- `runCase(card, deps): Promise<{ outcome; attempts: number; unstable: boolean; detail: string }>`: one `replayScenarios` call over a single scenario built from the card, so a failure is run once more from the start with a new run key.

`test case <id> --criterion <T-N.x> --kind <kind> --intent <words>` reads the step lines with `args.stdin()`, refuses a criterion outside `testedCriteria`, a kind outside `CASE_KINDS`, a round already at `caseCap` (`the cap of <n> cases this round is reached; record what is left with picket test note <id> <criterion> <kind> not-covered --why <why>`), and any `caseCard` or `scenarioProblems` problem (each listed). It runs the card, appends a `case` row with the next case id, the stdin text as `steps`, the run's fields and the stack's `mocks`, and prints `C-04 T-2.1 boundary passed`, or `C-04 T-2.1 boundary failed: <detail>` followed by `classify it: picket test classify <id> C-04 <product|test|environment> --evidence <why>`, with ` · through a mock: payments-mock` when `mocks` is not empty.

`test rerun <id>` takes the latest row of each case id in the previous round, runs each again with its stored `steps`, kind, criterion and intent, and appends rows under the same case ids in the current round; with no earlier round it prints `round 1 has no earlier cases`. Both verbs take injected deps (engine runner, adapter, sleep, random) as `env replay` does, and use its 20-second request timeout.

**Done when:**
- **T-3.1** `cases.test.mts`: `caseCard` of `request GET {orders}/orders/PKT-{run}` and `expect status 200`, kind `boundary`, gives a card covering `<id>/T-2.1` with no `scenarioProblems` for services `["orders"]`; `request GET https://orders.example.com/x` gives the rule 1 problem.
- **T-3.2** `runCase` with an adapter answering 500 twice gives `failed`, 2 attempts, `unstable: false`; 500 then 200 gives `unstable: true`.
- **T-3.3** `case.test.mts`: with a fixture model holding `orders` (`app`) and `payments-mock` (`mock`), a recorded stack and an adapter answering 201, `test case` appends a `case` row whose `steps` equal the stdin text and whose `mocks` are `["payments-mock"]`, and prints `through a mock: payments-mock`.
- **T-3.4** No recorded stack refuses with `run picket env start <id>`; a criterion outside the list is refused; with one tested criterion the seventh case of a round is refused with the cap text.
- **T-3.5** `test rerun` in round 2 appends rows for `C-01` and `C-02` of round 1 with `round: 2` and the same steps; in round 1 it prints `round 1 has no earlier cases`.
- **T-3.6** A failing case whose test-user value is `fixture-secret-9` and whose answer text is `fixture-answer-9` writes a row and prints output holding neither string.
- **T-3.7** `node scripts/test.mjs unit build product` exits 0.

## Phase 4: The black box

**Touch set:**
- `src/lib/hooks/guard/blackbox/index.mts`: new; Read and Grep denial
- `src/lib/hooks/guard/blackbox/index.test.mts`: new
- `src/lib/hooks/guard/blackbox/index.variants.test.mts`: new; closure test (C-020)
- `src/lib/hooks.mts`: register `guard.blackbox`
- `src/lib/hooks/guard/bash/payloads.mts`: `TESTER_VERBS`, `testerRefusal`, spawned agents
- `src/lib/hooks/guard/bash/payloads.test.mts`: tester cases
- `src/lib/hooks/guard/bash/judge.mts`: apply the tester refusal
- `src/lib/hooks/guard/bash/tester.variants.test.mts`: new; closure test
- `src/lib/hooks/guard/scope/index.mts`: kernel-owned test folder and report
- `src/lib/hooks/guard/scope/index.test.mts`: denial cases
- `src/lib/shared/agent-name.mts`: role `tester`, instance names
- `src/lib/shared/agent-name.test.mts`: tester names
- `test/repo/closures.test.mjs`: two registry entries
- `test/repo/hook-list.test.mjs`: `EXPECTED_GROUPS` [INFERRED]
- `test/hooks/guard.blackbox.test.mjs`: new; the bundle denies
- `docs/reference/hooks.md`: regenerated by the build
- `src/lib/shared/review-summary.mts`: read only; `itemOwnedPaths`
- `src/lib/shared/transcript/entries.mts`: read only; `latestHints`

**Changes:** `agent-name.mts` adds `tester` to `INSTANCE_NAME`, `AgentRole` and `ROLES`, so `bareAgentName("abcd-tester")` is `tester`. `payloads.mts` adds `tester` to `SPAWNED_AGENTS`, exports `TESTER_VERBS = ["test", "env start", "env replay", "env status", "state"]` and `testerRefusal(reading, agent): Refusal | null`, which for agent `tester` refuses unless every segment is a kernel call (`kernelVerbStart` at index 1, so no leading assignment) whose verb, or verb and subverb, is in `TESTER_VERBS`, and the reading has no hidden execution, write redirect or background, and no heredoc body holding `$(`, `${` or a backtick (a case card needs none: placeholders are `{name}`). Its reason: `guard.bash: the tester runs only picket test, env start, env replay, env status and state, written out plainly; it reads files with Read, and never the item's own files`. `judgeCommand` applies it before `judgeSegments`, and for the tester an unreadable command is denied with the same reason. Other agents' decisions do not change.

`guard.blackbox` (PreToolUse, matcher `Read|Grep`) exports `blackboxDenial(event, ctx): string | null`. It returns null unless `bareAgentName(event.agent_type)` is `tester`. The item is `latestHints(agentTranscript(event)).work_id`; none gives `guard.blackbox: the tester's send names no work item, so every read is refused`. The denied list is `itemOwnedPaths(root, id, snap.phases)`, `work/<id>/`, and each recorded worktree of `snap.layout`; `work/<id>/test/` is allowed. A Read target (`file_path`) or Grep target (`path`, else `cwd`) is made root-relative after `realpath` where it exists, compared lower-case on `win32`; a Read is denied when the denied list holds it, a Grep when it holds it or when a denied path lies under it. The reason: `guard.blackbox: <rel> is part of the change under test; the tester is a black box and reads the brief, the request and unchanged files only`.

`guard.scope` adds `test/` and `test.md` to `KERNEL_OWNED_ENTRIES`. `closures.test.mjs` registers `guard.blackbox` with its variants file and `guard.bash tester commands` with `tester.variants.test.mts`, tables `TESTER_VERBS`.

**Done when:**
- **T-4.1** `blackbox/index.test.mts`, with a transcript whose send holds `work: <id>`: for agent type `abcd-tester`, a Read of a plan path and of `work/<id>/design.md` is denied with `black box`; a Read of `work/<id>/test/brief.md` and of an unowned `docs/other.md` gets no decision; for `picket:developer` the plan path gets no decision.
- **T-4.2** A tester Grep with no `path` is denied; a Grep on `docs/`, which holds no owned path, gets no decision; `HOOKS["guard.blackbox"]` matches `Read|Grep` and not `Glob`.
- **T-4.3** A tester transcript with no `work:` line denies a Read of `README.md` with `names no work item`.
- **T-4.4** `payloads.test.mts`, for agent `abcd-tester`: `picket test case <id> --criterion T-2.1 --kind normal --intent x` with a quoted heredoc of two step lines is not denied; `cat src/a.mts`, `git diff`, `picket summary <id>`, `picket drive --run "cat src/a.mts"` and `picket test note <id> T-2.1 normal blocked --why "$(cat src/a.mts)"` are denied with the tester reason; for `picket:developer` each keeps its decision from before the phase, captured on the base by running the same commands before the first edit.
- **T-4.5** Both variants tests run their seeds through every spelling (blackbox: absolute, `./`, a `..` segment, a symbolic link, an upper-case folder on `win32`; bash: an assignment prefix, `command`, `bash -c`, a subshell, a pipe, `&&`, backticks, process substitution, an unquoted heredoc holding `$(`) and fail naming any spelling that is not denied; `closures.test.mjs` passes with both entries.
- **T-4.6** `scope/index.test.mts`: a Write of `work/<id>/test/results.jsonl` and an Edit of `work/<id>/test.md` are denied as kernel-owned.
- **T-4.7** `test/hooks/guard.blackbox.test.mjs`: a PreToolUse Read payload for a plan path with `agent_type` `abcd-tester` and a transcript naming the item, piped into `dist/hooks/guard.blackbox.mjs`, prints a deny decision whose reason holds `black box`.
- **T-4.8** `node scripts/test.mjs unit build product timing` exits 0, the hook cold-start budget included.

## Phase 5: Routing the tester's verdict

**Touch set:**
- `src/lib/shared/verdicts.mjs`: `TESTER_VERDICTS`
- `src/lib/shared/route/route.mts`: tester spec, derived check, row fields
- `src/lib/shared/route/plan.mts`: the `tested` effect
- `src/lib/shared/route/plan.test.mts`: effect cases
- `src/lib/shared/route/apply.mts`: write `test.md`
- `src/lib/shared/work/block.mts`: the `test` block kind
- `src/lib/shared/work/block.test.mts`: heading cases
- `src/lib/hooks/route/verdict/index.mts`: tester blocks reach route
- `src/lib/hooks/route/verdict/index.test.mts`: hook cases
- `src/lib/hooks/guard/block/index.mts`: tester tokens
- `src/lib/hooks/guard/block/index.test.mts`: token cases
- `src/lib/hooks/guard/block/index.variants.test.mts`: tester seeds
- `test/repo/closures.test.mjs`: the `TESTER_VERDICTS` table
- `src/lib/verbs/route/index.test.mts`: route end to end
- `src/lib/shared/testing/facts.mts`: read only; `testFacts`

**Changes:** `verdicts.mjs` exports `TESTER_VERDICTS = Object.freeze({ APPROVED: "tested", "CHANGES REQUIRED": "tested", "DRIFT DETECTED": "tested" })`; `findVerdict` is unchanged, since the tokens already exist. In `route.mts`, `verdictSpec` for agent `tester` reads `TESTER_VERDICTS` and refuses any other token (`"PHASE DONE" may only come from developer, not tester`). Before planning, a tester verdict reads `testFacts` and `deriveVerdict`: unclassified cases refuse with the `picket test classify` text of phase 2; a different token refuses with `the recorded results derive <token> (<first reason>); end the block with <token>`. The row carries `scope: "test"`, `round`, `test_route` and `replay_run` (the latest full replay's run id or absent).

`plan.mts` adds `Effect` `tested` and the change `{ kind: "test_report"; text: string; line: string }`; the plan returns that change with `renderReport`'s text and `line: "work/<id>/test.md written"`, plus a note `test round <n>: <token>` with ` (route <route>)` when there is one. `apply.mts` writes the text to `work/<id>/test.md`.

`block.mts` adds `BlockKind` `test`, the heading `["test", /^##\s+Test:\s+(?<id>[a-z0-9-]+)/m]` and `BLOCK_FIELDS.test = ["Report"]`. The verdict hook maps kind `test` to agent `tester` with scope `test`, and saves no review file. `guard.block` gives the role `tester` the tokens of `TESTER_VERDICTS`; the closure test adds them as seeds.

**Done when:**
- **T-5.1** `route/index.test.mts`: a tester `APPROVED` while the results derive `CHANGES REQUIRED` for `T-2.3 has no passed case` is refused with that text, and `verdicts.jsonl` gains no row.
- **T-5.2** A tester `CHANGES REQUIRED` matching the derivation appends a row with `agent: "tester"`, `scope: "test"`, `round: 1`, `test_route: "user"` and the replay run id, and writes `work/<id>/test.md` equal to `renderReport` of the same rows.
- **T-5.3** A tester verdict with an unclassified failed case is refused naming `picket test classify`; a tester `PHASE DONE` and a tester `ALIGNED` are refused as not the tester's.
- **T-5.4** `block.test.mts`: `readHeading("## Test: x-1 · round 2\n…")` gives kind `test` and id `x-1`.
- **T-5.5** `verdict/index.test.mts`: a SubagentStop payload with `agent_type` `abcd-tester` and a `## Test:` block ending `DRIFT DETECTED`, whose rows derive it, appends a tester row with scope `test` and does not set the item blocked.
- **T-5.6** `guard/block/index.test.mts`: a tester turn ending `PHASE DONE` is blocked with a reason naming `APPROVED, CHANGES REQUIRED, DRIFT DETECTED`; the variants test passes with the new seeds.
- **T-5.7** `plan.test.mts`: the test that every effect has a plan covers `tested`, and the existing reviewer, developer and architect cases pass unchanged.
- **T-5.8** `node scripts/test.mjs unit build product` exits 0.

## Phase 6: The tester shell, the testing skill and the send

**Touch set:**
- `src/agents/tester.md`: new; the fifth shell
- `src/skills/testing/SKILL.md`: new; the testing skill
- `src/skills/testing/steps/matrix.md`: new; criteria by case kind
- `src/skills/testing/steps/cases.md`: new; writing a case card
- `src/skills/testing/steps/results.md`: new; classes, cells, questions
- `src/.claude-plugin/plugin.json`: list the skill
- `src/lib/shared/views.mts`: `AgentType` gains `picket:tester`
- `src/lib/shared/work/next-step.mts`: the `test_item` step type only
- `src/lib/shared/work/action-text.mts`: `test_item` text
- `src/lib/shared/work/send.mts`: tester role and send
- `src/lib/shared/work/send.test.mts`: send cases
- `src/lib/shared/extensions.mjs`: `AGENT_ROLES` gains `tester`
- `test/repo/agents.test.mjs`: tester Entry fixture
- `test/repo/description-cases.json`: routing cases for testing
- `docs/reference/agents.md`: `## picket:tester` section
- `docs/reference/skills.md`: `## picket:testing` section
- `.claude/rules/harness-authoring.md`: tester among agent names (lead edits)

**Changes:** `NextStep` gains `{ action: "test_item"; actor: "tester"; round: number; detail: string }`, `NEXT_ACTIONS` gains `test_item` and `ACTION_TEXT` `test_item: () => "tester tests the finished item"`; `nextStep` does not return it until phase 7. `send.mts` adds the role `tester` (`picket:tester`, owning rows whose `agent` is `tester`) and `testSend`: `first: ["picket test brief <id> --save"]`, message `work: <id>`, `round: <n>`, `brief: work/<id>/test/brief.md`; `Agent` on the first round, `SendMessage` when the tester owns a row of this session, so the same tester retests.

`tester.md` (frontmatter: `tools: Read, Grep, Glob, Bash, SendMessage`, `skills: [picket:testing]`, `model: sonnet` per OQ-003, `memory: project`) has the six parts. Entry: the send's fields; the first batch reads the brief and runs `picket state <id>`. Constraints: a black box (`guard.blackbox` and `guard.bash` enforce it); Bash runs only the five verbs; no exploratory testing (SDR D-001); every failure classified with runtime evidence; at most three questions, business matters only, each a choice, a default only with `Basis:`; writes nothing outside its memory folder. Work: `picket env start <id>`; from round 2 `picket test rerun <id>`; the matrix of `steps/matrix.md`; cases per `steps/cases.md`; `picket env replay <id>`; classes, cells and questions per `steps/results.md`; `picket test report <id>`; the block. Output: `## Test: <id> · round <n>`, one sentence with the derived verdict and first reason, `Report: work/<id>/test.md`, `Results:` with the counts line `test report` printed, `Questions: none | <n> asked`, and the token `test report` printed as the last line.

`SKILL.md` carries the procedure index and `Use when` triggers in its description; the steps hold the case kinds and their meaning, permission checks both ways, the card grammar with `PKT-{run}` data and login as the first request, the cap, the classes with evidence and the question form. Budgets hold: the shell at most 120 lines, `SKILL.md` at most 150, a step at most 80.

**Done when:**
- **T-6.1** `agents.test.mjs` passes with a `tester` Entry fixture: the shell's Entry names exactly the send's keys `brief`, `round` and `work`, and its Output fence ends with a token of `TESTER_VERDICTS`.
- **T-6.2** `send.test.mts`: a `test_item` step for round 1 gives `Agent <tag>-tester · picket:tester` with `first: picket test brief <id> --save` and the three message lines; with a tester row of the same session it gives `SendMessage` to the same name.
- **T-6.3** `test/repo/descriptions.test.mjs` passes with the testing cases (at least three positive and two negative), the routing share and the cosine limit included.
- **T-6.4** `test/repo/plugin-layout.test.mjs`, `test/repo/docs.test.mjs` and `test/repo/skills.test.mjs` pass, and `docs/reference/agents.md` has a `## picket:tester` section.
- **T-6.5** `test/timing/budgets.test.mjs` passes for the new shell, skill and step files.
- **T-6.6** The existing `next-step.test.mts` cases pass unchanged: no step returns `test_item` yet.
- **T-6.7** `node scripts/test.mjs unit build product timing` exits 0.

## Phase 7: The test stage in picket next

**Touch set:**
- `src/lib/shared/work/test-stage.mts`: new; applicability and the stage machine
- `src/lib/shared/work/test-stage.test.mts`: new
- `src/lib/shared/work/next-step.mts`: call the stage; new step types
- `src/lib/shared/work/next-step.test.mts`: stage cases
- `src/lib/shared/work/action-text.mts`: two new actions
- `src/lib/shared/work/snapshot.mts`: testing facts on the snapshot
- `src/lib/shared/work/send.mts`: fix, diagnose and re-review lines
- `src/lib/shared/work/send.test.mts`: line cases
- `src/agents/developer.md`: `diagnose:` in Entry and Work
- `src/agents/reviewer.md`: `fixes:` in Entry
- `test/repo/agents.test.mjs`: fixtures for the new keys
- `src/lib/shared/config.mjs`: read only; `testing`

**Changes:** `WorkSnapshot` gains an optional `testing?: { setting: "all" | "design" | "off"; environment: boolean }`, filled by `readSnapshot` from `loadConfig` and the existence of `.picket/env/compose.yaml`; absent reads as `off`. `test-stage.mts` exports `testApplies(snap): { applies: true } | { applies: false; why: string }` per D-001 (whys: `testing is off`, `off for the order lane (testing: design)`, `no environment`, `no declared HTTP check`) and `testStageStep(snap): NextStep | null`, D-007's machine over the rows after the first cumulative `APPROVED`. With T the stage's latest tester row:
- no T: `test_item` round 1;
- T `CHANGES REQUIRED` route `fix` or `breaker`: no developer row after T gives `fix_findings` with `review: "test"` (route `breaker` adds `diagnose: <first reason>`); a developer `PHASE DONE` after T with no reviewer cumulative row after it gives `review_cumulative` with `fixes: <T.round>`; a reviewer `CHANGES REQUIRED` there gives `fix_findings` with `review: "cumulative"`; a reviewer `APPROVED` there gives `test_item` round `T.round + 1`; a fresh reply after a breaker's stall gives `fix_findings` with no `diagnose`;
- the third route `fix` row since the latest fresh reply, before any developer row after it: `resolve_rejections` with `3 test rounds returned CHANGES REQUIRED since the last approval` and the stall options;
- T `CHANGES REQUIRED` route `user`: `resolve_tests` with options `[t] tell the tester: <answers>`, `[n] accept the unproved criteria as not verified`, `[x] abandon`;
- T `DRIFT DETECTED`: `approve_amendment` with `the tester found a criterion it cannot test as written: <first reason>; report: work/<id>/test.md`; an `[a]` answer gives the existing amend step with `reword`, and a counted `AMENDED` after it gives `test_item` round `T.round + 1`; an `[f]` answer gives the fix cycle of route `fix`;
- T `APPROVED`: `approve_fixes` with `[a] approve and commit the fixes` and `[x] reject: <why>` when a developer `PHASE DONE` exists in the stage, else null (close).

`allApprovedStep` returns `testStageStep(snap) ?? close` once cumulatively reviewed and the stage applies; otherwise `close` as today. `isRepeatStall` counts reviewer drifts only. `NEXT_ACTIONS` and `ACTION_TEXT` gain `resolve_tests` (`you answer the tester` / `waits for answers to the tester`) and `approve_fixes` (`you approve the test fixes` / `waits for approval of the test fixes`). `FindingsReview` gains `test`, whose send line is `review: work/<id>/test.md`; `fix_findings` may carry `diagnose`, sent as `diagnose: <text>`; `review_cumulative` may carry `fixes`, sent as `fixes: test round <n>`. `developer.md`: on `diagnose:`, find the root cause and write the red test as `picket:implementing` does for a bug, fix nothing, and end `PHASE STALLED` with `Root cause:` and `Red:`. `reviewer.md`: `fixes:` asks for the fix diff since its last cumulative review.

**Done when:**
- **T-7.1** `test-stage.test.mts`: a design item with an HTTP check, the environment and setting `design` applies; the same as an order item gives `off for the order lane (testing: design)`; setting `off`, no environment and run checks only each give their why.
- **T-7.2** After a cumulative `APPROVED` with no tester row, `nextStep` gives `test_item` round 1; for an item where the stage does not apply it gives `close` with today's detail.
- **T-7.3** Tester route `fix` gives `fix_findings` whose send holds `review: work/<id>/test.md`; a developer `PHASE DONE` after it gives `review_cumulative` sent to `<tag>-cumulative-reviewer` with `fixes: test round 1`; a reviewer `APPROVED` after that gives `test_item` round 2.
- **T-7.4** A third route `fix` row gives `resolve_rejections` with the three-rounds detail; a fresh reply after it gives `fix_findings`.
- **T-7.5** Route `breaker` gives `fix_findings` whose send holds `diagnose: C-02 passed in round 1 and fails now`; a developer `PHASE STALLED` after it gives `resolve_block` with the stall options; a fresh reply after that gives `fix_findings` with no `diagnose` line.
- **T-7.6** Route `user` gives `resolve_tests` with the three options; `DRIFT DETECTED` gives `approve_amendment` whose detail names `work/<id>/test.md`.
- **T-7.7** Tester `APPROVED` with a developer `PHASE DONE` in the stage gives `approve_fixes`; without one it gives `close`.
- **T-7.8** `node scripts/test.mjs unit build product` exits 0, the existing `next-step.test.mts` and `agents.test.mjs` cases included.

## Phase 8: The stage's stops and the fix commit

**Touch set:**
- `src/lib/verbs/reply/table.mts`: forms for the two stops
- `src/lib/verbs/reply/index.mts`: their effects
- `src/lib/verbs/reply/index.test.mts`: reply cases
- `src/lib/shared/work/replies.mts`: answers and choices
- `src/lib/shared/work/test-stage.mts`: read answers and acceptance
- `src/lib/shared/work/test-stage.test.mts`: answered cases
- `src/lib/shared/route/plan.mts`: user approval at the fix stop
- `src/lib/shared/route/plan.test.mts`: fix commit cases
- `src/lib/shared/route/apply.mts`: the `commit_fixes` change
- `src/lib/verbs/route/index.test.mts`: the commit end to end
- `src/lib/shared/work/send.mts`: the `answers:` line
- `src/lib/shared/testing/brief.mts`: the Answers section
- `src/lib/shared/testing/brief.test.mts`: answers case
- `src/agents/tester.md`: `answers:` in Entry
- `test/repo/agents.test.mjs`: tester fixture key
- `src/lib/verbs/packet/packet.mjs`: lines for both stops
- `test/kernel/packet.test.mjs`: packet cases
- `src/lib/shared/review-summary.mts`: read only; `itemOwnedPaths`
- `src/lib/shared/work/block.mts`: read only; `latestSavedBlock`
- `src/lib/shared/commit-message.mts`: read only; `checkBlockCommit`

**Changes:** `ReplyRow` gains `answers?: string`, and `choice` takes `answers` and `accept` beside `amend` and `fix`. `GATE_ACTIONS` gains `resolve_tests` and `approve_fixes`. Forms: at `resolve_tests`, `t: <text>` or `tell: <text>` gives `{ kind: "answers"; text }`, `n` or `accept` gives `{ kind: "accept_unproved" }`, and `x` or `abandon` as today; at `approve_fixes`, the `APPROVE_FORMS` `a` and `x: <why>` lines. Effects: answers record the reply with `choice: "answers"` and the text, and print the tester's send; accept records `choice: "accept"`; approve routes the user verdict `approved` with `scope: "test"`; reject routes `rejected` with `scope: "test"` and sends the developer `rejected: <why>`.

`testStageStep` reads them: an `answers` reply after T gives `test_item` round `T.round + 1`, whose send adds `answers: <text>` and whose brief adds `## Answers` with each answer; an `accept` reply after T counts as passed for the stage; a user `rejected` with scope `test` after the latest developer `PHASE DONE` gives `fix_findings` with `review: "test"`; a user `approved` with scope `test` after it gives null (close).

In `plan.mts`, `phaseApproved` with `scope: "test"` returns `[{ kind: "commit_fixes"; line: null }]` and no marker. `apply.mts` commits with `commitOwned`: `add` holds `work/<id>/`, `owns` matches `itemOwnedPaths` of every phase, and the message is the `Commit:` line of `latestSavedBlock` of the last phase, checked by `checkBlockCommit`; a missing or invalid line refuses with its problem and commits nothing. The applied line is `committed <sha>: <subject>` and the commit is recorded with `recordAccept`.

`packet.mjs` adds a `resolve_tests` branch (each open question with its choices and `Basis:`, each tested criterion without a passed case with its cells' why, `report: work/<id>/test.md`) and an `approve_fixes` branch (the staged paths the commit would take and the proposed `Commit:` line).

**Done when:**
- **T-8.1** `reply/index.test.mts`: `t: keep the old rounding` at `resolve_tests` records `choice: "answers"`; the next send is `SendMessage <tag>-tester` with `round: 2` and `answers: keep the old rounding`, and the saved brief holds the answer under `## Answers`.
- **T-8.2** `n` at `resolve_tests` records `choice: "accept"`; with a developer `PHASE DONE` in the stage the next step is `approve_fixes`, without one `close`.
- **T-8.3** `route/index.test.mts`: `a` at `approve_fixes`, with fixes staged in files of phases 1 and 2, makes one commit holding both files and `work/<id>/`, with the subject of the latest fix block's `Commit:` line, and `nextStep` gives `close`.
- **T-8.4** `x: wrong currency` at `approve_fixes` commits nothing, records a user `rejected` row with scope `test`, prints the developer send with `rejected: wrong currency`, and the next step is `fix_findings`.
- **T-8.5** A fix block with no `Commit:` line makes `a` refuse with the commit problem, and `git log` shows no new commit.
- **T-8.6** `packet.test.mjs`: the `resolve_tests` packet prints a question with its choices and `Basis:`, an unproved criterion with its why, and the report path; the `approve_fixes` packet prints the staged paths and the proposed subject; `yes` at `resolve_tests` is unmatched and lists the options.
- **T-8.7** `node scripts/test.mjs unit build product` exits 0.

## Phase 9: The closing block says what was proven

**Touch set:**
- `src/lib/shared/testing/keep-cases.mts`: new; final-round candidates
- `src/lib/shared/testing/keep-cases.test.mts`: new
- `src/lib/shared/scenarios/keep.mts`: export the data rule
- `src/lib/shared/scenarios/keep.test.mts`: data rule case
- `src/lib/verbs/close/close.mts`: tested facts, kept cases
- `src/lib/verbs/close/block.mts`: three new lines
- `src/lib/verbs/close/index.test.mts`: closing cases
- `src/lib/shared/work/test-stage.mts`: read only; `testApplies`

**Changes:** `keep.mts` exports `writesUnownedData(card): boolean`, the rule `candidateCard` already applies (a changing method whose target and body hold no `PKT-`), and `candidateCard` calls it. `keep-cases.mts` exports `caseCandidates(item, rows, round): Candidate[]`: every case of the final round that `passed`, is not `unstable`, holds no `***` and does not write unowned data becomes a `Candidate` with outcome `passed`, `replaces: null` and the text `writeScenario` gives its card; and `notProven(rows)`: the mocks of the final round's cases and the real names they stand for (the name before `-mock`, else the mock's own name).

`Closing` gains `tested: string | null`, `unproved: string[]` and `kept: string[]`. For an order or design item, `close` sets `tested` to: `APPROVED in round <n> · <counts line>` after a tester `APPROVED`; `accepted by the user, not verified: <criterion> (<why>), …` after an `accept` reply; else the `why` of `testApplies`. When the stage ran, it writes the candidates through `keepCandidates` before the commit, adds their paths to the close commit's `add` and owned paths, and restores them with `restoreKept` when the commit fails. `closingBlock` prints `Tested: <tested>` after the lane line, `Not verified end to end: <names>` when `unproved` is not empty, and `Kept: S-0003 (T-2.1 normal), …` when cases were kept. Fast and research items print none of the three.

**Done when:**
- **T-9.1** `close/index.test.mts`: an item whose tester approved in round 2 with 5 passed cases and 1 `not covered` cell prints `Tested: APPROVED in round 2 · 5 passed, 1 not covered`.
- **T-9.2** An item accepted at `resolve_tests` with `T-2.3` blocked for `no matching data` prints `Tested: accepted by the user, not verified: T-2.3 (no matching data)`.
- **T-9.3** A design item with no environment prints `Tested: no environment`; an order item under setting `design` prints `Tested: off for the order lane (testing: design)`; a fast item prints no `Tested:` line.
- **T-9.4** Final-round cases listing `payments-mock` print `Not verified end to end: payments`.
- **T-9.5** Passed stable cases `C-01` and `C-02` become `.picket/env/scenarios/S-0003.md` and `S-0004.md` with matching fingerprints, both in the close commit, printed as `Kept: S-0003 (T-2.1 normal), S-0004 (T-2.1 boundary)`; a failed case, an unstable case and a `POST` without `PKT-` are not kept.
- **T-9.6** `keep.test.mts`: `writesUnownedData` is true for `POST {orders}/orders` with body `{"sku":"a"}` and false with `{"sku":"PKT-{run}-1"}`; the existing `candidateCard` cases pass unchanged.
- **T-9.7** `node scripts/test.mjs unit build product` exits 0, the existing close tests included.

## Phase 10: Five agents in the floor text

**Touch set:**
- `src/templates/claude-block.md`: the floor line
- `CLAUDE.md`: the same line (lead edits)
- `README.md`: the product line
- `package.json`: description
- `src/.claude-plugin/plugin.json`: description
- `.claude-plugin/marketplace.json`: description
- `docs/how-to.md`: five agents, the `testing` setting
- `.claude/MEMORY.md`: the project line (lead edits)
- `test/kernel/init.test.mjs`: read only; CLAUDE.md starts with the template
- `test/timing/budgets.test.mjs`: read only; CLAUDE.md at most 2048 bytes

**Changes:** Every "four lanes, four agents, one kernel" becomes "four lanes, five agents, one kernel", in each file's own case and form ("four lanes, five agents and one kernel" in the three descriptions). "five" and "four" have the same length, so CLAUDE.md stays at its 2044 bytes, under the 2048 budget. `docs/how-to.md` names the tester beside the four agents it lists and adds a short paragraph on the setting `testing` (`all`, `design`, the default, or `off`) and what the closing `Tested:` line means. `docs/design/picketai-design-system/` is a design asset and keeps its text.

**Done when:**
- **T-10.1** `src/templates/claude-block.md` and `CLAUDE.md` hold `Four lanes, five agents, one kernel.`, and `test/kernel/init.test.mjs` passes.
- **T-10.2** `package.json`, `src/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` describe Picket with "four lanes, five agents and one kernel".
- **T-10.3** `README.md`, `docs/how-to.md` and `.claude/MEMORY.md` say five agents, and `docs/how-to.md` names `tester` and the three values of `testing`.
- **T-10.4** No file in `src/`, `README.md`, `package.json` or `docs/how-to.md` holds "four agents", checked by the phase's absence greps.
- **T-10.5** `test/timing/budgets.test.mjs` passes with CLAUDE.md at most 2048 bytes.
- **T-10.6** `node scripts/test.mjs unit build product timing` exits 0.

## Open questions

- **OQ-001** Should the tester also test request or story sentences that no declared check covers? SDR D-009 says "a criterion" without naming the set. Owner: product owner. Fallback: D-001, the covers of HTTP checks only; the request reaches the tester as context.
- **OQ-002** Which cap by item size binds the case matrix? Draft section 11 leaves the cap numbers open. Owner: product owner. Fallback: six cases per tested criterion per round, one per case kind (phase 3), until the planted-defect benchmark (TF-005) measures cost and catch rate.
- **OQ-003** Which model runs the tester? No input in reach sets it. Owner: product owner. Fallback: `sonnet`, the reviewer's default, until TF-005 measures it.
- **OQ-004** How does the tester propose replacing a saved scenario the item changes on purpose without `replaces` (draft section 3.9)? Owner: product owner. Fallback: the tester asks it as a question at `resolve_tests`; a replacement is a follow-up order item whose check names `replaces`.
- **OQ-005** Should the breaker stop also offer consult and park (draft section 5)? Owner: product owner. Fallback: the stall stop's options (continue with a fresh developer, redesign, abandon); the lead can offer `picket:consulting` at any stop.
- **OQ-006** Should `.claude/MEMORY.md` `## Language` gain tester, test stage, round, case and cell, which D-002 and D-007 define for this record? Draft section 11 notes the file is at its limit. Owner: product owner. Fallback: no entries; phase 10 changes only the project line.
- **OQ-007** Do the QA colleague's staff edit test cases by hand (draft section 11)? Owner: product owner, asking the QA colleague. Fallback: kept cases are ordinary saved scenarios, and hand edits follow step 3's rules (D-007 of that record).

## Revision log
- 2026-11-17: D-008 (r2): states the tester shell, the testing skill, the floor text and the deferred flow-level mock mark; cross-check drift.
