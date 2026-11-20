---
kind: order
lane: order
title: Four defects that give wrong results
date: 2026-11-20
audience: developer
sources: [work/20261120-four-defects-that-give-wrong-results/request.md, work/20261120-browser-adapter-for-scenario-steps/verdicts.jsonl, work/20261120-browser-adapter-for-scenario-steps/replies.jsonl, src/lib/shared/work/next-step.mts, src/lib/shared/work/test-stage.mts, src/lib/shared/work/send.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.mts, src/lib/shared/mocks/stub.mts, src/lib/shared/scenarios/replay.mts, src/lib/verbs/test/defect.mts, src/lib/verbs/test/case.mts, src/lib/verbs/test/rerun.mts, src/lib/shared/testing/derive.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/results.mts]
phases:
  - n: 1
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.test.mts]
    greps:
      - path: src/lib/verbs/reply/table.mts
        pattern: 'Number\.isSafeInteger'
    tests: true
    drive: false
  - n: 2
    files: [src/lib/shared/mocks/stub.mts, src/lib/shared/mocks/stub.test.mts, src/lib/shared/scenarios/replay.test.mts]
    greps:
      - path: src/lib/shared/mocks/stub.mts
        pattern: 'TrafficEntry\[\] \| null'
      - path: src/lib/shared/mocks/stub.test.mts
        pattern: 'as an empty log'
        absent: true
    tests: true
    drive: false
  - n: 3
    files: [src/lib/shared/testing/derive.mts, src/lib/verbs/test/defect.mts, src/lib/verbs/test/defect.test.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/brief.test.mts]
    greps:
      - path: src/lib/shared/testing/derive.mts
        pattern: 'export const MAX_DEFECTS\b'
      - path: src/lib/verbs/test/defect.mts
        pattern: '\bMAX_DEFECTS\b'
      - path: src/lib/shared/testing/brief.mts
        pattern: 'defects per round: at most'
    tests: true
    drive: false
---
# Order: Four defects that give wrong results

## Problem

Four small kernel defects each produce a wrong result. A continue at a stall in a cumulative fix round sends the item to a review of unfixed code; a failed stub read turns a mock's whole earlier log into one run's traffic; a set_case_cap total of 309 or more digits is saved as null; and `picket test defect` has no cap per round while cases do. Each fix stays inside its own module, adds no gate option or verdict token, and leaves the six-per-criterion case cap alone.

## Decisions

### D-001: The newest done-or-stalled row after a review decides whether its findings are open
**Decision:** `findingsOpen` (src/lib/shared/work/next-step.mts:139) treats a review's findings as open while the newest `PHASE DONE` or `PHASE STALLED` row after that review is not `PHASE DONE` (none yet, or a stall). Today any `PHASE DONE` after the review closes them. Replaying work/20261120-browser-adapter-for-scenario-steps through `nextStep` with a one-off script confirmed the cause: the rows after the cumulative `CHANGES REQUIRED` (18:46:47) are `PHASE DONE` at 18:50:13 and `PHASE STALLED` at 18:51:05, so after the user's `c` (18:54:19) the step was `review_cumulative`; without the 18:50:13 row the same replay already gives `fix_findings`. So the request's reading ("because every phase was approved") names the branch, and the earlier `PHASE DONE` is what picks it. The rule reads verdicts, not the agent field, so it covers the checkpoint scope too, and `send.mts` already names `developer-2` after the fresh reply (`developerName`, send.mts:48).
**Instead of:** a flag on the `c` reply row that forces `fix_findings`: the step is derived from rows, so `nextStep` would have to read the flag anyway, and a stall without a reply in between would still be read wrongly.
**Risks:**
- **RISK-001** The checkpoint path changes with the cumulative one. Mitigation: T-1.3 pins the checkpoint case; the existing next-step tests stay green.

### D-002: The case cap form refuses a total that is not a safe integer
**Decision:** `CASE_CAP_FORMS` (src/lib/verbs/reply/table.mts:114) returns no match when `Number(m[0])` is not a safe integer, so `matchReply` gives null and the existing refusal (`"<reply>" matches no option at set_case_cap; options: ...`, reply/index.mts:149) prints and no reply row is written. A one-off script gave `Number` of 309 nines as `Infinity`, saved by JSON as `"cases":null`, and 9007199254740992 as not safe, 9007199254740991 as safe.
**Instead of:** a separate "too large" refusal: it adds wording the user never sees otherwise, and the existing refusal already names the option.

