---
name: node-test-prints-spec-not-tap
description: node --test here prints spec lines (ℹ pass 1) even when piped, so a drive contains "# pass 1" never matches; real-engine env tests run in about 80s
metadata:
  type: reference
---

On this machine `node --test <file> | tail` prints the spec reporter (`ℹ pass 1`, `ℹ fail 0`), not TAP (`# pass 1`). A plan `drive:` check with `contains: "# pass 1"` fails literally even when the test passes; grade it as plan wording (amendment), not a code defect.

The real-engine env tests are cheap enough to run in a review: `node --test test/env/model.engine.mjs` takes under a second, `node --test test/env/lifecycle.engine.mjs` about 77 s on Podman 5.7.0, and leaves no picket-trial container, volume, network or image (check with the T-3.3 `podman ... ls -q --filter` listing). Related: [[picket-verify-runs-npm-test]].
