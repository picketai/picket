# Working notes: the tester, scenarios and the standard test environment

**Status:** Draft. Not an SDR, not ratified, nothing built.
**Dates:** consultation of 2026-10-21 and 2026-10-22, continued on 2026-11-12.
**Waiting for:** the process of the user's QA colleague, and a check of which services of the user's real system can run in containers.

These notes record what two interview rounds decided, what a review of the result found missing, and the agenda for a third round. Section 1 is what stands. Section 2 is what must change. Section 3 is open.

Terms used here: "flow" (never "journey"), "mock" (never "fake"), "declared hit", "scenario", "card".

## 1. Decided so far

### 1.1 Declared hits

- The architect writes hits in a phase's `drive:` frontmatter. A hit asserts method, path, expected status and an optional `contains` list of literal strings.
- A CLI or worker phase declares a run in the same shape: command, exit code, `contains`.
- A mismatch is ruled on by the user at the phase gate, never sent to the architect as drift on its own.
- Under a run grant, a path prefix difference is carried (the path that ran ends with the declared path, method, status and `contains` hold). A failed status or `contains`, a different resource, or any difference in a run command stops the run at that phase.
- Carried mismatches appear once, as a group, in the packet at the end of the run. The normal approval accepts them. The kernel writes the correction and a revision log line, with no architect turn.
- A security phase keeps its own gate, so its mismatches appear there.

Today's gap, for reference: `driveResult` in `src/lib/verbs/verify/index.mts` passes when any drive-class row exists, reads no status, and counts rows with no work item or phase.

### 1.2 The tester

- A fifth agent, `tester`, with the skill `picket:testing`. No per-phase tester and no tests written before the code.
- It runs after the cumulative review ends with `APPROVED`, on order and design items in which a phase declares a hit or a run. Never in the fast lane. No offer and no stop before it. Config: `testing: all | design | off`.
- It reuses `APPROVED` and `CHANGES REQUIRED` in scope `system`. No new verdict tokens.
- It is a black box toward the change: the guard denies it reads of the files the item changed. It may read the rest of the project.
- The kernel compiles its brief: the story, the `T-N.x` criteria, the corrected hits, the start facts from the drive log, the suites in config. The send carries no diff.
- Every finding needs runtime evidence. A defect without an evidence line is rejected by the report lint.
- It requires the standard environment. A project without one gets `Tested: no environment` at close.
- An environment failure is decided in code and blocks the item with no fix round.

### 1.3 Method

- A fixed matrix: for each criterion, the case kinds smoke, boundary, negative, permission, state, integration. Each cell holds a scenario or `n/a` with a reason. The report carries the table.
- No exploratory testing. That belongs to the QA team. The tester checks what the item implemented.

### 1.4 Defects and learning

