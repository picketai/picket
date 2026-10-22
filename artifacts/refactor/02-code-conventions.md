# 02: Code conventions

Status: approved (2026-10-22).

The shapes every later item writes code in: how a verb is declared and called, how it fails, how closed word lists and work item files are named, how files and processes are read and run, and how the plugin finds its own folder. This item builds the small foundation modules and the tests that hold the rules; items 03 to 05 move the existing code onto them.

## Today

Four calling styles for verbs, and a hidden default for `root`:

```js
export function leave(id, root, { command, why } = {})               // root positional
export function verify(id, n, { root = projectRoot(), runTests })    // root in options
export function route(o)                                              // one object
export function preflight(id, root = projectRoot(), home = homedir()) // home positional
```

`root = projectRoot()` appears 40 times in `core/lib` (20 in `work.mjs`); each reads `process.cwd()` and `CLAUDE_PROJECT_DIR` at call time.

Eight ways to fail:

| Verb | Failure | Exit |
|---|---|---|
| `init` | throws `InitRefused`; the CLI prints `{ root: null, error }` | 2 |
| `new` | throws `IntakeError`; the CLI prints `{ error, failures }` | 2 |
| `close` | throws `CloseRefused` carrying `.next`; the CLI catches every error | 2 |
| `leave` | throws `LeaveRefused`, caught by nothing | 1, like a usage error |
| `source add` | throws `LookupError` with `exitCode = 2`, a field nobody reads | 2 |
| `preflight`, `verify`, `check`, `drive` | return `{ ok: false }` | 2 |
| `mutate` | returns `{ outcome: "error" }` | 2 |
| `init` steps | return `{ result: "failed" }` | 2 |

Other things that make the code harder to follow:

- **Verdict tokens:** they live in `route.mjs:49`, but `close.mjs:70`, `next.mjs:54`, `packet.mjs:55` and `pr.mjs:175` repeat them as untyped strings.
- **Work item paths:** `"state.yaml"` is written four times in `work.mjs`, the `phases` folder is built in five places, and `` `work/${id}/` `` appears in five modules. `review.mjs:178` builds it without checking the id.
- **JSONL parsing:** it is done five ways. Two of them throw on a single bad line (`work.mjs:207,251`, bug B4).
- **Git:** there are eight wrappers. `drive.mjs:108` builds a shell string, `` `git checkout -- "${p}"` `` (bug B2).
- **Formatting:** about ten human renderers sit inline in `picket.mjs`.
- **Verb names:** three are two words (`review-summary`, `find-verdict`, `setup-terminal`), and the guard keeps its own copy of every verb name (`guard.bash.mjs:420-421`).
- **Plugin root:** `paths.mjs:125` finds it with `dirname(dirname(import.meta.url))`, which works only because every caller sits one level below the plugin folder (item 01, R-4).

## Target

### The action

```ts
// src/lib/action.mts
import type { Context } from "./context.mjs";

export type Details = Record<string, unknown>;

export type Outcome<T> =
  | { status: "done"; value: T }
  | { status: "failed"; value: T }
  | { status: "refused"; message: string; details: Details };

export type Action<I, O> = (input: I, context: Context) => Promise<Outcome<O>>;

export function done<T>(value: T): Outcome<T> {
  return { status: "done", value };
}
export function failed<T>(value: T): Outcome<T> {
  return { status: "failed", value };
}
export const refuse = (message: string, details: Details = {}): Outcome<never> => ({ status: "refused", message, details });

export class Refused extends Error {
  details: Details;
  constructor(message: string, details: Details = {}) {
    super(message);
    this.details = details;
  }
}

export class UsageError extends Error {}

export function action<I, O>(run: Action<I, O>): Action<I, O> {
  return async (input, context) => {
    try {
      return await run(input, context);
    } catch (err) {
      if (err instanceof Refused) return refuse(err.message, err.details);
      throw err;
    }
  };
}
```

```ts
// src/lib/context.mts
export type Context = { root: string; now: () => Date; env: NodeJS.ProcessEnv; home: string; session: string | null };

export function edgeContext(root: string): Context {
  return { root, now: () => new Date(), env: process.env, home: homedir(), session: process.env.CLAUDE_CODE_SESSION_ID ?? null };
}
```

The rules that go with it:

