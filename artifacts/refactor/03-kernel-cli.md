# 03: Kernel CLI and source layout

Status: approved (2026-10-22).

The CLI becomes a thin dispatcher over one folder per verb, and `src/lib` gets a fixed shape: `cli/`, `hooks/`, `verbs.mts`, `verbs/`, `shared/`, `util/`, with imports flowing one way. Each verb loads only its own code, which cut `picket next` from 92 to 73 ms in the prototype. This item moves files and rewires the CLI; the insides of the large modules (`work`, `sources`, `statusline`, `drive`) are item 04.

## Today

`core/bin/picket.mjs` is 424 lines: 28 imports, a hand-kept `VERBS` array (`:83`), and one `switch` of 324 lines in which each `case` reads its flags, sometimes holds kernel logic, formats its human text and picks its exit code.

```js
case "drive": {
  const env = envFromFlags(opt.env);
  const r = await drive({
    root, env,
    run: opt.run === true ? undefined : opt.run,
    start: opt.start === true ? undefined : opt.start,
    hits: opt.hit === undefined ? [] : [].concat(opt.hit),
    timeoutMs: opt.timeout ? Number(opt.timeout) * 1000 : undefined,
    keepChanges: opt["keep-changes"] === true, id: opt.work, phase: opt.phase,
  });
  out(r, opt, renderDrive);
  return r.ok ? 0 : 2;
}
```

The problems:

- **Hand-written flag coercion.** `opt.x === true ? undefined : opt.x` appears 4 times, and comma lists are parsed 3 ways.
- **A silent flag bug.** `picket cost --session` passes `true` as the session, so no rows match and the totals read zero.
- **Logic in the CLI.** The source-snapshot warning of `new` (`:153-157`), the field checks and the dirty-tree check of `set` (`:175-189`), and the row building of `list` (`:162-166`) all live in the dispatcher.
- **Per-verb error handling.** `close` catches every error; `init`, `new` and `source add` catch their own classes.
- **Inline renderers.** About ten human renderers are written inline.
- **Eager loading.** Every call loads all 28 modules.
- **Four places to add a verb.** A new verb touches the import, the `VERBS` array, the `case`, and the guard's own verb lists (`guard.bash.mjs:420-421`).

`core/lib` is flat: 45 modules plus `hooks/`, `styling/` and `vendor/`. Verb modules import each other:

| Importer | Imports | What |
|---|---|---|
| `check`, `drive`, `mutate`, `verify` | `preflight` | `detectTooling`, a re-export of `tooling.mjs` |
| `close`, `route`, hook `route.verdict` | `packet` | `blockFiles`, `readBlock`, `parseBlock`, `saveBlock` |
| `close` | `leave` | `readLeft` |
| `extensions` | `route` | `VERDICTS` |
| `mutate` | `check` | `check` |
| `pr` | `review` | `reviewSummaryRange` |
| `review` | `mutate` | `readMutation` |
| `route` | `close` | `recordAccept` |
| hooks `guard.bash`, `observe.drive` | `cost` | `readLedger` |
| `styling/statusline-setting` | `init` | `STATUS_LINE` |
| hook `guard.bash` | `cli-args` | `parseArgs` |

## Target

### Source layout

```
src/bin/picket.mts              Node 22 check, then imports cli/main
src/lib/
  cli/
    main.mts                    dispatch, exit table, printing, help
    registry.mts                lazy loader per verb, checked against verbs.mts
  hooks/                        hook handlers and hook-only helpers (item 05)
  verbs.mts                     every verb: readOnly, subverbs; no imports
  verbs/
    admit/ check/ close/ comment/ cost/ drive/ extension/ init/ leave/ list/
    migrate/ mutate/ new/ next/ packet/ pr/ preflight/ route/ set/ source/ state/
    statusline/ style/ summary/ uninstall/ verify/ waive/
  shared/                       Picket code used by two or more verbs, or by a hook
    action.mts context.mts paths.mts config.mts extensions.mts
    work/ sources/ styling/ transcript/
    git.mts repos.mts block.mts gate.mts verdicts.mts next-step.mts ledger.mts
    checks.mts mutation.mts review-summary.mts tooling.mts agent-name.mts
    destructive.mts comments.mts silenced.mts escalation.mts saved-rules.mts
  util/                         no Picket knowledge
    args.mts io.mts process.mts git.mts yaml-lite.mts vendor/
```

Where each piece of today's code lands:

