---
name: bench-tasks-pin-admit
description: bench/test/tasks.test.mjs checks admit's lane for every bench task prompt via dist; admission changes break it outside the touch set
metadata:
  type: project
---

`bench/test/tasks.test.mjs` imports `admit` from `dist/` and asserts each `bench/tasks/*.json` prompt gets its labelled lane. Orders that change admission name only `src/lib/shared/admission/*` tests, but `npm test` also runs this one. It reads the built dist, so it fails only after a build.

**Why:** in the admit-needs-a-touch-set order (2026-11-08), the new `pending` answer turned 8 fast bench tasks red. They were fixed by counting pending as fast.

**How to apply:** when a phase changes lane answers, plan to edit this test as well and list it under Decisions. Related: [[npm-pack-rebuilds-dist]].
