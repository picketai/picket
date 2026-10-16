---
kind: design
lane: design
title: Redesign picket-status band as Concept A
date: 2026-10-16
audience: developer
sources: [request.md, tmp/design-picket-status/project/Main.dc.html, tmp/design-picket-status/project/States.dc.html, status/hooks/register.tsx, status/hooks/format.ts, status/hooks/format.test.ts, status/types/index.d.ts, status/hooks/hooks.json, status/.claude-plugin/plugin.json, markdown/hooks/work.ts, core/lib/next.mjs, core/lib/work.mjs, core/lib/route.mjs, core/bin/picket.mjs, core/lib/hooks/guard.bash.mjs, core/lib/drive-evidence.mjs, test/kernel/next.test.mjs, test/kernel/cli.test.mjs, test/hooks/handlers.test.mjs, package.json, scripts/test.mjs, claude-code.d.ts 2.1.301]
phases:
  - n: 1
    files: [status/types/index.d.ts, status/hooks/format.ts, status/hooks/band.ts, status/hooks/register.tsx, status/hooks/format.test.ts, status/hooks/band.test.ts, status/hooks/register.test.tsx]
    greps:
      - path: status/hooks/band.ts
        pattern: 'export (const|function) rows\b'
      - path: status/hooks/band.ts
        pattern: 'export (const|function) sessionLine\b'
      - path: status/hooks/register.tsx
        pattern: 'hasSurvey'
      - path: status/hooks/register.tsx
        pattern: 'classic\.PostModelSwitch'
      - path: status/hooks/register.tsx
        pattern: 'autoCompactThreshold'
      - path: status/hooks/register.tsx
        pattern: '^(?![\s\S]*(SEPARATOR|label:))'
        flags: i
      - path: status/hooks/format.ts
        pattern: '^(?![\s\S]*export const pack\b)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [core/lib/next.mjs, core/bin/picket.mjs, test/kernel/next.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: core/lib/next.mjs
        pattern: 'export function latest\b'
      - path: core/bin/picket.mjs
        pattern: 'opt\.latest'
      - path: core/bin/picket.mjs
        pattern: 'next needs <id> or --latest'
      - path: test/kernel/next.test.mjs
        pattern: 'latest\('
      - path: test/kernel/cli.test.mjs
        pattern: '--latest'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [status/types/index.d.ts, status/hooks/format.ts, status/hooks/band.ts, status/hooks/register.tsx, status/hooks/band.test.ts, status/hooks/register.test.tsx]
    greps:
      - path: status/hooks/band.ts
        pattern: 'export (const|function) workLine\b'
      - path: status/hooks/format.ts
        pattern: 'export (const|function) stepText\b'
      - path: status/hooks/register.tsx
        pattern: '--latest'
      - path: status/hooks/register.tsx
        pattern: 'cmd.{1,4}/c'
      - path: status/types/index.d.ts
        pattern: 'since'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [status/types/index.d.ts, status/hooks/format.ts, status/hooks/band.ts, status/hooks/register.tsx, status/hooks/band.test.ts, status/hooks/register.test.tsx]
    greps:
      - path: status/hooks/band.ts
        pattern: 'export (const|function) agentsLine\b'
      - path: status/hooks/register.tsx
        pattern: 'turn\.complete'
      - path: status/hooks/register.tsx
        pattern: 'session\.send'
      - path: status/hooks/register.tsx
        pattern: 'agent\.spawn'
      - path: status/hooks/register.tsx
        pattern: '5_000'
    tests: true
    drive: true
    security: false
---
# Design: Redesign picket-status band as Concept A

## Problem

