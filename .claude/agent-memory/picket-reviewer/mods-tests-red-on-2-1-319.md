---
name: mods-tests-red-on-2-1-319
description: The 25 status pane tests that failed under `claude plugin test dist` on Linux were fixed at 43ee39c; how to rerun the mods tests and the product markdown-paths check in a review
metadata:
  type: project
---

Until 43ee39c (2026-11-08) `claude plugin test dist` gave 105 pass, 25 fail on this Linux host, all in status pane tests: the engine resolves the Windows fixture paths (`D:/repo`) against the plugin root. Since 43ee39c it gives 130 pass, 0 fail. If it goes red again, suspect a fixture path that is relative on POSIX before blaming the Claude Code version.

Both `claude plugin test dist` and `claude plugin validate --strict dist` run read-only against an existing dist (about 4 s), so a review can rerun them. Check dist is current first: diff the src test file against its copy under dist/hooks/mods; the only expected difference is the shared theme import depth. `validate --strict dist` prints an advisory about a missing marketplace install line but still passes.

The product step's markdown-paths test (test/repo) scans agent memory files too: a backticked repository path cited in an unstaged memory edit fails `npm test`. Run that one file with `node --test` rather than the full suite.

**Why:** a phase block can report `npm test` red for a cause outside the work item (a memory edit), which is fixed later without a commit in range.
**How to apply:** re-run the one failing step yourself before grading an "npm test exits 0" criterion FAIL.
