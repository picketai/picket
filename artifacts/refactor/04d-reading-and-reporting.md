# 04d: Reading and reporting

Status: approved (2026-10-22).

The verbs and modules that read and report: `admit`, the review summary, `pullrequest` (today `pr`), cost and the ledger, `statusline`, the transcript readers and `yaml-lite`. Each gets its pure part separated from its reading part, one copy of each reader, and typed records where the format was only implicit. Fixes B3 in `admit` and the summary, and B10 (found in this pass): `yaml-lite` silently misreads trailing comments and inline maps.

## admit (173 lines)

### Today

Sound design: regex signals feed a short ladder, and a labelled corpus tests it (`test/kernel/admit-labelled.json`). Around it:

- `recheck` (`:167`) is exported and called by nothing; only a comment names it. `CAPS` (`:15`) is unused. `securityPaths()` (`:87`) duplicates `config.mjs`'s, which `gate` and `review` use instead.
- `export { DEFAULT_SECURITY_PATHS }` (`:10`) re-exports from `config`.
- `securityPathHits` (`:57`) matches with a bare `startsWith` (B3).
- `admit()` (`:98`, 64 lines) computes the signals and then decides.

### Target

```ts
// src/lib/verbs/admit/signals.mts
export type Signals = { forced: Lane | null; mentioned_paths: string[]; touched: number; security: boolean; security_path_hits: string[]; research: boolean; diagnosis: boolean; ... };
export function signalsOf(text: string, mentioned: string[], touched: string[], securityPaths: readonly string[]): Signals    // pure

// src/lib/verbs/admit/lane.mts
export type Admission = { lane: Lane | "none"; skill?: "debugging"; reasons: string[]; signals: Signals };
export function laneOf(signals: Signals, caps: LaneCaps): Admission                                                       // pure, the ladder

// src/lib/verbs/admit/index.mts
export const admit = action<AdmitInput, Admission>(async ({ text, touched }, { root }) => {
  const config = loadConfig(root);
  return done(laneOf(signalsOf(text, mentionedPaths(text, root), touched, config.security_paths), config.lanes));
});
```

The ladder keeps its order and its reason wording. `security_path_hits` uses `securityPathOf` (04a). `recheck`, `CAPS`, the duplicate `securityPaths` and the re-export go. The labelled corpus runs against `laneOf(signalsOf(...))` without touching disk.

## Review summary (217 lines) and pull requests (211 lines)

### Today

- `reviewSummaryRange` (`review.mjs:123`) and `reviewSummary` (`:157`) both assemble size, security, frameworks, concerns, extension steps and silenced moves; the human one-liner is written three times in `picket.mjs` (`:255`, `:260`, `:359`).
- `review.mjs:51,126` and `pr.mjs:42` call `execFileSync("git", ...)` directly; `numstat` exists in both `git.mjs` and `review.mjs`.
- Both summaries match security paths with a bare `startsWith` (`:135`, `:169`, B3).
- `patFromEnv(env = process.env, root = process.cwd())` (`pr.mjs:112`) and `postReview(..., { root = process.cwd(), pat = patFromEnv(process.env, root) })` read the process by default.
- The verb is `pr`, two letters that say little; it has two modes, `pr <url>` (prepare) and `pr <url> --post <file>` (post findings).

### Target

```ts
// src/lib/shared/review-summary.mts
export type ChangeSet = { base: string; head: string | null; files: string[]; added: number; removed: number; silencedInputs: SilencedInput[]; repos: RepoChange[] };

export function changesOfItem(root: string, snap: WorkSnapshot): ChangeSet
export function changesOfRange(root: string, base: string, head: string): ChangeSet
export function summarize(root: string, changes: ChangeSet, config: Config): Summary          // size, security, frameworks, concerns, steps, silenced
export function renderSummary(summary: Summary): string                                        // the one human line
```

`summary <id>` adds the item fields (`work_id`, `request`, `phases`, `repos`, `sources`, `mutation`, waived silenced moves) to `summarize`'s result; `summary --range a..b` and `pullrequest` use it as is. The JSON fields stay. Git goes through `util/git.mts`; security paths through `securityPathOf`.

The verb becomes a group, so the two modes are two subverbs and the name says what it is:

