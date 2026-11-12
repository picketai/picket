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