| Today | Target |
|---|---|
| one verb's module (`admit`, `drive`, `leave`, `pr`, `verify`, ...) | `verbs/<verb>/index.mts`, with private parts beside it |
| `work.mjs` | `shared/work/`; verbs `state`, `list`, `set`, `new`, `comment`, `waive` each get a folder |
| `sources.mjs`, `source-paths.mjs` | `shared/sources/`; `verbs/source/` with `find.mts`, `grep.mts`, `pick.mts`, `add.mts` |
| `styling/**` | `shared/styling/` (used by `style`, `uninstall` and `statusline`) |
| `transcript.mjs`, `turn-block.mjs` | `shared/transcript/` |
| block parsing in `packet.mjs` | `shared/block.mts` |
| `VERDICTS`, `findVerdict` in `route.mjs` | `shared/verdicts.mts` |
| `next()` used by `close`, `packet`, `route`, `inject.state` | `shared/next-step.mts` (K-3); `verbs/next/` wraps it |
| `check()` used by `mutate` | `shared/checks.mts`; `verbs/check/` wraps it |
| `readMutation`, `reviewSummaryRange`, `recordAccept`, `readLedger` | `shared/mutation.mts`, `shared/review-summary.mts`, `shared/ledger.mts` |
| `STATUS_LINE` in `init.mjs` | `shared/styling/statusline-setting.mts`; `init` imports it from there |
| `unsafe.mjs` | `shared/destructive.mts` |
| `cli-args.mjs` | `util/args.mts` |
| `yaml-lite.mjs`, `vendor/` | `util/` |
| `gitRead`, `gitRun` (item 02) | `util/git.mts`; Picket git rules (`commitOwned`, bookkeeping paths) in `shared/git.mts` |
| `hook.mjs`, `edit-texts`, `kernel-call`, `powershell-text`, `drive-evidence` | `hooks/` (item 05 decides their shape) |

### Import direction

```
bin -> cli -> verbs -> shared -> util
       hooks ---^
```

- `util/` imports only `node:` modules and `util/`.
- `shared/` imports only `shared/` and `util/`.
- A verb folder imports its own files, `shared/` and `util/`, never another verb folder.
- Hooks import `verbs/<verb>/index.mts` (they are entry points, K-3), `shared/` and `util/`.
- Nothing imports `cli/` except `bin/`.

### A verb folder

`index.mts` holds the verb's spec and its action. A verb that grows splits private parts into files beside it. Hooks import the action from `index.mts`.

```ts
// src/lib/verbs/leave/index.mts
import { action, done, refuse } from "../../shared/action.mts";
import { readState, workFile, type WorkId, workId } from "../../shared/work/index.mts";
import { appendJsonl } from "../../util/io.mts";
import { need, str, UsageError, type Args } from "../../util/args.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type LeaveInput = { id: WorkId; command: string; why: string | null };
export type LeftEntry = { ts: string; command: string; why: string | null };

const MAX_COMMAND_CHARS = 300;

export const leave = action<LeaveInput, LeftEntry>(async ({ id, command, why }, { root, now }) => {
  if (command.length > MAX_COMMAND_CHARS) return refuse(`the command is longer than ${MAX_COMMAND_CHARS} characters`, { id });
  const { status } = readState(root, id);
  if (status === "done" || status === "abandoned") return refuse(`${id} is ${status}; only an open or blocked item records what is left`, { id, status });
  const entry = { ts: now().toISOString(), command, why };
  appendJsonl(workFile(root, id, "left.jsonl"), entry);
  return done(entry);
});

export const renderLeave = ({ command, why }: LeftEntry): string => `left for you: ${command}${why ? ` (${why})` : ""}`;

export const verb: VerbSpec<LeaveInput, LeftEntry> = {
  usage: 'leave <id> --command "<command>" [--why "<why>"]',
  output: "json",
  parse: (args: Args) => {
    const command = need(args, "command").trim();
    if (!args.pos[0] || !command) throw new UsageError('leave needs <id> --command "<command>"');
    return { id: workId(args.pos[0]), command, why: str(args, "why")?.trim() || null };
  },
  run: leave,
  render: renderLeave,
};
```

`readLeft`, which `close` needs, moves to `shared/work/` with the other work item readers.

### Names and loaders

```ts
// src/lib/verbs.mts
export const VERB_NAMES = {
  admit: { readOnly: true },
  check: { readOnly: false },
  extension: { subverbs: { new: { readOnly: false }, list: { readOnly: true } } },
  leave: { readOnly: false },
  next: { readOnly: true },
  source: { subverbs: { find: { readOnly: true }, grep: { readOnly: true }, pick: { readOnly: false }, add: { readOnly: false } } },
  statusline: { readOnly: false },
  style: { readOnly: false },
  summary: { readOnly: true },
  ...
} as const;
export type Verb = keyof typeof VERB_NAMES;
```