### D-003: A failed stub read is null, and a run counts a stub's traffic only when both reads worked
**Decision:** `Traffic` becomes `Record<string, TrafficEntry[] | null>` in src/lib/shared/mocks/stub.mts. `readTraffic` (stub.mts:111, not 106 as the request says) gives null when the answer status is not 200 (a refused connection has status null) or the body is not a JSON array; entries that are not traffic entries inside an array are still filtered out. `trafficBetween` skips a service whose before or after read is null, so it adds neither a mock nor a gap for it. The caller, `replayOne` (src/lib/shared/scenarios/replay.mts:61), needs no edit.
**Instead of:** counting the service as reached with no gaps when only the before read failed: that still blames earlier traffic on this run, which the request forbids.
**Risks:**
- **RISK-002** A pass through a mock whose before read failed is not flagged as mocked. Mitigation: the stub only starts behind a health check (stub.mts:63, 15 retries), so a failed read mid-replay is rare; a field naming unread stubs is a later item if it shows up.

### D-004: Recorded defects get a fixed cap per round, counted on new ids only
**Decision:** src/lib/shared/testing/derive.mts exports `MAX_DEFECTS` beside `MAX_QUESTIONS`. `recordDefect` (src/lib/verbs/test/defect.mts:46) refuses before the steps run once the round holds `MAX_DEFECTS` defect ids first recorded in this round, the same place `recordCase` refuses its cap (case.mts:48). Rows `picket test rerun` writes reuse an earlier round's `found` id in the new round (rerun.mts:36), so a defect row whose id appears in an earlier round does not count. `compileBrief` adds `defects per round: at most <MAX_DEFECTS>` to its Limits section. The value is 3 by fallback (OQ-001): it copies `MAX_QUESTIONS = 3` (derive.mts:6) and has no input of its own, so the product owner sets it.
**Instead of:** counting every defect row in the round: a rerun of earlier defects would use up the cap before the tester records a new one.
**Risks:**
- **RISK-003** A real fourth defect in one round goes unrecorded. Mitigation: the refusal names the cap and the brief shows it; a defect seen again next round can be recorded then.

## Scope

**In:**
- `findingsOpen` and its tests; the `c` reply at a stall in a fix round, tested through the reply verb
- the set_case_cap total form
- `readTraffic` and `trafficBetween`, and one replay test through the real caller
- `MAX_DEFECTS`, its refusal in `recordDefect` and its line in the brief

**Out:**
- the admission wording defect (its own item), new gate options or verdict tokens, the six cases per criterion, the `testing` setting, any benchmark run
- skill or agent prose about the defect cap: the brief and the refusal carry it
- a stall in the test stage's fix cycle (OQ-002)

## Phase 1: A stall in a fix round, and the case cap total

**Touch set:**
- `src/lib/shared/work/next-step.mts`: findingsOpen reads the newest stall
- `src/lib/shared/work/next-step.test.mts`: replayed incident rows as tests
- `src/lib/shared/work/send.mts`: read only, developer-2 after fresh
- `src/lib/verbs/reply/table.mts`: case cap form refuses unsafe totals
- `src/lib/verbs/reply/index.mts`: read only, refusal and reply row
- `src/lib/verbs/reply/index.test.mts`: reply c and oversized totals

**Changes:** Change `findingsOpen` as D-001 says; `findingsStep` and `checkpointStep` keep calling it. Change the `CASE_CAP_FORMS` match as D-002 says. Add the tests below; the existing ones stay as they are.

**Done when:**
- **T-1.1** A test in next-step.test.mts feeds the verdict rows of work/20261120-browser-adapter-for-scenario-steps up to 18:51:05.575Z, its `c` reply row (`fresh: true`), three approved phases and status open to `nextStep`, and gets `fix_findings` with actor `developer`, phase 3 and review `cumulative`.
- **T-1.2** The same rows plus the `PHASE DONE` of 18:54:39.690Z give `review_cumulative`; a cumulative `CHANGES REQUIRED` followed by a lone `PHASE STALLED` and a fresh reply gives `fix_findings`.
- **T-1.3** On a design item of six phases at its midpoint, a checkpoint `CHANGES REQUIRED` followed by `PHASE DONE` then `PHASE STALLED` gives `fix_findings` with review `checkpoint`; followed by `PHASE DONE` alone it gives `review_checkpoint` again, as today.
- **T-1.4** In reply/index.test.mts, on an order item with all phases approved, a cumulative `CHANGES REQUIRED`, a `PHASE DONE` and a `PHASE STALLED` with status blocked, the reply `c` sets status open, writes a reply row with `fresh: true`, and returns `next.action` `fix_findings` with one send by tool `Agent` to `<tag>-developer-2` whose message holds `review: work/<id>/reviews/cumulative.md`.
- **T-1.5** At set_case_cap with 24 by default, the replies of 309 nines and `9007199254740992` are each refused with `"<reply>" matches no option at set_case_cap; options: reply: <total>, 24 keeps six for each criterion`, and replies.jsonl is not created.
- **T-1.6** At the same gate `9007199254740991` is accepted and its reply row holds `cases: 9007199254740991` and `default_cases: 24`.

