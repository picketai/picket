---
name: tsc-lib-before-es2023
description: tsconfig lib predates ES2023, so findLast/findLastIndex fail typecheck though node runs them
metadata:
  type: project
---

`npm run typecheck` (tsc -p .) rejects `Array.prototype.findLast` and `findLastIndex` (TS2550), while `node --test` on the .mts file passes, so the failure shows only in `picket check`.

**Why:** the project's tsconfig `lib` stops before es2023; raising it is a config change outside most phases.
**How to apply:** use a reverse loop or `map(...).lastIndexOf(...)` (as `next-step.mts` `lastIndexWhere` does) instead of findLast.
