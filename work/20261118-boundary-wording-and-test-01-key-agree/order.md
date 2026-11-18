---
kind: order
lane: order
title: Boundary wording and test-01 key agree
date: 2026-11-18
audience: developer
sources: [request.md, src/skills/testing/steps/matrix.md, src/skills/testing/steps/results.md, bench/hidden/test-01-negative-quantity/key.json, bench/lib/tester-grade.mjs, bench/test/tester-grade.test.mjs, bench/test/tasks.test.mjs, bench/seeds/test-01-negative-quantity/item/design.md, src/lib/shared/scenarios/format.mts, bench/results/plugin-2026-11-18.json, the 2026-11-18 test-01 run transcript]
phases:
  - n: 1
    files: [src/skills/testing/steps/matrix.md]
    greps:
      - path: src/skills/testing/steps/matrix.md
        pattern: 'A business boundary the request gives no outcome for gets no case'
      - path: src/skills/testing/steps/matrix.md
        pattern: '\bA boundary the request gives no outcome for\b'
        absent: true
    tests: true
    drive: false
  - n: 2
    files: [bench/hidden/test-01-negative-quantity/key.json, bench/lib/tester-grade.mjs, bench/test/tester-grade.test.mjs]
    greps:
      - path: bench/hidden/test-01-negative-quantity/key.json
        pattern: '"consequences"'
      - path: bench/hidden/test-01-negative-quantity/key.json
        pattern: 'T-1\.2'
      - path: bench/lib/tester-grade.mjs
        pattern: '\bconsequences\b'
      - path: bench/test/tester-grade.test.mjs
        pattern: 'key\.json'
    tests: true
    drive: false
---
# Order: Boundary wording and test-01 key agree

## Problem
Two causes of wrong grades stand before the tester benchmark is rerun. `src/skills/testing/steps/matrix.md:8` sends every boundary with no outcome to a question, while `steps/results.md:11` keeps a technical edge (a size of 0) as a case, and a question fails a trap task. The test-01 key matches only a POST /invoices followed by `expect status 400`, so in the 2026-11-18 run (`bench/results/plugin-2026-11-18.json`, `no_false_alarm` failed with "1 unmatched product failure(s)") the tester's case C-09 counted as a false alarm. The run transcript shows C-09: criterion T-1.2, kind negative, a GET capturing `total`, a POST /invoices with `"quantity": -1` and no status expectation, then a GET expecting the same total; it failed and was classed `product`. That is the planted defect seen through T-1.2.

## Decisions

### D-001: A defect key may list consequences, matched by criterion, request and body
**Decision:** A `defect` key gains an optional top-level `consequences` list. Each entry names a `criterion`, a `method`, a `path` regex and a `body` regex. A round-1 product failure matches an entry when its row's criterion equals the entry's and one of its request steps has that method, a target (service prefix stripped, as `showsDefect` does) matching the path, and a body matching the body regex. No status expectation is read, since a consequence shows in a later step. Only the test-01 key carries the list: `[{ "criterion": "T-1.2", "method": "POST", "path": "^/invoices$", "body": "\"quantity\"\\s*:\\s*-" }]`, the body regex being `"quantity"\s*:\s*-`. A probe through the kernel's `caseCard` matched it on C-09's body and on `"quantity":-1`, and not on `"quantity": 2`. The other five keys stay as they are.
**Instead of:** dropping the status from the primary defect match and matching the negative body on any criterion: it changes how test-02 and test-03 grade, and a T-1.1 case that posts a negative quantity expecting 201 (a test error classed product) would count as found.
**Risks:**
- **RISK-001** A tester writes a negative quantity the regex misses (a captured `{q}` value). Mitigation: a miss grades as a false alarm, as today, never as a false find.
- **RISK-002** An entry missing `body` builds an empty regex that matches every body. Mitigation: the only entry is the reviewed test-01 one, and T-2.1 pins its four fields.

### D-002: A consequence counts as the planted defect
**Decision:** A product failure that matches a consequence joins the `matching` list in `defectGrade`: it counts toward `found` and the `defect_found` detail, and never toward `false_alarms`. Check names, detail formats and the signature stay as they are, so `bench/report.mjs` and the measures read the same fields. This gives up the reading of `found` as "a T-1.1 case caught it": a run whose only product failure is C-09 now counts as found.
**Instead of:** a neutral consequence that clears the false alarm but leaves `found` to the primary match: the request says the failure counts as the planted defect, and C-09 does show it on a running stack.

### D-003: The new tests read the shipped test-01 key
**Decision:** The new tests in `bench/test/tester-grade.test.mjs` parse `bench/hidden/test-01-negative-quantity/key.json` from disk instead of a constant, and use C-09's steps from the run as the T-1.2 card, so the grader is tested against the key and the card shape the benchmark really uses. The existing `DEFECT`, `TRAP` and `SILENT` constants and their tests stay, and pin that a key without `consequences` grades as before.
**Instead of:** a `DEFECT_WITH_CONSEQUENCE` constant in the test: a copy can drift from the shipped key while the tests stay green.

