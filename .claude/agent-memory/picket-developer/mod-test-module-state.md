---
name: mod-test-module-state
description: a mod mock-engine test that imports a hook module gets its own copy, so module-level state (paneView()) reads undefined; observe through engine calls instead
metadata:
  type: project
---

In `src/mods/*/hooks/*.test.tsx`, importing `./data` and calling `paneView()` after a mounted render returns `undefined`: the hooks the engine loads are a separate module instance from the test's import. A criterion that names module state is pinned through the engine instead, for example `$.ui.scroll({ component: 'Pane', requestId, by, pointer: { row, column } })` around the boundary row.

`FoundElement.children` holds plain descriptions with no `text` field; join string children recursively to read a row.

**Why:** cost a failed test round in phase 1 of 20261102-band-and-work-pane-match-canvas (2026-11-02).

**How to apply:** when a mod criterion names a hook's in-memory value, test the behaviour that value drives. See [[mod-validator-rules]].