The picket-status band today is one wrapped row of `Label: value` segments joined by ` | ` (`status/hooks/register.tsx:110`), packed left to right by `pack` (`status/hooks/format.ts:41`). Concept A, agreed in the canvas (`tmp/design-picket-status/project/Main.dc.html`, its `renderVals`), replaces it with up to three label-free lines (work, agents, session), each a left part and a right part, where a line that does not fit moves its right part to a row of its own. The binding constraints: the next step of a work item is computed by the kernel (`core/lib/next.mjs`), never re-derived in the mod; colours are theme keys, not hex; the survey guard stays; no comments in code; mod tests run under `claude plugin test status`, outside `npm test`, because the release runner has no Claude Code CLI (`package.json` `test:status`, `scripts/test.mjs`).

## Decisions

### D-001: A band is a list of lines, laid out by pure functions
**Decision:** Infrastructural decision. The band is modelled as `Line = { left: Piece[]; right: Piece[] }` with `Piece = { text: string; color?: string; bold?: boolean; dim?: boolean }`. A new pure module `status/hooks/band.ts` builds each line from atom state (`sessionLine` now, `workLine` and `agentsLine` in later phases) and lays one line out with `rows(line, columns): Piece[][]`. The rule is the canvas's: width is the count of code points (`[...text].length`) summed over pieces; when `width(left) + 2 + width(right) <= columns` the result is one row, the left pieces, one gap piece of `columns - width(left) - width(right)` spaces, then the right pieces; otherwise two rows, the left pieces and then the right pieces (no second row when `right` is empty). `register.tsx` keeps hooks, atoms and the drawing only: it reads atoms, calls the builders, and draws each row as one `<Text wrap="truncate-end">`. `format.ts` keeps the text helpers. `columns` is `e.props.bodyColumns`.
**Instead of:** a `<Box justifyContent="space-between">` row per line, as the canvas HTML draws it: the split rule would then depend on the engine's flex layout and truncation, which a pure test cannot see.
**Risks:**
- **RISK-001** A glyph such as `⚇`, `◷` or `↻` draws two cells wide in some terminals, so a padded row overflows by one. Mitigation: `wrap="truncate-end"` clips the overflow; the count rule matches the canvas, which the user approved.

### D-002: Session line figures
**Decision:** Infrastructural decision. Left: `◆ <model>` (`prettyModel`, bold), ` · `, effort (`default` when unknown), ` · `, skill (`none` when unknown). Right, parts joined by three spaces: `5h <pct> ↻<reset>`, `7d <pct> ↻<reset>`, `ctx [bar] <tokens>/<window> (<pct>%)`, `cache <tokens> ◷ <left>` (D-003), `$<cost>`. Rate-limit percent is rounded to a whole number and coloured by today's `levelColor`; a missing window reads `n/a`. `untilReset` changes to the canvas's compact form: `2h14m`, `3d6h`, `20m`, `?`. The context bar, `compactTokens` and the window percent stay exactly as today (so a 200 000 window still reads `200.0k`), but the bar's colour is a new `contextColor(tokens, compactAt)`: under 65% of `compactAt` `success`, 65 to under 85% `warning`, 85% and up `error`. `compactAt` is `breakdown.autoCompactThreshold ?? breakdown.rawMaxTokens ?? context.window` from `$.session.usage({ breakdown: 'summary' })`, read at `session.start` and again when a main-thread `turn.step` reports a model different from the stored one. Cost is `usage.cost?.usd` at start and `e.cost?.usd` at `session.measure`; when absent the `$` part is left out. `pack` and its test are deleted.
**Instead of:** a `full` breakdown, or the window times a fixed ratio: `full` sends a token-count request per tool and memory file, and a fixed ratio ignores the engine's own threshold, which moves with autocompact settings.
**Risks:**
- **RISK-002** A `summary` breakdown estimates every category locally and may take tens of milliseconds. Mitigation: it is read only at start and on a model change, never per render or per measure.
- **RISK-003** The canvas showed `200k` where today's `compactTokens` prints `200.0k`. Mitigation: the request says the figures stay as today, so tests pin today's output; changing it is a one-line follow-up the user can ask for.

