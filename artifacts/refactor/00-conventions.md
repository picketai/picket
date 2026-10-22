# Conventions

Decisions that hold across every refactor item. Each item checks itself against this file; an item that changes an entry bumps its marker and adds a line to the revision log.

## Entries

### C-001: Source in `src/`, output in `dist/`
Everything hand-written lives in `src/`. `dist/` is generated whole by `npm run build`, ignored by git, and never edited. From item 01, L-1.

### C-002 (r2): Code is `.mts`, source imports name `.mts`
New and converted modules are `.mts` and pass `strict`. An import in `src/` names the source file: `import { readState } from "../shared/work/index.mts"`. The build rewrites it, so `dist/` holds only `.mjs` files with `.mjs` imports. From item 01, L-2 and L-4; revised by item 03, X-11.

### C-003: Convert bottom-up
A module converts to `.mts` only after the modules it imports, or together with them in the same change. From item 01, L-4.

### C-004 (r2): Shipped code runs on Node 22, tooling on Node 24
Code under `src/` that ships uses no API newer than Node 22 (`@types/node` at the 22 line enforces it; esbuild targets `node22`). Build, watch and test scripts may use Node 24 APIs. From item 01, L-5 (r2).

### C-005: Generated files carry a banner
Every built JavaScript file starts with `// generated from src/ by scripts/build.mjs; edit the source`. This is the only comment the build adds. From item 01, L-7.

### C-006: Verbs are actions
A verb is an `Action<I, O>` built with `action(...)`, async, taking `(input, context)` and returning `Outcome<O>` (`done`, `failed`, `refused`). Helpers are plain functions taking `root` first. From item 02, K-1 and K-2.

### C-007: Only entry points touch the process
The CLI, hook handlers and skill scripts build a `Context`; nothing else under `src/lib` reads `projectRoot()`, `process.cwd()`, `process.env`, `homedir()` or `new Date()`. From item 02, K-1.

### C-008: Refusals are values at the boundary
Helpers may throw `Refused`; `action()` turns it into `refused`. `UsageError` only while parsing arguments. Exit codes: done 0, failed 2, refused 2, usage or crash 1. An action never calls an action. From item 02, K-2 and K-3.

### C-009: Closed lists are types
Each closed word list has one owner exporting its values `as const` and its union type; typed literals are fine anywhere. From item 02, K-4.

### C-010: Paths, files and processes through their modules
Work item paths through `work-files.mts` with a branded `WorkId`; files through `io.mts`, where a bad JSONL line is skipped and counted; processes with argument arrays through `git.mts` and `process.mts`, `runShell` only for user commands. From item 02, K-5 to K-7.

### C-011: Erasable syntax, owner types, naming
`erasableSyntaxOnly`; no shared types file; generic helpers as `function` declarations; kebab-case module nouns, verb-first functions, PascalCase types, `UPPER_SNAKE` closed lists, no default exports. From item 02, K-8 and K-9.

### C-012 (r2): One-word verbs in a registry, named by what they do
Verbs are one lowercase word, group verbs take one one-word subverb. A verb that changes something is an action word (`open`, `close`, `route`); a verb that only prints may be named after what it shows (`state`, `next`, `cost`); a group is a noun followed by an action (`source add`). The shape is tested; the naming is checked in review. Every verb has a registry entry with `usage`, `readOnly`, `parse`, `run`, `render`; the `Verb` type and the guard's lists derive from it. From item 02, K-10 to K-12; naming from item 04b, S-10.

### C-013: No assumed locations
The plugin root is found by walking up to `.claude-plugin/plugin.json`; no code assumes how deep it sits. From item 02, K-13.

### C-014: Five folders under `src/lib`, imports flow one way
`cli/`, `hooks/`, `verbs.mts`, `verbs/<verb>/`, `shared/`, `util/`. `util/` imports only `node:` and `util/`; `shared/` only `shared/` and `util/`; a verb folder never imports another verb folder; hooks are entry points and may import a verb's `index.mts`; only `bin/` imports `cli/`. From item 03, X-2 and X-3.

### C-015: No barrel files
An import names the file that defines the symbol. `verbs/<verb>/index.mts` defines the verb, so it is not a barrel. A top-level barrel is added only if the CLI needs one for a cleaner import, and it never re-exports from `verbs/`. From item 04a, W-2; the user's rule.

### C-016: Hooks are listed like verbs
`src/lib/hooks.mts` lists every hook with its events and matcher and imports nothing; each hook is a folder `hooks/<kind>/<name>/` whose `index.mts` exports a `HookSpec`; the name `<kind>.<name>` is the path; the build generates the entries and `hooks.json`; outputs come from `output.mts`. From item 05, H-5, H-6, H-10.

### C-017: Tests sit beside their code
A test of one module is `<module>.test.mts` beside it and imports its `src/` file; tests of `dist/` and of the repository live in `test/`; shared helpers come from `#test/...`; temp folders are removed through `t.after`. From item 06, T-1 and T-4.

## Revision log

- 2026-10-22: C-004 (r2): floor raised from Node 20 to 22 for shipped code, 24 for tooling; item 01 L-5 (r2).
- 2026-10-22: C-012 (r2): naming rule for actions, queries and groups; the user chose it over strict grammatical verbs (item 04b, S-10).
- 2026-10-22: C-002 (r2): source imports name `.mts`, the build rewrites them to `.mjs`; item 03 X-11, user approved.
