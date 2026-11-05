## Review: 20261105-kernel-blocks-run-sends-item-diffs · crosscheck

D-001 and D-002 are each covered by phase criteria and both phases implement a decision.

Alignment: PASS (scope: full)
Decisions: HONOURED
Findings: 1 minor
- [Minor] work/20261105-kernel-blocks-run-sends-item-diffs/design.md#D-001: Reference integrity: Phase 1 says "every readLedger(root) row", but readLedger (src/lib/shared/ledger.mts:53) returns a JsonlRead wrapper, not an array. Name the rows field in the Changes text.

ALIGNED
