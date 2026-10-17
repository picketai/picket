---
kind: design
lane: design
title: Session line moves to the status line
date: 2026-10-17
audience: developer
sources: [request.md, https://code.claude.com/docs/en/statusline.md (fetched 2026-10-17), work/20261016-redesign-picket-status-band-as-concept-a/design.md, tmp/design-picket-status/project/Main.dc.html, status/hooks/band.ts, status/hooks/format.ts, status/hooks/register.tsx, status/types/index.d.ts, status/hooks/format.test.ts, status/hooks/band.test.ts, status/hooks/register.test.tsx, status/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, core/bin/picket.mjs, core/lib/init.mjs, core/lib/transcript.mjs, core/lib/paths.mjs, core/lib/drive.mjs, core/lib/hooks/guard.bash.mjs, test/hooks/handlers.test.mjs, test/kernel/init.test.mjs, test/kernel/cli.test.mjs, bench/test/adapters.test.mjs, bench/adapters/plugin.mjs, scripts/test.mjs, docs/how-to.md, a 2.1.301 session transcript]
phases:
  - n: 1
    files: [core/lib/statusline.mjs, test/kernel/statusline.test.mjs, test/kernel/statusline-input.json, test/kernel/statusline-transcript.jsonl]
    greps:
      - path: core/lib/statusline.mjs
        pattern: 'export function renderStatusline\b'
      - path: core/lib/statusline.mjs
        pattern: 'export function lastSkill\b'
      - path: core/lib/statusline.mjs
        pattern: '0\.83'
      - path: core/lib/statusline.mjs
        pattern: '38;2;215;119;87'
      - path: core/lib/statusline.mjs
        pattern: 'EDGE_COLUMNS = 2\b'
    tests: true
    drive: false
    security: false
  - n: 2
    files: [core/bin/picket.mjs, core/lib/hooks/guard.bash.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: core/bin/picket.mjs
        pattern: 'case "statusline"'
      - path: core/bin/picket.mjs
        pattern: 'Verbs: [\w -]*\bstatusline\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'KERNEL_OTHER_VERBS = new Set\(\[[^\]]*"statusline"'
      - path: test/kernel/cli.test.mjs
        pattern: 'statusline'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [core/lib/init.mjs, test/kernel/init.test.mjs, bench/test/adapters.test.mjs]
    greps:
      - path: core/lib/init.mjs
        pattern: 'command: "picket statusline"'
      - path: core/lib/init.mjs
        pattern: 'refreshInterval: 5\b'
      - path: core/lib/init.mjs
        pattern: 'settings\.local\.json'
      - path: test/kernel/init.test.mjs
        pattern: 'USERPROFILE'
      - path: bench/test/adapters.test.mjs
        pattern: 'statusLine'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [status/hooks/register.tsx, status/hooks/band.ts, status/hooks/format.ts, status/types/index.d.ts, status/hooks/band.test.ts, status/hooks/format.test.ts, status/hooks/register.test.tsx, status/.claude-plugin/plugin.json, .claude-plugin/marketplace.json]
    greps:
      - path: status/hooks/band.ts
        pattern: '^(?![\s\S]*sessionLine)'
        flags: i
      - path: status/hooks/register.tsx
        pattern: '^(?![\s\S]*(session\.measure|turn\.step|ModelSwitch|autoCompactThreshold))'
        flags: i
      - path: status/hooks/format.ts
        pattern: '^(?![\s\S]*(compactTokens|untilReset|contextColor|cacheLeft))'
        flags: i
      - path: status/hooks/register.tsx
        pattern: "key: 'now'"
      - path: status/.claude-plugin/plugin.json
        pattern: 'The open work item and its agents, above the prompt'
      - path: .claude-plugin/marketplace.json
        pattern: 'The open work item and its agents, above the prompt'
    tests: true
    drive: true
    security: false
---
# Design: Session line moves to the status line

## Problem

The session line of the picket-status band (`status/hooks/band.ts:74`, fed by six hooks in `status/hooks/register.tsx`) moves into Claude Code's own status line, keeping the Concept A text and colours of `work/20261016-redesign-picket-status-band-as-concept-a/design.md` (D-001 (r3), D-002 (r2), D-003, D-004). The status line contract is a shell command that gets JSON on stdin, prints one row per line, may use ANSI escapes, and reads its width from `COLUMNS`; it goes blank when the command exits nonzero or prints nothing (docs page, "Script errors or hangs"). The binding constraints: a plugin cannot import from `core/` at runtime, because the marketplace cache copies only `status/`; every CLI verb must sit in exactly one guard verb set (`test/hooks/handlers.test.mjs:286`), and `core/lib/hooks/guard.bash.mjs` is staged mid-phase by `20261016-guard-escalation-through-native-ask-dialog`; no comments in code; mod tests run under `claude plugin test status`, outside `npm test`.

## Decisions

### D-001: The session line lives in one kernel module
**Decision:** Infrastructural decision. A new module `core/lib/statusline.mjs` holds the session line and every helper it alone uses: `prettyModel`, `compactTokens`, `untilReset`, `bar`, `levelColor`, `contextColor`, `cacheLeft`, plus `widthOf` and `rows` (the D-001 (r3) split rule: one row padded to `columns` when `left + 2 + right` code points fit, else the left row, then the right row). Phase 4 deletes the mod's copies of the session helpers, so each has one copy. `widthOf` and `rows` stay in `status/hooks/band.ts` too, because the work line still has a right part; both test files pin the same rule, one row padded to the width when the parts fit and two rows when they do not.
**Instead of:** one shared source both sides import: the plugin cache holds only `status/`, so a shared file would need a build step that copies it, and this repo has no build.
**Risks:**
- **RISK-001** The two `rows` copies drift. Mitigation: it is 10 lines with no dependency, and both test files pin the exact padded width and the split.
- **RISK-002** Until phase 4 lands, the helpers exist twice and a user with both the mod and the status line sees the session line twice. Mitigation: all four phases ship in one release; phase 4 removes the mod's copy.

### D-002: Status line figures come from the stdin JSON
**Decision:** Infrastructural decision. `factsOf(input, { now, skill })` maps the documented fields to one plain object, and `sessionLine(facts)` builds the D-002 (r2) line from it with the same text, parts and order as `band.ts` today:
- model: `model.id` through `prettyModel`; absent reads `...`
- effort: `effort.level`; absent reads `default`
- skill: `lastSkill(transcript_path)` (D-003); none reads `none`
- `5h`, `7d`: `rate_limits.five_hour` and `.seven_day`, `used_percentage` rounded, `resets_at` in epoch seconds times 1000 into `untilReset`; a missing window reads `n/a`
- `ctx`: tokens `context_window.total_input_tokens` (the docs: tokens now in the window, cache included), window `context_window_size` (absent reads `?`), percent `used_percentage` rounded (null reads 0)
- context bar colour: `contextColor(tokens, 0.83 * window)`, under 0.65 of it `success`, 0.65 to under 0.85 `warning`, 0.85 and up `error`; with no window, `levelColor(percent)`
- `cache <tokens>`: `context_window.current_usage.cache_read_input_tokens`; null reads `n/a`
- `$<cost>`: `cost.total_cost_usd` to two decimals; absent drops the part

`renderStatusline(input, { now, columns })` lays the line out at `columns - EDGE_COLUMNS` with `EDGE_COLUMNS = 2`, where `columns` is used when it is a positive integer and is 80 otherwise, paints each row (D-004), and joins the rows with `\n`.
**Instead of:** the engine's own compaction threshold, as the mod read it from `breakdown.autoCompactThreshold`: the stdin JSON carries no threshold, and the request fixes 83%.
**Risks:**
- **RISK-003** The status line row has built-in spacing the docs do not size ("in addition to the interface's built-in spacing"), so a row padded to the full width can wrap or clip. Mitigation: `EDGE_COLUMNS` keeps 2 cells free; OQ-003 settles the value in the live check.
- **RISK-004** Outside fullscreen, notifications share the status line row on the right and may cover the right part. Mitigation: they are transient; the docs name no way around it.

### D-003: Cache time left from `prompt_cache`; the transcript gives only the skill
**Decision:** Infrastructural decision. The cache countdown reads the documented `prompt_cache` object (Claude Code 2.1.251 and later; `docs/how-to.md:21` tests 2.1.296): `ttl` (`5m` or `1h`), `expires_at` (epoch seconds), `warm`, `caching_observed`. `cacheLeft` keeps the mod's rules: no `◷` part when `prompt_cache` is absent or `caching_observed` is false; `cold` bold `error` when `warm` is false, `expires_at` is null, or the time is past; otherwise `◷ <whole minutes, rounded up>m`, prefixed `~` only when `ttl` is absent, `warning` under 5 minutes and dim from 5 up. The transcript is read for one fact: `lastSkill(path, maxBytes)` takes `readTail` from `core/lib/transcript.mjs` (4 MB default window), walks lines from the end, parses only lines holding `"name":"Skill"`, and returns `input.skill` of the last `tool_use` named `Skill` in a `type: "assistant"` entry (shape seen in a 2.1.301 transcript, where `api-request-shape` lines also hold that text); a missing file or no hit returns null.
**Instead of:** the request's wording, the last model reply time from the transcript plus an assumed 5 minute TTL: `prompt_cache` gives the engine's own TTL and expiry on every supported version, so the guess and its `~` would show where a fact exists. OQ-001 asks the user to confirm.
**Risks:**
- **RISK-005** A Skill call older than the 4 MB tail reads `none`. Mitigation: lane skills load at the start of a request, far inside 4 MB; a whole-file read every 5 s costs more than it saves.

### D-004: Colours are 24-bit ANSI from the Concept A palette
**Decision:** Infrastructural decision. Pieces keep the mod's colour keys, and one table maps each to the canvas hex (`tmp/design-picket-status/project/Main.dc.html:37`) as `38;2;r;g;b`: `claude` 215;119;87, `permission` 177;185;249, `ide` 71;130;200, `inactive` 138;138;138, `success` 78;186;101, `warning` 255;193;7, `error` 255;107;128; `dim: true` is the canvas dim 107;107;107. `paint(pieces)` writes a piece with codes as `ESC[` + codes joined by `;` (`1` first when bold) + `m` + text + `ESC[0m`, and a piece with no colour and no style as bare text, so plain text keeps the terminal's own colour.
**Instead of:** the 16 basic ANSI colours the docs show: they have no orange or violet, so `◆`, the model and the effort would lose the Concept A look the request keeps.
**Risks:**
- **RISK-006** The docs show basic colours only, so 24-bit escapes may draw wrong in some terminal. Mitigation: the palette is one table; a switch to 256 or basic codes is a one-table change, and phase 2's live check looks at it.
- **RISK-007** Hex values ignore a light theme, which the mod's theme keys followed. Mitigation: the status line has no theme access; the mod's own lines keep theme keys.

### D-005: `picket statusline` is a rendering verb that never fails
**Decision:** Infrastructural decision. `core/bin/picket.mjs` gains `case "statusline"`: it reads all of stdin (an error reads as empty), parses it as JSON (empty or invalid input reads as `{}`), writes `renderStatusline(input, { now: Date.now(), columns: Number(process.env.COLUMNS) })` and a newline, and returns 0, so the status line is never blanked by an exit code. It prints text, not JSON, as `packet` does. The verb joins the `Verbs:` list and `KERNEL_OTHER_VERBS` in `core/lib/hooks/guard.bash.mjs:425`; that set is read only by the verb-set test, so guard behaviour does not change. The verb name and its stdin contract are written into user projects by `picket init` (D-006), so once released they are a published contract [IRREVERSIBLE].
**Instead of:** a second bin such as `picket-statusline` that skips the CLI's imports: measured on this machine, `picket find-verdict` starts in about 120 ms against 90 ms for bare `node -e 0`, a cost too small to justify a second bin, a second npm shim and a second settings string.
**Risks:**
- **RISK-008** A later rename breaks every project's status line. Mitigation: the [IRREVERSIBLE] mark; a rename keeps `statusline` as an alias.
- **RISK-009** `KERNEL_READ_VERBS` would also fit (the verb writes nothing), and a reviewer may ask why not. Mitigation: other is the conservative set, adding it changes no classification, and `Bash(picket *)` from `picket init` allows it either way.

### D-006: `picket init` writes the status line into project settings unless one is set
**Decision:** Infrastructural decision. The existing settings step (`core/lib/init.mjs:129`) also sets `statusLine: { type: "command", command: "picket statusline", refreshInterval: 5 }` in `.claude/settings.json`, after the existing keys, when no `statusLine` key is in that file, in `.claude/settings.local.json`, or in `<home>/.claude/settings.json`. When one is, the step leaves the project file's status line as it is and adds the detail `statusLine already set in <path>` (joined with `; ` to any deny warning). `init(root, options)` takes `home` (default `homedir()`) so tests read a temp home. Project settings because they already enable picket-status for everyone who pulls; once phase 4 drops the session line from the mod, those teammates need the status line too.
**Instead of:** `.claude/settings.local.json`: it reaches only the person who ran init, so teammates who pull lose the session line with phase 4.
**Risks:**
- **RISK-010** A teammate's own user-level status line is overridden by the project setting, since project settings outrank user settings. Mitigation: their `.claude/settings.local.json` outranks the project file; the init detail line names the setting.
- **RISK-011** With no `picket` on PATH (npx or devDependency installs) the status line is blank. Mitigation: OQ-002.

### D-007: The mod keeps the work and agents lines only
**Decision:** Infrastructural decision. `status/hooks/register.tsx` drops the `bar` atom and every hook that only fed it (`turn.step`, `session.measure`, `tool.call` on `Skill` and `Agent`, `classic.PreModelSwitch`, `classic.PostModelSwitch`, and the model and usage reads at `session.start`). A `now` atom (`{ plugin: 'picket-status', key: 'now' }`, a number) takes over the clock that the 30 s and 5 s timers move today. The render draws `workLine` then `agentsLine`; when both are null it returns `next(e)`, so no blank padding row is left. `band.ts` loses `sessionLine` and its parts; `format.ts` keeps `elapsed`, `minutes` and `stepText`; `types/index.d.ts` drops `Bar`, `Limit` and `CacheTtl`. The manifest and marketplace descriptions change to `The open work item and its agents, above the prompt`.
**Instead of:** keeping the session line in the mod behind a setting: two renderers of one line is the duplication D-001 removes.
**Risks:**
- **RISK-012** A user who has the mod and not the status line loses the session line. Mitigation: `picket init` writes it (D-006), and the init detail says when it did not.

## Scope

**In:** `core/lib/statusline.mjs` and its tests and fixtures; the `picket statusline` verb and its guard set entry; the init settings change and its tests, the bench settings test included; the mod trim, its tests and the two description strings.
**Out:** `.claude/settings.json` of this repository (the live check sets the status line in `.claude/settings.local.json`); the guard's classification of any verb; `.claude/bin/statusline.mjs`; a light-theme palette; `subagentStatusLine`; README and `docs/how-to.md` text (OQ-005).

## Phase 1: Session line renderer in the kernel

**Touch set:**
- `core/lib/statusline.mjs`: new; facts, line, layout, paint [INFERRED new file]
- `core/lib/transcript.mjs`: read only; `readTail` imported, not edited
- `status/hooks/band.ts`: read only; source of the ported parts
- `status/hooks/format.ts`: read only; source of the ported helpers
- `test/kernel/statusline.test.mjs`: new; figures, layout, paint, skill [INFERRED new file]
- `test/kernel/statusline-input.json`: new; canvas stdin fixture [INFERRED new file]
- `test/kernel/statusline-transcript.jsonl`: new; two Skill calls [INFERRED new file]

**Changes:**
- `statusline.mjs` exports, plain ESM with no imports beyond `node:` modules and `./transcript.mjs`:
  - `Piece = { text, color?, bold?, dim? }`, `Line = { left: Piece[], right: Piece[] }` as plain objects
  - `factsOf(input, { now, skill })` returns `{ model, effort, skill, limits: { five_hour, seven_day }, contextTokens, contextWindow, contextPercent, cacheRead, cache, cost, now }`, each limit `{ percent, resetsAt }` (ms) or null, `cache` `{ observed, warm, ttl, expiresAt }` (ms) or null (D-002, D-003)
  - `sessionLine(facts): Line`, `widthOf(pieces)`, `rows(line, columns): Piece[][]`, `paint(pieces): string` (D-004)
  - `lastSkill(path, maxBytes?)` (D-003)
  - `renderStatusline(input, { now, columns }): string` (D-002), with `EDGE_COLUMNS = 2`
  - the helpers of D-001, ported from `format.ts` with today's outputs; `untilReset(resetsAtMs, now)` takes ms or null
- `statusline-input.json`: the canvas figures as stdin JSON (model `claude-opus-5-5`, effort `high`, the two windows, context 62 000 of 200 000 at 31%, cache read 48 000, `prompt_cache` `ttl: "1h"`, cost 4.12) with `transcript_path: "test/kernel/statusline-transcript.jsonl"`; tests copy it and set the times from their fixed `now`.
- `statusline-transcript.jsonl`: an assistant entry calling `Skill` with `picket:designing`, a later one with `picket:ordering`, and an `api-request-shape` line holding `"name":"Skill"`.

**Done when:**
- **T-1.1** `statusline.test.mjs` shows `renderStatusline` for the fixture with 5h 42% resetting in 134 minutes, 7d 71% in 78 hours and the cache expiring in 52 minutes, at 160 columns, prints one row of 158 code points with escapes stripped, starting `◆ Opus 5.5 · high · picket:ordering` and ending `5h 42% (2h14m)   7d 71% (3d6h)   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k ◷ 52m   $4.12`.
- **T-1.2** The same input at 90 columns prints two rows, the left part and then the right part, and with `columns` NaN it lays out at 78.
- **T-1.3** `contextColor` on a 200 000 window gives `success` for 100 000 tokens, `warning` for 120 000 and `error` for 145 000.
- **T-1.4** The cache part reads `◷ 2m` in `warning` for `ttl: "5m"` expiring in 2 minutes, `◷ ~3m` when `ttl` is absent, `cold` bold `error` when `warm` is false, and is absent when `caching_observed` is false.
- **T-1.5** Input `{}` reads `◆ ... · default · none` on the left and `5h n/a   7d n/a   ctx [░░░░░░░░░░] 0/? (0%)   cache n/a` on the right.
- **T-1.6** `lastSkill` returns `picket:ordering` for the fixture transcript, null for a missing file, and null when `maxBytes` cuts both Skill lines off.
- **T-1.7** `paint` writes the `◆ ` piece as `\x1b[38;2;215;119;87m◆ \x1b[0m`, the model as `\x1b[1;38;2;215;119;87mOpus 5.5\x1b[0m`, and the cost with no escape.
- **T-1.8** `npm test` passes.

## Phase 2: The `picket statusline` verb

The lead starts this phase only after `picket state 20261016-guard-escalation-through-native-ask-dialog` reports `status: done` and `git diff --cached --name-only` lists no path under `core/lib/hooks/`.

**Touch set:**
- `core/bin/picket.mjs`: `case "statusline"`, `Verbs:` list
- `core/lib/hooks/guard.bash.mjs`: `statusline` into `KERNEL_OTHER_VERBS`
- `test/hooks/handlers.test.mjs`: read only; verb-set test at line 286
- `test/kernel/cli.test.mjs`: verb tests over stdin
- `core/lib/statusline.mjs`: read only; `renderStatusline` from phase 1
- `test/kernel/statusline-input.json`: read only; stdin for tests and drive

**Changes:**
- `picket.mjs`: import `renderStatusline` from `../lib/statusline.mjs`; `case "statusline"` as D-005 states, writing with `process.stdout.write` and returning 0; `statusline` joins the `Verbs:` string of the default case.
- `guard.bash.mjs:425`: the string `"statusline"` joins `KERNEL_OTHER_VERBS`; no other edit.
- `cli.test.mjs`: tests that spawn `node core/bin/picket.mjs statusline` with `input` on stdin and `COLUMNS` in `env`, stripping escapes with `/\x1b\[[0-9;]*m/g` before comparing text.

**Done when:**
- **T-2.1** `cli.test.mjs` shows the fixture on stdin with `COLUMNS=160` exits 0 with empty stderr and prints one line of 158 code points, escapes stripped, starting `◆ Opus 5.5 · high · picket:ordering`.
- **T-2.2** `cli.test.mjs` shows the fixture with `COLUMNS=90` prints two lines, the second starting `5h `.
- **T-2.3** `cli.test.mjs` shows stdin `not json` and empty stdin each exit 0 and print a line starting `◆ ... · default · none`, escapes stripped.
- **T-2.4** The verb-set test in `test/hooks/handlers.test.mjs` passes with `statusline` in the `Verbs:` list, and `npm test` passes.
- **T-2.5** `picket drive --run "node core/bin/picket.mjs statusline < test/kernel/statusline-input.json" --env COLUMNS=160` exits 0 and its output holds `38;2;215;119;87m◆`.
- **T-2.6** In a live `npm run claude` session with `.claude/settings.local.json` holding `statusLine` `{ "type": "command", "command": "node D:/workspace/github/AISpec/core/bin/picket.mjs statusline", "refreshInterval": 5 }` (the global picket lacks the verb), the user sees the session line in the Concept A colours with the right part ending near the right edge and not wrapping (OQ-003).

## Phase 3: `picket init` writes the status line

**Touch set:**
- `core/lib/init.mjs`: `statusLine` in the settings step, `home` option
- `core/bin/picket.mjs`: read only; `init` case keeps its call
- `test/kernel/init.test.mjs`: temp home, new settings shape, skip cases
- `bench/test/adapters.test.mjs`: compare every key but `statusLine`
- `bench/adapters/plugin.mjs`: read only; runs init with the real home

**Changes:**
- `init.mjs`: a constant `STATUS_LINE = { type: "command", command: "picket statusline", refreshInterval: 5 }`. `mergeSettings(settings, { statusLineAt = null } = {})` appends `statusLine: STATUS_LINE` when `settings` has no `statusLine` key and `statusLineAt` is null; its other behaviour is unchanged. `settingsStep(root, { home })` finds the first file that holds a `statusLine` key among `.claude/settings.json`, `.claude/settings.local.json` and `<home>/.claude/settings.json`, where a file that is missing or not JSON holds none, and passes that path as `statusLineAt` for the other two. The detail `statusLine already set in <path>` is added when that path is the local or user file, or the project file with a `statusLine` other than `STATUS_LINE`. `init(root, { install, exec, market, home = homedir() })` hands `home` to the steps.
- `init.test.mjs`: `runInit` sets `HOME` and `USERPROFILE` to a fresh temp folder unless the test gives its own; `INIT_SETTINGS` gains the `statusLine` object; the key-order test expects `["outputStyle", "permissions", "env", "statusLine"]`.
- `adapters.test.mjs`: the settings comparison drops `statusLine` first (`const { statusLine, ...rest }`), because the bench runs init against the developer's real home.

**Done when:**
- **T-3.1** `init.test.mjs` shows a fresh repo with an empty temp home gets `.claude/settings.json` equal to `env`, `permissions` and then `statusLine: { type: "command", command: "picket statusline", refreshInterval: 5 }`, ending in `}\n`.
- **T-3.2** A second init reports `settings: unchanged` and leaves the file byte-identical.
- **T-3.3** A project file holding `statusLine: { type: "command", command: "my-line" }` keeps it equal, and the step detail reads `statusLine already set in <that file>`.
- **T-3.4** A `statusLine` in `.claude/settings.local.json`, and separately one in `<temp home>/.claude/settings.json`, each leave the project file with no `statusLine` key and the detail naming that file; the local and user files are unchanged.
- **T-3.5** A user settings file that is not JSON fails no step and counts as holding no status line.
- **T-3.6** `npm test` passes, `bench/test/adapters.test.mjs` included.
- **T-3.7** `picket drive --run "node core/bin/picket.mjs init --no-install --root <temp git repo> --human"` with `--env HOME=<temp home> --env USERPROFILE=<temp home>` exits 0, prints `settings: created`, and the written file holds the `statusLine` object.

## Phase 4: The mod keeps the work and agents lines

**Touch set:**
- `status/hooks/register.tsx`: session hooks out, `now` atom, empty render
- `status/hooks/band.ts`: `sessionLine` and its parts out
- `status/hooks/format.ts`: session helpers out
- `status/types/index.d.ts`: `Bar`, `Limit`, `CacheTtl` out; `now` key
- `status/hooks/band.test.ts`: session cases out; `rows` on a work line
- `status/hooks/format.test.ts`: session helper tests out
- `status/hooks/register.test.tsx`: TTL test out; empty and clock tests
- `status/.claude-plugin/plugin.json`: new description
- `.claude-plugin/marketplace.json`: new picket-status description

**Changes:**
- `register.tsx`: D-007 as written. `session.start` keeps `next(e)`, the launcher reset, `refreshWork`, both timers and `syncRoster`, and sets `now`; the 30 s timer and the 5 s timer (while an agent works) move `now`; `agent.spawn`, `session.send`, `turn.complete`, `tool.call` on `Bash` and the `hasSurvey` guard stay as they are.
- `band.ts`: keeps `widthOf`, `rows`, `workLine`, `agentsLine`, `agentState`, `isWorking`, `isEnded`.
- `types/index.d.ts`: `PluginState['picket-status']` is `{ now: number; work: Work | null; agents: AgentRow[] }`.
- `format.test.ts`: the session helper tests go; tests for `elapsed` (`42s`, `3m12s`, `1h05m`) and `minutes` (`6m`, `1h05m`) take their place.
- Both descriptions read `The open work item and its agents, above the prompt`.

**Done when:**
- **T-4.1** `band.test.ts` keeps today's work and agents cases unchanged, and its `rows` case on a work line pins one row padded to exactly 158 code points at 158 columns and two rows at 60.
- **T-4.2** `register.test.tsx` shows that with no open item and no working or waiting agent the render returns the engine's own tree (`engine`).
- **T-4.3** `register.test.tsx` shows that with an open item the band has a row starting `▶` and no Text `Opus 5.5` or `◆`.
- **T-4.4** `register.test.tsx` shows a user gate whose `since` is 6 minutes ago reads `6m`, then `7m` after `clock.advance(60_000)`, and the 5 s agent clock test still passes.
- **T-4.5** `git grep -n -E "compactTokens|untilReset|contextColor|cacheLeft|sessionLine|lastRequestAt" -- status/` prints nothing.
- **T-4.6** `claude plugin validate --strict status` exits 0 and `claude plugin test status` passes (OQ-004).
- **T-4.7** In the live session of T-2.6, the band above the prompt shows only the work and agents lines, draws nothing when neither has content, and the status line still shows the session line.

## Open questions

- **OQ-001** The request words the cache countdown as the transcript's last reply time plus an assumed 5 minute TTL; D-003 reads the documented `prompt_cache` instead. Owner: user. Fallback: D-003 as written; choosing the request's mechanism amends D-003 and T-1.4 before phase 1 is approved.
- **OQ-002** Projects that install Picket as a devDependency or run it through `npx` have no `picket` on PATH, so the status line is blank. Owner: user. Fallback: init writes `picket statusline` as requested; such a user sets `statusLine.command` to `node <install path>/core/bin/picket.mjs statusline` with forward slashes (docs, "Windows configuration"). A launcher setting is a separate request.
- **OQ-003** The width of the status line row's built-in spacing is not documented. Owner: user, at the T-2.6 live check. Fallback: `EDGE_COLUMNS = 2`; another value amends D-002 by one constant.
- **OQ-004** `claude plugin test status` has refused before with "hooks modules are turned off in this process: the rollout switch was saved off". Owner: developer, then the lead. Fallback: run `claude plugin validate --strict status`, quote the refusal in the phase block, and the user checks the band live at the phase gate.
- **OQ-005** README and `docs/how-to.md` say nothing of the status line or of `picket statusline`. That is document text, not phase scope. Owner: lead, through `picket:documenting` after close. Fallback: no document changes ship with this item.

## Revision log