- **Actions:** a verb is an `Action<I, O>`, built with `action(...)`, and it returns `Outcome<O>`.
- **Helpers:** a helper is a plain function that takes `root` first and returns plain data. A helper deep in a call chain may `throw new Refused(...)`; the `action()` wrapper turns that into a `refused` value at the boundary.
- **Who calls what:** entry points (the CLI, hook handlers, skill scripts) call actions. Actions call helpers, and helpers call helpers. An action never calls another action. Where two actions share logic, it becomes a helper. For example, `close`, `packet` and `route` call the helper `nextStep(root, id)`, and the `next` action only wraps it.
- **Who builds the context:** only entry points build a `Context`. Nothing else under `src/lib` reads `projectRoot()`, `process.cwd()`, `process.env`, `homedir()` or `new Date()`.
- **Exit codes:** they come from one table, with the same values as today:

  | Status or error | Exit | JSON |
  |---|---|---|
  | `done` | 0 | the value |
  | `failed` (a report whose checks failed) | 2 | the value |
  | `refused` | 2 | `{ ok: false, error, ...details }` |
  | `UsageError` (thrown only while parsing arguments) | 1 | message on stderr |
  | any other error (a crash) | 1 | message on stderr |

### A verb end to end

```ts
// src/lib/leave.mts
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

export const readLeft = (root: string, id: WorkId): LeftEntry[] => readJsonl<LeftEntry>(workFile(root, id, "left.jsonl")).rows;

export const renderLeave = ({ command, why }: LeftEntry): string => `left for you: ${command}${why ? ` (${why})` : ""}`;
```

The registry entry, which item 03 fills in for every verb. The `Verb` type comes from the registry, and `readOnly` lets the guard derive its lists from it in item 05.

```ts
type VerbSpec<I, O> = { usage: string; readOnly: boolean; parse: (args: Args) => I; run: Action<I, O>; render: (value: O, display: Display) => string };

function parseLeave({ pos, opt }: Args): LeaveInput {
  const command = typeof opt.command === "string" ? opt.command.trim() : "";
  if (!pos[0] || !command) throw new UsageError('leave needs <id> --command "<command>"');
  return { id: workId(pos[0]), command, why: typeof opt.why === "string" && opt.why.trim() ? opt.why.trim() : null };
}

export const VERBS = {
  leave: { usage: 'leave <id> --command "<c>" [--why "<w>"]', readOnly: false, parse: parseLeave, run: leave, render: renderLeave },
} satisfies Record<string, VerbSpec<any, any>>;

export type Verb = keyof typeof VERBS;
```

The parts of `leave.mjs` that went away: the empty-command check and the trimming moved to `parseLeave`. The hand-written JSONL loop and the local file name constant went into the shared helpers. The `LeaveRefused` class is gone; a refusal now exits 2. And the clock comes from the context.

### Closed word lists, work item files, I/O, processes, plugin root

```ts
// a closed list: the owner exports the type, typed literals are fine anywhere
export const VERDICTS = { APPROVED: { agent: "reviewer", effect: "phase_reviewed" }, ... } as const;
export type Verdict = keyof typeof VERDICTS;
```

```ts
// src/lib/work-files.mts
export type WorkId = string & { readonly __brand: "WorkId" };
export type WorkFile = "state.yaml" | "verdicts.jsonl" | "request.md" | "story.md" | "order.md" | "design.md" | "research.md"
  | "left.jsonl" | "comments.jsonl" | "waivers.jsonl" | "sources.yaml" | "repos.yaml" | "mutation.json";
export type Marker = "done" | "approved" | "reviewed" | "block.md";

export function workId(text: string): WorkId                                         // checks the format; throws UsageError
export function workDir(root: string, id: WorkId): string
export function workFile(root: string, id: WorkId, name: WorkFile): string
export function phaseMarker(root: string, id: WorkId, n: number, kind: Marker): string
export function workRel(id: WorkId): string                                           // "work/<id>/" for git paths
```

```ts
// src/lib/io.mts
export function readText(path: string): string | null
export function readJson<T>(path: string): T | null
export function readJsonl<T>(path: string): { rows: T[]; skipped: number }             // a bad line is skipped and counted
export function appendJsonl(path: string, row: object): void                          // creates the folder
```

```ts
// src/lib/git.mts and src/lib/process.mts
export function gitRead(root: string, args: string[]): string | null                  // null on any failure
export function gitRun(root: string, args: string[]): string                          // throws on failure
export function runShell(command: string, opts: ShellOptions): ShellResult            // only for commands the user supplies
```

```ts
// src/lib/paths.mts
export function pluginRoot(from: string = import.meta.dirname): string                 // walks up to .claude-plugin/plugin.json
```

## Evidence (prototype, 2026-10-22)

The foundation modules above were written as `.mts` in the item 01 prototype, checked with TypeScript 7.0.2 and built with esbuild.