### D-003: Cache time left, with the TTL learned from the engine
**Decision:** Infrastructural decision. The `Bar` atom gains `lastRequestAt: number | null`, `cacheTtl: '5m' | '1h' | null` and `ttlSource: 'switch' | 'agent' | null`. `lastRequestAt` is `$.clock.now()` after each main-thread `turn.step` (no `agentId`) resolves. `classic.PreModelSwitch` and `classic.PostModelSwitch` set `cacheTtl` from `e.cache_ttl` with source `switch`. A `tool.call` on `Agent` whose result carries `usage.cache_creation` sets `1h` when `ephemeral_1h_input_tokens > 0`, else `5m` when `ephemeral_5m_input_tokens > 0`, with source `agent`, and never overwrites a `switch` value. Left = TTL (5 minutes when `cacheTtl` is null) minus `now - lastRequestAt`, shown in whole minutes as `◷ 52m`, prefixed `~` while unlearned (`◷ ~3m`). Under 5 minutes it is `warning`; at or past zero the part reads ` cold` in bold `error`; otherwise dim. Before the first main-thread request there is no `◷` part.
**Instead of:** reading the main thread's `cache_creation` split from the transcript file: the transcript layout is not a published contract, and it costs file reads per step.
**Risks:**
- **RISK-004** A subagent's split can differ from the main thread's TTL, so a learned value may be wrong. Mitigation: a model-switch value always wins over an agent-derived one; both come from the request's named sources.

### D-004: Canvas colours map to theme keys
**Decision:** Infrastructural decision. The canvas palette is Claude Code's dark theme, so each colour maps to the key that draws it: text to no colour; grey `#8a8a8a` (labels such as `5h `, `ctx `, `cache `, the `1/2` count) to `inactive`; dim `#6b6b6b` (separators, reset timers, idle agents) to `dim: true` (`dimColor`); faint `#5a5a5a` (empty phase dot) to `subtle`; claude `#d77757` to `claude`; violet `#b1b9f9` (lane, effort, agent in action, `⚇`) to `permission`; blue `#4782c8` (skill, done phase dot, working agent) to `ide`; green to `success`; amber to `warning`; red to `error`.
**Instead of:** the canvas's hex values: they would ignore the user's theme, and the request says keep theme keys.
**Risks:**
- **RISK-005** On a light theme `permission` and `ide` may read close together. Mitigation: bold and the glyphs (`⋯`, `◀`) carry the state too, not colour alone.

### D-005: The kernel answers the work line with `picket next --latest`
**Decision:** Infrastructural decision. `core/lib/next.mjs` exports `latest(root)`: over `listOpenWork(root)` (status open or blocked) it computes each item's `since` as the later of `state.updated` and the last verdict's `ts`, picks the item with the latest `since` (ties go to the later id), and returns `{ ...next(id, root), title, phases_approved, phase_count, blocked_reason, since, by }`, where `by` is the last verdict's `agent` (`developer`, `reviewer`, `architect`, `analyst`, `user`) or null. With no open item it returns `{ id: null, action: "none", actor: null, phase: null, detail: "no open work item", options: [] }`. The CLI's `next` verb takes `--latest` in place of an id; with neither it still fails, now saying `next needs <id> or --latest`. `since` uses the verdict log because `route` writes a phase marker and a verdict line without touching `state.updated` (`core/lib/route.mjs:81`), so `updated` alone would rank a busy item as stale. The mod shows the step as given and never re-derives it.
**Instead of:** the mod reading `work/*/state.yaml` and the markers itself, as `markdown/hooks/work.ts` does: it would copy the state machine of `next.mjs` into a second module that drifts. A new verb lost too: every verb must sit in one of the guard's verb sets (`test/hooks/handlers.test.mjs:283`), which would widen this work into `core/lib/hooks/guard.bash.mjs`; `next` is already a read verb.
**Risks:**
- **RISK-006** The JSON shape is a contract between `core/` and `status/`, which cannot import each other. Mitigation: phase 2's CLI test pins the key set, and phase 3's mod fixture uses the same keys; both ship in the one npm package at one version.

