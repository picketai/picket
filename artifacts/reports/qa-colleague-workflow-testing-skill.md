---
kind: report
title: QA colleague workflow and what the testing skill can adapt
date: 2026-11-13
audience: collaborator
sources: work/20261113-qa-colleague-workflow-for-testing-skill/request.md; artifacts/strategy/drafts/testing-and-test-environment.md; /home/vlad/Work/development/local/CompleteTestingSolution/CLAUDE.md; README.md; MAP.md; qa/README.md; qa/CONTEXT.md; qa/improvements-from-picket.md; qa/test-data-catalog.md; qa/knowledge/ways-of-working.md; qa/knowledge/test-data-and-sign-in.md; qa/runs/2026-11-13-rc7675.md; qa/runs/2026-10-16-defect-retest.md; qa/runs/2026-10-13-RC-6726.md; .claude/agents/qa-lead.md; qa-manual-1.md; qa-manual-2.md; qa-auto-api.md; qa-auto-ui.md; qa-deploy-check.md; .claude/commands/qa-test-story.md; reproduce-bug.md; (A) analyze-failed-tests.md; (C) detect-flaky-tests.md; .claude/hooks/guard-rules.json; .claude/hooks/guard-lib.js; .claude/commands/generate-testcases.md; (A) generate-coverage-report.md; (F) mutation-test.md; .claude/agents/qa-auto-nfr.md; scripts/qa.js; package.json; playwright.config.js; azure-pipelines.yml; tests/smoke/README.md; stories/RC-7114-pay-duplicate-webhooks/RC-7110-prevent-duplicate-finance-records-from-concurrent/story.md and cases.json; directory listings
confidence: high
---
# Report: QA colleague workflow and what the testing skill can adapt

## Summary
The colleague's project is a team of seven Claude Code QA agents that verify finished stories against a shared real acceptance system, so it is a QA department and not a verifier inside a delivery flow [VERIFIED]. What serves Picket's minimal check is a result that is passed, failed, skipped, blocked or not run and is never rounded up to a pass, with evidence on every result (R-001) [VERIFIED]. A failure is classified once as product, test or environment, and silence in the story becomes a question with a proposed default, never a guessed expectation (R-006) [VERIFIED]. Against the draft, the project answers holes 1, 2, 4 and 6 in part and gives real case counts for item 12, 33 and 40 per story, but says nothing on containers, the scenario format or merging hits with cards [INFERRED]. One difference needs a decision: his testers read the product source where the draft's tester is black box (R-040), while the other learnings (guards as data, generated cases, a data catalog, assertion mutation, a planted-defect benchmark) sit in part 2 [VERIFIED].

## Context
Scope as understood: study the colleague's QA project read only, to learn how a QA engineer works, and name what Picket's testing skill (the minimal check that the change does what the request asked and breaks nothing existing) can adapt. Part 1 is what serves that check, part 2 is other learnings, and the draft `artifacts/strategy/drafts/testing-and-test-environment.md` is the comparison.

