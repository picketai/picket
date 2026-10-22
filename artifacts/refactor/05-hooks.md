# 05: Hooks

Status: approved (2026-10-22).

Hooks get the structure verbs got in item 03: an import-free list (`src/lib/hooks.mts`) that names every hook with its events and matcher, one folder per hook under `hooks/<kind>/<name>/`, and one runner. The build generates `hooks.json` and every entry bundle from the list. `guard.bash.mjs` (1497 lines) splits into a `guard/bash/` folder around one rule table and one evaluation loop for both shells, which fixes B1.

## Today

### The hooks around the guard

14 handlers, 2288 lines in `core/lib/hooks/`, plus 14 entry shells in `core/hooks/` and a hand-written `core/hooks/hooks.json`.

| Inconsistency | Where |
|---|---|
| The output JSON is built by hand in 11 places | `guard.scope.mjs:17,21`, `guard.comments.mjs:30`, `guard.silenced.mjs:35`, `inject.extensions.mjs:49`, `inject.rules.mjs:18`, `inject.state.mjs:50`, `lint.schema.mjs:130`, `monitor.context.mjs:17`, `route.verdict.mjs:85`, `guard.block.mjs:63`, `guard.bash.mjs:155` |
| Signatures differ | `guardBlock(event)`, `guardComments(event)` (works out `root` itself), `injectRules(event, { rules })`, `notifyUser(event, { spawn, platform, env })`, `guardBash(input, { root, home })` |
| The ledger's `hook` field comes from the function name | `hook.mjs:30` turns `guardBash` into `guard.bash`; renaming a function changes ledger rows |
| A handler imports a handler | `hook.mjs:38` (dynamic) and `guard.bash.mjs:30` import from `hooks/observe.drive.mjs` |
| The block heading regex has four copies | `turn-block.mjs:127` (`BLOCKS`), `guard.block.mjs:4` (`CONTRACT`), `emit.ledger.mjs:8` (`HEADING`), `route.verdict.mjs:7` (`HEADINGS`) |
| Three places must agree by hand | `hooks.json`, the entry shell file names, and the names `hook.mjs` derives; `Stop` and `SubagentStop` must list the same three hooks in the same order, which nothing checks |

### `guard.bash.mjs`

| Lines | Job |
|---|---|
| 38-170 | tracing, tokenizer loading, five command tables, output shapes |
| 179-417 | reading shell text: heredocs, quoting, `$(...)`, variables |
| 418-627 | hand-kept kernel verb lists, lead-only verbs, wrapped payloads (`sh -c`, `eval`, `xargs`), code-write targets |
| 630-710 | splitting into segments |
| 711-1008 | checks for `git`, `sed`, `dotnet`, `npm`/`yarn`/`pnpm`, worktree teardown |
| 1009-1162 | `cd` tracking, the source-reader rule, `picket verify`, kernel calls |
| 1163-1196 | `classifySegment` |
| 1198-1220 | entry |
| 1221-1316 | the PowerShell evaluator |
| 1318-1497 | escalation and the Bash evaluator |

**B1, facts kept twice.** The general classifier and the source-reader rule each keep their own list of flags that make a reader write or run code:

```js
// classifySegment, guard.bash.mjs:1180
const isDestructive = tokens.some((t) => typeof t === "string" && /^-(exec|execdir|ok|okdir|delete)$/.test(t));

// source-reader rule, guard.bash.mjs:1029-1031
const FIND_ACTIONS = /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/;
const READER_WRITE_FLAGS = { rg: /^--pre(=|$)/, tree: /^-o/, file: /^(-C|--compile)$/ };
```

Probed through `guardBash` on 2026-10-22, each of these is auto-allowed today:

```
find . -fprint out.txt     allow        git log --output=x          allow
find . -fls x              allow        git diff --output=x         allow
tree -o out.txt            allow        git show --output=x HEAD    allow
rg --pre ./x foo           allow
```

