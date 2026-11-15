---
name: drive-needs-fresh-dist
description: picket on PATH runs dist/bin, so drive a changed verb only after npm run build, or it runs the old code
metadata:
  type: project
---

`picket` on PATH is `dist/bin` (see CLAUDE.md), and `node --test` on `src/**/*.test.mts` does not rebuild it. A drive run right after editing `src/` runs the previous build and looks like the change failed: on 2026-11-13 a `picket route` drive showed no path correction until `npm run build` ran.

**Why:** a stale dist cost a reset attempt, which guard.bash denied, plus a second scratch repo.

**How to apply:** run `npm run build` right before every `picket ...` or `dist/hooks/*.mjs` drive. Make a fresh scratch dir per drive rather than resetting one, since guard.bash denies `git reset` even in scratch. See [[scratch-drive-root]].