```ts
// src/lib/cli/registry.mts
export const REGISTRY = {
  admit: () => import("../verbs/admit/index.mts"),
  leave: () => import("../verbs/leave/index.mts"),
  ...
} satisfies Record<Verb, () => Promise<{ verb: VerbSpec<any, any> }>>;
```

`verbs.mts` imports nothing, so the guard (item 05) can read `readOnly` without esbuild pulling every verb into its bundle. A name without a loader fails `tsc`.

### Arguments

```ts
// src/lib/util/args.mts
export class UsageError extends Error {}
export function parseArgs(argv: string[], stdin: () => string): Args
export function str(args: Args, name: string): string | undefined      // "--session" with no value: UsageError
export function need(args: Args, name: string): string                 // missing: UsageError naming the flag
export function list(args: Args, name: string): string[]               // "--touched a,b"
export function many(args: Args, name: string): string[]               // "--hit /a --hit /b"
export function int(args: Args, name: string): number | undefined
export function seconds(args: Args, name: string): number | undefined  // "--timeout 30" -> 30000
export function flag(args: Args, name: string): boolean
export function pairs(args: Args, name: string): Record<string, string> // "--env A=1 --env B=2"
```

`UsageError` moves here from `shared/action.mts`: argument errors are generic, and `util/` must not import `shared/`. `Args.stdin()` reads standard input only when called, for `statusline` and `admit --request -`.

### main and bin

```ts
// src/lib/cli/main.mts
const EXIT = { done: 0, failed: 2, refused: 2 } as const;

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv, () => readFileSync(0, "utf8"));
  if (flag(args, "version")) return printVersion();
  try {
    const target = resolveVerb(args);                  // unknown verb or subverb: UsageError with the choices
    if (target.kind === "help") return printHelp(target);
    const { verb } = await REGISTRY[target.name]();
    const outcome = await verb.run(verb.parse(target.args), edgeContext(rootFrom(args)));
    print(outcome, verb, displayFrom(args));
    return EXIT[outcome.status];
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(`picket: ${err.message}`);
    return 1;
  }
}
```

```ts
// src/bin/picket.mts
const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(`Picket needs Node 22 or newer; this is ${process.versions.node}`);
  process.exit(1);
}
const { main } = await import("../lib/cli/main.mts");
process.exitCode = await main(process.argv.slice(2));
```

Global flags, handled only in `main`:

| Flag | Effect |
|---|---|
| `--root <dir>` | the project root for the `Context` |
| `--human` | `render(value)` instead of JSON |
| `--pretty` | indented JSON |
| `--json` | JSON for a verb whose `output` is `"text"` (`packet`, `statusline`, `style`, `uninstall`) |
| `--version`, `--help`, `help <verb>` | version, and usage generated from the specs |

### Logic that leaves the CLI

| In `picket.mjs` today | Moves to |
|---|---|
| `new`: the warning for a story with no reachable source | the `new` action, as `warnings` |
| `set`: settable fields, value types, dropping `blocked_reason`, the dirty-tree check | the `set` action; `parse` only splits `key=value` |
| `list`: rows from `deriveState` and `next` | the `list` action |
| `statusline`: recording session cost | the `statusline` action |
| `source`: lookup by name and reachability | the `source` subverb actions |
| `close`, `init`, `new`, `source add`: error handling | `refuse(...)` in each action |
| inline human renderers | `render` in each verb folder (K-12) |

### Renames (K-10)

| Today | Becomes | Mentioned in |
|---|---|---|
| `review-summary` | `summary` | `core/skills/ordering/steps/40-review.md`, the guard's verb list, `test/hooks/handlers.test.mjs`, `test/kernel/{cli,names,sources}.test.mjs` |
| `find-verdict` | removed | the guard's verb list, `test/kernel/names.test.mjs` |
| `extension new <name>`, `extensions` | `extension new <name>`, `extension list` | `docs/how-to.md:263`, the guard's verb list, the tests that call the verb (`test/kernel/names.test.mjs`, `test/hooks/handlers.test.mjs`) |
| `setup-terminal` | `style` | `README.md`, `docs/how-to.md`, `docs/setup-terminal-checklist.md` (renamed `docs/style-checklist.md`), `docs/design/picketai-design-system/project/README.md`, messages in `shared/styling/terminals/{gnome-terminal,windows-terminal}.mts`, the guard's verb list, `test/kernel/cli.test.mjs` |

The concept name "review summary" stays in the reviewing skill and the agents; only the command changes.

