# Traced review (scope `cumulative`)

The cumulative review checks the change against what was asked, not against the architect's reading of it. Load this file in addition to `10-alignment.md`'s floors and criteria rules and to `12-bar.md`: the comment and test floors and the silenced-check row still apply to the diff, and step 5 grades the plan's criteria by its procedure. What this file replaces is the reading order and the requirements table. The load table in `SKILL.md` still applies for the pattern files.

You are a fresh instance. The plan is read last, on purpose: reading it first anchors you on its reading of the story, and a plan that misread the story then passes review.

## Order (fixed)

1. Read `work/<id>/request.md`, `work/<id>/story.md` and every snapshot under `work/<id>/sources/` that `work/<id>/sources.yaml` names. Read nothing else of the work item yet: no artifact, no verdicts, no phase blocks. A missing `story.md` or `sources.yaml` is normal; read what exists.
2. Write the requirements checklist from the story prose, or from the request when there is no story. Number the rows `S-1`, `S-2` in source order. Each row quotes the sentence and cites where it came from: `story.md#<heading>:<line>`, `request.md:<line>` or `sources/<source>/<path>#<heading>:<line>`. Cap 15 rows: past 15, keep the rows with observable behaviour first and say how many were left out. The source documents carry no ids; never invent `R-###` for them.
3. Read the diff of every repo in the summary's `repos` list with `git -C <worktree> diff <base>`, and the root's with `git diff <base>`. Grade each `S` row PASS, FAIL or UNCLEAR with `path:line` evidence. A requirement with no code anywhere is FAIL, even when the place it belongs is outside `changed_files`: this is the one exception to the range rule.
4. Regression: for each changed exported symbol, read it at `<base>` with `git show <base>:<path>`, then its callers and its existing tests. Record each behaviour change that neither the story nor the plan asks for. This replaces the cross-flow check for this scope.
5. Now read the plan (`work/<id>/order.md` or `design.md`): grade its `T-N.x` criteria and its `D-###` decisions as `10-alignment.md` says, for the `Alignment:` and `Decisions:` lines. PASS rows go in as a count; only FAIL and UNCLEAR rows get a table line.
6. Copy `Sources:` from the summary's `sources` field: `none` when the field is absent or empty, else one entry per ref, and `moved: <ref> (<sha8> to <sha8>)` for each entry with `moved: true`. A moved source is reported, never a blocker.

No `request.md`: write `Requirements: N/A (no request saved)` and run step 5 alone.

## Grading the S rows

PASS: the code does what the sentence says, cited at `path:line`, ideally with a test that asserts it. FAIL: absent, partial, or contradicted; it takes a companion finding as `10-alignment.md` maps it. UNCLEAR: the sentence is ambiguous, or it names a document you do not have. Do not interpret it, and never read a live source file to settle it: cite snapshots only.

An `S` row at FAIL blocks `APPROVED`, like a `T` row. An `S` row at UNCLEAR does not block: the developer cannot fix an ambiguous story. It goes on the `Questions:` line, which the lead copies into the closing block for the user.

The table:

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | quoted sentence | story.md#Fees:12 | PASS, FAIL or UNCLEAR | path:line or test name |

## Findings

Every Critical and Major finding keeps the shape from `SKILL.md` and ends with two fields:

```
- [Major] src/Orders/Fees.cs:42: <what>. <why it matters>. <the fix>. Likelihood: medium. Leave it: <one-line PR note if the team ships it as is>.
```

`Likelihood` is how likely the failure scenario is in production (`high`, `medium`, `low`), judged from the callers and data you read. `Leave it` is the note a reviewer would put on the PR if the finding is accepted, so the user can choose to ship with it.

Report only: change no file, run no full test suite. Targeted reads with `git show` and `git -C` are the tools.
