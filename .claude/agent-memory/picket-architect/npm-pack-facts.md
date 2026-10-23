---
name: npm-pack-facts
description: npm package contents facts for @picketai/picket; a "!**/*.test.*" negation in package.json files excludes test files (probed on npm 10.4.0), CI publishes with npm 11.21.0 on Linux
metadata:
  type: reference
---

A `!` entry in `package.json` `files` is an exclusion across every included folder: a scratch package with `"files": ["dist/", "status/hooks/", "!**/*.test.*"]` packed `a.mjs` and `b.ts` and left out `a.test.mjs` and `b.test.tsx` (npm 10.4.0, 2026-10-17). The release workflow uses npm 11.21.0 on ubuntu, untested for this, so its manual run's `npm publish --dry-run` list is the check.

**Why:** the mods keep their `*.test.ts(x)` beside the hooks, so a `files` entry naming a mod's hooks folder ships them unless excluded. From item 07a the mods are built into the dist folder with their tests, and the same exclusion keeps those tests out of the tarball.

**How to apply:** probe a packaging premise in a scratchpad package with `npm pack --dry-run --json` instead of trusting docs; the Windows working copy can differ from the index (CRLF, lost exec bit), and npm packs the working copy. Related: [[claude-cli-plugin-facts]].
