## Review: 20261105-kernel-blocks-run-sends-review-diffs · cumulative

Approved: the code meets all four request gaps and every T-1.x to T-3.x criterion, and nothing blocks. One gap in the summary: it left out the phase 1 commit, so I reviewed that commit separately.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "every path on the block's Files: line that is staged must go into the phase commit" | request.md:2 | PASS | blockFiles reads bold/bulleted Files (block.mts, d9d312a); route/index.test.mts T-1.4 test |
| S-2 | "Either guard.block bounces that shape ... or parseBlock reads it; pick one and apply it to every phase field" | request.md:3 | PASS | LABEL_LINE over BLOCK_FIELDS; guard.block reads fields through parseBlock (src/lib/hooks/guard/block/index.mts:28); T-1.2 loops every phase label |
| S-3 | "The lead should get no send ... and a repeated identical block must not add a verdict row" | request.md:4 | PASS | send.mts runHandOff and implementSends; src/lib/hooks/route/verdict/index.mts:82; tests T-2.1, T-2.5 |
| S-4 | "The summary must cover only this item's own commits ... and leave out staged paths that belong to no phase of the item" | request.md:5 | PASS | src/lib/shared/review-summary.mts:189 rootOwned; summary/index.test.mts T-3.1, T-3.2 |
Alignment: PASS (22)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/hooks/route/verdict/index.mts:85: a fix block that is identical to the saved one is dropped even after a reviewer CHANGES REQUIRED row or a user rejection, because the check reads only the newest developer row. The hook returns nothing, so the developer gets no sign the block was dropped. D-003 asks for exactly this, so it is a note for the architect, not a developer defect.
- [Nit] pre-existing: the summary omits phase 1 commit d9d312a and its files (`src/lib/hooks/guard/block/index.mts`, `test/hooks/guard.block.test.mjs`, `src/lib/verbs/route/index.test.mts`). That commit lacks `work/<id>/` (the index-lock bug fixed later in feae211), and `.picket/state/ledger.jsonl` has no accept row for this item, so `ownCommits` misses it. I reviewed d9d312a by hand.
Classes: none
Checked: I recomputed T-3.7 by numstat: 15 files, +207/-18, exact. T-1.3 and T-2.6 before-images: base diffs add tests only, plus the one replaced test and import lines. 139 of 139 tests pass in the six changed test files. lint.craft is clean on all three commits. silenced is []; the mutant was killed. The bulleted-label-under-Verified override that d9d312a introduced is already fixed at HEAD by 096baf5. Under a run grant, a security phase still clears run_through only when its own PHASE DONE arrives, so the hand-off logic stays correct for it.

The memory note about this summary gap was not saved. The harness blocked the Write call, and I removed the index line I had already added to `/mnt/work/development/github/picket/.claude/agent-memory/picket-reviewer/MEMORY.md`.

APPROVED
