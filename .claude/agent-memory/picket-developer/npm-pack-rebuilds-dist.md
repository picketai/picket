---
name: npm-pack-rebuilds-dist
description: local npm 10.4 runs prepack (npm run build) on `npm pack --ignore-scripts`, deleting dist/ under parallel tests
metadata:
  type: project
---

On this machine npm is 10.4.0, and `npm pack --dry-run --ignore-scripts` still runs `prepack`, which deletes and rewrites dist/. CI uses npm 11.21.0, which honours the flag. Found 2026-10-23 when item 06 made the product tests parallel: 5 to 9 random "Cannot find module dist/..." failures per run.

**Why:** the lead ruled contributors may have npm 10, so the suite must not rely on --ignore-scripts.
**How to apply:** a random "Cannot find module dist/..." in parallel runs means something rebuilt dist/; find it by running test groups and comparing `stat -c %Y dist/bin/picket.mjs`. test/repo/package.test.mjs now packs a script-free temp copy.
