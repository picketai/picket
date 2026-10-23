---
name: prove-test-moves-by-script
description: How to prove a test-move refactor kept every base test and assertion, with node -e over git show (no files written)
metadata:
  type: feedback
---

For a refactor that moves or splits tests, the lead asks for proof that every base test and assertion lives on. A three-pass `node -e` over `git show <base>:<file>` and `git show HEAD:<file>` settles it in minutes:

1. Test names: regex `^\s*(test|it)\(\s*(["'`])(...)\2` on base, exact match against all HEAD test names; read the few misses by hand (renamed titles, template-literal loops).
2. Assertion lines: normalise whitespace, look for each base `assert` line verbatim in the HEAD corpus; for the rest, check every string literal of the line is in the matched HEAD test body and the expected value (`"deny"`, `null`) matches on a line with the same first literal.
3. Per-test assertion count, base against HEAD: flag any test where HEAD has fewer.

**Why:** item 06 (2026-10-23) moved 164 hook tests; helper renames (`decision` to `bashDecision`, `run("x.mjs")` to `runHookBundle`) made 183 of 585 assertions non-verbatim, and only the literal pass made hand-reading feasible (14 lines left).
**How to apply:** any cumulative review where `silenced` rows are `deleted-test`. Do it inline with `node -e`; never redirect output to a file. See [[probe-guards-directly]].