```
picket pullrequest prepare <url> [--repo <path>]          today: picket pr <url>
picket pullrequest post <url> --file <review.md> [--dry-run]   today: picket pr <url> --post <file>
```

`pullrequest` is the noun and `prepare` and `post` are the actions, as the naming rule asks for a group (C-012). The PAT comes from `ctx.env` (`AZDO_PAT` or `AZURE_DEVOPS_EXT_PAT`, then `.claude/settings.local.json`); it is never logged or echoed (security-paths rule). Mentioned in `core/skills/reviewing/SKILL.md:106,109`, the guard's verb list (`guard.bash.mjs:421`) and `test/kernel/names.test.mjs:12`.

## Cost and the ledger (214 lines across `cost`, `ledger`, `escalation`)

### Today

Four writers, one reader, no written format:

| Writer | Event | Fields beyond `v`, `ts` |
|---|---|---|
| `hooks/emit.ledger.mjs:56` | `stop`, `subagent_stop`, `gate` | `session` (`"unknown"` when missing), `agent`, `lane`, `work_id`, `phase`, `model`, `duration_ms`, `verdict`, `gate_kind`, `tool_calls`, `reads`, `rereads`, `first_reviewable_ms`, `usage`, `session_cost_usd` |
| `close.mjs:60` (`recordAccept`) | `accept` | `session: null`, `agent: null`, `work_id`, `phase`, `commit`, `lines_added` |
| `hook.mjs:39` | `block`, `bounce` | `session`, `agent`, `hook`, `work_id`, `reason` |
| `escalation.mjs:80` | `escalation` | `session`, `outcome`, `why`, `key`, `command`, `reason`, `agent`, `work_id`; builds `v` and `ts` by hand and appends itself instead of calling `appendLedger` |

`cost.mjs:6` reads with its own skip-bad-lines loop and keeps `v === 2` rows.

### Target

```ts
// src/lib/shared/ledger.mts
type Common = { v: 2; ts: string; session: string | null; agent: string | null; work_id: string | null };

export type TurnRow = Common & {
  event: "stop" | "subagent_stop" | "gate"; lane: Lane | null; phase: number | null; model: string | null;
  duration_ms: number; verdict: Verdict | null; gate_kind: string | null; tool_calls: number; reads: number; rereads: number;
  first_reviewable_ms: number | null; usage: Usage; session_cost_usd: number | null;
};
export type AcceptRow = Common & { event: "accept"; phase: number | null; commit: string; lines_added: number };
export type DenialRow = Common & { event: "block" | "bounce"; hook: string; reason: string };
export type EscalationRow = Common & { event: "escalation"; outcome: "asked" | "ran" | "not_run" | "denied"; why: string | null; key: string; command: string; reason: string | null };
export type LedgerRow = TurnRow | AcceptRow | DenialRow | EscalationRow;

export function appendLedger(root: string, row: NewRow, now: Date): void        // NewRow: a LedgerRow without v and ts
export function readLedger(root: string): { rows: LedgerRow[]; skipped: number }
```

Every writer calls `appendLedger`, and the compiler checks each against its row type. A missing session is `null` in every row; the turn row's `"unknown"` goes, and `cost` already treats both as "no session". `cost` becomes `summarizeLedger(rows, { session, work_id })`, a pure function; the verb reads, then summarizes.

## statusline (416 lines)

### Today

One file, five jobs: facts from Claude Code's input (`factsOf`, `:141`), text width with an East Asian wide table (`:51-68`, `:161-172`), layout into rows (`:264-298`), painting (`:299-313`), cached probes of git state and the last skill (`:345-395`), plus recording the session cost (`:397`). `USER_CONFIG` (`:18`) duplicates the path in `styling/terminal.mjs:28`. `lastSkill` (`:326`) reads the transcript tail with `transcript.mjs`'s reader and scans lines itself.

### Target

```
src/lib/verbs/statusline/
  index.mts      the action: facts, probe, layout, paint, record the cost
  facts.mts      factsOf(input, now): Facts                          pure
  layout.mts     layout(facts, { columns, icons }): Row[]           pure
  paint.mts      paint(rows): string                                pure
  probe.mts      cached git state; last skill through shared/transcript
src/lib/util/text-width.mts      displayWidth, charWidth              no Picket knowledge
src/lib/shared/paths.mts         userConfigPath(home), for statusline and styling
```

