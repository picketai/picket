## Review: 20261105-kernel-blocks-run-sends-review-diffs · cumulative

The new summary code leaves out one of this item's own recorded phase commits, so phase 1's guard change is missing from this item's own summary.json and S-5 fails.

Requirements: FAIL: S-5 a recorded phase commit (d9d312a, ledger accept for phase 1) is missing from the item's changed_files and line counts

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "every path on the block's Files: line that is staged must go into the phase commit" | request.md:2 | PASS | src/lib/shared/route/commit.mts:64 reads blockFiles, which now parses bold and bulleted labels (src/lib/shared/work/block.mts:110-117); T-1.4 test |
| S-2 | "Either guard.block bounces that shape naming the plain one-line form, or parseBlock reads it; pick one and apply it to every phase field." | request.md:3 | PASS | src/lib/shared/work/block.mts:154-178; src/lib/hooks/guard/block/index.mts:63; T-1.2 |
| S-3 | "The lead should get no send (or a no-op) when the developer already continues" | request.md:4 | PASS | src/lib/shared/work/send.mts:120-129; T-2.1, T-2.2 |
| S-4 | "a repeated identical block must not add a verdict row" | request.md:4 | PASS | src/lib/hooks/route/verdict/index.mts:82-87, :143; T-2.5 |
| S-5 | "The summary must cover only this item's own commits (the phase commits and fix commits recorded for the item) plus its staged fixes" | request.md:5 | FAIL | src/lib/shared/review-summary.mts:177; d9d312a has no work/<id>/ path and is not in summary.json |
| S-6 | "leave out staged paths that belong to no phase of the item" | request.md:5 | PASS | src/lib/shared/review-summary.mts:178-179; T-3.2 |

Alignment: PASS (23)
Decisions: DRIFT: D-004 assumes that "every phase commit adds that folder", but this item's own phase 1 commit d9d312a does not
Regression: none
Sources: none
Questions: none
Findings: 1 major
- [Major] src/lib/shared/review-summary.mts:177: `rootOwned` finds the item's commits only with `git log <base>..HEAD -- work/<id>/`. A phase commit without the work folder therefore drops out of changed_files, the line counts and the silenced scan. Here, d9d312a (recorded as the phase 1 accept in `.picket/state/ledger.jsonl`) holds only product files. So summary.json leaves out src/lib/hooks/guard/block/index.mts, src/lib/verbs/route/index.test.mts and test/hooks/guard.block.test.mjs, and reports +323/-26 where the item's three commits add up to +490/-52. A likely way such a commit happens: `commitOwned` adds the folder through `gitRead` (src/lib/shared/git.mts:210, src/lib/util/git.mts:20-25), which hides a failed `git add` and commits anyway. Fix: amend D-004 so the item's commits come from a second source too (the ledger's accept commits, or commits whose files the phases own), and make the folder add fail loudly. Likelihood: medium. Leave it: item summaries can leave out a phase commit that lacks work/<id>/; reviewers should compare `git log --stat <base>..HEAD` with changed_files.

Classes: Rf2
Checked: these held up: list joining against the plain-form readers (packet, reply, commit-message); the guard now reading the last field rather than the first, which is stricter; the repeat check comparing the same text the hook saves; the idle marker on stops that are not continued developer stops; the deleted-path filter for range and nested-repo summaries; and the edits to existing tests (only additions, wider imports, the MARKERS pin and the one replaced test). The mutation spot check was killed. npm test was not run, as the traced checklist says.

AMENDMENT NEEDED: D-004 finds the item's commits only by their touching work/<id>/, and phase 1's commit d9d312a does not; it needs a second source or an add that cannot fail silently

CHANGES REQUIRED
