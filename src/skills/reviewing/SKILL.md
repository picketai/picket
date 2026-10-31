---
name: reviewing
description: >
  The reviewer's grading rules (severities, evidence bar, finding format, verdict rule) over
  the checklists the kernel names. Grades a diff (APPROVED or CHANGES REQUIRED), a design
  record's decisions against its phases (ALIGNED or DRIFT DETECTED), and a pull request.
when_to_use: >
  Use when `picket next` says `review_cumulative` or `review_checkpoint`, when a review of
  scope `phase n`, `cumulative` or `pr` is due, when the user says "review this phase",
  "review the diff" or "run an alignment check", when scope `crosscheck` asks whether a design
  record's decisions and phases agree, or for `/picket:reviewing <pull request URL>` on Azure
  DevOps or GitHub.
argument-hint: "[<pull request URL>]"
---

# Reviewing

Which checklists to open for each scope, how to grade and write a finding, and when a verdict may say `APPROVED`. Procedure (reading the diff, memory, the output block) belongs to the reviewer agent.

## Steps

1. Invoked as `/picket:reviewing <pull request URL>`, you are the lead: read `steps/pr.md`. Every step below is the reviewer's.
2. Cross-check: no diff, so no summary. Open `checklists/crosscheck.md` alone.
3. Checkpoint or phase review: open exactly the files the summary's `checklists` names, in order, honouring each entry's `skip` (sections left out).
4. Cumulative: the same list, in `checklists/traced.md`'s reading order: request and story first, plan last.
5. Pull request: open exactly the `checklists` of the `pr:` JSON. The pull request description is the plan.

## Rules

The review summary is the kernel's: never recompute `size`, `frameworks`, `concerns` or `security_path`, and never fall back to your own detection. A missing summary or field is asked for, and you stop. `changed_files` is the review scope. `silenced` (suppressions, skipped or focused tests, weaker thresholds and deleted tests since the base, each with whether the user waived it) and `mutation` (the last `picket mutate` result) are graded by `checklists/bar.md`. Extension checklists (`extension_steps`) add findings and never waive a core row. A row whose construct does not appear in the changed files is skipped silently.

Severities, first match wins:

- Critical: wrong behaviour, data loss, a security hole, or an unhandled exception on the happy path; also the code-level gap behind an alignment FAIL when the missing behaviour is the criterion's core.
- Major: a listed check fails with a concrete failure scenario and no Critical condition holds; a partially met acceptance criterion.
- Minor: advisory: style, naming, readability, or a best practice not in any checklist.
- Nit: a typo, formatting, or wording point with no behavioural effect.

Out of range: a defect on a line the diff did not touch (`git blame` SHA outside the range, or a file outside `changed_files`) is not a finding of this review. Mention it once as a Nit prefixed `pre-existing:` if it matters; it never counts toward the verdict. One exception: in a cumulative review, a story requirement (`S` row) with no code anywhere is in range and FAILs wherever its code should have been.

Noise: skip a finding the project's own gates already reject, and name the gate once on the `Checked:` line. Note the enforced set from config first: compiler warnings-as-errors and analyzers at `error`, banned-API lists, architecture-test projects, lint rules at `"error"`, strict `tsconfig` flags, pre-commit hooks, unconditional CI steps, DB constraints in migrations, and the resolved test and lint command. Nothing is excluded until it is detected; a rule at `warning`, or a path outside the tool's include glob, is not enforced; the guard's own code (trigger SQL, analyzer rule, auth filter, validator) stays fully in scope.

Evidence bar. A false Critical costs more than a missed Minor. Before a finding is written:

1. Cite `path:line` from source read in this pass, not from the diff header or from memory.
2. Never infer behaviour from a name, and never assert library semantics from memory; read the code path, the overload, or the config value.
3. Try to disprove it: read callers, tests, configuration. A finding that does not survive is dropped silently.
4. Critical and Major carry a concrete failure scenario (inputs or state, then the wrong output, exception, or data effect). No scenario, no Critical or Major: demote or drop. "Looks fragile" is not a scenario.
5. One finding per defect. When two checks fire on the same lines, report once at the higher severity and name both check ids.
6. Recompute a number or ratio the plan or the change states (a threshold, a limit, a ratio, a count) from its inputs before you grade a row that rests on it; a figure the developer, the lead or the plan repeats is not evidence. The summary's fields stay exempt, as above.

Finding format, one line per finding, Critical first, then Major, Minor, Nit:

```
- [Severity] path:line: <what>. <why it matters>. <the fix>.
```

The location ends with a colon. A finding with no line is `- [Severity] path: <text>`. Cross-check findings use a record anchor (`#D-003`, `#phase-2`): `- [Major] design.md#D-003: <text>`. Cap: 25 findings per review. Past the cap, add one line `+N more not shown (Minor a, Nit b)`; Critical and Major are never the ones cut, and Minor findings past five become a count by category.

Verdict rule. `APPROVED` is blocked by any Critical, any alignment row at FAIL, and any alignment row at UNCLEAR. Major, Minor, Nit, and out-of-range items never block. UNCLEAR blocks fail-closed because an unjudgeable criterion is a plan defect, not a developer defect: the verdict reason names the ambiguity so the lead routes it to the architect, not back to the developer. Story rows (`S-N`, cumulative only) differ in one way: FAIL blocks, UNCLEAR does not; an ambiguous story is a question for the user and goes on the `Questions:` line. A cross-check with any Critical or Major row is `DRIFT DETECTED`; Minor rows are recorded and do not block.

A criterion the code misses on the good side (a line-count bound beaten) still fails literally, so no `APPROVED`. Never ask for padded code: grade the row FAIL, name the `D-###` that states the bound, report `Decisions: DRIFT` and `AMENDMENT NEEDED: D-00x`, and say the fix is the amendment, with no code change. Group the other literal misses (an over-broad grep, "same passing count" after added tests) into that amendment as UNCLEAR. In a cumulative review, read each phase block's `Decisions:` line for misses the developer reported ("under T-x.y", "not padded", "also lists"). A plan grep that hits content the plan mandates (a fixture corpus, an import whose path matches) is judged by intent; a hit on a name the developer chose freely is FAIL.

In scope `pr` the code never followed Picket's comment rule. When a person's comment justifies a construct that T3, N2, A1, E1, Co1, Na2 or Uc2 flags, report a Minor recommendation to replace the comment with the check or the decision; Uc2 takes its recorded decision from the pull request description.

## Output

The block is the reviewer shell's `## Output`. Its last line is the verdict alone: `APPROVED` or `CHANGES REQUIRED` for a review, `ALIGNED` or `DRIFT DETECTED` for a cross-check.
