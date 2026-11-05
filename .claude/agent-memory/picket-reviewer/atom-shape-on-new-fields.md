---
name: atom-shape-on-new-fields
description: Mod engine atoms keep what older code wrote across a plugin reload; a new field on an atom with no shape tag reads undefined
metadata:
  type: reference
---

The mod engine types (dist/mods/session/.claude-plugin/types/claude-code/index.d.ts, around line 709 and the `AtomOptions` doc) say an atom's initial applies only while nothing is written, and "the engine keeps whole what the old code wrote"; only a changed `shape` tag makes the new code read it as absent. `update` and `read` do not merge the initial in.

**How to apply:** when a diff adds a field to an atom's object value (for example `PaneView.folded` in picket-status, 2026-11-02), check whether the atom gives `{ shape }` or the reader defaults the field; else an old stored value makes `.includes` or similar throw after a reload. Grep `shape:` under src/mods to see whether any mod uses tags yet.
