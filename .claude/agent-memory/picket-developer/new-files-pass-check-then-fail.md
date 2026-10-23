---
name: new-files-pass-check-then-fail
description: tests that scan `git ls-files` (names-picket) skip untracked files, so a new file passes picket check and fails once committed
metadata:
  type: feedback
---

Some repo-wide tests (test/repo/names-picket.test.mjs) scan only tracked files. A new file is untracked during `picket check`, so it passes there and turns trunk red once the route commits it. This happened on 2026-10-23 with the yaml-lite corpus fixture (now `src/lib/util/yaml-lite-corpus.test.json`), which copied old work/ documents that still named the previous product.

**Why:** the run grant committed the phase before anyone saw the failure, so it took an extra commit to fix.

**How to apply:** stage new files (`git add`) before the last `picket check` of a phase, so tracked-file scans see them. Copied fixture data must also pass the old-name rule. The lead chose to rename inside the data rather than waive the test.
