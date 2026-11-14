## Review: 20261114-purge-never-removes-another-item-s-stack · crosscheck

The record holds together: every decision has a criterion, each phase implements a decision, and the cumulative review's Major is resolved. One Minor (D-002 is only tested with an open item) does not block.

Scope: full. I read the cumulative review of 20261114-standard-test-environment-and-env-verbs and that record's D-007 and T-8.x criteria. I spot-checked the code lines the record cites, and I read no code beyond those lines.

Alignment: PASS
Decisions: HONOURED
Findings: clean, 0 critical, 0 major, 1 minor
- [Minor] work/20261114-purge-never-removes-another-item-s-stack/design.md#D-002: Decision coverage: D-002 says close refuses when `stacks.json` records the fallback stack for a different item "at any status", and that a done item's stack is left to `env purge`. T-1.1 seeds only an open item B, so the done and abandoned branch has no criterion. Someone could narrow the check to active items and every criterion would still pass, so add a done-item case to T-1.1 or a new T-1.x.

Classes: none
Checked:
- D-001 to D-003 each map to criteria (T-1.1 to T-1.6, T-2.1 to T-2.4).
- Both phases implement a decision.
- The cumulative Major (close.mts:212-216) and its three fixes (close, `env purge`, `env start`) are all covered.
- The cited code lines match: `purge.mts:18` refusal text, `itemStack` at `close.mts:212-216`, `recordStack` at `start.mts:99-100`, the T-5.4 stub, the T-8.1 call order, and the T-8.1 to T-8.6 and T-5.4 to T-5.6 ids in the parent design.
- RISK-001 to RISK-004 have no gaps.
- SDR 00004's naming rule is left unchanged by D-001 to D-003.

ALIGNED
