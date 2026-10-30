# Picket candidates from development's memory

Status: candidates, not approved. Found on 2026-10-30 while moving development's agent memory and auto-memory into its rules; none of this is covered by the current agent shells, skills or kernel. Each needs the walkthrough treatment before a draft.

## Agent lessons

1. Analyst: read the persistence mapping below a gate before calling a case unreachable.
2. Analyst: a second challenge to a negative claim means re-read the source, not re-defend the claim.
3. Analyst report template: a "cannot be tested" row names its kind (data, configuration or routing).
4. Architect: run a criterion's rule against its own example before designing to it.
5. Architect and reviewer: derive every number and ratio, never relay one.
6. Architect: a deferred criterion names its owner and its gate.
7. Architect amendment: a table found incomplete is rebuilt from the source, every cell; sweep every phase and the scope for a retired code in the same turn.
8. Architect greps: target the stable tail of an expression, and check every negative grep against its positive twin.
9. Architect and reviewer: a criterion "unchanged versus before" needs a captured before-image and a named compare step.
10. Reviewer: when a touch set gives a count and a search, run the search; when a criterion names a test, open the class and count the candidates.
11. Reviewer cross-check: ask about a gap in a `RISK-###` sequence. Minor.
12. Developer and implementing: a bulk edit script keeps BOM and line endings and counts its matches; prove the edit with `git diff --numstat`.
13. Developer: before writing a file the plan calls new, confirm with `git ls-files`; Glob skips gitignored worktree paths.
14. Tests rule or implementing: no test for a scenario a decision makes impossible; a verdict that varies per branch asserts every field at every return site.
15. Implementing: after moving a namespace, grep the whole solution for the old one; copy strings from the delivered attachment, never retype them; prove a "pre-existing" failure on the base.
16. Implementing: compare a ticket's updated time with the report's pull time before relying on the report.
17. Architect and developer: capture read-only live evidence before an irreversible step.
18. Architect and developer: a failing ticket repro proves the failure, not its diagnosis.

## Kernel and rules

- A sanctioned way for an agent to delete an untracked file it created; today guard.bash denies `rm` and agents found a `cmd //c del` way around it.
- Test tooling detected per nested checkout: `picket verify` reports "no test command detected" in a nested worktree.
- `picket check` and `picket drive` run in the git toplevel of the main checkout instead of the nested worktree they are called from.
- `prose.md` exempts verbatim quotations of a source (ticket text, acceptance criteria, copy strings) from the dash rule.