The printed text is unchanged; `test/kernel/statusline.test.mjs` (287 lines) is the check. Item 07 removes the mods' copies of `prettyModel` and `compactTokens`.

## Transcript and turn-block (421 lines)

### Today

- Three tail readers: `transcript.mjs:10` (a fixed 4 MB), `turn-block.mjs:28` (a window that grows 512 KB, 4 MB, then the whole file), and `statusline.lastSkill` on top of the first. Each of `turn-block`'s three turn readers (`:48`, `:75`, `:220`) parses its tail its own way.
- `detectVerdict`, `detectClassification` and `detectScope` (`:149-160`) are unused; a second `VERDICTS` set (`:141`) shares a name with `route.mjs`'s.
- `transcript.mjs:5` re-exports five functions from `turn-block.mjs`.

### Target

```
src/lib/shared/transcript/
  tail.mts       entriesFromEnd(path): Iterable<TranscriptEntry>, one reader with the growing window
  entries.mts    TranscriptEntry; isUserText, messageText, toolUses
  turn.mts       turnSpan, readTurn, currentTurnAssistantEntries
  agent.mts      agentName, agentTranscript
```

The block headings `detectBlock` matches (`turn-block.mjs:127`) move to `shared/work/block.mts` (04a); item 05 replaces the hooks' four drifted copies of that regex with it. The dead detectors and the re-export go.

## yaml-lite (153 lines)

### Today

The reader for `state.yaml`, `sources.yaml`, artifact frontmatter and the branching manifest. Its header says "Comments start with `#`" and "Anything else throws"; two cases do neither (B10):

```
block scalar                     THROWS yaml-lite: unexpected indent at line 3:   line one
flow map                         {"g":"{path: src/a.ts, pattern: foo}"}
comment                          {"n":"1 # one"}
```

`n: 1 # one` reads as the string `"1 # one"`, so `verify` reports "frontmatter has no phases[] entry for n: 1"; a `greps` entry written inline reads as a string and is never checked. The templates use block style, so this bites only when an agent or a person writes the shorthand.

### Target

`util/yaml-lite.mts`, with `parse` (109 lines) split into the line structure (maps, lists, indents) and a value reader:

- a ` #` comment outside quotes ends the value; a `#` with no space before it stays (`https://x/y#z`);
- `{key: value, ...}` of plain values is a map, and `[...]` may hold such maps;
- anything else that starts a YAML feature the reader does not support (`|`, `>`, `&`, `*`, `!`, a nested `{...}` inside `{...}`, an unclosed bracket) throws with the line number.

Prototype results for the value reader:

```
comment                  1 # one                                    -> 1
flow map                 {path: src/a.ts, pattern: foo}             -> {"path":"src/a.ts","pattern":"foo"}
flow list of flow maps   [{path: a.ts, pattern: "x, y"}, {path: b.ts, pattern: z}] -> [{"path":"a.ts","pattern":"x, y"},{"path":"b.ts","pattern":"z"}]
files list and comment   [src/a.ts, src/b.ts] # two files           -> ["src/a.ts","src/b.ts"]
hash inside quotes       "a #b"                                     -> "a #b"
hash without space       https://x.example/y#z                      -> "https://x.example/y#z"
escaped regex            "lines\\[0\\]"                             -> "lines\\[0\\]"
block scalar             |                                          -> THROWS yaml-lite: unsupported value at line 7: |
anchor                   &x 1                                       -> THROWS yaml-lite: unsupported value at line 7: &x 1
nested flow              {path: a, more: {b: 1}}                    -> THROWS yaml-lite: nested {...} or [...] inside {...} at line 7
unclosed                 {path: a                                   -> THROWS yaml-lite: unsupported value at line 7: {path: a
```

With the new value reader plugged into today's parser, every YAML document in this repository's `work/` folder reads the same as before: `152 documents, 152 identical, 0 different` (every `state.yaml`, `sources.yaml`, and the frontmatter of every `order.md`, `design.md` and `research.md`).

## Decisions

