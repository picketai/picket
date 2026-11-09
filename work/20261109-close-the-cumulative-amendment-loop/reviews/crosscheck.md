## Review: 20261109-close-the-cumulative-amendment-loop · crosscheck

The design record's decisions and phases agree, and I found nothing that blocks Phase 1.

Alignment: PASS
Decisions: HONOURED
Findings: clean
Checked:
- **Decision coverage:** D-001 is carried by T-1.1 to T-1.5, D-002 by T-2.1, T-2.2 and T-2.5, and D-003 by T-2.3, T-2.4 and T-2.6. Every phase implements a decision.
- **Reference integrity:**
  - Every existing test the criteria name is in `src/lib/shared/work/next-step.test.mts`: `(T-2.2)` at line 371, `(T-2.4)` at 381, `(T-2.5)` at 390 and 397, "a gate reply older…" at 403, and the two tests T-1.4 and the Phase 1 changes say to rename, at 137 and 145.
  - The incident rows are in `work/20261109-fix-budget-schema-session-admit-findings/verdicts.jsonl`: row 7 is the cumulative `CHANGES REQUIRED` with `amend` and row 8 is the unedited `AMENDED`. The T-1.5 "first 7 lines" and T-2.6 "first 6 rows" counts match, and `phases/` holds `.done`, `.approved` and `.reviewed` for phases 1 to 3.
  - `snapshot.mts:15` shows `artifact.body` exists, which D-002's digest relies on.
- **Caps:** both phase bodies are under 80 lines, each has 6 or 7 `T-N.x` criteria, there are 3 decisions, and the RISK ids run 001 to 003 with no gap.
- **Reproducibility and the `AMENDED` path:**
  - The `answeredAmendment` description is consistent across D-001, D-003 and the Phase 2 changes. A reply `a` older than an unchanged `AMENDED` still reads as the newest answer. The gate reopens, and a newer reply decides again with no further change.
  - Rows written before this change carry no `record`, so they count as changed and the existing `(T-2.4)` rows pass unchanged.

ALIGNED