## Scope
**In:**
- `src/skills/testing/steps/matrix.md` line 8, the request's wording.
- The test-01 key, the grader's defect match and its unit tests.

**Out:**
- Any paid benchmark run, the other five tester keys, `bench/test/tasks.test.mjs`, the kernel's `picket test` verbs, `steps/results.md`, `steps/cases.md` and the setting `testing`.

## Phase 1: Matrix line 8 names a business boundary
**Touch set:**
- `src/skills/testing/steps/matrix.md`: line 8 wording
- `src/skills/testing/steps/results.md`: read only, step 4 wording

**Changes:** In the `boundary` bullet of step 2, "A boundary the request gives no outcome for gets no case" becomes "A business boundary the request gives no outcome for gets no case". The rest of the line and of the file stays byte for byte. On this machine `npm test` needs `TMPDIR=/tmp` (`test/init.test.mjs:104` fails with a TMPDIR under HOME) [INFERRED].

**Done when:**
- **T-1.1** `src/skills/testing/steps/matrix.md` line 8 reads "A business boundary the request gives no outcome for gets no case: it becomes a question, as step 4 of `steps/results.md` says." at its end.
- **T-1.2** The text "A boundary the request gives no outcome for" no longer appears in `src/skills/testing/steps/matrix.md`.
- **T-1.3** Against the before-image (the file at base `aed758de`), `git diff --numstat aed758de -- src/skills/testing/steps/matrix.md` prints 1 added and 1 removed line, and `git diff -U0` shows the change at line 8 only.
- **T-1.4** `npm test` passes, the step file budget (80 lines) included.

## Phase 2: The test-01 key counts the T-1.2 consequence
**Touch set:**
- `bench/hidden/test-01-negative-quantity/key.json`: add the consequences list
- `bench/lib/tester-grade.mjs`: match consequences in defectGrade
- `bench/test/tester-grade.test.mjs`: tests on the shipped key
- `bench/test/tasks.test.mjs`: read only, key kinds check
- `src/lib/shared/scenarios/format.mts`: read only, RequestStep body field

**Changes:**
- `key.json`: add the `consequences` entry of D-001 beside `kind` and `defect`; `defect` stays as it is.
- `tester-grade.mjs`: a `showsConsequence(row, steps, consequence)` beside `showsDefect`, and `defectGrade` counts a product row as matching when `showsDefect` or any entry of `key.consequences ?? []` holds. Read each row's card steps once. A request step whose `body` is null never matches. Trap and silent grading stay as they are.
- `tester-grade.test.mjs`: read the shipped key with `readFileSync`. Add a `C09` steps constant copied from the run: `request GET {ledgerlite}/invoices`, `expect status 200`, `capture before json total`, `request POST {ledgerlite}/invoices` with header `content-type: application/json` and body `{"customer": "PKT-{run}", "currency": "EUR", "lines": [{"description": "item", "quantity": -1, "unitPriceCents": 150}]}`, `request GET {ledgerlite}/invoices`, `expect status 200`, `expect contains "\"total\":{before}"`. `failedCase` already takes `criterion`. Each new test asserts the whole `tester` tuple and `pass`.

**Done when:**
- **T-2.1** The test-01 `key.json` parses to `kind` "defect", the same `defect` object as at base, and `consequences` with one entry: criterion "T-1.2", method "POST", path "^/invoices$", body `"quantity"\s*:\s*-`.
- **T-2.2** Graded with the shipped key, round-1 product failures C-02 (T-1.1, `NEGATIVE_POST`) and C-09 (T-1.2, the C09 steps) give found true, false_alarms 0, pass true, and the `defect_found` detail "C-02, C-09".
- **T-2.3** With C-09 as the only product failure, the grade is found true, false_alarms 0, pass true.
- **T-2.4** The C09 steps with quantity 1, and the C09 steps recorded under T-1.1, each grade as found false, false_alarms 1, pass false.
- **T-2.5** The eight tests present at base `aed758de` pass, and `git diff aed758de -- bench/test/tester-grade.test.mjs` removes no line other than the `node:fs` import.
- **T-2.6** `git diff --name-only aed758de -- bench/hidden` prints only `bench/hidden/test-01-negative-quantity/key.json`.
- **T-2.7** `npm test` passes, `bench/test/tasks.test.mjs` (T-1.7, the key kinds and declared checks) included.

## Open questions
- **OQ-001** The cumulative review of `20261118-tester-reads-shapes-doubts-asks-edges` also flagged `matrix.md:3` ("each cell gets a case, or a note") and how a business-boundary cell with a question is recorded; the brief keeps this item to line 8. Owner: the product owner. Fallback: both stay as they are.

## Revision log
