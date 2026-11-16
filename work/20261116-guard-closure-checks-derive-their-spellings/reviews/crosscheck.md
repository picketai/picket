## Review: 20261116-guard-closure-checks-derive-their-spellings · crosscheck

The design record's decisions and phases agree; only two Minor citation drifts remain.

Alignment: PASS
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor (scope: full)
- [Minor] work/20261116-guard-closure-checks-derive-their-spellings/design.md#D-002: Reference integrity: line cites are off against the tree at base 29346d5b. `SECRET_WORDS` in `config-entries.mts` is at line 10, not 11. The test-side copy in `config-entries.variants.test.mts` is at line 17, not 20. `stdinSpellings` in `in-place.variants.test.mts` is at line 100, not 105. `inlineProgram`'s subcommand branch in `in-place.mts` is at line 31, not 32. Re-cite from the files, or drop the numbers.
- [Minor] work/20261116-guard-closure-checks-derive-their-spellings/design.md#D-004: Terminology: the 5 of 11 interpreter rows without a flag vocabulary is correct, but D-002 states it as "5 of 11 ... no flag vocabulary" and the Problem as "6 of the 11" with one. Both are right; phrase them the same way.

Checked:
- Decision coverage: D-001 to D-007 each have a T-criterion (T-1.1/1.2, T-2.1 to 2.3 and 3.1/3.2, T-2.2, T-3.3/3.4/4.1, T-5.x, T-1.6/2.5 to 2.7/3.6/4.4, T-3.5).
- Reverse coverage: every phase implements a decision. Phase 6 cites none by id, but T-6.1 and T-6.2 name D-002, D-004 and D-005 content.
- Recomputed from source:
  - `FAMILIES` has 11 rows and the flag table has 6.
  - Alternatives: 8 for the shared write pattern, 2 for PHP, 2 for Lua, 7 for R, matching T-3.2.
  - 4×2×3×3 = 72, matching T-3.4.
  - 11 writer wrapper forms, matching T-4.1.
  - 13 registry guards: the 3 existing spend guards plus `spendRefusal --max-usd` make 4, with 8 others and `claudeArgs`.
- The eight rejected trees in D-006 are each covered by a declared replay drive.
- No gaps in the D, RISK and OQ id sequences.
- Phase and criterion caps hold: 7 decisions, 3 to 8 criteria per phase.
- No ratified SDR was in play for this record.

ALIGNED
