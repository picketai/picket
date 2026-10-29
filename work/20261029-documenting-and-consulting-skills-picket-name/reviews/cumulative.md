## Review: 20261029-documenting-and-consulting-skills-picket-name · cumulative

Approved. Every requirement with an observable behaviour is met. The one open point is whether the request meant rewriting closed over-cap reports; that is a question for the user and does not block.

Requirements: PASS (14)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-7 | "fixing the existing reports that fail" | request.md:1 | UNCLEAR | Only the 20261008 markers were fixed. Three closed reports still fail: 20261004 (Summary cites 6 ids), and the two 20261017-compare reports (77 and 66 findings). I checked by running `reportProblems` from source over every `work/*/research.md`. |

Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-7. Does "fixing the existing reports that fail" cover closed reports that break a cap (OQ-001, never answered, fallback applied)? The 20261004 Summary fix is format-sized: cite 3 ids instead of 6. The two 77 and 66 finding reports would need their findings rewritten. Any later edit to one of them makes `lint.schema` ask the editing agent to fix it before ending the turn.

Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/hooks/lint/schema/report.mts:19: the leftover check matches only `[REPLACE:`. The report template carries 8 bare `[REPLACE]` placeholders (`templates/report.md:17,21,25,...`), and a report that leaves one under `## Summary` lints clean (probed). Match `\[REPLACE[:\]]`.
- [Minor] src/lib/verbs/reply/index.mts:103: on a research item whose title yields no slug, `p` is not offered. Typing `p` is then refused with "on a research item reply takes p", which contradicts the reply it refuses. Name the missing slug when `p` is not among the options.

Classes: none
Checked: `picket name` driven from source at the root and from `src/lib` (report, sdr sequence 00002, design with `exists`, `../../etc passwd` becomes `etc-passwd`, api without a subject exits 1). `git grep filename.mjs` is empty and `src/skills/understanding` is unchanged. Publish refuses before any write and the verdict row carries `published`, which `close` stages. Close survives a published file deleted before close, because `commitOwned` adds through `gitRead`. 86 targeted unit tests pass from source. I did not run the full `npm test`; for that I relied on the phase blocks and the mutation run (killed, rebuild passed).

APPROVED
