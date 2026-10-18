---
name: npm-pack-facts
description: npm package contents facts for @picketai/picket; a "!**/*.test.*" negation in package.json files excludes test files (probed on npm 10.4.0), CI publishes with npm 11.21.0 on Linux
metadata:
  type: reference
---

A `!` entry in `package.json` `files` is an exclusion across every included folder: a scratch package with `"files": ["core/", "status/hooks/", "!**/*.test.*"]` packed `a.mjs` and `b.ts` and left out `a.test.mjs` and `b.test.tsx` (npm 10.4.0, 2026-10-17). The release workflow uses npm 11.21.0 on ubuntu, untested for this, so its manual run's `npm publish --dry-run` list is the check.

**Why:** the mods keep their `*.test.ts(x)` beside the hooks, so `files` entries like `status/hooks/` ship them unless excluded.

**How to apply:** probe a packaging premise in a scratchpad package with `npm pack --dry-run --json` instead of trusting docs; the Windows working copy can differ from the index (CRLF, lost exec bit), and npm packs the working copy. Related: [[claude-cli-plugin-facts]].