### D-006: How the mod runs `picket`, and when
**Decision:** Infrastructural decision. A module-level `refreshWork($)` runs `$.process.run([...launcher, 'next', '--latest'], { timeoutMs: 10_000 })`. The launcher starts as `['picket']`; when that call rejects (it cannot start, as with the `picket.cmd` shim on Windows) it retries once with `['cmd', '/c', 'picket']` and keeps whichever started for the rest of the session. A nonzero exit, unparsable stdout, or `action: "none"` sets the `work` atom to null, which hides the work line. Refresh is single-flight (a call while one runs is skipped) and is triggered at `session.start`, after any `tool.call` on `Bash` in any loop whose `e.command` matches `/\bpicket\b/`, and by the 30 s timer that already moves `now`. Render never spawns.
**Instead of:** choosing the launcher from `$.env.get('OS')`: it still needs both argv forms, and a wrong guess hides the line with no second try.
**Risks:**
- **RISK-007** A machine without `picket` on PATH pays two failed starts per refresh. Mitigation: after both forms fail, the launcher is marked missing and the timer stops calling it until the next `session.start`.

### D-007: Agent clocks from engine events, statuses from the roster
**Decision:** Infrastructural decision. A new atom `agents: AgentRow[]` with `AgentRow = { id, name, role, status, startedAt, idleAt, lastJobMs }`. `name` is `AgentInfo.name ?? type`; `role` is `type` without its `picket:` prefix. The roster (id, name, role, status) is copied from `$.agent.list()` inside every hook below and on a 5 s timer; ended agents (`completed`, `failed`, `killed`) are dropped. Clocks: after `agent.spawn` resolves with an `agentId`, its `startedAt` is now; after `session.send` resolves, every listed agent whose `name` or `id` equals `e.to` gets `startedAt` now; at `turn.complete` with an `agentId`, `idleAt` is now and `lastJobMs` is `e.durationMs`. An agent first seen with no clock gets `startedAt` at that sighting. Display state: status `running`, `pending` or `waiting` is working (time since `startedAt`); `idle` is waiting when the work item's `actor` is `user`, its `by` equals the agent's `role`, and it is the most recently idle agent of that role (time since `idleAt`); any other idle agent is idle (`lastJobMs`). The 5 s timer moves `now` only while some agent is working. Render reads atoms only.
**Instead of:** the classic `SubagentStart`, `SubagentStop` and `TeammateIdle` events: they carry `agent_id` but no turn length and no moment a message was sent, so the idle duration and the restart on SendMessage would need a second source anyway.
**Risks:**
- **RISK-008** A teammate in a terminal pane runs no loop here, so it has no `turn.complete` and its status is whatever it last wrote to the roster (`claude-code.d.ts` `AgentInfo.status`). Mitigation: it still shows, timed from its first sighting.
- **RISK-009** A SendMessage to an agent that is already working restarts its clock. Mitigation: that is the request's rule ("time since its latest spawn or SendMessage instruction"); tests pin it.

## Scope

**In:** the three-line band and its split rule; the session line's new figures (threshold colour, cache time left, cost); the work line from a new `picket next --latest`; the agents line; the mod's tests; the kernel flag and its tests.
**Out:** the `picket-status` manifest description and the marketplace text; any change to the guard's verb sets; the markdown mod; a light-theme palette; changing `compactTokens`.

## Phase 1: Label-free band with the session line

**Touch set:**
- `status/types/index.d.ts`: `Piece`, `Line`, wider `Bar`
- `status/hooks/format.ts`: compact reset, context colour, drop `pack`
- `status/hooks/band.ts`: new; `rows`, `sessionLine` [INFERRED new file]
- `status/hooks/register.tsx`: new hooks, label-free drawing
- `status/hooks/format.test.ts`: helper tests, `pack` test removed
- `status/hooks/band.test.ts`: new; layout and session line [INFERRED new file]
- `status/hooks/register.test.tsx`: new; survey guard, TTL learning [INFERRED new file]

