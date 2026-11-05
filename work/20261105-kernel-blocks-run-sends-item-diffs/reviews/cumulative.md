## Review: 20261105-kernel-blocks-run-sends-item-diffs · cumulative

Approved: every request row and every T criterion is met with evidence. One Major remains, and it does not block: the saved mutant on the reset hint's file-path branch survived.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "every path on the block's Files: line that is staged must go into the phase commit" | request.md:2 | PASS | src/lib/shared/route/commit.mts:64,67 (reported paths are owned); landed before base |
| S-2 | "Either guard.block bounces that shape ... or parseBlock reads it; pick one and apply it to every phase field" | request.md:3 | PASS | src/lib/shared/work/block.mts:69,124-127 |
| S-3 | "The lead should get no send ... and a repeated identical block must not add a verdict row" | request.md:4 | PASS | src/lib/shared/work/send.mts:120; src/lib/hooks/route/verdict/index.mts:82 |
| S-4 | "The summary must cover only this item's own commits (the phase commits and fix commits recorded for the item) plus its staged fixes, and leave out staged paths that belong to no phase" | request.md:5 | PASS | src/lib/shared/review-summary.mts:177-187, 191-192 |
| S-5 | "the item summary still misses a phase commit that lacks work/<id>/ because the phase commit's folder add can fail silently" | request.md:8 (Brief) | PASS | review-summary.mts:185; src/lib/shared/git.mts:221-226 |

Alignment: PASS (15)
Decisions: HONOURED
Regression: 2 unrequested behaviour changes
- src/lib/shared/git.mts:224: an `add` path that git refuses now fails the whole phase or close commit, where before the product files were still committed. This covers an ignored path as well as RISK-005's "matches nothing". I probed it: `git add -A -- work/x/` with `work/` in .gitignore exits 1. No supported setup ignores `work/`, so this is a note, not a finding.
- src/lib/shared/route/commit.mts:40: a nested checkout whose index reset fails after a successful commit now gives a warning line instead of `refused the commit`. This follows D-002.
Sources: none
Questions: none
Findings: 1 major, 1 minor
- [Major] src/lib/shared/git.mts:229: the saved mutant `===` to `!==` survived `npm test`. No test passes an `add` path that does not end in "/", yet `commitClose` passes published report files (src/lib/verbs/close/close.mts:140). Scenario: with the mutant in place, a close that publishes `docs/reports/x.md` under a held index lock prints a reset hint that leaves out the other committed paths, such as `src/a.js`. After running that hint, the shared index still shows `src/a.js` as a staged deletion. Fix: add a test that fails when `===` becomes `!==`, i.e. a `commitOwned` call with `add: ["work/x/", "docs/r.md"]` under a held lock that asserts the hint ends `; run git reset -q -- work/x/ docs/r.md src/a.js`. Likelihood: low. Leave it: the file-path branch of the reset hint is untested; the hint is advisory text and only appears when the shared index is locked.
- [Minor] src/lib/shared/git.mts:224,238: `add` paths are relative to `root`, while `committed` paths come from `top`. When the project root is a subfolder of the git top level, `underAny` never matches and the hint mixes the two bases. Fix: give `add` the repo prefix before comparing and printing.
Classes: Mu1
Checked: I recomputed the 21 files, +492/-54 for d9d312a, 595f05f and fb187cc from numstat; they match T-1.7. The before-images of the three unit test files show only added lines. The test/cli/close.test.mjs edit follows from D-002 and the block reports it. The T-2.6 before-run printed `git reset failed` instead of the design's predicted `committed <sha>`; base fb187cc's reset throw explains that. I found no new comments, and `silenced` is empty.

APPROVED
