---
name: init-test-tmpdir
description: test/cli/init.test.mjs:104 (refuses the home folder) fails when TMPDIR lies under HOME, as this machine's session TMPDIR does; npm test and picket verify go red on the base unless TMPDIR=/tmp
metadata:
  type: reference
---

On this machine the Claude Code session sets `TMPDIR=/home/vlad/Work/development/containers/podman/tmp`, which is under `HOME`. `test/cli/init.test.mjs` test "init writes at the git top level from a subfolder, in the cwd outside git, and refuses the home folder" then fails at line 104 (expected exit 2, got 0), on base 08da3132 too. With `TMPDIR=/tmp` the file passes 18 of 18 (checked 2026-11-18). `picket verify` runs `npm test` with the session env, so its tests check fails for every item here.

**How to apply:** write "npm test passes" criteria as run with `TMPDIR=/tmp`, and tell the reviewer the base fails without it. Related: [[machine-node-and-test-runs]], [[zone-and-root-facts]].
