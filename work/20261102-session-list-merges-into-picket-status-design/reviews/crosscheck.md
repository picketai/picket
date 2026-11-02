## Review: 20261102-session-list-merges-into-picket-status-design · crosscheck

The record is aligned: no Critical or Major row, only two Minor rows. Scope: full.

Alignment: PASS
Decisions: HONOURED
Findings: 2 minor
- [Minor] design.md#phase-4: Reference integrity: phase 3 moves `SessionEntry` into the status types "as it stands" (`src/mods/session/types/index.d.ts:37-44` has a `status: string | null` field). Phase 4 Changes redefines it as `{ id; title; mtimeMs; isLive; isCurrent }` without `status`. The moved `sessions.test.ts` builds entries of the old shape, and T-3.3 requires it unedited. State in phase 4 whether `status` is dropped and the test edited.
- [Minor] design.md#D-005: Strategy: SDR-00002 D-003 says the band asks the kernel again when "a work item's state or verdict file has changed". D-005 stats only items not closed at the last list. RISK-005 discloses this and the pane open forces a list, so it is recorded and does not block.

Checked:
- **Coverage:** every D-001 to D-008 has criteria, and every phase implements a decision.
- **SDR items:** TF-001 to TF-005 each map to a phase; TF-006 is out of scope.
- **Ids:** no gaps in the D or RISK sequences.
- **Citations:** `next-step.mts:14-26`, `apply.mts:24-38`, `build.mjs:21`, `dashes.test.mjs:67` and the `view.tsx` "run /md path" text are accurate. The item named in T-1.6 has status `done` and session 43b73270.
- **`/md` references:** none outside the markdown mod and the SDR.
- **Caps:** phase and criterion counts are within the caps.

ALIGNED