- The report is `work/<id>/test.md`. Each defect keeps its entry after the fix, with status `fixed (round n)`.
- An entry has scenario, expected (quoting the story), actual, evidence, root cause (copied from the developer's fix block) and `Escaped:`.
- `Escaped:` uses a closed list: unit test, declared hit, a review row id, or `none: not checkable earlier`.
- `picket close` counts escape points across items. At two or more, one line of prose goes to the memory of the role concerned and is listed in the closing summary. A project rule stays a change the user requests.

### 1.5 Fix rounds and the circuit breaker

- Fix, then the same reviewer re-reviews the fix diff, then the same tester retests every scenario of round 1. No user gate in the loop. Three failed rounds become the user's decision.
- The breaker trips at once on either signal: a scenario that passed turns red, or a fix edits files outside the item's touch set.
- On a trip, `picket:debugging` runs first. Then one stop carries the facts (what was fixed, what broke with both responses, the overlap), the cause and a red test.
- Options at that stop: design (architect amends with the diagnosis), one more fix round from the red test, consult, park. The diagnosis chooses the default.
- A trip is counted at close as its own class.

### 1.6 The standard test environment

- One enforced standard on the Compose Specification (Docker or Podman). No Kubernetes.
- Layout, tracked: `.picket/env/compose.yaml`, `seed/`, `mocks/`, `scenarios/`.
- Rules checked by `picket env check`:
  - every service has a `picket.role` label: `app`, `dependency`, `mock` or `seed`;
  - an `app` uses `build:`, never a pulled image;
  - every long-running service has a healthcheck;
  - no fixed host ports;
  - state in named volumes only;
  - a `seed` service loads the data and exits 0;
  - `dependency` and `mock` images are pinned;
  - a trial start passes twice in a row.
- Verbs: `picket env init`, `check`, `up`, `status`, `down`, `test`. A stack runs under the project name `picket-<id>`.
- A service that cannot run in a Linux container is represented by a `mock`, and the packet says so.
- `picket env init` is one repeatable verb. With no environment it detects, asks only what code cannot answer, and hands the answers to a design item. With one, it compares and asks only about the difference. "Left out" answers are kept in `.picket/config.json`.
- The same comparison is a rule of `picket env check`. A phase that adds or removes a service fails verify until `.picket/env/` is in step, so the environment change travels in the item that changes the system. A difference the item did not cause is a packet line, not a failure.
- Defaults inside an item: a new service is an `app`, a new outside host is a `mock`, both listed in a group at the gate.

### 1.7 Scenarios

- Picket owns the format. No dependency on another test tool's format. Engines sit underneath, each behind an adapter: HTTP (Node's `fetch`), browser (Playwright, from a pinned container), command.
- A scenario is a card in words over recorded steps. Header: `id`, `flow`, `kind`, `covers`, `intent`, optional `defect`. The kernel only counts and filters by the labels and never parses `intent`.
- Step words are a closed list: `request`, `expect`, `capture`, `wait`, and for the browser `open`, `fill`, `click`, `see`. Browser elements are named by what the user sees.
- Login, mock checks and data variations are plain requests, not keywords.
- A flow is a label on scenarios, not a file.
- Kept only if it covers a criterion or reproduced a defect, plus one smoke scenario per flow.
- Ease of change is the main driver. Enforced by: a line budget per adapter and for the core, `format: 1` on each card, no conditions, loops or includes, and format changes handled by recording again from `intent`, never by a migration script.
- A project's own suite still runs in the regression part through a JUnit report.

### 1.8 Superseding a scenario

- A saved scenario that fails because behaviour changed on purpose is never rewritten. The old one gets `status: deprecated` and `superseded_by`, a new one is created with `supersedes`. Ids are never reused, files never deleted.
- A supersede must name the criterion that contradicts the old intent.
- One gate per item lists all proposed supersedes, after the tester's session and before any fix round. A refused one is treated as a regression.
- Setting `scenarios.supersede: gate | close`, default `gate`. The ledger counts approvals and refusals so the gate can be removed on data.

### 1.9 Build order as last stated

Declared hits, the standard environment with a fixture project, the tester with saved scenarios, the browser adapter. Section 2 changes this.

## 2. Review findings: what must change

### 2.1 Holes that would make it fail in use

1. **No path for "not a defect".** A black-box tester will report its own mistakes as defects. The developer needs a way to dispute a finding, and someone must rule on it.
2. **The story is a weak oracle.** When the story is silent, the tester invents an expectation. A third outcome is needed, a question, collected for the user and the architect and never sent to the developer.
3. **No baseline.** A scenario that was failing before the item is blamed on the item. The regression part needs the result on the base commit.
4. **Flaky scenarios trip the breaker.** A failure should count only after a second run confirms it. A scenario that flips is marked unstable and kept out of the breaker.
5. **Environment or product is decided too simply.** A change that breaks startup gives no answer and is a product defect. The rule needs the baseline: starts on base, not on the item's commit, means the item broke it.
6. **Scenarios share state.** Not decided: reset between scenarios, between flows, or never.

### 2.2 Two things that should be one

7. **Declared hits and scenario steps.** A declared hit could be the first scenario card of a criterion, drafted by the architect, run by verify at the phase gate, and saved after approval. One concept less, and the suite fills before a tester exists.
8. **Two runtimes.** When the standard environment exists, phase checks should run on it too. Drive stays for projects without one.
9. **The fast lane.** Replaying saved scenarios costs no model, so the fast lane can run them in its normal check.

Proposed: adopt 7, 8 and 9 whatever the QA reference says. Not yet confirmed by the user.

## 3. Open: agenda for the third round

### 3.1 Never defined

10. How the tester records: the verb for one step, how a response value becomes a `{capture}`, and relative dates in place of literal ones.
11. What the tester knows about request shapes: an API description in the brief, or the contract in the record.
12. The size of the matrix: which kinds apply to which criterion, and a cap per item. Worst case today is 480 cells.
13. Login: a mock identity provider as a standard service, with roles from the seed.
14. Seed and schema: loaded through the app's migrations, and who updates it when a story needs new data.
15. Where fix rounds are committed, and where the user's last approval sits in relation to the test result.
16. Running outside a session: `picket env test` in CI on every pull request.
17. Safety of a replayed file: requests only to services of the stack, no `command` adapter from a saved scenario.

