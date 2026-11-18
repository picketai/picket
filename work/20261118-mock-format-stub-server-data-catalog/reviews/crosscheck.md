## Review: 20261118-mock-format-stub-server-data-catalog · crosscheck

The record is consistent: every decision has an implementing phase, every phase serves a decision, and I found no contradiction with SDR 00004.

Scope: full
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor
- [Minor] work/20261118-mock-format-stub-server-data-catalog/design.md#Phase-9: Reverse coverage: phase 9 never cites a `D-###` in its Changes, and no decision covers the brief, the testing skill's case step or the setup text. I dropped this from Major because D-002 RISK-003 names "the setup text (phase 9)" as its mitigation, and T-9.1 uses the D-005 catalog entries. Cite `D-002` and `D-005` (and `D-003` for the gap class) in phase 9's Changes.
- [Minor] work/20261118-mock-format-stub-server-data-catalog/design.md#D-001: Terminology: `.claude/MEMORY.md` `## Language` has no entry for "mock", "stub", "catalog entry" or "gap". All four recur across decisions and phases. Add the four glossary entries.

Checked:
- **Decision coverage:** D-001 is in phase 1, D-002 in 2, D-003 in 3, D-004 in 4, D-005 in 5 and 6, D-006 in 7, D-007 in 8, and D-008 in 2 and 3. No phase cites a missing decision.
- **Driver findings:** TF-006 (mock format, stub server, catalog, approved SQL) is covered. Out-of-scope TF-007, TF-008 and TF-009 match the SDR's own list.
- **ID sequences:** the RISK ids (001 to 008) and OQ ids (001 to 005) have no gaps.
- **Strategy:** D-001 to D-008 match SDR 00004 (Ratified) D-005, D-006, D-010 and D-011 on:
  - Picket-owned formats.
  - A recorded format change instead of a migration.
  - An approved SQL file run through the database's own client.
  - The mock flag on the result, the flow and the closing line.
- **Draft:** sections 2.6, 3.5 and 10 exist. Reading mock traffic in the replay layer rather than through a scenario request departs from 2.6's wording but not from the SDR.
- **Cited code:** `isBuiltModule`, `LEAD_ONLY_VERBS`, `STATE_PREFIX`, `MOCK_SUFFIX`, the `decisions.mts:112` text and the `scenario_core_lines` 600 budget all exist as described. `src/lib/shared/mocks`, `src/lib/shared/catalog` and `src/lib/shared/data` are absent, as new-file phases expect.
- **Unverified:** the `GroupEntry` `leadOnly` addition and the Compose v2.40.3 `-e` behaviour. I did not check them, because the cross-check does not read code.

ALIGNED
