---
name: mod-validator-rules
description: claude plugin validate --strict rules that shape mod code under src/mods (atoms, $, function declarations, types contract, test mocks)
metadata:
  type: project
---

Found while splitting the mods in item 07a (2026-10-23, Claude Code 2.1.308). `validate --strict` and `claude plugin test` reject a mod module that breaks any of these:

- `read`/`update` take an atom declared in the same file. Keep atoms in one data module and export `readX`/`updateX` wrappers.
- `$` never goes into an object, spread or binding. Pass it as its own first argument.
- Across an import, `$` can only be passed into a `function` declaration. An exported const arrow that takes `$` fails, so `export async function` is needed.
- A mod's types file (`src/mods/status/types/index.d.ts` and its siblings) has no imports and must itself declare every `PluginState` key the hooks use.
- In tests, `$.process.run` called straight from a test body is not mocked. Unit-test helpers with a fake `$` object.
- `find({ text })` can match an outer Text whose text starts with the string. Assert on its children.
- Every engine call a hook makes needs an `on(...)` answer of `{ value }`, `command.register` and `ui.close` included.

**Why:** each rule cost a failed build-and-test round in phases 3 to 6.

**How to apply:** follow these rules from the first edit to any file under `src/mods/`. Run `node scripts/test.mjs build mods` before `picket check`. See [[npm-pack-rebuilds-dist]] for the other build trap.
