---
name: mods-step-fails-on-2-1-319
description: npm test's mods step fails 25 status-mod pane tests on Claude Code 2.1.319 here, at HEAD 2646b20 too; not caused by kernel phases
metadata:
  type: project
---

On 2026-11-08, with Claude Code 2.1.319, `claude plugin test dist/mods/status` fails 25 of 103 tests (work pane, Cleanup, band T-6.4/T-6.5; pane renders `[]`). A clean `git archive HEAD` build at 2646b20 fails the same 25, so `npm test` and `picket verify` fail on the mods step whatever a kernel phase changes. unit, build, product and timing steps pass.

**Why:** a phase that touches no `src/mods` input still sees `tests: failed` from verify.
**How to apply:** prove it with the base archive ([[base-red-via-archive]]) and report it on `Tests:` as already failing at HEAD instead of debugging the phase.