Three root sets overlap (`SAFE_ROOTS :75`, `INERT_ROOTS :261`, `SOURCE_READERS :1024`) and two `sed` checkers use different regexes (`:842-860`, `:1062-1078`).

**Other duplication.** The Bash evaluator (`:1375-1497`) and the PowerShell evaluator (`:1271-1316`) run the same loop; `ctx.depth === 0 && ctx.escalation && segments.some(carriesMarker)` appears five times. `KERNEL_READ_VERBS` and `KERNEL_OTHER_VERBS` (`:420-421`) still list `review-summary`, `find-verdict`, `new` and `pr`.

**Dead table entries.** `Select-Object`, `Sort-Object` and `Measure-Object` in `SAFE_ROOTS` (`:78-79`) never match: `canonicalRoot` lower-cases any name it does not map (`powershell-text.mjs:33-36`). They change no decision, because a PowerShell command is never auto-allowed (probed: `Get-ChildItem | Select-Object -First 3` falls through), but they read as if they did.

## Target

### The list

```ts
// src/lib/hooks.mts
export const HOOKS = {
  "inject.state":      { on: [{ event: "SessionStart" }] },
  "inject.rules":      { on: [{ event: "SessionStart" }, { event: "SubagentStart" }] },
  "inject.extensions": { on: [{ event: "SessionStart" }, { event: "SubagentStart" }] },
  "guard.scope":       { on: [{ event: "PreToolUse", matcher: "Write|Edit" }] },
  "guard.comments":    { on: [{ event: "PreToolUse", matcher: "Write|Edit" }] },
  "guard.silenced":    { on: [{ event: "PreToolUse", matcher: "Write|Edit" }] },
  "guard.bash":        { on: [{ event: "PreToolUse", matcher: "Bash|PowerShell" }] },
  "lint.schema":       { on: [{ event: "PostToolUse", matcher: "Write|Edit" }] },
  "observe.drive":     { on: [{ event: "PostToolUse", matcher: "Bash|PowerShell" }, { event: "PostToolUseFailure", matcher: "Bash|PowerShell" }] },
  "monitor.context":   { on: [{ event: "PostToolUse", matcher: "Read|Grep|Glob|WebFetch|WebSearch" }] },
  "guard.block":       { on: [{ event: "Stop" }, { event: "SubagentStop" }] },
  "route.verdict":     { on: [{ event: "Stop" }, { event: "SubagentStop" }] },
  "emit.ledger":       { on: [{ event: "Stop" }, { event: "SubagentStop" }] },
  "notify.user":       { on: [{ event: "Notification", matcher: "permission_prompt|idle_prompt" }] },
} as const;

export type HookName = keyof typeof HOOKS;
```

Hooks on the same event run in list order. A hook's name `<kind>.<name>` is its path: `guard.bash` lives in `hooks/guard/bash/` and builds to `dist/hooks/guard/bash.mjs`.

### Source layout

```
src/lib/
  hooks.mts                          the list
  hooks/
    run-hook.mts                     runHook(name, hook): Node check, Context, output, denial row
    hook-spec.mts                    HookSpec<E>, event payload types, OutputFor<E>
    output.mts                       allow, ask, deny, fallThrough, context, bounce
    guard/
      edit-target.mts                shared by comments, scope, silenced: path, edit texts, quoted list
      bash/       index.mts judge.mts bash.mts powershell.mts rules.mts kernel.mts payloads.mts sources.mts escalation.mts
      block/      index.mts
      comments/   index.mts
      scope/      index.mts
      silenced/   index.mts
    inject/       state/index.mts  rules/index.mts  extensions/index.mts
    lint/         schema/index.mts
    monitor/      context/index.mts
    notify/       user/index.mts
    observe/      drive/index.mts  drive/evidence.mts
    route/        verdict/index.mts
    emit/         ledger/index.mts
```