The type checker caught every mistake the rules are meant to catch. A file of deliberate mistakes produced exactly these errors:

| Mistake | Error |
|---|---|
| `last === "APPROVD"` where `last: Verdict` | `TS2367: ... types 'Verdict' and '"APPROVD"' have no overlap` |
| `workFile(root, id, "stat.yaml")` | `TS2345: '"stat.yaml"' is not assignable to parameter of type 'WorkFile'` |
| `workFile(root, "20261022-x", "state.yaml")`, an unchecked string id | `TS2345: 'string' is not assignable to parameter of type 'WorkId'` |
| `{ status: "done", value: "x" }` as `Outcome<number>` | `TS2322: Type 'string' is not assignable to type 'number'` |
| `constructor(readonly x: number)` | `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled` |
| `const anything: {} = 42` | no error: `{}` accepts any value that is not null or undefined, which is why the action types are generic |

The checker also reported one thing the draft has to follow: a generic arrow function `<T>(value: T) => ...` is reserved syntax in `.mts` (`TS7060`). Generic helpers are therefore written as `function` declarations.

Run through the registry on Node 22.18, `leave` behaved as intended:

```
0 {"status":"done","value":{"ts":"2026-10-22T17:02:56.550Z","command":"npm run e2e","why":"needs the browser"}}
2 {"status":"refused","message":"20261022-probe is done; only an open or blocked item records what is left","details":{"id":"20261022-probe","status":"done"}}
threw Refused not a work item id: ../etc
```

The third line shows a gap. The prototype's `workId` threw `Refused` inside `parse`, which runs outside the `action()` wrapper, so the refusal escaped. A malformed id is a usage error, so in the draft `workId` throws `UsageError`.

`pluginRoot()` returned the `dist/` folder both from `dist/lib/k/` (two levels down) and from a bundled hook in `dist/hooks/`.

What depends on the output changes: no skill, agent or doc reads the refusal JSON or the human text (`not closed`, `init refused`). The tests that assert on these outputs are 4 in `close.test.mjs`, 1 in `init.test.mjs` and 4 in `sources.test.mjs`.

## Decisions

### K-1: Verbs are `Action<I, O>`
Every verb is async, takes `(input, context)`, and is built with `action(...)`. Its input type and output type are its own, never `{}`. Helpers are plain functions that take `root` first. Only entry points build a `Context` or read the process environment. Why: one calling shape, and tests that pass a context without setting up the process. This builds on the user's sketch of `(input, context, options) => Promise<Result | Error>`, with options merged into input and display settings moved to `render`.

### K-2: Three outcomes, one exit table
Actions return `done`, `failed` or `refused`. Helpers may throw `Refused`, and the `action()` wrapper converts it. `UsageError` is thrown only while parsing arguments. The exit codes are 0, 2, 2 and 1, as today. Why: an expected refusal is a value the caller handles, while a crash stays a thrown error. A returned `Error` was rejected because `JSON.stringify(new Error("x"))` prints `{}` and it can't be told apart from a crash. Behaviour changes: `leave` on a closed item exits 2 instead of 1, and the refusal JSON of `init`, `new`, `close` and `source add` becomes `{ ok: false, error, ...details }`.

### K-3: An action never calls an action
Shared logic between actions is a helper. Why: an action inside an action means a second `Outcome` to unwrap, and the refusal could come from either place. Today `next()` is called by `close`, `packet`, `route` and the `inject.state` hook; those calls become `nextStep(root, id)`.

### K-4: Closed word lists are literal union types
One module owns each list (verdicts, lanes, statuses, effects, markers) and exports both its values and its type. Typed literals are fine anywhere. Why: the checker rejects `"APPROVD"`, so no constant object is needed just to avoid typos.

### K-5: Work item paths only through `work-files.mts`
`WorkId` is a branded string, which only `workId()` produces. `workId()` checks the format and throws `UsageError`. File names are the `WorkFile` union. Why: the id is checked once, and an unchecked string can't reach a path (the `review.mjs:178` gap).

### K-6: `io.mts` for files; a bad JSONL line is never fatal
`readJsonl` skips and counts unreadable lines. A verb that cares about them reports them in `warnings`, for example `verdicts.jsonl: 1 unreadable line skipped`. Fixes B4 once `work.mts` adopts it (item 04).

### K-7: Processes take argument arrays
`gitRead` returns null on any failure. `gitRun` throws. `runShell` is the one named exception, for commands the user supplies to `drive` and `check`. Fixes B2 once `drive.mts` adopts it (item 04).

