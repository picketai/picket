## Review: 20261114-a-check-for-the-guard-bypass-class · checkpoint

Phases 1 to 4 are approved: the closure tests pass on the working tree and fail on each rejected revision, with no guard changed.

Alignment: PASS (T-1.1 to T-1.7, T-2.1 to T-2.6, T-3.1 to T-3.6, T-4.1 to T-4.6)
Decisions: HONOURED
Findings: clean, 0 critical, 0 major, 0 minor
Classes: none
Checked: I ran everything below in this pass.
- **Tests:** the three `*.variants.test.mts` files, `test/repo/variants.test.mjs` and `test/repo/replay-rejected.test.mjs` pass together (30 of 30).
- **Replays:** at `c63c2ddc`, `d7011a32`, `2f702e9a` and `fe18d1fc` each exits 1.
- **Guards unchanged:** `git diff --quiet 5d23e0c2` is clean for `config-entries.mts`, `in-place.mts` and `signals.mts`.
- **Imports:** `test/support/variants.mts` imports only `node:test` and `node:assert/strict`, and it is the only helper that `scripts/replay-rejected.mjs` copies.
- **Replay script:** it spawns with argument arrays, so a file or revision name cannot inject a command. It rejects a test path outside the repository and exits 2 on a bad revision or missing file before creating any folder. It removes its temp folder in `finally`.
- **Seeds:** the review-probe seeds in all three tests match the design record's lists.
- **Removed guards and silenced checks:** none were removed. The summary has no silenced entries and no mutation result.
- **Not run:** `picket verify` (it runs `npm test`) and the full TypeScript check. I relied on the developer's reported pass for those.

APPROVED