### 3.2 Risks to the whole plan

18. The user's own system may not fit the standard. Check first, as a short research item: which services can be an `app` today.
19. A system across several repositories: where the environment lives and how it builds each worktree's code.
20. No measure of the tester's quality. Proposal: plant known defects in the fixture project, as `picket mutate` does for code, and count how many the tester finds.
21. Five large items for a product in alpha. Proposal: build the thinnest slice first (fixture environment, HTTP adapter, replay, a tester with two case kinds) and decide the rest from it.

### 3.3 Waiting for the QA colleague's process

- The matrix and its size (12).
- How expected results are decided when the story is silent (2).
- Who owns and edits the cards, and whether the QA team writes them by hand.
- How defects from the QA team's exploratory testing become scenarios.

### 3.4 Smaller open questions

- Does `testing: all` ship as the default before the benchmark has measured it? Default: no, `design` until then.
- Can declared hits start before the QA reference arrives? Default: yes.
- Should a difference the item did not cause block its tester stage? Default: no.
- `.claude/MEMORY.md` is at its 6,000 character limit, so none of the terms above are in the glossary yet. Default: move the install decision to an SDR and leave a pointer.

## 3.5 Input from the QA colleague's project (2026-11-13)

Source: `artifacts/reports/qa-colleague-workflow-testing-skill.md` (finding ids R-xxx). His project is read-only for us and nothing from it is copied. A second research item, `20261113-qa-colleague-project-the-unread-rest`, covers what the first report did not read.

Accepted by the user:

- **Classify before a defect stands** (R-006, R-024). Every failure is first called product, test or environment, with evidence. Closes hole 1. Proposed ruling on a dispute: the kernel replays the scenario, and the reviewer, who may read the code, rules whether the test or the product is wrong.
- **A question with a default rooted in facts** (R-010, R-025). When the story is silent the tester asks, at most three questions per item, on business matters only. Closes hole 2. The user's condition: a default must rest on a fact we know, never on a suggestion with no basis. Proposed rule: each default carries a `Basis:` line naming its source (the story text, a decision in the record, a saved scenario, the behaviour observed on the base commit, a project document); with no basis the question is asked with no default.
- **A new scenario must fail on the base commit** (R-026). A scenario for new behaviour that also passes before the change proves nothing about the change. Checked in the baseline run that closes hole 3.
- **Smoke rules** (R-030): read-only, status and shape only, with a time cap.
- **The commit tested is written in the report** (R-008), and "does not start" is kept apart from "fails".

Accepted by the user on 2026-11-13, after discussion (result words, token reuse, the known defect rules below):

- **Result words** (R-001, R-021). The user asked to reuse existing verdicts and routes before adding anything. Accepted: the five words (passed, failed, blocked, not run, not covered) are cell statuses in the report table, not verdict tokens. The verdict stays `APPROVED` or `CHANGES REQUIRED`, derived by code from the table, and each cell that needs action is routed by its class to an existing path: developer fix, architect amendment, item block, or a question to the user.
- The user also asked to reuse the amendment tokens. Accepted: a criterion that cannot be tested as written is a drift between the record and the system, so the tester ends with `DRIFT DETECTED`, the architect amends and ends with `AMENDED`, and the tester retests. When one session has both drift and defects, drift goes first, so no fix is written against a criterion that is about to change. The tester then has three reused tokens and no new one.

Accepted by the user after explanation:

- **Sizing the matrix** (R-013, R-039). One check for each risk: no scenario where a declared hit or a saved scenario already checks it, "not applicable" where the kind does not exist for the criterion, and a cap by item size. What falls outside the cap is listed as not covered. The tester cannot count the developer's unit tests, since it may not read the changed files.
- **A known defect kept visible** (R-007, R-022). The scenario asserts the correct behaviour and carries `known: DF-xxx`; its failure does not count against an item or trip the breaker. Every regression run prints the open known defects with their age. A ticket is offered through `picket:ticketing`, with the user's confirmation.
- The user's condition: when a known defect stops failing, the reason must be stated, or a hidden cause could do more harm than the defect. Proposal, decided from facts the kernel has:
  - passes on the base commit too: fixed outside this item; report the commit range since the last failing run and what changed in it;
  - fails on base, passes on the item, and the item's story or a criterion names the defect: fixed by this item on purpose;
  - fails on base, passes on the item, not named by the item: stopped reproducing as a side effect; the label is not removed and the case goes to the user's stop with the files that changed;
  - the item changed the seed, a mock or the scenario's own inputs: possibly masked by the environment; treated as the side-effect case.
  The label is removed only in the first two cases.