### K-8: Types live with their owner; erasable syntax only
`tsconfig.json` sets `erasableSyntaxOnly: true`. There are no enums, namespaces or constructor parameter properties, so classes assign their fields by hand, as `Refused` does. Generic helpers are `function` declarations, because `<T>() =>` is reserved in `.mts`. There is no shared types file. Why: the source reads as JavaScript plus annotations, and it stays runnable under Node's type stripping for contributor scripts.

### K-9: Naming
- Modules are kebab-case nouns.
- Functions start with a verb.
- Types are PascalCase.
- Closed lists are `UPPER_SNAKE` `as const` values.
- There are no default exports.
- A verb module exports the action, its input and output types, and `renderX`.

### K-10: Verbs are one word
A verb is one lowercase word (`/^[a-z]+$/`). A group verb may take one subverb of one word (`source find`, `extension new`). Flags are not affected and stay kebab-case. Applied in item 03:
- `review-summary` becomes `summary`;
- `find-verdict` is deleted (no skill or agent calls it; the hook uses the `findVerdict` function directly);
- `setup-terminal` becomes `style`.

There are no aliases, and the release note lists the renames.

### K-11: The registry carries `readOnly`
Every `VerbSpec` states whether the verb writes anything. Item 05 derives the guard's verb lists from it instead of keeping `KERNEL_READ_VERBS` and `KERNEL_OTHER_VERBS` by hand.

### K-12: Rendering lives beside the verb
`renderX(value, display)` sits in the verb's module. The CLI only chooses between JSON, `--pretty` and `--human`. Display settings such as `--width` reach `render`, never the action.

### K-13: The plugin root is found, not assumed
`pluginRoot()` walks up from `import.meta.dirname` to the first folder that holds `.claude-plugin/plugin.json`. Closes item 01, R-4.

### K-14: JSDoc type comments go when a file converts
Once a file has real types, its `@param` and `@returns` lines are stale, so the comments rule deletes them. Other existing comments stay.

## Migration

One item, two phases. The foundation modules have no kernel imports, so they convert first (C-003). Items 03 to 05 move the existing modules onto them.

### Phase 1: foundation modules
- New `src/lib/action.mts`, `context.mts`, `io.mts`, `work-files.mts`, `process.mts`, each with tests.
- Convert `paths.mjs` to `paths.mts` with the new `pluginRoot()`, tested from `dist/lib`, from a bundled hook and from `dist/bin`.
- Convert `git.mjs` to `git.mts` with `gitRead` and `gitRun`. Its existing exports keep their behaviour.
- `tsconfig.json`: `erasableSyntaxOnly: true`.

### Phase 2: tests that hold the rules
These source scans run over `.mts` files only, so each rule covers more code as conversion proceeds:

1. No `projectRoot(`, `process.cwd(`, `process.env`, `homedir(` or `new Date(` under `src/lib`, except in `context.mts` and `paths.mts`.
2. No `execSync`, `spawn` with `shell: true`, or command string built from a template, except in `process.mts`.
3. No `` `work/${ `` outside `work-files.mts`.
4. Every registry key matches `/^[a-z]+$/`, and every subverb matches too.

Phase 2 also amends `CONTRIBUTING.md` with a short "Code conventions" section that points to `00-conventions.md` entries C-006 to C-013.

## Risks

- R-1: async everywhere adds `await` at every call site of a verb. Only entry points call verbs (K-3), and they are already async (`runHook` and `main`).
- R-2: a helper that throws `Refused` outside any `action()`, for example inside a hook handler, is a crash, not a refusal. `runHook` already catches everything and returns nothing, which is the safe default. Item 05 decides whether a hook should say why.
- R-3: changing the refusal JSON breaks scripts outside the repository that parse it. None are known; the release note names the change.
- R-4: a branded `WorkId` forces a `workId()` call wherever an id enters as text: CLI arguments, folder listings and hook events. That is the point, but it adds calls in items 03 to 05.

## Affects

- 01 layout and build: `tsconfig.json` gains `erasableSyntaxOnly`. R-4 is closed by K-13.
- 03 kernel CLI: the registry, `parse` and `render` per verb, the three renames, the one exit table.
- 04 kernel modules: `work.mts` adopts `io.mts` (B4); `drive.mts` adopts `gitRun` (B2); `next` splits into `nextStep` and the action; the `root` default goes from 40 places.
- 05 hooks: the guard derives its verb lists from `readOnly`, and hook handlers get a `Context`.
- 06 tests: the source-scan tests above, and a fixed `Context` helper for tests.

## Open questions

None. Q-1 (the refusal JSON) and Q-2 (helpers take `root` first) from the first discussion were settled by the user's sketch and K-1.
