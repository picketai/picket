## Review: 20261109-close-guard-test-admit-ledger-gaps · cumulative

APPROVED: both Majors are fixed and I re-ran the probes against the staged code. The three plan-wording items are still in design.md because the user answered [f]. Treat them as accepted; they are listed as Minor.

Requirements: PASS (5); S-1 and S-5 UNCLEAR, see Questions
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "An in-place shell or script edit of a source or test file must get the same checks as an Edit, or be denied." | request.md:2 | UNCLEAR | sed -i, perl -i, inline programs, heredocs, `-X utf8 -` and here-strings are denied to the lead and the developer (probe; payloads.test.mts:192-193). Script files are still not read (OQ-002). |
| S-5 | ".picket/state/check-log.jsonl grows by one row per picket check run with no limit; keep it bounded." | request.md:6 | UNCLEAR | src/lib/shared/check-log.mts:52 keeps 2 rows per item phase. Closed items are never pruned. |

Alignment: PASS (43)
Decisions: HONOURED
Regression: 2 unrequested behaviour changes. (1) The check log rewrite drops malformed rows (src/lib/shared/check-log.mts:52). (2) Any interpreter argument that holds a write call is now read as program text (src/lib/hooks/guard/bash/in-place.mts:39). An argument passed to a script, such as `node tool.mjs "writeFileSync('src/a.ts')"`, is therefore denied.
Sources: none
Questions: S-1 should script files (`python3 fix.py`), `patch` and `git apply` stay outside the denial (OQ-002)? S-5 is a log that grows by item phase, with closed items never pruned, bounded enough?
Findings: 0 critical, 0 major, 3 minor
- [Minor] work/20261109-close-guard-test-admit-ledger-gaps/design.md:138: D-004 (r2) still says every quoted span with whitespace is blanked. The code keeps a span that holds a security word or a credential token (src/lib/shared/admission/signals.mts:80). The user declined the amendment, so the record understates the rule.
- [Minor] work/20261109-close-guard-test-admit-ledger-gaps/design.md:197: Phase 2 Changes still describes the r1 two-rename swap. D-002 (r2) and `swapInto` move files one by one.
- [Minor] work/20261109-close-guard-test-admit-ledger-gaps/design.md:285: T-7.1 shows the note on the red line. The packet prints it on the line under the field because of the 88-column width (src/lib/verbs/packet/packet.mjs:130). I graded the criterion PASS on intent.
Classes: none
Checked: 114 of 114 tests pass in the guard, admission, admit verb, labelled corpus, bench tasks and build tests. The three quoted credential-token requests now admit to design, while the verdict-token request still gives security false. Every lead in-place form I probed is denied, and redirects, `git commit -F -` and `sed -i` on .md are not. The summary's `mutation` (18:46) predates the new swapInto test at test/repo/build.test.mjs:65. That test drives a staged file over a non-empty folder, which reaches line 274's `rmSync` with `recursive`, so it should kill the mutant. Rerun `picket mutate` to record that.

APPROVED
