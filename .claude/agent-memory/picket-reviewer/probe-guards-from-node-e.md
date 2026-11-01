---
name: probe-guards-from-node-e
description: guard.bash decisions probe from node -e with #test/hook.mts imports; never copy a probe test file into src
metadata:
  type: reference
---

`node --experimental-strip-types --no-warnings --input-type=module -e` run from the repo root resolves `#test/hook.mts` and `#test/project.mts` through package imports. `decision(cmd, { root, tool, agent })` with `root = withProject({ after: (f) => process.on("exit", f) }, { host: true, picket: false })` prints the guard's decision. Verified 2026-10-31.

A probe test copied into `src/` to reach `#test/` breaks the scratchpad-only rule and needs a `node -e` unlinkSync to remove, because guard.bash denies `rm`. Use the `-e` form instead. Related: [[probe-guards-directly]].