**Changes:**
- `types/index.d.ts`: export `Piece` and `Line` (D-001); `Bar` gains `cost: number | null`, `compactAt: number | null`, `lastRequestAt: number | null`, `cacheTtl: '5m' | '1h' | null`, `ttlSource: 'switch' | 'agent' | null`. The `PluginState` entry keeps `'picket-status': { bar: Bar }`.
- `format.ts`: `untilReset` returns the compact form (D-002); new `contextColor(tokens: number, compactAt: number): string` and `cacheLeft(bar: Bar, now: number): Piece[]` (or the equivalent pure shape) for D-003; `pack` deleted. `prettyModel`, `compactTokens`, `bar`, `levelColor` unchanged.
- `band.ts`: `widthOf(pieces: Piece[]): number`, `rows(line: Line, columns: number): Piece[][]`, `sessionLine(bar: Bar): Line`.
- `register.tsx`: `session.start` also reads cost and `compactAt`; `turn.step` stamps `lastRequestAt` and rereads `compactAt` on a model change; `session.measure` keeps cost; new `classic.PreModelSwitch`, `classic.PostModelSwitch` and `tool.call` `{ tool: 'Agent' }` hooks for D-003, each passing `next(e)` through unchanged. The render keeps the `hasSurvey` early return, draws `rows(sessionLine(s), e.props.bodyColumns)`, and has no labels and no ` | `.

**Done when:**
- **T-1.1** `band.test.ts` shows `rows` returns one row padded to exactly `columns` code points when left + 2 + right fits, and two rows (left, then right) when it does not, using the canvas session line at 160 and at 90 columns.
- **T-1.2** `band.test.ts` shows `sessionLine` for model `claude-opus-5-5`, effort `high`, skill `picket:ordering`, 5h 42% resetting in 134 minutes, 7d 71% in 78 hours, context 62 000 of 200 000, cache 48 000, TTL learned `1h` with 52 minutes left and cost 4.12 reads `◆ Opus 5.5 · high · picket:ordering` on the left and `5h 42% ↻2h14m   7d 71% ↻3d6h   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k ◷ 52m   $4.12` on the right.
- **T-1.3** `format.test.ts` shows `contextColor` gives `success` for 100 000 of 167 000, `warning` for 120 000 and `error` for 145 000, and `untilReset` gives `3h37m`, `20m`, `3d8h` and `?` for today's four cases.
- **T-1.4** `band.test.ts` shows the cache part reads `◷ ~3m` in `warning` when unlearned with 2 minutes since the last request, and ` cold` bold `error` when 61 minutes have passed on a learned `1h`.
- **T-1.5** `register.test.tsx` shows a `classic.PostModelSwitch` with `cache_ttl: '1h'` removes the `~`, and a later `Agent` result with only `ephemeral_5m_input_tokens > 0` does not change it.
- **T-1.6** `register.test.tsx` shows the render returns the engine's own tree while `hasSurvey` is true, and otherwise draws rows with no `Model:` text and no ` | `.
- **T-1.7** `claude plugin validate --strict status` exits 0 and `claude plugin test status` passes (OQ-001 names the fallback).

## Phase 2: `picket next --latest` in the kernel

**Touch set:**
- `core/lib/next.mjs`: new `latest(root)` (D-005)
- `core/bin/picket.mjs`: `next` takes `--latest`
- `test/kernel/next.test.mjs`: selection and shape tests
- `test/kernel/cli.test.mjs`: CLI key set test

