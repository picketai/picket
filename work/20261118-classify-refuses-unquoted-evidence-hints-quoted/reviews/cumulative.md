## Review: 20261118-classify-refuses-unquoted-evidence-hints-quoted · cumulative

APPROVED: classify now refuses split evidence when it parses the command, before any row is written, and the four hints and three usages show free text in double quotes. An exact-string test pins each of them.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Fix picket test classify so it refuses extra words" | request.md:1 | PASS | src/lib/verbs/test/classify.mts:29-30; record.test.mts "classify's parse refuses evidence the shell split into words..." |
| S-2 | "Make classify answer a usage error and save nothing" | request.md:1 | PASS | parse throws before `run`; drove `test classify <id> C-01 product --evidence POST /orders answered 500`: exit 1, usage printed, never reached the item check |
| S-3 | "change the kernel's own hints to print the flag text in double quotes ... in classify.mts, note.mts, case.mts, report.mts, route.mts and cases.mts" | request.md:1 | PASS | classify.mts:10, note.mts:14, case.mts:20,30, report.mts:27, route.mts:64, cases.mts:76 |
| S-4 | "make every hint the kernel prints a command that keeps its text when copied" | request.md#Brief | PASS | every hint in the named files is quoted; see Questions |
| S-5 | "out of scope: The testing skill's step files; the bench grader and keys ..." | request.md#Brief | PASS | the base..HEAD diff touches nothing under src/skills or bench |

Alignment: PASS (T-1.1 to T-1.7)
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-4: the purpose asks that every hint the kernel prints keeps its text when copied. Two places still fall short. The ask usage still shows `--question <text>` and `--basis <text>` (/mnt/work/development/github/picket/src/lib/verbs/test/ask.mts:11). /mnt/work/development/github/picket/src/skills/testing/steps/results.md:3 still says that unquoted, "`classify` keeps only the first one", which is now false. The brief keeps both out of scope (OQ-001, OQ-002). Does the user want a follow-up item?
Findings: clean
Classes: none
Checked: drove the unquoted classify (exit 1) and the quoted one (passes the parse, exit 2 at the item check). Trailing options land in `opt`, not `pos`, so only stray words are refused. No unquoted `--evidence <`, `--why <` or `--intent <` is left in src outside ask.mts and the out-of-scope cases.md. No guard was removed, the skill-examples assertion got stronger, and no comment lines were added.

APPROVED