Code used by one hook sits in its folder, code shared by one kind sits in the kind folder (`guard/edit-target.mts`), anything wider goes to `shared/`. Today's hook-only modules move next to their user: `powershell-text` to `guard/bash/powershell.mts`, `kernel-call` to `guard/bash/kernel.mts`, `drive-evidence` to `observe/drive/evidence.mts`, `edit-texts` to `guard/edit-target.mts`. `src/hooks/` and the hand-written `hooks.json` go away.

### A hook

```ts
// src/lib/hooks/guard/block/index.mts
export const hook: HookSpec<"Stop" | "SubagentStop"> = {
  handler: async (event, ctx) => {
    const problems = blockProblems(event, ctx);
    return problems.length ? bounce(`guard.block: ${problems.join(". ")}. Re-emit the block only.`) : null;
  },
};
```

```ts
// src/lib/hooks/hook-spec.mts
export type HookSpec<E extends HookEvent> = { handler: (event: PayloadOf<E>, ctx: HookContext) => Promise<OutputFor<E> | null> };

type OutputFor<E> =
  E extends "PreToolUse" ? PermissionOutput :
  E extends "SessionStart" | "SubagentStart" | "PostToolUse" | "PostToolUseFailure" ? ContextOutput :
  E extends "Stop" | "SubagentStop" ? BounceOutput | ContextOutput :
  E extends "Notification" ? never :
  never;
```

The handler receives the payload of the events it listens to and may return only what Claude Code accepts for them: a `guard.block` that returned `deny(...)` fails `tsc`. `HookContext` is item 02's `Context` plus the hook's name.

### What the build generates

For each name in `HOOKS`, an entry through esbuild's `stdin`, bundled to `dist/hooks/<kind>/<name>.mjs`:

```js
import { runHook } from "<src>/lib/hooks/run-hook.mts";
import { hook } from "<src>/lib/hooks/guard/block/index.mts";
await runHook("guard.block", hook);
```

and `dist/hooks/hooks.json` from the list:

```json
"Stop": [{ "hooks": [
  { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/guard/block.mjs"] },
  { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/route/verdict.mjs"] },
  { "type": "command", "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/emit/ledger.mjs"] }
] }]
```

`runHook` takes the name, so the ledger's `hook` field no longer depends on a function name.

### `guard/bash/`: one rule table (fixes B1)

```ts
// src/lib/hooks/guard/bash/rules.mts
export type RootRule = {
  class: "safe" | "deny" | "meta" | "check";
  check?: (seg: Segment, ctx: GuardContext) => Classification;   // git, sed, dotnet, npm, yarn, pnpm
  writeFlags?: RegExp;          // a flag that makes this command write a file or run a program
  inert?: true;                 // allowed inside $(...)
  sourceReader?: true;          // may read a protected source
};

export const ROOTS: Record<string, RootRule> = {
  cat:  { class: "safe", inert: true, sourceReader: true },
  find: { class: "safe", writeFlags: /^-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)$/, sourceReader: true },
  rg:   { class: "safe", writeFlags: /^--pre(=|$)/, inert: true, sourceReader: true },
  tree: { class: "safe", writeFlags: /^(-o|--output)/, sourceReader: true },
  file: { class: "safe", writeFlags: /^(-C|--compile)$/, sourceReader: true },
  git:  { class: "check", check: checkGit },     // read subcommands with --output or -o are "unknown"
  sed:  { class: "check", check: checkSed },     // one sed checker: print-only scripts are safe
  ...
};
```

The general classifier, `$(...)` substitution and the source rule all read `ROOTS`. A command with one of its `writeFlags` is `unknown`, which hands the decision to Claude Code's permission prompt. PowerShell names in the table are the canonical names `canonicalRoot` returns, and a test checks every mixed-case entry against `CANONICAL_GROUPS`.

### `guard/bash/`: one loop for both shells