**Changes:**
- `next.mjs`: `export function latest(root)` as D-005 states, built from `listOpenWork`, `readState` and `readVerdicts` (already exported by `core/lib/work.mjs`) and the existing `next`; `blocked_reason` and `by` are null, never absent, when there is none. `next(id, root)` is unchanged.
- `picket.mjs` `case "next"`: with `opt.latest` and no id, print `latest(root)`; the `--human` form is `<id>: <action> · <actor> · <detail>` or `(no open work item)`. The usage error becomes `next needs <id> or --latest`. The `Verbs:` list is unchanged.
- `core/bin/picket.mjs` shows a line-ending-only change in the working tree today; the developer stages only this phase's hunks.

**Done when:**
- **T-2.1** `next.test.mjs` shows that with two open items, the one whose last verdict is newer than the other's `updated` is chosen, even though its own `state.updated` is older.
- **T-2.2** `next.test.mjs` shows done and abandoned items are never chosen, a blocked item is, and its answer carries `action: "resolve_block"` and its `blocked_reason`.
- **T-2.3** `next.test.mjs` shows the answer for an item whose last verdict is `PHASE DONE` by `developer` has `actor: "user"`, `action: "approve_phase"`, `by: "developer"`, `since` equal to that verdict's `ts`, and `phases_approved` and `phase_count` matching its markers.
- **T-2.4** `next.test.mjs` shows a root with no open item answers `id: null` and `action: "none"`.
- **T-2.5** `cli.test.mjs` shows `picket next --latest --root <tmp>` prints JSON with exactly the keys `id, lane, status, phase, options, own_gate, action, actor, detail, title, phases_approved, phase_count, blocked_reason, since, by`, and `picket next` with neither id nor flag exits 1.
- **T-2.6** `npm test` passes.

## Phase 3: Work line

**Touch set:**
- `status/types/index.d.ts`: `Work` shape, `work` atom key
- `status/hooks/format.ts`: step phrase, waiting minutes
- `status/hooks/band.ts`: `workLine`
- `status/hooks/register.tsx`: `refreshWork`, launcher, triggers
- `status/hooks/band.test.ts`: work line text and colours
- `status/hooks/register.test.tsx`: refresh triggers, launcher fallback

**Changes:**
- `types/index.d.ts`: `Work` declares the phase 2 JSON fields the mod reads (`id`, `lane`, `title`, `status`, `action`, `actor`, `phase`, `detail`, `phases_approved`, `phase_count`, `blocked_reason`, `since`, `by`); `PluginState['picket-status']` gains `work: Work | null`.
- `format.ts`: `stepText(work: Work, now: number): Piece[]`. Blocked: `blocked: <blocked_reason ?? detail> ◀` bold `error`. Actor `user`: `you approve phase <n> ◀` (or `you pick source versions ◀` for `resolve_sources`) bold `warning`, then ` <minutes since since>` dim. Any other actor: `<actor> <verb> ⋯` in `permission`, where the verb is `implements phase <n>`, `reviews phase <n>`, `reviews all phases`, `writes <lane>.md` or `closes the item` by action.
- `band.ts`: `workLine(work: Work | null, now: number): Line | null`; null for no item. Left: `▶ ` and the lane in `permission`, two spaces, the title bold, two spaces, `●` in `ide` per approved phase and `○` in `subtle` per other phase, then ` <approved>/<total>` in `inactive`; dots and count are left out when `phase_count` is 0.
- `register.tsx`: D-006 as written; the render draws the work line's rows above the session line's.