## Phase 2: A failed stub read counts no traffic

**Touch set:**
- `src/lib/shared/mocks/stub.mts`: null for a failed read
- `src/lib/shared/mocks/stub.test.mts`: failed reads before and after
- `src/lib/shared/scenarios/replay.mts`: read only, the one caller
- `src/lib/shared/scenarios/replay.test.mts`: a replay whose first read fails
- `src/lib/shared/scenarios/http.mts`: read only, status null on errors

**Changes:** Change `Traffic`, `readTraffic` and `trafficBetween` as D-003 says. Rename and rewrite the test "readTraffic asks each stub for its log and reads a stub that does not answer as an empty log" (stub.test.mts:95) to the new rule. Add one test to replay.test.mts in the shape of its T-3.1 test (replay.test.mts:109).

**Done when:**
- **T-2.1** `readTraffic` gives null for a stub answering status null with error `ECONNREFUSED`, null for status 500, null for a 200 whose body is `{}` or `not json`, and the filtered entries for a 200 JSON array; one test asserts the whole returned record and the requests sent.
- **T-2.2** `trafficBetween({ "payments-mock": null }, { "payments-mock": [CHARGE, REFUND] })` returns `{ mocks: [], gaps: [] }`, with `REFUND` unanswered.
- **T-2.3** `trafficBetween` with a null after read for one service and a grown log for another returns the second service alone in `mocks` and only its gaps.
- **T-2.4** A `replayScenarios` run whose first log read of `payments-mock` fails and whose second returns an unanswered entry gives a run with `mocks` equal to `ownMocks` only and `gaps` empty.
- **T-2.5** The tests at stub.test.mts:84 (a shorter log counts whole) and stub.test.mts:89 (only added entries count) pass unedited.

## Phase 3: A cap per round for recorded defects

**Touch set:**
- `src/lib/shared/testing/derive.mts`: MAX_DEFECTS beside MAX_QUESTIONS
- `src/lib/verbs/test/defect.mts`: refuse past the cap
- `src/lib/verbs/test/defect.test.mts`: cap and rerun rows
- `src/lib/verbs/test/case.mts`: read only, refuseCap pattern
- `src/lib/verbs/test/rerun.mts`: read only, reruns reuse found ids
- `src/lib/shared/testing/results.mts`: read only, roundRows and defectRows
- `src/lib/shared/testing/brief.mts`: Limits line for defects
- `src/lib/shared/testing/brief.test.mts`: brief shows the line

**Changes:** Add `MAX_DEFECTS` and the refusal as D-004 says, reading the rows `recordDefect` already reads; the refusal names the cap and is thrown before `runCase`. Add the Limits line after the questions line in `limitLines`. Tests use the constant, not the number.

**Done when:**
- **T-3.1** derive.mts exports `MAX_DEFECTS`, and defect.mts and brief.mts import it; neither holds the cap as a literal.
- **T-3.2** With `MAX_DEFECTS` defects recorded in round 1, `recordDefect` with new steps is refused with a message holding `the cap of <MAX_DEFECTS> defects this round is reached`, the stack receives no request outside `/__picket/received`, and results.jsonl keeps its rows.
- **T-3.3** In round 2 (one tester verdict row), with `MAX_DEFECTS` defects found in round 1 and their rerun rows written in round 2, a new defect is recorded with the next `K-` id.
- **T-3.4** `compileBrief` puts `defects per round: at most <MAX_DEFECTS>` in the Limits section, right after the questions line; the existing brief tests at brief.test.mts:71, 72, 135 and 136 pass unedited.
- **T-3.5** `TMPDIR=/tmp npm test` exits 0 (without it, test/cli/init.test.mjs:104 fails on this machine on the base too).
- **T-3.6** [DEFERRED: the product owner, the next testing-stage round on a design item] The tester's saved brief shows the defects line, and a defect past the cap is refused in a live round.

## Open questions

- **OQ-001** What is the defect cap per round? Owner: the product owner. Fallback: 3, copied from `MAX_QUESTIONS`; the tests read the constant, so a new value changes one line.
- **OQ-002** By reading test-stage.mts:82-90, a stall while fixing the cumulative findings of test fixes, then `c`, sends the developer the test findings (`fixStep`, review `test`), not the cumulative ones, and the review runs again after. Fix it in a later item? Owner: the product owner. Fallback: unchanged here.

## Revision log
