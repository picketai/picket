## Review: 20261114-a-check-for-the-guard-bypass-class · cumulative

Approved: the amendment rewords T-6.4 and T-5.1 to match what the code does, the code is unchanged since e427fea0, and the new mutation run killed its mutant.

Requirements: PASS (6)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "fix the Se4 mistake class ... at the highest level that works (type, lint rule, test, docs last)" | request.md:1 | PASS | test/support/variants.mts:164-174; CONTRIBUTING.md C-020 and ## Guards |
| S-2 | "The new check must fail on the code the reviews in ... rejected." | request.md:1 | PASS | replays at c63c2ddc, d7011a32, 2f702e9a, fe18d1fc, d40b21ab exit 1 with probe labels; spendRefusal-only probe leaves 0, -0, -2 open |
| S-3 | "find what they have in common, and add the check that would have caught each before review" | request.md:1 | PASS | design.md:138; five *.variants.test.* files |
| S-4 | "where no single check covers all four, cover the ones a check can cover and say plainly which are left to prose" | request.md:1 | PASS | CONTRIBUTING.md "No check covers these" list |
| S-5 | "missed query-string secrets (`?api_key=`, `?client_secret=`) in src/lib/shared/env/config-entries.mts" | request.md:1 | PASS | src/lib/shared/env/config-entries.variants.test.mts:9-11 |
| S-6 | "out of scope: rewriting the guards themselves beyond what the check needs" | request.md:6 | PASS | the five guard files are byte-identical to 5d23e0c2; the only change is the seam at bench/lib/spend.mjs:51 |

Alignment: PASS (38). T-6.4 now names `--harness plugin` (design.md:116, :340), which bench/run.mjs:65 maps to ROOT, so `--budget-usd abc` reaches the refusal at bench/run.mjs:321-324. T-5.1 (design.md:320) counts the T-5.3 test at src/lib/verbs/verify/index.variants.test.mts:35.
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: the revision log has one line per amended criterion (design.md:364-365). `git diff e427fea0` outside work/ and .claude/ is empty. The mutation outcome is killed (scripts/replay-rejected.mjs:18, `!==` to `===`). `silenced` is empty.

APPROVED