**Done when:**
- **T-3.1** `band.test.ts` shows the left part reads `▶ order  Ship picket-markdown mod with picket init  ●○ 1/2` for a fixture with 1 of 2 phases approved.
- **T-3.2** `band.test.ts` shows `approve_phase` by `user` with `since` 6 minutes ago reads `you approve phase 1 ◀ 6m`, its first piece bold `warning`.
- **T-3.3** `band.test.ts` shows `implement_phase` by `developer` on phase 2 reads `developer implements phase 2 ⋯` in `permission`, and a blocked item reads `blocked: phase 2 stalled, 3 tests fail ◀` bold `error`.
- **T-3.4** `register.test.tsx` shows a `Bash` `tool.call` whose command is `picket route x --verdict approved` triggers one more `process.run` ending in `next --latest`, and `git status` triggers none.
- **T-3.5** `register.test.tsx` shows a `process.run` that rejects for `['picket', ...]` is retried as `['cmd', '/c', 'picket', 'next', '--latest']` and the work line then draws.
- **T-3.6** `register.test.tsx` shows exit code 1, stdout `not json`, or `action: "none"` leave no row starting with `▶` while the session line still draws.
- **T-3.7** `claude plugin test status` passes (OQ-001 names the fallback).

## Phase 4: Agents line

**Touch set:**
- `status/types/index.d.ts`: `AgentRow`, `agents` atom key
- `status/hooks/format.ts`: `elapsed` and minutes text
- `status/hooks/band.ts`: `agentsLine`, display state
- `status/hooks/register.tsx`: roster and clock hooks, 5 s timer
- `status/hooks/band.test.ts`: agents line text and colours
- `status/hooks/register.test.tsx`: spawn, send, idle flow

**Changes:**
- `types/index.d.ts`: `AgentRow` as D-007; `PluginState['picket-status']` gains `agents: AgentRow[]`.
- `format.ts`: `elapsed(ms)` reads `42s`, `3m12s`, `1h05m`; `minutes(ms)` reads `6m`, `1h05m`.
- `band.ts`: `agentState(row, rows, work): 'working' | 'waiting' | 'idle'` and `agentsLine(rows, work, now): Line | null` (null with no live agent). Left only: `⚇ ` in `permission`, then each agent joined by ` · ` dim. Working: the name, a space, `working` bold `ide`, ` (<elapsed>)` in `ide`. Waiting: the name, a space, `waiting` bold `warning`, ` (<minutes>)` in `warning`. Idle: `<name> idle (<elapsed of lastJobMs>)` all dim.
- `register.tsx`: the D-007 hooks (`agent.spawn`, `session.send`, `turn.complete`), the roster copy, the 5 s timer; the render draws the agents line between the work and session lines.

**Done when:**
- **T-4.1** `band.test.ts` shows a running `developer` started 192 s ago and an idle `architect` whose last turn took 250 s read `⚇ developer working (3m12s) · architect idle (4m10s)`.
- **T-4.2** `band.test.ts` shows an idle `developer` reads `developer waiting (6m)` when the work item's actor is `user` and `by` is `developer`, and `developer idle (...)` when `by` is `reviewer`.
- **T-4.3** `band.test.ts` shows no agents line when the roster is empty or holds only `completed`, `failed` and `killed` agents.
- **T-4.4** `register.test.tsx` shows `agent.spawn`, then `turn.complete` with that `agentId` and `durationMs: 250000`, draws `(4m10s)` for it, and a later `session.send` to its name draws it as working from the send's time.
- **T-4.5** `register.test.tsx` with `mock.clock` shows a working agent's time moves from `(3m12s)` to `(3m17s)` after `advance(5000)`.
- **T-4.6** `claude plugin test status` passes, and in a live session with an agent working the band shows all three lines (OQ-001 names the fallback).

## Open questions

- **OQ-001** `claude plugin test status` has refused before with "hooks modules are turned off in this process: the rollout switch was saved off", seen from a subagent shell. Owner: developer, then the lead. Fallback: run `claude plugin validate --strict status`, quote the refusal in the phase's block, and the user checks the band in a live `npm run claude` session at the phase gate.
- **OQ-002** Users who install Picket only as a project devDependency or through `npx` may have no `picket` on PATH. Owner: user. Fallback: the work line stays hidden (D-006) and the agents and session lines work as designed; a launcher path setting is a separate request.

## Revision log
