---
name: mts-conversion-facts
description: converting a src/lib .mjs to .mts in place keeps .mjs importers working (esbuild bundles resolve ./x.mjs to x.mts); @ts-expect-error fixtures are denied by guard.silenced
metadata:
  type: project
---

Converting a `src/lib` module from `.mjs` to `.mts` in place needs no importer edits before item 03's rewrite plugin: the per-module build writes the `.mjs` into `dist/lib`, copied `.mjs` importers point at it, and esbuild 0.28.2 bundling resolves `../x.mjs` to `x.mts` when only the `.mts` exists (probed 2026-10-23). `import.meta.dirname` inside a bundle is the bundle's own folder.

A type-mistake fixture cannot use `@ts-expect-error`: `guard.silenced` denies suppression markers (COMMENT_SUPPRESSION_MARKERS in the comments module). Use a fixture outside `src/` with its own tsconfig and assert tsc error codes instead.

The `conventions.test.mjs` scans (process reads, `shell: true`, `work/${` templates, built-name imports) read `.mts` files only (`typedSources`), so a module still `.mjs` may read `process.env` or spawn with a shell; converting it makes the scans bite. A converted verb that must start a shell process (drive's server) needs a helper in `src/lib/util/process.mts`, the one `SHELL_EXEMPT` path. `handlers.test.mjs` once regex-read `assertNotDestructive(o.x, "picket v --flag")` from verb sources, so renaming such a call breaks a test far away (item 04c).

By 2026-10-23 (item 07b design), `isBuiltModule` in `scripts/build.mjs` builds non-vendored `.mjs` under the src folder too, so a `.mjs` may import `.mts` names (`src/lib/verbs/init/init.mjs` imports `src/lib/mods.mts`), and Node 24 runs that from the src folder. A `.mts` may import a `.mjs` only when no `.mts` twin exists (the built-name scan). Non-code files are copied into dist and npm pack; a JSON test fixture under the src folder must be named `*.test.json`. `projectRoot(` is on the process-read scan list (it reads `CLAUDE_PROJECT_DIR`), so a converted module that finds a root from its input (the status line's cost file) needs a resolver in the exempt `src/lib/shared/paths.mts` (item 04d, 2026-10-23).

**Why:** found while designing item 02 (work/20261022-refactor-item-02-code-conventions).
**How to apply:** when a design converts a kernel module, plan the scan updates and skip directive-based type tests. See [[verify-grep-patterns]].
