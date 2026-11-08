---
name: one-hooks-module-per-plugin
description: Claude Code 2.1.319 validate --strict refuses a hooks.json "modules" list with two entries, and one module may not register an unmatched event (session.start) twice
metadata:
  type: project
---

Found 2026-11-08 in phase 4 of 20261107-plugin-only-install (Claude Code 2.1.319). `claude plugin validate --strict dist` with one module entry per mod fails: "hooks.json `modules` names one hooks module per plugin; a second entry is refused". A single composing module that calls both mods' old register functions on the same `on` also fails: "on(\"session.start\") is registered twice without a matcher". A matched and an unmatched `tool.call` side by side pass.

The fix that landed: `src/mods/index.tsx` alone exports `register` and calls `on` once per event and matcher; each mod's own index file exports named handler functions. In mod tests, every world must then answer the engine calls of both mods (status needs `store.get`, Markdown needs `session.messages` and `session.root`), and mounts name plugin `picket`. The validator does not type-check mod code.

To record `clock.every` intervals in a test, wrap the `on` passed to `mock.clock`; a second `on('clock.every')` in the test fails to load ("registered twice").

**Why:** design D-002 (r4) assumed two module entries; the phase stalled on it.
**How to apply:** probe a layout in a scratch copy of the built plugin (copy with `tar`, `cp` out of the build folder is denied) before building it. See [[mod-validator-rules]].
