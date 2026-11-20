---
name: npm-install-drops-dev-tools
description: npm 11.20 "npm install --save-dev <pkg>" removed esbuild and typescript from node_modules; npm ci restores them
metadata:
  type: project
---

On this machine (npm 11.20, allowScripts warnings for esbuild), adding a devDependency with `npm install --save-dev --save-exact <pkg>` reported "removed 8 packages" and left node_modules without esbuild and typescript, so `npm run build` failed with ERR_MODULE_NOT_FOUND 'esbuild'. The lock file stayed correct.

**Why:** seen 2026-11-20 adding playwright-core; the cause looked tied to esbuild's unapproved install script.

**How to apply:** after any npm install that changes package.json, run `npm ci` before building or testing. Related: [[npm-pack-rebuilds-dist]], [[drive-needs-fresh-dist]].