```ts
// src/lib/hooks/guard/bash/judge.mts
export type Dialect = {
  name: "bash" | "powershell";
  read(command: string): Reading | null;              // null: unreadable, fall through
  classify(seg: Segment, ctx: GuardContext): Classification;
  cdTarget(seg: Segment): string | null;
  hints: { escalate: string; denial: (seg: Segment) => string };
};

export function judgeSegments(reading: Reading, ctx: GuardContext, dialect: Dialect): Judgement
export function isEscalating(segments: Segment[], ctx: GuardContext): boolean
```

`bash.mts` and `powershell.mts` each export a `Dialect`. PowerShell keeps its rule that it is never auto-allowed.

### `guard/bash/kernel.mts`: verb lists from the registry

```ts
import { VERB_NAMES } from "../../../verbs.mts";       // import-free, so the bundle stays small (item 03)

export function kernelClass(verb: string, subverb: string | undefined): "safe" | "kernel"
export function isLeadOnly(verb: string): boolean     // from the new leadOnly field: comment, waive
```

`verbs.mts` gains `leadOnly: true`. The guard keeps only what is about the guard: `--run`, `--start` and `--only` wrap a command, and `verify` runs project code unless `--no-tests`.

### One output shape

```ts
// src/lib/hooks/output.mts
export const allow = (reason: string): PermissionOutput => permission("allow", reason);
export const ask = (reason: string): PermissionOutput => permission("ask", reason);
export const deny = (reason: string): PermissionOutput => permission("deny", reason);
export const context = (event: HookEvent, text: string): ContextOutput => ({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
export const bounce = (reason: string): BounceOutput => ({ decision: "block", reason });
```

## Evidence (2026-10-22)