Proposed from the second report, `artifacts/reports/qa-colleague-project-unread-rest.md` (ids written "second R-xxx"). The user asked for these to be added as proposed; not yet ruled on one by one:

- **The verdict depends on the new behaviour having run** (second R-038). `APPROVED` is impossible while a criterion has no passed check of its own, however many other cells pass.
- **A pass through a mock is labelled** (second R-005). The closing line separates live passes from passes against a mock.
- **A ranked list of sources for `Basis:`** (second R-034): the story and its criteria, the record's decisions, an API description, the behaviour on the base commit, and a saved scenario last, since it can be out of date.
- **The build under test is proven in code** (second R-024, R-025). A check that each `app` image was built from the item's commit, recorded in the report.
- **Permission checks in both directions** (second R-045): each credential is tested where it must work and where it must be refused.

Proposed from the last unread files, read by the lead on 2026-11-13 (the case builder script and the run report skill; the tools folders by listing only):

- **The report is a view over data.** His run report is generated by scripts from a ledger and is never edited by hand; a wrong report means the data or a script is wrong. For us: the kernel generates `test.md` from the recorded step results and the tester's table rows, and the tester writes no report prose that carries a number.
- **A defect outside the story's criteria does not block the story.** He has a decision "close with bugs": the story works as specified and the bugs sit outside its acceptance criteria. For us: a defect that the baseline run shows on the base commit too, or that no criterion of the item covers, is recorded as a known defect and offered as a ticket; only a defect inside the item's criteria gives `CHANGES REQUIRED`.
- **A result belongs to the build that carried it.** He never passes or fails a story on code it did not run. For us: each round's results name their commit, and results from before a fix do not count for the commit after it.
- **A partial re-run never replaces a full run.** He keeps re-runs of a subset in a separate folder so that they cannot overwrite the full results. For us: a single scenario replayed during a fix is kept apart, and the breaker compares full runs only.
- **A question is a choice.** His questions for the product owner are phrased as "A or B?", answerable in one meeting, with stable ids and the finding they come from.
- **Environment trouble is reported apart from functional results**, and a check that failed because the environment stalled is still recorded with its re-run.
- **Private values stay out of evidence.** His report has a shareable build and a private one, and redacts before citing. For us: a captured token or personal value is never written into a saved scenario or the report, only its variable name (bears on items 10 and 17).

Unknowns closed by that read: the case builder holds the cases in the script and merges by story key, overwriting, so no step retires or deprecates a case; history is kept as a private per-run copy of the cases file, because the next generation overwrites it. Whether QA staff edit cases by hand in ADO cannot be seen from the files and is a question for the colleague.

Not taken: asserting the wrong behaviour on purpose to watch a known defect (second R-021), editing tests in place by tier (second R-001, R-027), a fixed checklist found by a label (second R-033).

Kept as decided, against his practice: black box toward the change (R-040, R-046), reset and not ownership for shared state (R-036), supersede and never edit in place (R-023).

Left to the QA team: the agent team, manual testing, performance budgets, coverage against the documented contract, the flaky detector, ticket filing.

## 4. Proposed order of next steps

1. Research on the user's real system (18).
2. The QA colleague's process (3.3).
3. A third interview round on items 10 to 17, with what the first two steps showed.
4. Only then an SDR.

## 5. Rejected along the way

- A tester that writes tests before the developer implements, per phase (dropped by the user on 2026-11-12).
- Automatic drift to the architect on a failed hit.
- Test files written by the tester in the project's own stack.
- A tester that reads everything.
- Retest without a re-review of the fix.
- Debug as an option at the breaker stop, not before it.
- New verdict tokens for the tester.
- The tester in the design lane only.
- An existing runner (such as Hurl) under a Picket header.
- Playwright test files written by the tester.
- A flow as a reusable step file.
- A capped exploratory part in the tester's session.
- A wizard that writes the environment itself, and a separate `picket env update` verb.
- The three backends of October round 3 and the "Compose where present, drive otherwise" rule for the tester.