Read in full: the sources listed in the frontmatter (the outline's 12, the first deep pass, and a second bounded pass that closed the unknowns on case generation, the trace script, the guard engine, the mutation skill and the non-functional agent).

Not read: `stories/coverage.json` (100 KB, generated; the summary in MAP.md and the script that writes it were read instead), the other nine skills in `.claude/commands/`, the specs under `tests/`, the other files in `scripts/` and `tools/`, `qa/knowledge/HANDOFF-2026-10-28.md`, the other 11 run files, and the other 14 findings. Nothing from the project is copied or saved; findings are paraphrased with locations.

## Structure
A story has a home under `stories/<KEY>/` with a `story.md` (status in frontmatter), a `cases.json` and an evidence folder. Runs are one markdown file each under `qa/runs/`. Defects are `findings/FND-xxxx` with a generated index. Seven agents (`qa-lead`, two manual testers split by product area, UI and API and non-functional automation, a deploy checker) are started by `/qa-test-story`, which runs a deploy check and the lead's sizing in parallel, fans testers out once, and returns results to the lead for a verdict (`.claude/commands/qa-test-story.md:8-19`). Three hooks enforce rules and record time and tokens (`qa/README.md:61-72`). `npm run trace` generates MAP.md and `coverage.json` from folders and tags in test titles (`MAP.md:257-262`).

## Findings
Part 1: what serves the minimal verification
- **R-001** [VERIFIED] A result is passed, failed, skipped or blocked, and a failed, skipped or blocked check is never reported as passed; "blocked" and "not covered" are results. A verdict (GO, NO-GO, GO with risks) lists what ran, passed, stayed open and was not covered. `CLAUDE.md:16`, `.claude/agents/qa-lead.md:34-41`, `qa/runs/2026-11-13-rc7675.md:10-75`. The draft has only `APPROVED` and `CHANGES REQUIRED` plus an environment block (draft lines 28 to 33).
- **R-002** [VERIFIED] The stated policy: code review plus unit tests is not verification; a story passes only on behaviour observed in a running system, otherwise "not verified, code review only". `qa/knowledge/ways-of-working.md:14`. Matches the draft's runtime evidence rule (draft line 31).
- **R-003** [VERIFIED] The lead rejects a result without evidence and relabels "seems fine" as not covered. A results table has one row per check with status and an evidence path. `.claude/agents/qa-lead.md:34-37`.
- **R-004** [VERIFIED] Cases name the acceptance criterion they check in the title ("AC5 ... exactly one set of finance rows"), with steps and an expected result per step. `stories/RC-7114-.../RC-7110-.../cases.json` (33 cases). Same unit as the draft's criterion by case kind matrix (draft 1.3).
- **R-005** [VERIFIED] A story file states its status literally: `designed` means no execution is recorded, and coverage is derived from tags in test titles, never declared by hand. `.../RC-7110-.../story.md:11,22,32`. The draft's card carries `covers` (draft 1.7); he derives the same link from tags.
- **R-006** [VERIFIED] A failure is classified as product defect, test defect or environment problem, with evidence for the call, before it is returned. `.claude/agents/qa-auto-api.md:36-38`. Answers draft hole 1 in part (a black box reports its own mistakes as defects).
- **R-007** [VERIFIED] A known defect is kept as an expected failure carrying the defect id, never a skip, so the check stays visible and turns red when the defect is fixed. `CLAUDE.md:13`, `guard-rules.json:271-284`. Relevant to draft hole 3 (no baseline).
- **R-008** [VERIFIED] Step 0 is a deploy check: is the story's code on the target now. If not, nothing is tested and the outcome is blocked, not failed; the build tested is written into the run file, and the answer is only valid at the time it is given. `.claude/commands/qa-test-story.md:12-14`, `.claude/agents/qa-deploy-check.md:29-30,40`, `qa/runs/2026-11-13-rc7675.md:4`. Draft hole 5 uses the base commit for the same question.
- **R-009** [VERIFIED] Regression of neighbouring behaviour is chosen per story by the tester (the RC-7675 run re-checks a header endpoint, a sessions endpoint and a contracts endpoint), and a tagged smoke set gates every pull request. `qa/runs/2026-11-13-rc7675.md:29-30`, `.claude/agents/qa-auto-api.md:7`.
- **R-010** [VERIFIED] When the acceptance text says what to show and the system conforms but looks wrong, the observation is held with a proposed check and not filed as a defect. `qa/runs/2026-11-13-rc7675.md:62`. This is the third outcome the draft asks for (draft hole 2).
- **R-011** [VERIFIED] Missing data is a normal result: two cases are blocked because the system has no matching record, two are not run because ids live elsewhere. `qa/runs/2026-11-13-rc7675.md:15-16,22,24`. Relates to draft item 14.
- **R-012** [VERIFIED] One run file per task holds request and size, results, bugs as drafts, verdict and a not covered list. `.claude/agents/qa-lead.md:35-41`. Compare the draft's `test.md` (draft 1.4), which has no not covered section.
- **R-020** [VERIFIED] A tester returns one block per risk with a status from the four words (skipped and blocked carry a reason), 1 to 3 lines of steps, the build and the evidence; a retest says "still reproduces", "fixed" or "changed" with the request and response that prove it; "facts only, never it seems". `.claude/agents/qa-manual-2.md:34-41`, `qa-manual-1.md:34-41`.
- **R-021** [VERIFIED] A test that was written but not run is reported as "not run", a fifth word separate from skipped and blocked. `.claude/agents/qa-auto-api.md:36-37`, `qa-auto-ui.md:31-32`, `qa/runs/2026-11-13-rc7675.md:16`.
- **R-022** [VERIFIED] An expected failure that starts to pass signals that the fix landed; the retest run saw one ("expected to fail but passed") and removed the marker. `qa/runs/2026-10-16-defect-retest.md:60-61`. A retest with no fix change is "observe only" and cannot be reported fixed (`:16`, `:69`).
- **R-023** [VERIFIED] A test that fails on changed copy is called test drift, repaired in place with the smallest edit, and the edit is listed with a stored diff; the product is not blamed. `qa/runs/2026-10-16-defect-retest.md:60-61,78-81`. The draft supersedes a saved scenario and never rewrites it (draft 1.8); he edits tests in place.
- **R-024** [VERIFIED] The lead re-observed a tester's claim live, withdrew a tester's draft defect, and ordered a test that asserted the wrong thing to be rewritten before anything was filed. `qa/runs/2026-10-13-RC-6726.md:63,69,73-74`. This is who rules on "not a defect" (draft hole 1): a reviewing role with a live re-check, before filing.
- **R-025** [VERIFIED] Open expectations become at most three business questions, each with a proposed default; the user decides business matters only. `.claude/commands/qa-test-story.md:25`, `qa/knowledge/ways-of-working.md:6`, `qa/runs/2026-10-13-RC-6726.md:153-156`. Answers draft hole 2 and the first waiting item of 3.3.
- **R-026** [VERIFIED] The expected value of a bug's check comes from the ticket's acceptance criteria, and the check is proven to fail for the stated reason by removing the ratchet once; a check that fails for another reason is not the check. `.claude/commands/reproduce-bug.md:42-56`.
- **R-027** [VERIFIED] The reproduce command marks claims `[VERIFIED]`, `[INFERRED]` or `[ASSUMED]`, calls an uncaptured claim "strongest hypothesis", first checks whether the report is already a finding with a ratchet, and checks deploy state. `.claude/commands/reproduce-bug.md:14-19,67,72`. The same marker set Picket uses.
- **R-028** [VERIFIED] The failure skill has six classes (bug, not implemented, flaky, test code, environment, contract change), one root cause per test, a confidence level, a rule to re-run failed tests and never read stale results, "passed on retry means flaky", and soft performance thresholds. `.claude/commands/(A) analyze-failed-tests.md:88-264`. Environment is recognised when all or most tests fail with the same connection error (`:149`), which bears on draft hole 5.
- **R-029** [VERIFIED] Flakiness: three runs with zero retries, classes stable pass, stable fail and flaky; his own note says a test that flakes 10 percent is caught in three runs about 27 percent of the time. CI retries twice, local runs none, smoke once, and the one browser project that retries twice says a test failing all attempts is real. `.claude/commands/(C) detect-flaky-tests.md:80-114,298`, `playwright.config.js:43,92,160-165`. Bears on draft hole 4.
- **R-030** [VERIFIED] Smoke rules: one endpoint per test, status and shape only, no writes, no volatile data, one smoke test per public endpoint the UI depends on, moved out if it takes over 2 seconds. `tests/smoke/README.md:3-33`. Compare "one smoke scenario per flow" (draft 1.7).
- **R-031** [VERIFIED] The post-deploy pipeline is a separate run that cannot block or roll back a release; it prints the deployed branch because a result is not attributable without it, and a preflight separates credential problems from product failures. `azure-pipelines.yml:16-21,89-92`. Picket's tester is a gate inside the item; his checks are not.
- **R-032** [INFERRED] No code found computes which neighbouring behaviour to re-check: the tester or model picks it (R-009), `qa.js` only counts tags and validates links (R-047), and the case skill avoids duplicates only (R-046). Paths not followed: other scripts, the remaining skills, the specs.
- **R-033** [VERIFIED] The status carries the kind of evidence ("passed (code)", "passed (emulation)", "blocked"), but one verdict lists code-review results under "what ran and passed" next to live checks, so the policy in R-002 is applied by label, not enforced. `qa/runs/2026-10-13-RC-6726.md:47-53,126-131`, `qa/runs/2026-10-16-defect-retest.md:70,92`.

Part 2: other learnings
- **R-013** [VERIFIED] Work is sized S, M or L; each risk has exactly one owner, manual or automated, never both; "a few strong checks"; new test code rarely larger than the code it covers; L needs approval; a 50 percent overrun stops the run. `qa/README.md:32-41`, `.claude/agents/qa-lead.md:22-31`.
- **R-014** [VERIFIED] Rules are enforced by hooks whose rules are data and which have unit tests; a denial names the rule and the item is reported as not covered. `qa/README.md:61-72`, `CLAUDE.md:6-7`.
- **R-015** [VERIFIED] Time and tokens come from a ledger a hook writes from transcripts, never from an agent's claim; testers overstated their own time in one run, and subagent reports are model output whose key claims are re-checked. `qa/README.md:69-72`, `qa/runs/2026-10-16-defect-retest.md:26`, `ways-of-working.md:35`.
- **R-016** [VERIFIED] His backlog applies "code decides what code can decide" to his skills and plans a benchmark of past stories with an answer key, traps for false positives and frozen replay. `qa/improvements-from-picket.md:6,67-117`. Matches draft item 20.
- **R-017** [VERIFIED] Filing in Jira or ADO needs the user's approval, and drafts stay in the run file. `CLAUDE.md:15`, `qa/knowledge/ways-of-working.md:15-16`. Close to the single gate in draft 1.8.
- **R-018** [VERIFIED] Invented data with a prefix, a read-only database, redacted evidence, production hosts denied. `CLAUDE.md:8-18`. The environment is the shared acceptance system; there is no container environment. `qa/CONTEXT.md:49-53`.
- **R-019** [VERIFIED] He notes that Picket fits easy product fixes and not test automation. `qa/knowledge/ways-of-working.md:44`. His project tests finished work; the draft verifies one's own change.
- **R-034** [VERIFIED] Guard rules are data with id, decision (deny or ask), a reason shown to the agent and a kind; a guard error defaults to ask; an exception carries an approval note, an expiry time and the only allowed targets. `.claude/hooks/guard-rules.json:3,82,117-123`. A guard denies a skip next to a bug marker (`:271-284`), the counterpart of Picket's silenced-move guard.
- **R-035** [VERIFIED] A guard can deny the evidence itself: a personal data guard refused a masked evidence file, so the run left a recorded gap to close before filing. `qa/runs/2026-10-13-RC-6726.md:63,93`.
- **R-036** [VERIFIED] Shared state is handled by ownership, not reset: one writer per contract, one agent per journey token, one agent on the shared browser, and fixture ids that drift after data refreshes are checked before blaming the API. `qa/CONTEXT.md:37-38`, `ways-of-working.md:25`. Draft hole 6 is undecided; this is one answer.
- **R-037** [VERIFIED] Data cannot be seeded, so a catalog lists each data case by how it can be produced (product API, mobile RPC, signed webhook replay, desktop, database, time, a physical car, a person) and a short list is requested from developers in one message. `qa/test-data-catalog.md:13-29,153-161`, `qa/CONTEXT.md:35`. Relates to draft item 14.
- **R-038** [VERIFIED] Login: a staff account through a fixture; a wrong account 401-cascades the whole suite; a customer token cannot be minted headlessly, so those steps are blocked, and one-time codes, identity scans, payments and signatures are not covered. `qa/CONTEXT.md:39-40,72`, `qa/knowledge/test-data-and-sign-in.md:19-26,35-40`. No mock identity provider exists (draft item 13).
- **R-039** [VERIFIED] Real case sets: 33 designed cases for one payments story and 40 for the RC-7675 tab story, with non-functional kinds as labels, not a fixed matrix. `cases.json`, `qa/runs/2026-11-13-rc7675.md:8`, `story.md:30`. Informs draft item 12 (worst case 480 cells).
- **R-040** [VERIFIED] His testers are not black box: checks cite product source at a commit, a risk can be owned "code only", and a source copy sits in the project. `qa/runs/2026-10-13-RC-6726.md:30-36,47-53`, `qa/test-data-catalog.md:6`. The draft's guard denies the tester the changed files (draft 1.2). [ARCHITECT REVIEW NEEDED]
- **R-041** [VERIFIED] Exploration is bounded: manual testers stay inside their brief, spend at most 10 minutes around it and give one line on anything outside. `.claude/agents/qa-manual-1.md:32,41`, `qa-manual-2.md:32,42`. Consistent with the draft's choice to leave exploratory testing out.
- **R-042** [VERIFIED] A bug report becomes one failing check that names the defect, a diagnosis and a finding record, with no product fix; this is how a found defect enters the suite. `.claude/commands/reproduce-bug.md:40-56,73-74`. Answers the fourth waiting item in draft 3.3.
- **R-043** [VERIFIED] Designing cases is cheap and verification is rare: MAP.md lists 199 stories of which 8 count as verified, and most show `designed` with 0 tests. `MAP.md:20-40,46-244`.
- **R-044** [VERIFIED] A separate project and skill mutate the suite's own assertions (invert, loosen or delete) and re-run them: killed mutants are good, survivors are assertions that check nothing; done means a score of 80 percent or more, with a budget of 30 minutes per 100 mutants. `.claude/commands/(F) mutation-test.md:13-90`, `playwright.config.js:95-105`. `picket mutate` inverts operators on changed product lines instead; the two target different things.
- **R-045** [VERIFIED] Two suites that shared one output folder erased each other's results before publishing (one build reported 30 of 104 tests), so each gets its own folder. `azure-pipelines.yml:111-119`.
- **R-046** [VERIFIED] Cases are generated by a skill from the Jira story, Confluence pages and the pull request diff: the story says what was asked, the diff says what was built, and reviewer threads often name an edge case. The count has a floor from story points (10, 15, 20 or 25) plus one per non-functional keyword, and the floor is not a limit. Cases are implementation-agnostic with placeholders, existing automated tests are read only to avoid duplicates, and real data comes from a separate step. `.claude/commands/generate-testcases.md:78-137,253-257,267,526-531`. The draft's tester gets no diff (draft 1.2).
- **R-047** [VERIFIED] Coverage is measured against the documented contract (endpoints, response codes, parameters); deferred tests count separately and never as coverage, and one happy-path test is partial, not covered. `qa.js trace` is code: the automated count comes only from tags (a test inherits the nearest describe's tag), declared automation must exist and carry the tag, and a story cannot be marked verified while an open finding names it. `.claude/commands/(A) generate-coverage-report.md:172-178`, `scripts/qa.js:231-269,373-402`.
- **R-048** [VERIFIED] The guard is a pure function over a tool call and the rules data: deny beats ask, no match means no opinion; it splits commands into segments, follows shell wrappers three levels deep, skips read-only commands, scans a script's own text before it runs, and lets an expiring exception downgrade a match only when every match names an approved target. The skip rule compares added lines before and after, so old skips do not trip it. `.claude/hooks/guard-lib.js:1-10,94-108,183-199,294-327`. Relates to draft item 17.
- **R-049** [VERIFIED] Performance budgets are business numbers: a tester reports the measurement and never loosens a budget to turn a test green; each run is compared with the last baseline in the run files and a drift over 30 percent is flagged even when the budget passes; a timed check uses the 95th percentile over at least 20 samples after warm-up. `.claude/agents/qa-auto-nfr.md:19-25`. This is the only baseline comparison found (draft hole 3).

## Dependencies and relationships
Atlassian (Jira, Confluence), a read-only MSSQL connection, Azure DevOps, Playwright and a VPN switch with strict on and off rules; all specific to his product (`CLAUDE.md`, `qa/CONTEXT.md:98-110`). Nothing the minimal check needs depends on them.

## Risks and unknowns
- [UNKNOWN] Whether QA staff edit cases by hand after they are generated (draft 3.3, third waiting item). The generator writes them and refreshes a story's cases on each sprint run (`generate-testcases.md:358`), so the owner of a card is the skill, but no step for hand edits was found.
- [UNKNOWN] How a deliberate behaviour change retires a case (draft 1.8); the generator refreshes by overwrite and tests are edited in place (R-023), so no supersede step exists in the files read.
- [UNKNOWN] Whether other scripts or skills suggest regression targets (R-032). `scripts/qa.js` and the coverage skill do not; the `propose-api-tests` skill named in the README is not in the commands folder.
- [UNKNOWN] The other nine skills in `.claude/commands/`; claims about them rest on the READMEs.
- [UNKNOWN] Quality of his results: no run file read measures how many real defects the team missed.
- [ASSUMPTION] Coverage choice: three of 14 run files and one story's case file stand for the rest; one story file read shows `designed` and no run.
- [ASSUMPTION] Findings refer to the project as of 2026-11-13; run files cite builds of that date.

## Recommendations
Part 1, what the testing skill can adapt for the minimal check. These are candidates, not a design.

Must have (each serves "matches the request" or "breaks nothing"):
- A result vocabulary with blocked, not run and not covered next to passed and failed, and a rule that none rounds up to a pass (R-001, R-021). [ARCHITECT REVIEW NEEDED] The draft keeps no new verdict tokens (draft 1.2); the words would live in the report, not the verdict.
- Evidence per result with its kind named, and no result without evidence (R-003, R-020, R-033).
- One classification of a failure as product, test or environment, with a named role that rules before a defect stands (R-006, R-024, R-028). [ARCHITECT REVIEW NEEDED]
- A third outcome for a silent story: a held observation or question with a proposed default, not sent to the developer (R-010, R-025). [ARCHITECT REVIEW NEEDED]
- The build or commit tested recorded with the result, and "not deployed" or "does not start" kept apart from "fails" (R-008, R-031).

Nice to have:
- A known failing check kept visible as an expected failure that turns red when fixed (R-007, R-022).
- A short read-only smoke set per entry point, with a time cap (R-030).
- Proof that a new check fails for the stated reason (R-026) and a "not run" word for checks never executed (R-021).
- Ownership rules for shared data instead of resets (R-036), and a catalog of how each data case is produced (R-037).

Comparison with the draft, row by row:

| Draft item | What the colleague's project shows |
|---|---|
| Hole 1, not a defect | Classify first, lead re-checks live (R-006, R-024) |
| Hole 2, silent story | Question with a default (R-010, R-025) |
| Hole 3, baseline | Ratchet, recorded build, performance drift against last run; no base commit run (R-007, R-008, R-049) |
| Hole 4, flaky | Retries by project, three-run detector (R-029) |
| Hole 5, environment or product | Deploy check, class rule (R-008, R-028) |
| Hole 6 and item 6, shared state | Ownership, not reset (R-036) |
| Items 7 to 9, merge hits and cards, one runtime, fast lane | No evidence either way |
| Item 12, matrix size | 33 and 40 cases per story, a floor from story points and no cap, no fixed matrix (R-039, R-046) |
| Items 13 and 14, login and seed | No mock identity, no seeding; catalog (R-037, R-038) |
| Item 17, replay safety | Guards as data, script text scanned before it runs (R-034, R-048) |
| Item 20, tester quality | Planted defects benchmark and assertion mutation (R-016, R-044) |
| 3.3, cards and exploratory | Cards are generated, hand edits unknown; report to one check (R-046, R-042) |
| 1.2 black box | His testers read source (R-040) |

## Glossary
- **Run file**: the single markdown record of one QA task in `qa/runs/`: request, results, bugs, verdict.
- **Ratchet**: an expected failure tied to a known defect id; it turns red when the defect is fixed.
- **Principal**: the colleague's name for the business decision maker who approves filing and scope.