- The prototype list above, turned into JSON by a 15-line generator, equals today's `core/hooks/hooks.json` once its paths are mapped from `hooks/guard.bash.mjs` to `hooks/guard/bash.mjs`: `generated hooks.json equals today's (paths mapped): true`. Order, matchers and the `Stop`/`SubagentStop` lists come out identical.
- Entries generated through esbuild `stdin` and bundled from today's handlers run: `guard.block generated bundle: exit 0`, and `guard.bash` answers a `PreToolUse` event with its usual JSON.
- B1 probes as listed above; `sort -o`, `uniq in out`, `jq`, `awk` and `less` already fall through.
- PowerShell: `Get-ChildItem`, `Get-ChildItem | Select-Object -First 3`, `Get-Content a.txt | Sort-Object`, `... | Measure-Object`, `... | Select-String foo` all fall through.
- `guard.bash` also auto-allows project tools that write files or run project code, with the reason "every sub-command is read-only/inspection": `prettier --write src`, `eslint --fix src`, `tsc` and `vitest run` are allowed, while `npm test` and `picket verify x 1` fall through. See Q-1.

## Decisions

### H-1: One rule table keyed by command root (fixes B1)
Shared by the classifier, substitution and the source rule; `writeFlags` makes a command `unknown`; `git` read subcommands with `--output` are `unknown`; one `sed` checker. Behaviour change: the seven commands probed above start asking.

### H-2: `guard.bash.mjs` becomes `hooks/guard/bash/`
`index`, `judge`, `bash`, `powershell`, `rules`, `kernel`, `payloads`, `sources`, `escalation`. Bundling (item 01) makes the split free at runtime.

### H-3: One `judgeSegments` loop through a `Dialect`
`isEscalating` replaces the five copies of the marker check.

### H-4: The guard's verb lists come from `verbs.mts`
`readOnly` per verb and subverb; `leadOnly` becomes a registry field.

### H-5: `output.mts` builds every hook output
No handler writes the JSON shape.

### H-6: `HookSpec<E>` types payloads and outputs per event
`runHook(name, hook)` takes the name explicitly.

### H-7: No hook imports another hook
`currentItem`, `maskEnvValues` and the drive log live in `shared/` (04c).

### H-8: The Write/Edit guards share `guard/edit-target.mts`
Repository-relative path, edit texts, the quoted list in denial messages.

### H-9: Block headings come from `shared/work/block.mts`
One table (04a, 04d) replaces `BLOCKS`, `CONTRACT`, `HEADING` and `HEADINGS`.

### H-10: `src/lib/hooks.mts` lists every hook; the build generates `hooks.json` and the entries
One folder per hook at `hooks/<kind>/<name>/`; the name `<kind>.<name>` is the path; same-event hooks run in list order. The user asked for a structure like the verbs' on 2026-10-22.

### H-11: PowerShell table entries use canonical names
A test checks each mixed-case entry against `CANONICAL_GROUPS`; the three dead entries are corrected or removed.

### H-12: Project tools ask, like `npm test`
`tsc`, `eslint`, `prettier`, `jest`, `vitest`, `mocha`, `cypress`, `webpack`, `rollup`, `esbuild`, `vite`, `next`, `react-scripts`, `babel` and `playwright` leave the `safe` class and fall through to Claude Code's permission prompt. They run project code or load config files that are code, and some write files. "read-only/inspection" is then true of every command that reason is given for. Chosen by the user on 2026-10-22 (Q-1, option b).

## Migration

Two phases. The hook tests move to their new layout in item 06; this item adds only the tests its new code needs.

### Phase 1: the frame
- `src/lib/hooks.mts`, `hook-spec.mts`, `output.mts`, `run-hook.mts`; the build generates entries and `hooks.json` (item 01's build gains this step).
- Every hook except `guard.bash` moves to its folder as a `HookSpec`, with `output.mts` helpers and `edit-target.mts`.
- Tests: the generated `hooks.json` equals the expected list; every path in it exists after the build; `runHook` writes the explicit name to the ledger; one `tsc` fixture proves a `Stop` hook cannot return `deny`.

### Phase 2: `guard/bash/`
- `rules.mts` with `ROOTS`; `judge.mts` with `judgeSegments`; `bash.mts`, `powershell.mts`, `kernel.mts`, `payloads.mts`, `sources.mts`, `escalation.mts`.
- Tests: the seven B1 commands ask; `prettier --write src`, `eslint --fix src`, `tsc` and `vitest run` fall through (H-12); the canonical-name check; today's `guard.bash` tests in `handlers.test.mjs` and `hooks.test.mjs` pass unchanged apart from those cases.
- Cold start: every hook stays under the 200 ms budget (`budgets.test.mjs`, now over `dist/hooks/**/*.mjs`).

## Risks

- R-1: the guard decides what runs without asking. Phase 2 keeps every existing guard test, and the only intended decision changes are the B1 commands and the project tools (H-12).
- R-4: H-12 adds permission prompts for users who run `vitest` or `tsc` directly; the release note says so, and a project can still allow them in its own Claude Code permission settings.
- R-2: `hooks.json` paths change from `hooks/guard.bash.mjs` to `hooks/guard/bash.mjs`. Users never reference them; a plugin update replaces the whole `dist/` folder.
- R-3: a `HookSpec` that lists an event Claude Code does not send for that matcher would never run; the generated `hooks.json` test lists the expected pairs explicitly.

## Affects

- 01: the build gains entry generation and `hooks.json`; `src/hooks/` goes; the shell-shape test (58) becomes the mapping test.
- 02 and 03: `verbs.mts` gains `leadOnly`.
- 04a, 04d: block headings from `shared/work/block.mts`.
- 04c: `observe.drive` uses `currentItem` and `appendDriveRow`; `guard.bash` reads `detectTooling(root).tooling.test`.
- 06: the hook tests split per hook in item 06.
- 08: `core/hooks/README.md` becomes a docs page generated from or checked against `hooks.mts`.

## Open questions

- Q-1: resolved 2026-10-22, the user chose option (b): the project tools ask like `npm test` (H-12).