## Evidence (prototype, 2026-10-22)

Start time on Node 22.18, 40 interleaved runs, same folder (bare `node` 44 ms median):

| Command | Today, all modules | Only its modules | Only its modules, bundled |
|---|---|---|---|
| `picket next --latest` | 92 ms | 73 ms | 63 ms |
| `picket statusline` | 82 ms | 65 ms | 57 ms |

Loading only the verb's own modules saves 17 to 19 ms per call. Bundling saves 8 to 10 ms more. On Windows, the `picket.cmd` shim adds 21 ms of its own (105 against 84 ms for `statusline`), and every command written as `picket ...` pays it.

`.mts` import paths (decision X-11) were checked end to end:

| Step | Result |
|---|---|
| `tsc` with `allowImportingTsExtensions`, `import { two } from "../../util/math.mts"` | passes |
| esbuild per module with a 6-line plugin that marks each relative `.mts` import external and renames it `.mjs` | `import { two } from "../../util/math.mjs"`, static and dynamic imports alike |
| the built `dist` on Node 22.18 | runs, prints `42 2` |
| `src/main.mts` run directly on Node 24.22 | runs, prints `42 2` |

The plugin:

```js
const runtimeExtension = {
  name: "runtime-extension",
  setup(build) {
    build.onResolve({ filter: /^\.\.?\/.*\.mts$/ }, (args) =>
      args.kind === "entry-point" ? undefined : { path: args.path.replace(/\.mts$/, ".mjs"), external: true });
  },
};
```

The per-module build runs esbuild with `bundle: true`, `packages: "external"` and this plugin, so every relative import stays a separate file. Hook bundles run without the plugin and inline their imports as before.

## Decisions

### X-1: The CLI only parses, runs and prints
All logic in today's cases moves into actions. `main` holds the exit table, the global flags and the one `catch` for `UsageError`.

### X-2: `src/lib` has five folders and one file
`cli/`, `hooks/`, `verbs.mts`, `verbs/`, `shared/`, `util/`, with the import direction above. A source scan test checks the direction on `.mts` files. Why: the user asked for few folders under `lib`; `shared` names the membership rule (used by two or more verbs, or a hook), and `util` is code that knows nothing about Picket. Rejected names for `shared`: `core` (glossary clash, old plugin folder), `kernel` (already the whole CLI layer), `domain` (implies no I/O), `common` (reads as miscellaneous).

### X-3: One folder per verb, `index.mts` holds the spec and the action
Private parts sit beside `index.mts`; hooks import the action from `index.mts`. This answers question 1 from the discussion: `parse` lives in the verb folder, next to the action, because the folder is the verb's whole slice. Kernel code outside `verbs/` still never sees argument shapes.

### X-4: `verbs.mts` for names, `cli/registry.mts` for lazy loaders
Names, `readOnly` and subverbs sit in an import-free file the guard can use; loaders are checked against it with `satisfies Record<Verb, ...>`. Each call loads only its verb (17 to 19 ms saved). Bundling the CLI with code splitting would save 8 to 10 ms more; not taken, item 01 L-3 stands, revisit if CLI latency becomes a complaint.

### X-5: Typed argument getters in `util/args.mts`
They reject wrong shapes with a `UsageError` naming the flag, which fixes `cost --session`. `UsageError` moves here from item 02's `action.mts`.

### X-6: `output` per verb
`"text"` for `packet`, `statusline`, `style` and `uninstall`, `"json"` for the rest; `--json`, `--human`, `--pretty` are handled once in `main`.

### X-7: Help and usage come from the specs
`picket help` loads every spec and prints its `usage`; `picket help <verb>` prints one.

### X-8: Renames
`review-summary` becomes `summary`, `setup-terminal` becomes `style`, `find-verdict` is removed, and `extensions` becomes the subverb `extension list` next to `extension new`, with every mention in the table above. Two verbs that differ only by an `s` were easy to confuse; the user chose the group verb. The guard's two verb lists are updated by hand here; item 05 replaces them with `verbs.mts`.

### X-9: `src/bin/picket.mts` holds the Node check and one dynamic import
It closes item 01, R-8: the check runs before any file that could need Node 22.

### X-10: `statusline` stays a verb
This answers question 2. A separate bundled entry would save 8 ms per refresh, but Claude Code's `statusLine` setting runs `picket statusline` through PATH. Pointing it at `dist/bin/statusline.mjs` needs an absolute path into the global npm folder, which breaks when the user switches Node versions; a second bin name still pays the shim cost. Lazy loading already gives `statusline` 17 ms.

