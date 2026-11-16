---
name: init-test-tmpdir-under-home
description: test/cli/init.test.mjs home-folder case fails when TMPDIR sits under the user's home folder; run checks with TMPDIR set to a scratch folder outside home
metadata:
  type: project
---

As of 2026-11-14, on a machine whose session TMPDIR is a path under the real home folder, `init writes at the git top level ... and refuses the home folder` fails (`0 !== 2`) in the product step. With TMPDIR pointed at a scratch folder outside home it passes.

**Why:** host path layout, not the code under change.

**How to apply:** run `picket check` and `picket verify` with `TMPDIR=<scratchpad>/t`; recheck whether the session TMPDIR still sits under home. For the env step see [[podman-pasta-signal-denied]].
