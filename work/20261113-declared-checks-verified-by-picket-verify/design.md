---
kind: design
lane: design
title: Declared checks verified by picket verify
date: 2026-11-13
audience: developer
sources: [work/20261113-declared-checks-verified-by-picket-verify/request.md, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, artifacts/strategy/drafts/testing-and-test-environment.md, src/lib/verbs/verify/index.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/server.mts, src/lib/verbs/drive/run.mts, src/lib/shared/drive-log.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/route.mts, src/lib/shared/route/commit.mts, src/lib/verbs/packet/packet.mjs, src/lib/hooks/lint/schema/index.mts, src/lib/util/yaml-lite.mts]
phases:
  - n: 1
    files: [src/lib/shared/work/declared-checks.mts, src/lib/shared/work/declared-checks.test.mts, src/lib/shared/work/artifact.mts, src/lib/hooks/lint/schema/index.mts, test/hooks/lint.schema.test.mjs]
    greps:
      - path: src/lib/shared/work/declared-checks.mts
        pattern: export function readChecks\b
      - path: src/lib/hooks/lint/schema/index.mts
        pattern: \breadChecks\b
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/drive-log.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/server.mts, src/lib/verbs/drive/run.mts, src/lib/verbs/drive/index.test.mts, src/lib/verbs/drive/server.test.mts, src/lib/shared/work/declared-checks.mts, src/lib/shared/work/declared-checks.test.mts]
    greps:
      - path: src/lib/shared/drive-log.mts
        pattern: \bcontains\b
      - path: src/lib/verbs/drive/server.mts
        pattern: \bcontains\b
      - path: src/lib/verbs/drive/run.mts
        pattern: \bcontains\b
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/work/declared-checks.mts, src/lib/shared/work/declared-checks.test.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/verify/index.test.mts]
    greps:
      - path: src/lib/shared/work/declared-checks.mts
        pattern: export function compareChecks\b
      - path: src/lib/verbs/verify/index.mts
        pattern: \bcompareChecks\b|\bphaseCheckResults\b
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/work/declared-checks.mts, src/lib/shared/work/declared-checks.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/work/declared-checks.mts
        pattern: export function carriedResults\b
      - path: src/lib/verbs/packet/packet.mjs
        pattern: \bcarriedResults\b
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/shared/work/gate.mts, src/lib/shared/route/route.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/route/route.mts
        pattern: \bphaseCheckResults\b
      - path: src/lib/shared/route/route.mts
        pattern: \bcarriedResults\b
    tests: true
    drive: true
    security: true
  - n: 6
    files: [src/lib/shared/work/check-correction.mts, src/lib/shared/work/check-correction.test.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/route.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/work/check-correction.mts
        pattern: export function correctCheckPath\b
      - path: src/lib/shared/route/plan.mts
        pattern: "\"correct\""
    tests: true
    drive: true
    security: false
  - n: 7
    files: [src/skills/documenting/templates/design.md, src/skills/documenting/templates/order.md, src/agents/architect.md, src/agents/developer.md, src/skills/implementing/SKILL.md, src/lib/shared/work/declared-checks.test.mts]
    greps:
      - path: src/skills/documenting/templates/design.md
        pattern: "exit_code:"
      - path: src/skills/documenting/templates/order.md
        pattern: "exit_code:"
      - path: src/agents/architect.md
        pattern: \bcovers\b
      - path: src/skills/implementing/SKILL.md
        pattern: declared check
    tests: true
    drive: false
    security: false
---
# Design: Declared checks verified by picket verify

## Problem

`picket verify` passes the `drive` must_have when any drive-class row exists for the phase: `driveResult` (`src/lib/verbs/verify/index.mts:82`) reads no status and also counts rows whose `work_id` or `phase` is empty, so an architect's or reviewer's probe passes a developer's phase. On this machine the drive log holds 1335 drive rows; 116 carry no work item and 717 carry a work item with no phase, of which 6 are the developer's (counted from `.picket/state/drive-log.jsonl`, 2717 lines). SDR 00004 D-002 (Ratified) binds this item to TF-001: the architect declares a request with its expected status and content and the criterion it covers, the user rules on a mismatch at the phase gate, a path prefix difference rides inside a run grant and any other mismatch stops it. The environment, saved scenarios and the tester are later steps (D-013), so here the check that counts is the one `picket drive` logged, as the draft's section 1 allows for a project without the environment (`artifacts/strategy/drafts/testing-and-test-environment.md:28`).

## Decisions

### D-001 (r2): Declared checks live in the phase's drive key, read by one module
**Decision:** A phase's `drive:` frontmatter is `true`, `false`, or a block list of checks. An HTTP check carries `covers` (a `T-N.x` id of this phase), `method`, `path` (starting with `/`), `status` and an optional `contains` list of literal strings. A run check carries `covers`, `command`, `exit_code` and an optional `contains`. One new module, `src/lib/shared/work/declared-checks.mts`, owns the shape: it reads and validates checks for the schema lint, drive, verify, the packet and route, so the shape has one reader. `exit_code` reuses the drive log's field name, so a check and the row it is compared with use one word per fact. The shape is a contract for its writers too: both record templates show it in block form with one HTTP and one run check, the architect contract says when to declare a check and when `drive: true` remains, and the developer contract with the drive step of `picket:implementing` says how a declared check is driven and that one contradicting its criterion goes to the gate. These texts land in the last phase, so they describe only behaviour that has shipped. Infrastructural decision.
**Instead of:** a separate `checks:` key beside `drive: true`: two keys could disagree (`drive: false` with checks), and the request places checks in the drive frontmatter.
**Risks:**
- **RISK-001** yaml-lite reads a subset of YAML. Mitigation: a probe of `parse` on a phase whose `drive:` holds an HTTP and a run check, with `contains: ["\"id\"", pending, "a, b"]`, returned the expected nested lists and maps; a flow map `{ ... }` holding a list still throws, so the templates show the block form and the lint names the parse failure.

### D-002: Drive logs contains results, never response bodies
**Decision:** `picket drive` reads the declared checks of the phase it logs the row against and records, for each hit, a `contains` map from every `contains` string of the phase's HTTP checks to whether the full response body holds it; a run row records the same map against the full output, and a new `run` field with the exact command. Both are computed before the existing cuts (body 2000 characters in `server.mts`, output 4000 in `run.mts`, logged command 200 in `drive/index.mts`), so a string late in a long body still counts and a long command still compares.
**Instead of:** logging the response body: a body can carry a token, which the security rule forbids writing anywhere, and a cut body would miss strings past its end.
**Risks:**
- **RISK-002** The record is amended after the drive, so a new string was never looked for. Mitigation: verify and the packet say "not checked by the logged drive" for a string absent from the map, and the developer drives again.

### D-003: A pure comparison of declared checks with this phase's drive rows
**Decision:** The rows that count are `picket drive` rows (`source: "picket drive"`) whose `work_id` is the item and whose `phase` is the phase; hook rows, other items and empty phases never count. For an HTTP check, the latest hit with the same method and the exact path is compared; when none exists, the latest hit with the same method whose path ends with the declared path. A run check compares the latest row whose `run` equals the declared command exactly. Each check gets one outcome: `pass`; `prefix` (only the path differs, by a prefix; status and contains hold); `failed` (status, exit code or a contains string differs); `not_run` (no row matches: a different resource, a different command, or no drive). Verify reports one result per check, `check:<covers>`: `pass` and `prefix` are ok, the second with a detail naming both paths, and `failed` and `not_run` fail with declared versus ran. `drive: true` keeps its row count, limited to the same item and phase.
**Instead of:** failing verify on a prefix difference: the developer would bend working code to a declared path the user may accept, while the ratified rule lets that difference ride.
**Risks:**
- **RISK-003** An item in flight under `drive: true` whose developer drove with an empty phase now fails verify. Mitigation: the 6 developer rows with an empty phase on this machine all belong to closed order items; the detail says "no drive row for phase N of this item", and driving again inside the phase fixes it.

### D-004: Mismatches surface at the phase gate, never as drift
**Decision:** The approval packet lists every check of the phase that did not pass as declared versus ran, and a `carried` group listing every `prefix` outcome on phases the run grant approved. No verdict, next step or send changes: a mismatch reaches the user's ruling (`[a]` or `[x] reject: <why>`) and never the architect on its own.
**Instead of:** refusing `PHASE DONE` while a check fails: it takes the ruling from the user, and a check can be the wrong half.

### D-005: The run grant carries a prefix difference and stops on anything else
**Decision:** On `PHASE DONE` inside a grant, route checks the phase's own gate first (security path, `security: true`, irreversible) as today, then its check outcomes: any `failed` or `not_run` stops the run at that phase; `prefix` alone is carried and the grant approves the phase. The grant's last phase (`n` equal to `run_through`) also stops for the gate when the run carried any difference, so the group shows once, at the end. The carried set is computed, never stored: a `prefix` outcome on an approved phase.
**Instead of:** storing carried mismatches in `state.yaml`: the work-items rule fixes its 12 fields, and the set is recomputable from the drive log and the record.
**Risks:**
- **RISK-004** A grant whose last phase drives nothing still stops when an earlier phase carried a difference. Mitigation: intended; that stop is the one place the group is shown and accepted.

### D-006: The user's approval writes the path correction, with a revision log line
**Decision:** On the user's `approved` for phase N, the kernel corrects every `prefix` outcome on phases up to N: it replaces that check's `path:` line in the record's frontmatter with the path that ran and appends one line per correction to `## Revision log`, such as `- 2026-11-13: T-2.1 check path /orders corrected to /api/orders; approved with phase 3`. The write lands before the phase commit, so it rides that commit (`commitPhase` adds `work/<id>/`). A `failed` or `not_run` the user approves leaves the record as declared. The grant's own approvals write nothing; the user's approval at the end of the run does.
**Instead of:** rewriting the frontmatter through yaml-lite's `stringify`: it re-quotes and reflows every key of an approved record, so the diff would hide a one-line change.
**Risks:**
- **RISK-005** The line edit hits the wrong `path:` line. Mitigation: the check is addressed by phase and its index in that phase's `drive:` list, and a round-trip test parses the result and expects the frontmatter equal to the original except that one path.

## Scope

**In:**
- The check shape and its validation in the schema lint (D-001).
- `picket drive` logging the exact run command and contains results (D-002).
- `picket verify` comparing checks for this item and phase, and the narrower `drive: true` count (D-003).
- The approval packet's declared versus ran lines and the carried group (D-004).
- The run grant rule in route (D-005) and the correction on approval (D-006).
- The order and design templates, the architect contract, the developer contract and the drive step of `picket:implementing`.

**Out:**
- The test environment and `picket env`, saved scenarios and keeping an approved check, the tester, the browser adapter, and every other part of SDR 00004.
- Correcting the record for a status, exit code or contains mismatch the user approves (OQ-002).
- The reference docs under `docs/` (OQ-001).

## Phase 1: The declared check shape and its lint

**Touch set:**
- `src/lib/shared/work/declared-checks.mts`: new module owning the shape
- `src/lib/shared/work/declared-checks.test.mts`: new unit tests for reading
- `src/lib/shared/work/artifact.mts`: widen the `PhaseEntry.drive` type
- `src/lib/hooks/lint/schema/index.mts`: validate checks in `phaseProblems`
- `test/hooks/lint.schema.test.mjs`: lint cases for checks

**Changes:**
- `declared-checks.mts` exports `HttpCheck = { covers: string; method: string; path: string; status: number; contains: string[] }`, `RunCheck = { covers: string; command: string; exit_code: number; contains: string[] }`, `DeclaredCheck = HttpCheck | RunCheck`, and `readChecks(drive: unknown, phase: number): { checks: DeclaredCheck[]; problems: string[] } | null`. It returns `null` for `true`, `false` or a missing key, which keep today's meaning. A missing `contains` reads as `[]`.
- The problems it names: an empty list; a check that has both `path` and `command`, or neither; a key outside its kind's set; `covers` not of the form `T-<phase>.<x>`; `method` not upper-case letters; `path` not starting with `/`; `status` not an integer from 100 to 599; `exit_code` not an integer; `command` empty; `contains` not a list of non-empty strings.
- `PhaseEntry.drive` becomes `boolean | unknown[]`. Verify's `if (mustHaves.drive)` stays as it is in this phase, so a list still takes today's row count until phase 3.
- `phaseProblems` adds the problems from `readChecks` as `phases[n=N].drive ...` lines, a problem for a `drive` that is neither a boolean nor a list, and one for a `covers` id that no `- **T-N.x**` line of that phase's section carries.

**Done when:**
- **T-1.1** A unit test feeds `parseArtifact` a record text whose phase 1 declares one HTTP and one run check in block form, passes the phase entry's `drive` to `readChecks`, and gets both checks with every field and no problems.
- **T-1.2** `readChecks` returns `null` for `true`, `false` and `undefined`, and reads a check without `contains` as `contains: []`.
- **T-1.3** Each problem listed under Changes has a unit test that asserts its own message, one case per problem.
- **T-1.4** A lint.schema test on a design record whose check covers `T-2.1` from phase 1, or covers `T-1.9` with no such criterion, gets a context naming that phase and id.
- **T-1.5** A lint.schema test on a record with `drive: true` and one with two valid checks gets no context.
- **T-1.6** Piping a PostToolUse payload for a scratch record with a bad check into `dist/hooks/lint.schema.mjs`, after `npm run build`, prints the `phases[n=1].drive` problem.

## Phase 2: Drive logs what a check needs

**Touch set:**
- `src/lib/shared/drive-log.mts`: new row and hit fields
- `src/lib/verbs/drive/index.mts`: read declared strings, log them
- `src/lib/verbs/drive/server.mts`: test strings against full body
- `src/lib/verbs/drive/run.mts`: test strings against full output
- `src/lib/verbs/drive/index.test.mts`: run-mode row tests
- `src/lib/verbs/drive/server.test.mts`: hit contains tests
- `src/lib/shared/work/declared-checks.mts`: declared strings by kind
- `src/lib/shared/work/declared-checks.test.mts`: tests for the string lists

**Changes:**
- `declared-checks.mts` adds `containsMap(text: string, strings: string[]): Record<string, boolean>` and `declaredStrings(checks: DeclaredCheck[], kind: "http" | "run"): string[]` (the union of that kind's `contains`, without repeats).
- `DriveHit` gains `contains?: Record<string, boolean>`; `DriveRow` gains `run?: string` and `contains?: Record<string, boolean>`. A key is present only when the phase declared strings of that kind.
- `driveRow` resolves the target as today, then the phase entry of that target through `readSnapshot` and `readChecks`. `ServerInput` gains `contains: string[]`, and `request` applies `containsMap` to the full `text` before it cuts the body to 2000 characters. `runMode` takes the strings and applies `containsMap` to the full output before the 4000-character cut.
- A run row logs `run: input.run` uncut; `command` keeps its 200-character cut for display. `renderDrive` is unchanged.
- No item, an empty phase, or a phase whose `drive` is `true`, `false` or holds no `contains` logs rows without `contains`, as today.

**Done when:**
- **T-2.1** `containsMap("a pending order", ["pending", "paid"])` returns `{ pending: true, paid: false }`, and a 3000-character body holding `paid` at position 2900 returns `paid: true`.
- **T-2.2** A drive-verb unit test with a scratch root whose current phase declares a run check with `contains: [hello]` runs `--run` on a command printing `hello`, and the logged row carries `run` equal to the command and `contains: { hello: true }`.
- **T-2.3** The same test with a 250-character command logs `run` with all 250 characters while `command` stays at 200.
- **T-2.4** With the phase's `drive: true`, the logged row has neither `contains` nor any key other than today's plus `run`.
- **T-2.5** `picket drive --hit "GET /"` inside a scratch item whose phase declares an HTTP check, against a small server under `.picket/state/scratch/`, logs a hit whose `contains` map matches the body the server sends.

## Phase 3: Verify compares declared checks

**Touch set:**
- `src/lib/shared/work/declared-checks.mts`: add the comparison and row filter
- `src/lib/shared/work/declared-checks.test.mts`: tests for every outcome
- `src/lib/verbs/verify/index.mts`: report one result per check
- `src/lib/verbs/verify/index.test.mts`: update and add verify cases

**Changes:**
- `declared-checks.mts` adds `CheckOutcome = "pass" | "prefix" | "failed" | "not_run"`, `CheckResult = { phase: number; index: number; check: DeclaredCheck; outcome: CheckOutcome; ran: RanHit | RanCommand | null; detail: string }`, `phaseRows(rows: DriveRow[], id: WorkId, n: number): DriveRow[]`, `compareChecks(checks: DeclaredCheck[], rows: DriveRow[]): CheckResult[]` (pure, matching as D-003 states), and `phaseCheckResults(snap: WorkSnapshot, rows: DriveRow[], n: number): CheckResult[] | null`, which returns `null` when the phase's `drive` is not a list.
- `ran` for `not_run` is the phase's latest hit of the same method, or its latest run row, or `null`, so the packet can show what ran instead. A contains string missing from a row's map is `failed` with the detail `"<string>" not checked by the logged drive`.
- `verify` pushes one result per check named `check:<covers>`: `pass` with detail `<method> <path> → <status>`; `prefix` ok with `ran at <path>; declared <path>, the user rules at the gate`; `failed` with `declared <status>, ran <status>` or `"<string>" not in the body`; `not_run` with `not run; last ran <method> <path>` or `not run`. A check of `drive: true` keeps `drive_observed`, counted over `phaseRows`-style filtering of drive-kind rows with this `work_id` and `phase` only.

**Done when:**
- **T-3.1** A logged hit `POST /orders` 201 with every declared string `true` gives `check:T-1.2` ok; an earlier 500 hit before it does not change that, because the latest matching hit decides.
- **T-3.2** A logged hit `POST /api/orders` 201 for a declared `POST /orders` 201 gives ok with a detail naming `/api/orders` and `/orders`.
- **T-3.3** Status 400 for a declared 201 fails with `declared 201, ran 400`; a string mapped to `false` fails naming the string; a string absent from the map fails with `not checked by the logged drive`.
- **T-3.4** With only rows of another item, another phase, an empty phase or a hook row (`source` missing), the check fails with `not run`.
- **T-3.5** A run check of `npm test` against a logged `run` of `npm test -- --watch` fails with `not run`; an exact `run` with `exit_code` 0 and every string `true` passes; exit code 1 fails with `declared exit 0, ran exit 1`.
- **T-3.6** For `drive: true`, a drive-kind row with `phase: null` or `work_id: null` no longer counts: the existing verify test that relied on it is changed to expect `FAIL drive_observed`, and a row of this item and phase still gives ok.
- **T-3.7** `picket verify <id> 1 --no-tests` on a scratch root with a declared check and a mismatching logged hit prints `FAIL check:T-1.1: declared 201, ran 400` and `NOT VERIFIED`.

## Phase 4: The gate shows declared versus ran

**Touch set:**
- `src/lib/shared/work/declared-checks.mts`: add the carried group and line text
- `src/lib/shared/work/declared-checks.test.mts`: tests for the group
- `src/lib/verbs/packet/packet.mjs`: print checks and carried lines
- `test/kernel/packet.test.mjs`: packet cases with a drive log

**Changes:**
- `declared-checks.mts` adds `carriedResults(snap: WorkSnapshot, rows: DriveRow[], upTo: number): CheckResult[]`, the `prefix` outcomes on approved phases below `upTo`, and `mismatchText(result: CheckResult): string`, one line per result: `T-1.2 POST /orders: declared 201, ran 400`, `T-1.2 POST /orders ran at /api/orders; approval corrects the record`, `T-1.3 run "npm test": declared exit 0, ran exit 1`, `T-1.2 POST /orders: not run; last ran GET /health`.
- In the `approve_phase` branch for order and design items, `packet` reads the drive log once and adds, after `verified`, a `checks` field holding every result of the current phase whose outcome is not `pass`, and a `carried` field holding `carriedResults(snap, rows, n.phase)`, one `mismatchText` per line, cut to the width as other multi-line fields are. Neither field appears when it would be empty.
- `nextStep`, `nextOf`, the send and the verdict routing are untouched: a mismatch reaches the user's ruling only.

**Done when:**
- **T-4.1** A packet test whose phase 1 declares `POST /orders` 201 and whose drive log holds a 400 for it prints a line starting `  checks    T-1.1 POST /orders: declared 201, ran 400`.
- **T-4.2** A prefix difference on the current phase prints `T-1.1 POST /orders ran at /api/orders; approval corrects the record` on the `checks` field.
- **T-4.3** Phase 1 approved with a prefix difference and phase 2 awaiting approval prints that difference once, on a `carried` field, and not on `checks`.
- **T-4.4** A phase whose checks all pass, a phase with `drive: true`, and a phase with no drive key print neither field; the existing packet tests pass unchanged.
- **T-4.5** For the fixture of T-4.1, `nextOf` returns `approve_phase` with the same options as the same fixture without the drive log.
- **T-4.6** `picket packet <id>` on a scratch item at its approval gate with a mismatching logged hit prints the `checks` line.

## Phase 5: The run grant carries prefix differences only

**Touch set:**
- `src/lib/shared/work/gate.mts`: add the declared-check gate kind
- `src/lib/shared/route/route.mts`: gate from checks and carried group
- `src/lib/shared/route/plan.mts`: run grant reads the extended gate
- `src/lib/shared/route/plan.test.mts`: grant cases with checks
- `src/lib/verbs/route/index.test.mts`: route cases end to end

**Changes:**
- `Gate.kind` gains `"declared_check"`. `ownGate` is unchanged and keeps serving `nextStep`.
- `route.mts`'s `gateOf` reads the drive log once per route and returns, for phase `n`: `ownGate(...)` when it is not null; else a `declared_check` gate with reason `has a declared check that did not hold (T-2.1)` when `phaseCheckResults` holds a `failed` or `not_run`; else, when `n` equals `run_through` and `carriedResults(snap, rows, n)` plus the `prefix` outcomes of phase `n` are not empty, a `declared_check` gate with reason `ends the run with 2 carried check differences`; else `null`.
- `runGrantChanges` keeps its shape: a gate unsets `run_through` and writes `run grant stops here: phase N <reason>; it takes its own approval`. No grant change for a phase outside a run.

**Done when:**
- **T-5.1** Under `run_through: 3`, `PHASE DONE` on phase 2 with a `failed` check writes no `phases/2.approved`, unsets `run_through`, and returns the line `run grant stops here: phase 2 has a declared check that did not hold (T-2.1); it takes its own approval`.
- **T-5.2** A `not_run` check on phase 2 stops the run the same way.
- **T-5.3** A `prefix`-only difference on phase 2 under the grant writes `phases/2.approved` and commits phase 2, as a phase without checks does.
- **T-5.4** `PHASE DONE` on phase 3, equal to `run_through`, after phase 2 carried one difference, writes no `phases/3.approved` and returns `run grant stops here: phase 3 ends the run with 1 carried check difference; it takes its own approval`.
- **T-5.5** A grant over phases whose checks all pass, or whose `drive` is `true`, approves through `run_through` as today: the existing route tests pass unchanged.
- **T-5.6** A `security: true` phase with a failed check stops with its security reason, not the check reason.
- **T-5.7** Piping a SubagentStop payload ending in `PHASE DONE` into `dist/hooks/route.verdict.mjs` for a scratch item under a grant with a failed check prints the stop line.

## Phase 6: Approval writes the path correction

**Touch set:**
- `src/lib/shared/work/check-correction.mts`: new targeted record rewrite
- `src/lib/shared/work/check-correction.test.mts`: new round-trip tests
- `src/lib/shared/route/plan.mts`: approval adds correct changes
- `src/lib/shared/route/apply.mts`: write corrections before the commit
- `src/lib/shared/route/route.mts`: hand corrections to the plan
- `src/lib/verbs/route/index.test.mts`: approval cases with corrections

**Changes:**
- `check-correction.mts` exports `correctCheckPath(text: string, phase: number, index: number, path: string): string`, which replaces only the `path:` line of the check at `index` in phase `phase`'s `drive:` list, quoting the value where yaml-lite needs it, and `withRevisionLine(text: string, line: string): string`, which appends the line at the end of `## Revision log`.
- `Change` gains `{ kind: "correct"; phase: number; index: number; covers: string; from: string; to: string; line: string }`. `phaseApproved` adds one per `prefix` outcome on phases up to the approved one (`carriedResults` plus the approved phase's own), handed in by `route.mts` beside `gateOf`. `runGrantChanges` adds none.
- `applyChanges` applies `correct` changes after the markers and before `commitPhase`, writing the record once, with lines of the form `- <YYYY-MM-DD from now>: T-2.1 check path /orders corrected to /api/orders; approved with phase 3`. `withoutApproval` drops `correct` changes with the approval when a nested checkout refuses the commit.

**Done when:**
- **T-6.1** `correctCheckPath` on a record whose phase 2 holds two checks with the same path rewrites only the one at the given index; `parseArtifact` of the result equals the original frontmatter except that path, and every other line is byte-identical.
- **T-6.2** A path holding `#` or `: ` reads back from `parseArtifact` exactly as written.
- **T-6.3** After a grant carried `T-2.1` (`/orders` ran at `/api/orders`) and stopped at phase 3, the user's approval of phase 3 writes `path: /api/orders` into phase 2's check, appends `- 2026-11-13: T-2.1 check path /orders corrected to /api/orders; approved with phase 3` for a `now` of that day, and `git show HEAD:work/<id>/design.md` holds both.
- **T-6.4** An approval at an ordinary gate with a prefix difference on the approved phase corrects that phase's check the same way.
- **T-6.5** An approval over a `failed` check leaves the record byte-identical, and a `rejected` verdict writes nothing to it.
- **T-6.6** After the correction, `verify` reports the corrected check ok with the `pass` detail.
- **T-6.7** `picket route <id> --verdict approved --agent user --phase 3` on a scratch item with a carried difference prints the commit line, and the scratch record's revision log holds the new line.

## Phase 7: Templates and contracts describe the checks

**Touch set:**
- `src/skills/documenting/templates/design.md`: drive placeholder in block form
- `src/skills/documenting/templates/order.md`: drive placeholder in block form
- `src/agents/architect.md`: declare checks in the order steps
- `src/agents/developer.md`: drive declared checks, rule at gate
- `src/skills/implementing/SKILL.md`: drive step names declared checks
- `src/lib/shared/work/declared-checks.test.mts`: template example round trip

**Changes:**
- Both templates replace the `drive:` placeholder with a block list holding one HTTP check and one run check whose values are the templates' usual placeholders, and a YAML `#` comment saying `drive: true` remains for a runtime phase with no request to declare and `false` for none.
- `architect.md`, order step 1 and the design second save: a phase that touches an endpoint, CLI or worker declares one check per criterion that a request or command can show, with `covers`, the method and path or the command, the status or exit code and literal `contains` strings; `drive: true` only where no check fits.
- `developer.md` and the drive step of `picket:implementing`: a declared check is driven with `picket drive` inside the phase, by its declared method and path or its exact command; a failing check is fixed in the code, or, when the check contradicts its criterion, named on `Verified:` and handed over, since the gate shows declared versus ran for the user's ruling.
- The budgets hold: `architect.md` and `developer.md` at most 120 lines, `SKILL.md` at most 150.

**Done when:**
- **T-7.1** A unit test reads each template, replaces every placeholder value in the drive list with a sample of its field's type, and gets checks with no problems from `readChecks`.
- **T-7.2** `architect.md` names `covers`, `contains` and `exit_code`, and says `drive: true` stays for a phase with no check to declare.
- **T-7.3** `developer.md` or `picket:implementing` says a declared check is driven with `picket drive` and that a check contradicting its criterion goes to the gate, not into the code.
- **T-7.4** `npm test` passes, the budget tests in `test/timing/budgets.test.mjs` included.

## Open questions

- **OQ-001** `docs/reference/cli.md`, `docs/reference/skills.md` and `docs/how-to.md` describe `picket drive` and `picket verify`; their text is a document change outside this item's phases. Owner: the product owner. Fallback: the docs stay as they are, and a docs item follows this one.
- **OQ-002** Should a user's approval of a `failed` status, exit code or contains also write that value into the record, since SDR 00004 keeps an approved check as a scenario written from what ran (TF-003)? Owner: the product owner. Fallback: only path prefix differences are corrected (D-006); TF-003 decides the rest.

## Revision log

- 2026-11-13: D-001 (r2): the template and contract texts of phase 7 now rest on D-001; the cross-check found phase 7 had no decision
