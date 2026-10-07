# Alignment check and authoring floors (always loaded)

Two parts. The alignment check maps every acceptance criterion of the phase to code evidence; it is a mechanical mapping, not a quality judgement. The authoring floors check what the diff adds against the developer's standing rules on comments and tests; they are cheap and run at every size because small diffs are where a stray narration comment or a sneaked-in integration test slips through.

## Alignment: pull requests

Scope `pr` has no plan. The PR description stands in for it: split it into its claims ("adds X", "fixes Y", "no behaviour change"), number them `P-1`, `P-2` in source order, and run the procedure below on those. An empty or one-line description gives no table; write `Alignment: N/A (no description)` and grade the code alone. A claim the diff contradicts is a FAIL and blocks, as a criterion would.

## Alignment: procedure

1. Extract every bullet under the phase's `**Done when:**` (or the plan's own label: "Acceptance criteria", "Exit criteria"). Each bullet leads with its `T-<phase>.<seq>` id; record it verbatim.
2. No typed ids (older plan): number the bullets in source order as `T-N.1`, `T-N.2`, and so on, and add one Major finding asking the architect to backfill ids.
3. For each criterion find the evidence: the function, class, or module that implements it; a test assertion that verifies it; or a configuration entry or schema definition that satisfies it.
4. Classify. PASS: evidence exists and satisfies both the what and the how (criterion says "returns 404 when not found"; a 400 or an exception is FAIL). FAIL: evidence absent, partial, or contradicting. UNCLEAR: the criterion says "should", "consider", "as needed", or "if applicable" without a concrete condition; do not interpret, mark it and surface it to the architect.
5. Fill the table, fixed columns, criterion text quoted from the plan and never paraphrased:

| ID | Criterion | Result | Evidence | Note |
|---|---|---|---|---|
| T-N.1 | text from the plan | PASS, FAIL, or UNCLEAR | path:line or test name | one short clause |

Cap: 15 rows per phase. Past 15 the phase was too large to review; grade the 15 highest-priority criteria (FAIL candidates first, then UNCLEAR, then PASS) and flag "phase too large, N criteria exceed cap" to the architect.

## Alignment: evidence quality

Acceptable: `path:line` at the exact implementation; a test name plus its assertion; a config key and value; "the framework handles it" only when you cite the mechanism (middleware, attribute, filter) whose documented behaviour matches. Not acceptable: "the whole file was updated"; "I assume this is handled elsewhere" (find it or mark FAIL).

## Alignment: severity mapping

| Situation | Row | Companion code finding |
|---|---|---|
| Fully satisfied with cited evidence | PASS | none |
| Ambiguous wording | UNCLEAR, blocks | none; the plan is the defect |
| Partially satisfied (core present, edge case missing) | FAIL, blocks | Major on the diff-level gap |
| Absent or contradicted | FAIL, blocks | Critical if the missing behaviour is the criterion's core, else Major |

The row and the companion finding are two findings about one gap; both are reported.

## Comment discipline

No new comments in code (the `comments` rule). Judge only comments the diff adds, plus existing comments over code the diff changed.

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Cm1 | Unapproved comment | The diff adds a comment of any form (doc comments included) that is not exempt and has no matching entry in `work/<id>/comments.jsonl` | Major |
| Cm2 | Stale comment | The diff changed code beneath an existing comment and the comment now describes behaviour the code no longer has | Major |

Report Cm1 as one aggregated Major finding listing each `path:line` and the text, so a comment-heavy phase costs one slot. Report Cm2 per occurrence: a comment that lies is a correctness hazard. Never flag: machine directives (`eslint-disable`, `@ts-expect-error`, `noqa`, `SuppressMessage`, pragmas) and their justification; licence and SPDX headers; generated-file banners; workflow markers (`[IRREVERSIBLE]`, status anchors).

## Test scope

The developer writes unit tests and, conditionally, architecture tests; every other kind needs an explicit unlock (the `tether:developer` agent). Judge only tests the diff adds.

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Ts1 | Excluded test kind authored | The diff adds an integration, component, end-to-end, contract, performance, or smoke test and neither the phase summary nor the plan records an unlock naming that kind | Major |
| Ts2 | Infrastructure in a unit test | An added test boots or reaches real infrastructure (DB provider, container, HTTP server, in-memory host, broker, filesystem), whatever the file is called | Major |
| Ts3 | Architecture harness introduced | The diff introduces NetArchTest, ArchUnit, ts-arch, or dependency-cruiser where the project had none | Minor |
| Ts4 | Test asserts nothing meaningful | An added test asserts only that a mock was called, or has no assertion on the rule its name claims to cover | Major |

A plan line prescribing an excluded kind is not an unlock. Unit tests plus a logged deviation: no finding. The excluded kind written because the plan asked: still Ts1, and the plan wording is worth a note to the architect if the criterion cannot be met any other way.

`node .claude/scripts/lint.craft.mjs --range <range>` (add `-C <repo>` for a nested repo) locates candidates in added lines. Its errors (commented-out code, which is Cm1, and Ts1, Ts2) are facts worth citing; its candidates (comments, which are Cm1 unless exempt or approved, and Ts3) are questions to confirm before they become findings; Cm2 and Ts4 it cannot see. `guard.comments` blocks comments at the edit, so a Cm1 finding names a bypass. It is your instrument, not a project gate, so it never counts as a machine-enforced exclusion. Never paste its output as the review.