### P-1: `admit` is two pure steps
`signalsOf` and `laneOf`; the action only reads config and mentioned paths. `recheck`, `CAPS`, the duplicate `securityPaths` and the `DEFAULT_SECURITY_PATHS` re-export go. B3 through `securityPathOf`.

### P-2: One `summarize` behind every summary
`changesOfItem` and `changesOfRange` gather; `summarize` assembles; `renderSummary` is the one human line. Used by `summary` and `pullrequest`. Git through `util/git.mts`; B3 through `securityPathOf`.

### P-3: `pr` becomes the group verb `pullrequest`
`pullrequest prepare <url>` and `pullrequest post <url> --file <f>`; the `--post` mode flag goes. The user asked for the name `pullrequest`; the group form follows the naming rule (C-012). The PAT comes from `ctx.env`, never from process defaults, and is never logged.

### P-4: The ledger row is a typed union
`shared/ledger.mts` owns `LedgerRow`, `appendLedger` and `readLedger`; every writer goes through `appendLedger`; a missing session is always `null`; `cost` is a pure `summarizeLedger`.

### P-5: `statusline` splits into facts, layout, paint and probe
Text width moves to `util/text-width.mts`; `userConfigPath(home)` moves to `shared/paths.mts`. Output unchanged.

### P-6: One transcript reader
`shared/transcript/` with one tail reader that grows its window; dead detectors and the re-export go; block headings live in `shared/work/block.mts`.

### P-7: `yaml-lite` reads comments and inline maps, and throws on the rest (fixes B10)
As prototyped above; no vendored YAML parser, because the files are written by Picket and its agents, and a loud error is enough for anything outside the subset. Chosen by the user on 2026-10-22.

## Migration

Two phases. Phase 1 has no verb changes; phase 2 moves the verbs.

### Phase 1: shared readers
- `util/yaml-lite.mts` with the value reader; the 11 value cases above as tests; the comparison over a fixture copy of `work/` as a test (old and new reads equal).
- `shared/transcript/` with one tail reader; `turn-block.test` and `transcript` tests keep passing.
- `shared/ledger.mts` with the row types; `escalation`, `close`, `hook`, `emit.ledger` write through it.
- `util/text-width.mts`; `userConfigPath` in `shared/paths.mts`.

### Phase 2: verbs
- `verbs/admit/` with `signalsOf` and `laneOf`; the labelled corpus test against them.
- `shared/review-summary.mts`; `verbs/summary/`; `verbs/pullrequest/` with `prepare` and `post`.
- `verbs/cost/` over `summarizeLedger`; `verbs/statusline/` split.
- Renames: `picket pr <url>` to `picket pullrequest prepare <url>` and `--post <file>` to `pullrequest post <url> --file <file>` in `core/skills/reviewing/SKILL.md:106,109`, the guard's verb list and `names.test.mjs`.

## Risks

- R-1: `yaml-lite` now accepts two forms it used to misread. A file that relied on the misread (a value that really should contain ` # `) would change; none of the 152 documents in this repository does. A value that needs ` #` is quoted.
- R-2: the turn row's `session: "unknown"` becomes `null`. `cost --session unknown` would stop matching; nothing passes that value.
- R-3: `pullrequest` is longer to type than `pr`. Users rarely type it; the reviewing skill does.
- R-4: splitting `statusline` touches the line every user sees on every refresh. The 287-line test compares the rendered text; it must pass unchanged.

## Affects

- 03: the verb tree gets `pullrequest/` (with `prepare.mts`, `post.mts`) instead of `pr/`; X-8 gains the rename.
- 04a: `shared/work/block.mts` gains the block heading table from `turn-block`.
- 05: hooks write ledger rows through `appendLedger`; the guard's heading regexes use `block.mts`; `emit.ledger` reads turns through `shared/transcript/`. The gate detection in `emit.ledger.mjs:55` matches `[i] confirm`, which ties to open decision 2 in the findings list (the design lane's `[i]` option) and is settled in item 08.
- 07: the mods stop copying `prettyModel` and `compactTokens`.

## Open questions

None.

## Revision log

- 2026-10-22: `compactTokens`, `prettyModel` and the time formats come from `src/lib/shared/format.mts`, shared with the mods; `compactTokens` prints `200k`, one decimal below 10k (item 07a, M-4, M-8).
