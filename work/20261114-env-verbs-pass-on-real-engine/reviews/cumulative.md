## Review: 20261114-env-verbs-pass-on-real-engine · cumulative

Approved: the T-1.5 amendment now expects the text Node actually prints, and no code changed since the last review, which passed on the real engine.

Requirements: PASS (6)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Fix the argument order in the engine adapter wherever a profile is passed" | request.md:1 | PASS | src/lib/shared/env/engine.mts:205-206 |
| S-2 | "make the fake engine refuse a global flag placed after the subcommand" | request.md:1 | PASS | test/fixtures/env/fake-engine.mjs:30, :85; test/env/fake-engine.test.mjs |
| S-3 | "keep the real cause ("unknown flag: --profile") in the refusal text instead of only the wrapper's last line" | request.md:1 | PASS | engine.mts:132-139; T-2.1 and T-2.2 tests |
| S-4 | "run `node scripts/test.mjs env` on this machine until the real-engine tests pass" | request.md:1 | PASS | in the last pass I re-ran model.engine.mjs (1/1) and lifecycle.engine.mjs (1/1, 77 s) |
| S-5 | "fixing whatever further faults the real engine shows in the env lifecycle" | request.md:1 | PASS | src/lib/verbs/env/start.mts:23; fake-engine.mjs:10 |
| S-6 | `picket env check --root test/fixtures/env/umbrella` no longer exits 2 | request.md:1 | PASS | in the last pass it exited 0 with "rules passed" |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/verbs/env/start.test.mts:27: edited in phases 1 and 3, although phase 1's touch set marks it "read only" and phase 3 does not list it. These are needed test edits, and the phase 1 block disclosed the first one. No change required.
Classes: none
Checked: design.md:35-40 T-1.5 drive now contains "ℹ pass 1" and "ℹ fail 0", which is the output I captured from `node --test test/env/model.engine.mjs`. The Revision log has one line, at line 277, under 30 words. The file's mtime is 17:07:50, which matches the AMENDED verdict at 15:07:54Z. `git diff HEAD -- src test` is empty, and HEAD is still 5991f6d7.

APPROVED
