---
name: temp-short-names
description: On this machine os.tmpdir() is an 8.3 short path while git rev-parse --show-toplevel prints the long path; compare via realpathSync.native
metadata:
  type: project
---

`os.tmpdir()` here returns a user folder in 8.3 short form (a `~1` segment), but `git rev-parse --show-toplevel` in a folder under it returns the long form, so `path.relative` between them gives `..`.

**Why:** test fixtures (`withProject`, `gitRepo`) live under tmpdir, so code comparing the project root with a git-reported path fails only on machines with short-name temp folders.

**How to apply:** resolve both sides with `realpathSync.native` before `relative`, as `workingCheckout` in `src/lib/shared/checkouts.mts` does. A Grep of a file does not count as a read for guard.scope; Read it before an Edit. See [[node22-local-runs-on-windows]].