### X-11: Source imports name `.mts`, built imports name `.mjs`
Every relative import in `src/` names the source file (`"../../util/io.mts"`), with `allowImportingTsExtensions` in `tsconfig.json`. The build rewrites each one, so `dist/` holds only `.mjs` files and every import there names `.mjs` (`"../../util/io.mjs"`); hook bundles have no relative imports left at all. Why: the import names a file that exists where it is written, as the user expected, and `src/` runs directly under Node 24 type stripping, so tests and contributor scripts can run without a build. Approved by the user on 2026-10-22; it amends three approved entries:
- C-002 changes from "imports name the output" to "imports name the source".
- K-8's claim that `src/` runs under Node's type stripping becomes true (it was false with `.mjs` imports).
- L-2 changes the per-module build to `bundle: true`, `packages: "external"` plus the plugin.

## Migration

Phases 1 and 3 are small; phase 2 is the bulk and may split into read-only verbs, then writing verbs.

### Phase 1: the skeleton and the first verb
- `src/bin/picket.mts`, `src/lib/cli/main.mts`, `cli/registry.mts`, `src/lib/verbs.mts`, `util/args.mts`.
- The build plugin and the `tsconfig.json` change (X-11).
- Convert `leave` as the first verb: folder, spec, action, render, tests. Every other verb still runs through a fallback in `main` that calls today's `picket.mjs` code.
- **Stop:** show `leave` to the user and take feedback before any other verb is converted (the user's rule, 2026-10-22).

### Phase 2: the remaining verbs
- One folder per verb, in bottom-up order (C-003). Cross-verb pieces move to `shared/` as the table above says.
- Remove the fallback and `core/bin/picket.mjs` once the last verb is converted.
- `cli.test.mjs` and the verb tests follow their verbs. Refusal assertions change as item 02 listed (9 assertions).

### Phase 3: renames and checks
- The renames in X-8, with docs, skills, tests and the guard's two lists.
- The source scans: import direction (X-2), one-word verbs (K-10), a loader for every name.
- Measure `picket next --latest` and `picket statusline` against the numbers above.

## Risks

- R-1: phase 2 touches every verb at once. The fallback in `main` lets each verb move alone, with the full test suite green after each one.
- R-2: moving files breaks imports in skill scripts (`documenting/scripts`, `reviewing/scripts/lint.craft.mjs` import `lib/comments`, `lib/silenced`, `lib/paths`). They move to `src/skills/*/scripts/*.mts` and import from `shared/`.
- R-3: `picket help` loads every verb to print usage; slower than today's static list. Acceptable for a help screen.
- R-4: an import that the plugin misses would leave a `.mts` path in `dist/` and fail at runtime. A test after the build scans `dist/` for `.mts"` and fails on any hit.

## Affects

- 01 and 02: X-11 amends C-002, K-8 and L-2. `UsageError` moves from `shared/action.mts` to `util/args.mts` (K-2 unchanged in meaning).
- 04 kernel modules: works inside `shared/work/`, `shared/sources/`, `verbs/drive/`, `verbs/statusline/` after this item moves them.
- 05 hooks: `hooks/` gets its hook-only helpers; the guard reads `verbs.mts`; `route.verdict` and `inject.state` call `verbs/route/index.mts` and `shared/next-step.mts`.
- 06 tests: tests may import `src/` directly (X-11).
- 08 docs: the rename table.

## Open questions

- Q-1: resolved 2026-10-22, the user approved X-11.
- Q-2: resolved 2026-10-22, the user chose `extension new` and `extension list` (X-8).

## Revision log

- 2026-10-22: the tree's `shared/block.mts`, `shared/gate.mts` and `shared/next-step.mts` move under `shared/work/`; the leave example imports from `shared/work/state.mts` and `shared/work/files.mts`, since there are no barrels (item 04a, W-2, C-015).
- 2026-10-22: X-8 gains two renames: `new` becomes `open` and `extension new` becomes `extension add`; the tree has `verbs/open/` instead of `verbs/new/` (item 04b, S-10).
- 2026-10-22: the tree gains `shared/drive-log.mts` (item 04c, E-8).
- 2026-10-22: X-8 gains the rename `pr` to the group verb `pullrequest prepare` and `pullrequest post`; the tree has `verbs/pullrequest/` (item 04d, P-3).
- 2026-10-22: `verbs.mts` gains `leadOnly` (comment, waive), read by the guard (item 05, H-4).
- 2026-10-22: `style` becomes a group verb (`style apply`, `style remove`) replacing `setup-terminal`, its `--revert` and the old `uninstall`; a new `uninstall` removes Picket from the project (item 07b, Y-6, Y-8).
