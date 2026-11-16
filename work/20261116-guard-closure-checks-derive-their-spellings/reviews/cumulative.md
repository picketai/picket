## Review: 20261116-guard-closure-checks-derive-their-spellings · cumulative

Approved: the fixes build T-4.6. Bun and deno now read standard input through `run -`, and the in-place closure seeds them. No Critical finding and no FAIL row remains.

Requirements: PASS (6), 1 UNCLEAR
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-6 | "it fails when a guard or a row has no closure test" | request.md:3 | UNCLEAR | Rows: test/support/variants.mts:613-633. Closure files with no entry: test/repo/closures.test.mjs:89-95. A guard module with no closure file is never detected (D-005, OQ-001 fallback) |

Regression: none
Sources: none
Questions: S-6: does the OQ-001 fallback (a guard with no closure test at all still passes) satisfy "fails when a guard ... has no closure test"?
Alignment: PASS
Decisions: HONOURED
Findings: 1 major, 1 minor
- [Major] src/lib/hooks/guard/bash/in-place.mts:33: the summary's `mutation` still records `===` to `!==` as `survived` (Mu1). That record (ts 14:00:55) predates the fix. The new test at src/lib/hooks/guard/bash/in-place.test.mts:35 should kill the mutant: the deno row has no `programOperand` (interpreters.mts:125), so under the mutant the line 81 fallback reads only the write word and gives `[]`, not `["src/a.ts"]`. Fix: rerun `picket mutate` so the record matches the code. Likelihood: low. Leave it: the mutation record is stale; the deno eval branch now has a test that pins it.
- [Minor] src/lib/hooks/guard/bash/in-place.variants.test.mts:53: open from the last round, and the phase 4 fixes block says so. The `awk <program>` operand form is only a probe, and `interpreterRowSource` ignores `programOperand`. This is a plan gap: an operand reading in the vocabulary would close it.
Classes: Mu1
Checked: the three touched test files pass (93 pass, 0 fail), including `stays closed under stdin spellings` with the bun and deno seeds and the exact T-4.6 lists at test/repo/variants.test.mjs:280-283. The old assertion that bun reads no standard input is gone. The guard code did not change in this round. `silenced` is empty. The fixes are staged, not committed.

APPROVED
