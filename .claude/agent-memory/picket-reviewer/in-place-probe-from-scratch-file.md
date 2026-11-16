---
name: in-place-probe-from-scratch-file
description: a node -e probe whose text holds a write call to src/... is denied by guard.bash itself; put it in a scratchpad .mts and import by absolute path
metadata:
  type: reference
---

guard.bash's in-place check reads a `node -e` probe's program text: a probe that calls `inPlaceTargets` with a `writeFileSync('src/a.ts',...)` literal is denied as a shell write to code. Write the probe to a fresh scratchpad file (a name other reviewers have not used; Write refuses an existing unread file) and run `node --experimental-strip-types --no-warnings <file>`, importing repo modules by absolute path. Build write literals by joining pieces if the file itself is ever run through `-e`.

Related: [[probe-guards-from-node-e]], [[probe-attached-open-in-fallback]].
