---
name: esbuild-bundle-inlines-mjs
description: with bundle true, an onResolve plugin filtered on .mts only lets esbuild inline relative .mjs imports; filter every relative path to keep modules separate
metadata:
  type: reference
---

Probe 2026-10-23 (esbuild 0.28.2): the item 03 draft's plugin (`filter: /^\.\.?\/.*\.mts$/`, external plus rename to `.mjs`) with `bundle: true, packages: "external"` kept `.mts` imports external but copied an imported relative `.mjs` module's code into the importer. Filtering on every relative path (`/^\.\.?\//`) kept both as imports.

**Why:** an inlined copy duplicates module state and error classes, so `instanceof` checks across the copy fail.

**How to apply:** any per-module esbuild build that mixes converted `.mts` and copied `.mjs` must mark every relative import external. Probe files must be written with Write, not a Bash heredoc (guard.bash denies shell writes of code). Related: [[mts-conversion-facts]].
