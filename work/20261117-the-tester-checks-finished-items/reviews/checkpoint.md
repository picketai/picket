## Review: 20261117-the-tester-checks-finished-items · checkpoint

Phases 1 to 5 meet every T-criterion with a test I read, and no guard I probed let a tester read or write the item's files. The two Majors are maintenance risks and do not block.

Alignment: PASS (T-1.1 to T-1.7, T-2.1 to T-2.8, T-3.1 to T-3.7, T-4.1 to T-4.8, T-5.1 to T-5.8). The `node scripts/test.mjs` drives are the developer's recorded exit 0. I reran the 330 tests in the changed files: 330 pass, 0 fail.
Decisions: HONOURED (D-001 to D-006 as written). D-005 builds the owned list in the hook rather than importing `itemOwnedPaths`; see the first Major.
Findings: 0 critical, 2 major, 1 minor
- [Major] src/lib/hooks/guard/blackbox/index.mts:30: Rf2 information leakage: `ownedPaths` repeats `itemOwnedPaths` (src/lib/shared/review-summary.mts:210-213) line for line, and no test ties the two. If the summary's owned set gains a source, say a review file, the black box silently lacks it and the tester can Read the item's own change. Move the one list into a module with no extension-loader import and have both call it. That adds a file to the touch set, so it needs an amendment.
- [Major] src/lib/shared/testing/report.mts:6: Rf8 hand-synced list: `COUNTED_OUTCOMES` repeats `CASE_OUTCOMES` plus `CELL_OUTCOMES` (src/lib/shared/testing/results.mts:146-148). `COUNTS_LINE` (src/lib/verbs/test/report.mts:313) and `OUTCOME_WORDS` (src/lib/verbs/test/note.mts:193) repeat them again. Adding an outcome to `CELL_OUTCOMES` makes the counts line omit it with no error. The report's numbers then no longer match its rows, which D-002 forbids. Build the first two from the results.mts arrays.
- [Minor] src/lib/hooks/guard/scope/index.variants.test.mts:20: C-020: guard.scope gained `test/` and `test.md` (index.mts:12), but its closure seeds cover only `.picket/env/scenarios`. The new entries have one spelling test (index.test.mts) and no relative, `..`, symlink or upper-case seeds. Add a `work/<id>/test/results.jsonl` seed.
Classes: Rf2, Rf8
Checked:
- I probed the tester's Bash guard with newline, CRLF, backslash-newline, `<<<`, `< file`, `&` and `#` joins and an unquoted heredoc. Each one that could read a file was denied.
- `latestHints` reads user text only, so a tool result cannot name another item. A missing or unreadable item denies every Read and Grep.
- The `guard.block` change makes each role accept only its own tokens, which strengthens it.
- Tester rows carry scope `test`, so `next-step.mts:43` and `:47` do not mistake them for a cumulative verdict.
- No new comments, silenced tests or deleted guards.
- The unrelated `git.mts` change (commit 041506fa) belongs to another item and is out of range.

APPROVED
