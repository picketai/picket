---
kind: design
lane: design
title: Saved scenarios and kernel replay
date: 2026-11-15
audience: developer
sources:
  - work/20261115-saved-scenarios-and-kernel-replay/request.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - work/20261113-declared-checks-verified-by-picket-verify/design.md
  - work/20261114-standard-test-environment-and-env-verbs/design.md
  - src/lib/shared/work/declared-checks.mts
  - src/lib/shared/drive-log.mts
  - src/lib/verbs/drive/index.mts
  - src/lib/verbs/drive/server.mts
  - src/lib/verbs/verify/index.mts
  - src/lib/verbs/env/start.mts
  - src/lib/verbs/env/check.mts
  - src/lib/shared/env/build-plan.mts
  - src/lib/shared/env/stacks.mts
  - src/lib/shared/env/standard.mts
  - src/lib/shared/env/config-entries.mts
  - src/lib/shared/route/plan.mts
  - src/lib/shared/route/apply.mts
  - src/lib/shared/route/commit.mts
  - src/lib/shared/route/route.mts
  - src/lib/shared/work/gate.mts
  - src/lib/verbs/packet/packet.mjs
  - src/lib/verbs/close/close.mts
  - src/lib/hooks/guard/scope/index.mts
  - src/lib/hooks/guard/bash/kernel.mts
  - src/lib/util/yaml-lite.mts
  - src/skills/expediting/SKILL.md
  - src/skills/implementing/SKILL.md
  - test/timing/budgets.test.mjs
  - test/fixtures/env/fake-engine.mjs
phases:
  - n: 1
    files: [src/lib/shared/scenarios/format.mts, src/lib/shared/scenarios/format.test.mts, src/lib/shared/scenarios/rules.mts, src/lib/shared/scenarios/rules.test.mts, src/lib/shared/scenarios/files.mts, src/lib/shared/scenarios/files.test.mts, src/lib/shared/env/standard.mts, src/lib/shared/env/config-entries.mts, src/lib/verbs/env/check.mts, src/lib/verbs/env/check.test.mts, test/fixtures/env/umbrella/.picket/env/scenarios/S-0001.md, test/cli/env.test.mjs]
    greps:
      - path: src/lib/shared/scenarios/format.mts
        pattern: export function parseScenario\b
      - path: src/lib/shared/scenarios/format.mts
        pattern: \bSTEP_WORDS\b
      - path: src/lib/shared/scenarios/rules.mts
        pattern: export function scenarioProblems\b
      - path: src/lib/verbs/env/check.mts
        pattern: \blistScenarios\b
    tests: true
    drive:
      - covers: T-1.7
        command: node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["rules passed", "scenarios: 1 active, 0 deprecated"]
    security: true
  - n: 2
    files: [src/lib/shared/scenarios/values.mts, src/lib/shared/scenarios/values.test.mts, src/lib/shared/scenarios/http.mts, src/lib/shared/scenarios/http.test.mts, src/lib/shared/scenarios/runner.mts, src/lib/shared/scenarios/runner.test.mts, test/timing/budgets.test.mjs]
    greps:
      - path: src/lib/shared/scenarios/runner.mts
        pattern: export (async )?function runScenario\b
      - path: src/lib/shared/scenarios/values.mts
        pattern: PICKET_USER_
      - path: src/lib/shared/scenarios/http.mts
        pattern: \bfetch\b
      - path: test/timing/budgets.test.mjs
        pattern: \bscenario_core_lines\b
      - path: test/timing/budgets.test.mjs
        pattern: \bscenario_adapter_lines\b
    tests: true
    drive:
      - covers: T-2.7
        command: node scripts/test.mjs timing
        exit_code: 0
    security: true
  - n: 3
    files: [src/lib/shared/scenarios/keys.mts, src/lib/shared/scenarios/keys.test.mts, src/lib/shared/scenarios/results.mts, src/lib/shared/scenarios/results.test.mts, src/lib/shared/scenarios/compare.mts, src/lib/shared/scenarios/compare.test.mts, src/lib/shared/env/build-plan.mts, src/lib/shared/env/build-plan.test.mts, src/lib/shared/paths.mts]
    greps:
      - path: src/lib/shared/scenarios/keys.mts
        pattern: export function workingKey\b
      - path: src/lib/shared/scenarios/keys.mts
        pattern: export function baseKey\b
      - path: src/lib/shared/scenarios/compare.mts
        pattern: no base result
      - path: src/lib/shared/paths.mts
        pattern: scenarios/results\.jsonl
    tests: true
    drive: false
    security: false
  - n: 4
    files: [src/lib/shared/scenarios/replay.mts, src/lib/shared/scenarios/replay.test.mts, src/lib/shared/scenarios/files.mts, src/lib/shared/scenarios/files.test.mts, src/lib/shared/paths.mts, src/lib/verbs/env/replay.mts, src/lib/verbs/env/replay.test.mts, src/lib/verbs/env/start.mts, src/lib/verbs/env/start.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts, test/fixtures/env/fake-engine.mjs, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"env replay": \(\) => import\("\.\./verbs/env/replay\.mts"\)'
      - path: src/lib/shared/scenarios/replay.mts
        pattern: \bunstable\b
      - path: test/fixtures/env/fake-engine.mjs
        pattern: \bPICKET_FAKE_PUBLISHED\b
    tests: true
    drive: true
    security: true
  - n: 5
    files: [src/lib/shared/scenarios/base-run.mts, src/lib/shared/scenarios/base-run.test.mts, src/lib/verbs/env/replay.mts, src/lib/verbs/env/replay.test.mts, test/env/lifecycle.engine.mjs]
    greps:
      - path: src/lib/shared/scenarios/base-run.mts
        pattern: '--detach'
      - path: src/lib/shared/scenarios/base-run.mts
        pattern: '--remove-orphans'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/scenarios/results.mts, src/lib/shared/scenarios/results.test.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/verify/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/scenarios/results.mts
        pattern: export function replaySummary\b
      - path: src/lib/verbs/verify/index.mts
        pattern: '"scenarios"'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: \breplaySummary\b
    tests: true
    drive: true
    security: false
  - n: 7
    files: [src/lib/shared/work/declared-checks.mts, src/lib/shared/work/declared-checks.test.mts, src/lib/shared/work/gate.mts, src/lib/shared/work/gate.test.mts, src/lib/shared/drive-log.mts, src/lib/shared/drive-log.test.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/index.test.mts, src/lib/verbs/env/replay.mts, src/lib/verbs/env/replay.test.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/work/declared-checks.mts
        pattern: \breplaces\b
      - path: src/lib/shared/work/gate.mts
        pattern: '"replacement"'
      - path: src/lib/shared/drive-log.mts
        pattern: export function maskedBody\b
      - path: src/lib/verbs/drive/index.mts
        pattern: \bmaskedBody\b
    tests: true
    drive: true
    security: true
  - n: 8
    files: [src/lib/hooks/guard/scope/index.mts, src/lib/hooks/guard/scope/index.test.mts, src/lib/hooks/guard/scope/index.variants.test.mts, src/lib/hooks/guard/bash/index.test.mts, test/hooks/guard.scope.test.mjs]
    greps:
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: \bSCENARIO_DIR\b
      - path: src/lib/hooks/guard/scope/index.variants.test.mts
        pattern: \bclosureFailure\b
    tests: true
    drive: true
    security: true
  - n: 9
    files: [src/lib/shared/scenarios/keep.mts, src/lib/shared/scenarios/keep.test.mts, src/lib/shared/scenarios/files.mts, src/lib/shared/scenarios/files.test.mts, src/lib/shared/paths.mts, src/lib/verbs/env/replay.mts, src/lib/verbs/env/replay.test.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/route.mts, src/lib/verbs/route/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/scenarios/keep.mts
        pattern: export function candidateCard\b
      - path: src/lib/shared/scenarios/files.mts
        pattern: export function nextScenarioId\b
      - path: src/lib/shared/route/plan.mts
        pattern: 'kind: "keep"'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '"keeps"'
    tests: true
    drive: true
    security: false
  - n: 10
    files: [src/lib/verbs/close/close.mts, src/lib/verbs/close/index.test.mts, src/skills/expediting/SKILL.md, src/skills/implementing/SKILL.md, src/agents/developer.md, src/agents/architect.md, src/skills/documenting/templates/design.md, src/skills/documenting/templates/order.md, src/lib/shared/work/declared-checks.test.mts, test/repo/markdown-paths.test.mjs]
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: '--affected'
      - path: src/skills/expediting/SKILL.md
        pattern: picket env replay <id> --affected
      - path: src/skills/implementing/SKILL.md
        pattern: picket env replay
      - path: src/agents/architect.md
        pattern: \breplaces\b
      - path: src/skills/documenting/templates/design.md
        pattern: "replaces:"
    tests: true
    drive:
      - covers: T-10.6
        command: node scripts/test.mjs unit build product timing
        exit_code: 0
    security: false
---
# Design: Saved scenarios and kernel replay

## Problem

SDR 00004 (Ratified; D-002, D-005, D-007, D-010, TF-003) binds build step 3: an approved declared check is kept as a saved scenario in a format Picket owns, the kernel replays saved scenarios with no model against an item's stack, and stored results show what a change broke against the last known results, in the order and design lanes and in the fast lane (draft `artifacts/strategy/drafts/testing-and-test-environment.md` sections 3.1 to 3.3, 3.8, 3.9 and 6). Steps 1 and 2 are built: `picket verify` compares declared checks with `picket drive` rows (`src/lib/shared/work/declared-checks.mts`), and `picket env start` builds and starts an item's stack with each app's version from git (`src/lib/verbs/env/start.mts`, `src/lib/shared/env/build-plan.mts`). Two facts of that code shape this design: a drive row logs the method, path, status and `contains` map of a hit but not the request body it sent, and a declared HTTP check names no service, while a stack holds several. The standard must fit any runtime and database (the request names dotnet, node and SQL Server 2016), so the format speaks only HTTP to named services and knows no stack.

## Decisions

### D-001: A scenario is a Markdown card over closed step lines
**Decision:** Infrastructural decision. A saved scenario is `.picket/env/scenarios/S-<4 digits>.md` at the umbrella root: a yaml-lite frontmatter header, then one step per line. Header keys, a closed list: `id`, `kind` (`normal`, `boundary`, `negative`, `permission`, `state`, `integration`, `smoke`), `covers` (a list of `<item id>/T-N.x`), `intent` (words the kernel never parses), optional `flow`, `supersedes`, `superseded_by`, `status` (`active`, the default, or `deprecated`), `format: 1`, and `fingerprint: sha256:<hex>` (the SHA-256 of the file with that line removed and line endings as LF). Step words, a closed list (`STEP_WORDS`): `request <METHOD> <target>`, with indented `header <Name>: <value>` and `body <one line>` lines under it; `expect status <code>`; `expect contains <JSON string>`; `capture <name> json <dotted.path>` or `capture <name> header <Name>`; `wait <n>s` with n from 1 to 20 (the drive's request timeout, `DEFAULT_TIMEOUT_MS` in `src/lib/verbs/drive/index.mts`). `expect` and `capture` read the latest answer. An unknown word fails as `step <n>: unknown step word "<word>"`. A format change is handled by recording again, never by a migration script. Example:
```
request POST {orders}/orders
  header content-type: application/json
  body {"sku":"PKT-{run}-1","due":"{date:+7d}"}
expect status 201
capture order_id json id
request GET {orders}/orders/{order_id}
expect contains "PKT-"
```
[IRREVERSIBLE] once released: the header keys, step words and `format: 1` become a public contract in users' repositories, as the `x-picket` block did (step 2 D-002).
**Instead of:** steps as a YAML or JSON list: yaml-lite throws on the nesting a request with headers needs, and a person editing by hand reads a line grammar more easily; a probe on 2026-11-15 showed yaml-lite round-trips the flat header exactly, `intent` with `: ` included.
**Risks:**
- **RISK-001** The grammar grows into a test framework (SDR RISK-003). Mitigation: `STEP_WORDS` is one constant, and the core's line budget is a test (D-003).

### D-002: Placeholders are the only value sources, and the safety rules check them
**Decision:** Infrastructural decision. A placeholder is `{name}` with a lower-case letter after the brace (pattern `\{([a-z][a-z0-9_]*(?::[A-Za-z0-9_.+-]+)?)\}`; a probe matched no part of nested JSON such as `{"a":{"b":1}}` or `[{"x":1}]`). The sources: `{<service>}` as the first token of a request target; `{run}`, the run key (four lower-case hex characters, new for every attempt); `{<name>}` captured by an earlier step of the same scenario; `{user:<role>.<field>}`, read from the variable `PICKET_USER_<ROLE>_<FIELD>`; `{date:+Nd}` or `{date:-Nd}`, the UTC date N days from the run day. `scenarioProblems(card, services)` runs before every run and in `env check`, and enforces the request's three rules: a target starts with `{<service>}` of the environment, never `http://` or a bare path (rule 1); no command step exists, because `STEP_WORDS` has none (rule 2); every placeholder resolves to one of the sources above, so no arbitrary variable is reachable (rule 3). It also refuses a literal date (pattern `\b\d{4}-\d{2}-\d{2}(?=T|\b)`) in a target, header, body or `contains`, and a literal value in a header or JSON body key whose name `isSecretName` (`src/lib/shared/env/config-entries.mts`) marks secret. A card therefore holds secrets only by name; captured values live in memory only, and results and output carry the template text, never the resolved text.
**Instead of:** leaving test users to the data catalog (TF-006): login is a scenario's usual first step (draft 3.7), and the fixed prefix names a test user without opening any other variable.
**Risks:**
- **RISK-002** The catalog later names test users differently. Mitigation: `{user:...}` resolution is one function in `values.mts`; the catalog can point it elsewhere without a format change.

### D-003: Engines behind adapters, a pure core, budgets as tests
**Decision:** Infrastructural decision. The core under `src/lib/shared/scenarios/` (`format.mts`, `rules.mts`, `values.mts`, `runner.mts`) is pure: the runner takes an `HttpAdapter = (request: { method; url; headers; body; timeoutMs }) => Promise<{ status: number | null; headers; text; error: string | null }>`, the service URLs, the environment variables, the day and the run key. `http.mts` is the one adapter, over Node's `fetch`, with the fetch function injectable for tests. `test/timing/budgets.test.mjs` gains `scenario_core_lines` (the sum of the four core files) and `scenario_adapter_lines` (`http.mts`). Their values follow OQ-001's fallback. Stack work reuses step 2's `engine.mts` and `start.mts`; nothing in the core spawns.
**Instead of:** a runner that calls `fetch` and the engine directly: every test would need a server and an engine, which the tests rule forbids in unit tests.

### D-004: Results are keyed by content, labelled by commit, confirmed by a second run
**Decision:** Infrastructural decision. `.picket/state/scenarios/results.jsonl` holds a `run` row per replay (`run`, `item`, `mode`: `full`, `affected`, `only` or `base`, `key`, `versions`, `reason` when nothing ran) and a `result` row per scenario (`run`, `scenario`, `fingerprint`, `key`, `versions`, `outcome`: `passed`, `failed`, `blocked` or `not run`, `attempts`, `unstable`, `class`, `detail`). The content key is `{ env, apps }`: `env` is the SHA-256 of the `git ls-tree -r` lines of `.picket/env/` minus `scenarios/`, and `apps` maps each app to the git tree id of its build context; `versions` are the commit labels `env start` already prints, so each result names the commit it ran on. The last known result is the latest `full`, `affected` or `base` row with the same scenario, fingerprint and key; `only` rows are kept apart (draft 3.8). The base key reads trees at the item's base with `git rev-parse <base>:<path>`, no checkout. When a confirmed failure has no stored base result, the replay builds the base in detached worktrees under `.picket/state/env/base/`, replays it there, stores `base` rows, then removes that stack and those worktrees. A failed attempt is run once more from the start: two failures confirm it, a pass and a failure mark it `unstable`. Classes, against the base: `passed`, `new failure`, `failing before the item`, `no base result`, `replaced by this item`, `unstable`, `blocked`, `not run`; only `new failure` and `no base result` are blamed on the item.
**Instead of:** keying by commit, as the request words it: a squash merge gives trunk a new commit with the same content, so an item's base would almost never have a stored result; the commit stays on every row as its label.
**Risks:**
- **RISK-003** Results live per machine, because `.picket/state/` is not tracked, so a new machine builds the base on its first replay. Mitigation: OQ-002.
- **RISK-004** A shared database changes between the base run and the item's run. Mitigation: confirmation by a second run, and `unstable` is never blamed.

### D-005: The developer replays, verify and close read the results
**Decision:** Infrastructural decision. `picket env replay <id> [--affected] [--only <S-id>]` starts the item's stack through `env start`'s code, replays every active scenario (or those of `--affected`, D-008, or one with `--only`), confirms failures, runs the base where needed (D-004), stores the rows and prints one line per scenario and a summary; it exits 2 on a blamed class. Without an engine it stores a `run` row with `reason: no container engine` and exits 2. The developer runs it in the drive step of a project with `.picket/env/compose.yaml`; `picket verify` adds a `scenarios` result read from the stored rows, never by starting a stack, so the guard's verify classification holds (`verifyRunsNoProjectCode` in `src/lib/hooks/guard/bash/kernel.mts`). The gate packet prints the latest replay's summary on a `scenarios` field.
**Instead of:** replaying inside `picket verify`: building images runs project code, so verify would leave the guard's read-only class.

### D-006: An approved check is kept from what ran, replayed alone, written on approval
**Decision:** Infrastructural decision. `picket drive` logs a hit's request body, with values under secret-named keys masked as `***`, when the phase declares HTTP checks. `env replay` turns each HTTP check of the current phase whose outcome is `pass` or `prefix` into a candidate card from the drive row it matched: the ran path, the logged body, the declared status and `contains`; literal dates become `{date:±Nd}` from the drive's day; each `PKT-<letters and digits>` becomes `PKT-{run}`; `kind` is `negative` for a status of 400 or more, else `normal`; `intent` is the criterion's text. The service is the check's optional `service` key, else the only `app` whose build context holds a path of the phase's `files`. Each candidate is replayed once from the start on its own, and its outcome is stored in `.picket/state/scenarios/candidates/<id>.json`. On approval of the phase (the user's or a run grant's) the kernel writes each passed candidate as the next `S-` id and the phase commit carries it. Never kept: a run check (rule 2), a `failed` or `not_run` check (this answers step 1's OQ-002 for scenarios), a body holding `***`, a changing method (`POST`, `PUT`, `PATCH`, `DELETE`) whose target and body hold no `PKT-` (SDR D-006: a scenario writes only to records it created), and a check with no single service.
**Instead of:** starting the stack and replaying inside the approval: `picket reply` runs in the lead's Bash call, and an image build can outlast its timeout; the candidate also lets the gate show what will be kept.
**Risks:**
- **RISK-005** The code changes after the candidate replay and before approval. Mitigation: a fix round reruns the replay, and verify's `scenarios` result fails on a stale key (phase 6).

### D-007: Replacement is named in the plan and applied on approval; hand changes are noticed
**Decision:** Infrastructural decision. A declared HTTP check may carry `replaces: S-<id>`. Such a phase is its own gate (`Gate.kind` `replacement`), so no run grant crosses it, and the packet names the scenario it replaces. Until approval the replaced scenario's failures are classed `replaced by this item`. On approval with a kept candidate, the kernel sets the old file's `status: deprecated` and `superseded_by`, the new one's `supersedes`, and recomputes both fingerprints; no file is deleted and no id reused (the next id is one above the highest in the folder and in `results.jsonl`). `guard.scope` denies Edit and Write under `.picket/env/scenarios/` for every Claude Code tool call, so no agent rewrites a scenario. A file whose fingerprint does not match its text was changed by hand: the replay checks it against D-002, replays it, prints `changed by hand`, and records the fingerprint in `.picket/state/scenarios/accepted.json`, after which it is the normal version on that machine. A hand change that breaks D-002 is `blocked` with the problem and is never accepted.
**Instead of:** a gate for a hand-changed scenario: the draft rejects it (section 12), since the change is the person's own choice.
**Risks:**
- **RISK-006** Two items on different machines take the same id. Mitigation: the two files collide at merge, which git reports.

### D-008: The fast lane replays what the change touched and refuses a close that broke it
**Decision:** Infrastructural decision. `--affected` selects the active scenarios whose request targets name an app whose tree differs from the base, or every scenario when the `env` part of the key differs. `picket close` of a fast item in a project with active scenarios refuses while the item has no `affected` run row, and while its latest one holds a blamed class, naming the scenario and the way out: fix the change, or, when the request changes that behaviour on purpose, `picket set <id> status=abandoned` and the order lane, which has the gate. A run row with `reason: no container engine` lets the close pass.
**Instead of:** prose alone in `picket:expediting`: the lead could close without replaying, and a rule code can check is a function.

## Scope

**In:**
- The card format, its parser and writer, the fingerprint, and `env check` reading the folder (D-001).
- The placeholders, the three safety rules, the date and secret rules (D-002).
- The HTTP adapter, the runner and the line budgets (D-003).
- Content keys, stored results, confirmation, classes and the base run (D-004).
- `picket env replay`, verify's `scenarios` result and the packet's `scenarios` field (D-005).
- The drive's logged request body, the `service` and `replaces` keys, candidates and keeping on approval (D-006).
- Replacement on approval, the guard on scenario files, hand-changed notices (D-007).
- The fast lane's affected replay and close refusal, and the contract texts that name the new verb and keys (D-008).

**Out:**
- The tester and `picket env step`, the data catalog and SQL files, new mock features, the browser adapter, known defects (`defect`, `known` header keys), the database guards.
- Running the gate's declared-check comparison on the environment instead of the drive log (draft section 1); the drive log stays the gate's source.
- The order-dependence check and the "passes at the base too" flag of draft 3.2, both tester concerns.
- The reference docs under `docs/` other than `docs/reference/cli.md`, which the build regenerates.

## Phase 1: The card format and the safety rules

**Touch set:**
- `src/lib/shared/scenarios/format.mts`: new; parse, write, fingerprint
- `src/lib/shared/scenarios/format.test.mts`: new
- `src/lib/shared/scenarios/rules.mts`: new; safety, date, secret rules
- `src/lib/shared/scenarios/rules.test.mts`: new
- `src/lib/shared/scenarios/files.mts`: new; list the scenario folder
- `src/lib/shared/scenarios/files.test.mts`: new
- `src/lib/shared/env/standard.mts`: add `SCENARIO_DIR`
- `src/lib/shared/env/config-entries.mts`: export `isSecretName`
- `src/lib/verbs/env/check.mts`: rule E11 and the count line
- `src/lib/verbs/env/check.test.mts`: E11 cases
- `test/fixtures/env/umbrella/.picket/env/scenarios/S-0001.md`: new; `GET {orders}/health`
- `test/cli/env.test.mjs`: the count line on the fixture

**Changes:** `standard.mts` gains `SCENARIO_DIR = ".picket/env/scenarios"`. `format.mts` exports `STEP_WORDS = ["request", "expect", "capture", "wait"] as const`, `HEADER_KEYS`, `KINDS`, the types `ScenarioHeader`, `RequestStep = { word: "request"; line: number; method; target; headers: [string, string][]; body: string | null }`, `ExpectStep` (`status` or `contains`), `CaptureStep` (`json` or `header`), `WaitStep = { seconds }`, `Card = { header: ScenarioHeader; steps: Step[] }`, and:
- `parseScenario(text): { card: Card | null; problems: string[] }`, every problem prefixed `header` or `step <n>` (the 1-based step line) as D-001 states: an unknown word, an unknown or missing header key, `format` other than 1, an `expect` or `capture` before any request, an indented line not under a request or not `header`/`body`, a `wait` outside 1 to 20, a `contains` that is not a JSON string.
- `writeScenario(card): string`, the header through yaml-lite's `stringify` and the steps in canonical spelling, with a fresh `fingerprint`; `fingerprintOf(text)`; `fingerprintMatches(text)`.

`rules.mts` exports `PLACEHOLDER` (D-002's pattern), `placeholders(text)` and `scenarioProblems(card, services: string[] | null)`, which returns rule problems: `rule 1: step <n> sends to <target>; a request goes only to {<service>} of the environment`, `rule 1: step <n> names {<x>}, which is no service of the environment` (skipped when `services` is null), `rule 3: step <n> takes {<x>}, which is no capture before it, the run key, a test user or a relative date`, `step <n>: fixed date <d>; write {date:+Nd}`, `step <n>: header <Name> holds a literal secret; take it from a capture or {user:<role>.<field>}`, and the same for a secret-named JSON body key. `files.mts` exports `type SavedScenario = { path; id: string | null; card: Card | null; problems: string[]; byHand: boolean }` and `listScenarios(root): SavedScenario[]`, sorted by file name, where `byHand` is `!fingerprintMatches(text)`, plus a duplicate-id problem.

`env check` adds rule E11 when the folder exists: one error finding per problem of a scenario, `E11 <S-id>: <problem>`, with the model's service names, and the line `scenarios: <a> active, <d> deprecated`. The fixture `S-0001.md` is written with `writeScenario`: `kind: smoke`, `request GET {orders}/health`, `expect status 200`, `expect contains "ok"`.

**Done when:**
- **T-1.1** `format.test.mts`: the D-001 example card parses into two request steps whose method, target, headers and body are asserted, two expects and one capture; `parseScenario(writeScenario(card))` equals the card, and the fingerprint matches.
- **T-1.2** Changing one character of a step line makes `fingerprintMatches` false; changing only the `fingerprint` line's value makes it false too, and rewriting with `writeScenario` makes it true.
- **T-1.3** Each parse problem of the Changes list has its own case asserting its message, including `step 4: unknown step word "click"` and `step 2: unknown step word "run"` for `run npm test` (rule 2).
- **T-1.4** `rules.test.mts`: `request GET https://orders.example.com/x`, `request GET /x` and `{billing}` with services `["orders"]` each give a rule 1 problem; `{home}`, `{token}` used before `capture token` and `{env:PATH}` each give a rule 3 problem; `{run}`, `{date:-1d}`, `{user:admin.password}` and a capture used after it give none.
- **T-1.5** `"due":"2026-11-22"` in a body and `2026-11-15T10:00:00Z` in a target each give the fixed-date problem; `header Authorization: Bearer abc` and `{"password":"p"}` give the secret problem, while `header Authorization: Bearer {token}` after `capture token` gives none.
- **T-1.6** `check.test.mts`: a scenario folder holding one broken card exits 2 with an `E11 S-0002:` line; a duplicate id gives a duplicate problem; without the folder no E11 line and no count line appear.
- **T-1.7** `node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella`, driven as `picket drive --run "<that command>" --env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, so the logged `run` equals the declared command and the engine is the fixture's on any machine, exits 0 and prints `rules passed` and `scenarios: 1 active, 0 deprecated`.

## Phase 2: Values, the HTTP adapter and the runner

**Touch set:**
- `src/lib/shared/scenarios/values.mts`: new; resolve placeholders
- `src/lib/shared/scenarios/values.test.mts`: new
- `src/lib/shared/scenarios/http.mts`: new; the fetch adapter
- `src/lib/shared/scenarios/http.test.mts`: new; injected fetch
- `src/lib/shared/scenarios/runner.mts`: new; run one card
- `src/lib/shared/scenarios/runner.test.mts`: new; injected adapter
- `test/timing/budgets.test.mjs`: core and adapter line budgets

**Changes:** `values.mts` exports `type ValueScope = { run: string; captures: Record<string, string>; env: NodeJS.ProcessEnv; today: string }`, `userVariable(role, field)` (`PICKET_USER_` plus both parts upper-cased, `-` and `.` as `_`), `relativeDate(today, days): string`, `newRunKey(bytes: Uint8Array): string` (four lower-case hex characters from two bytes) and `resolveText(template, scope): { text: string } | { blocked: string }`. A missing test-user variable is `{ blocked: "test user admin has no PICKET_USER_ADMIN_PASSWORD" }`; the blocked text names the variable, never a value.

`http.mts` exports the `HttpRequest`, `HttpAnswer` and `HttpAdapter` types of D-003 and `httpAdapter(fetchImpl = fetch): HttpAdapter`, which sends method, headers and body with `AbortSignal.timeout(timeoutMs)`, reads the text, and maps a thrown error to `{ status: null, error: <cause.code, else name, else message> }`, as `failureCode` in `src/lib/verbs/drive/server.mts` does.

`runner.mts` exports `type RunInput = { card: Card; urls: Record<string, string>; adapter: HttpAdapter; env: NodeJS.ProcessEnv; today: string; runKey: string; timeoutMs: number; sleep: (ms: number) => Promise<void> }`, `type RunOutcome = { outcome: "passed" | "failed" | "blocked"; step: number | null; detail: string }` and `runScenario(input): Promise<RunOutcome>`. It runs the steps in order and stops at the first one that does not pass. A request's base is `urls[service]`; a service with no URL is `blocked` (`step 1: {orders} has no published port`); an answer with `status: null` is `blocked` (`step 1: {orders} did not answer: ECONNREFUSED`), an environment problem rather than a product failure. `expect status` gives `failed` with `step 2: expected status 201, got 500`; `expect contains` gives `failed` with `step 3: "PKT-{run}" not in the answer`, the template text; `capture` reads a dotted path of the JSON answer or a header (case-insensitive), and a missing value fails with `step 4: capture order_id: no id in the answer`. A `wait` calls `sleep`. Details carry template text only, never a resolved value or answer text. `timeoutMs` is the caller's; phase 4 passes 20000 (`DEFAULT_TIMEOUT_MS` of the drive).

`budgets.test.mjs` gains `scenario_core_lines` and `scenario_adapter_lines` in `BUDGETS`, with OQ-001's fallback values, and one test that sums the line counts of `format.mts`, `rules.mts`, `values.mts` and `runner.mts`, and counts `http.mts`, against them.

**Done when:**
- **T-2.1** `values.test.mts`: with today `2026-11-15`, `{date:+7d}` gives `2026-11-22` and `{date:-1d}` gives `2026-11-14`; `{run}` gives the scope's run key; `{order_id}` gives the captured value; `newRunKey(new Uint8Array([127, 58]))` gives `7f3a`.
- **T-2.2** `{user:admin.password}` with `PICKET_USER_ADMIN_PASSWORD` set gives its value; unset, it gives the blocked text naming `PICKET_USER_ADMIN_PASSWORD`; `userVariable("read-only", "token")` is `PICKET_USER_READ_ONLY_TOKEN`.
- **T-2.3** `runner.test.mts`: the D-001 example card with urls `{ orders: "http://127.0.0.1:49153" }` and an adapter answering 201 with `{"id":"PKT-7f3a-1"}`, then 200 with that text, passes; the adapter saw `http://127.0.0.1:49153/orders/PKT-7f3a-1` second and a first body holding `PKT-7f3a-1` and the date seven days after `today`.
- **T-2.4** An answer of 500 at the first request fails with `step 1: expected status 201, got 500` and the adapter gets no second call; an unanswered request and a service with no URL each give `blocked` with their detail.
- **T-2.5** A run whose test-user value is `fixture-secret-9` and whose answer text is `fixture-answer-9`, failing at a `contains`, gives an outcome whose `JSON.stringify` holds neither string.
- **T-2.6** `http.test.mts`: an injected fetch receives the method, headers, body and an `AbortSignal`; a fetch that throws an error with `cause.code` `ECONNREFUSED` gives `{ status: null, error: "ECONNREFUSED" }`.
- **T-2.7** `node scripts/test.mjs timing` exits 0, with the new budget test among the tests it runs.

## Phase 3: Content keys, stored results and the comparison

**Touch set:**
- `src/lib/shared/scenarios/keys.mts`: new; working and base keys
- `src/lib/shared/scenarios/keys.test.mts`: new; temporary git repositories
- `src/lib/shared/scenarios/results.mts`: new; rows, last known result
- `src/lib/shared/scenarios/results.test.mts`: new
- `src/lib/shared/scenarios/compare.mts`: new; classes against the base
- `src/lib/shared/scenarios/compare.test.mts`: new
- `src/lib/shared/env/build-plan.mts`: export the full context tree id
- `src/lib/shared/env/build-plan.test.mts`: the tree id case
- `src/lib/shared/paths.mts`: `STATE_FILES.scenarioResults`

**Changes:** `build-plan.mts` exports `workingTree(checkoutDir, contextRel, env): string`, the full tree id the private `contextTree` computes today; `contextVersion` keeps its output. `paths.mts` adds `scenarioResults: "scenarios/results.jsonl"`.

`keys.mts` exports `type ContentKey = { env: string; apps: Record<string, string | null> }`, `keyId(key)` (the first 12 hex characters of the SHA-256 of the key as JSON with sorted app names), `workingKey(root, layout, model, env)` and `baseKey(root, layout, base, model)`, per D-004. The apps are the model's started `app` services with a build, located through `locate` as `sourceFor` does; the working tree of an app comes from `workingTree`, its base tree from `revParse(checkout, "<repo base>:<path from top>")` (`src/lib/shared/git.mts`) with the root's `state.base` or the repository's `base` in the layout, `null` when absent. The `env` part hashes the `git ls-tree -r` lines of `.picket/env` whose path does not start with `scenarios/`, from a temporary-index tree for the working key and from `<base>:.picket/env` for the base key.

`results.mts` exports `RunRow`, `ResultRow` (D-004's fields, nothing else), `appendRows(root, rows)`, `readResults(root)`, `lastKnown(rows, scenario, fingerprint, keyId)` (the latest `full`, `affected` or `base` row of that scenario, fingerprint and key) and `latestRun(rows, item, modes)`. `compare.mts` exports `ResultClass`, `classify(item: { outcome; unstable }, base: ResultRow | null, replaced: boolean): ResultClass` and `isBlamed(cls)`. Order: `passed`; `unstable`; `blocked`; `not run`; a failure named by a `replaces` of this item is `replaced by this item`; a failure with no base row, or a base row that is not `passed` or `failed`, is `no base result`; a base `failed` gives `failing before the item`; a base `passed` gives `new failure`. Only `new failure` and `no base result` are blamed.

**Done when:**
- **T-3.1** `keys.test.mts`, in a temporary repository with `services/orders` as the only app: on a clean tree `workingKey` and `baseKey` give equal app trees; editing `services/orders/server.mjs` changes the orders tree and nothing else; `git diff --cached --name-only` is empty after each call.
- **T-3.2** Adding `.picket/env/scenarios/S-0002.md` leaves the `env` part unchanged; editing `.picket/env/compose.yaml` changes it; on a clean tree the working and base `env` parts are equal.
- **T-3.3** An app whose context does not exist at the base gets `null` in `baseKey`, and `keyId` is the same for two keys whose apps are listed in different orders.
- **T-3.4** `lastKnown` returns the latest of two matching rows, and ignores a row with another fingerprint, one with another key id, and one of mode `only`.
- **T-3.5** `compare.test.mts`: one case per class asserts the class and `isBlamed`; a failure with a base `blocked` row is `no base result`.
- **T-3.6** `workingTree` on a clean tree equals `git rev-parse HEAD:services/orders`, and the existing `build-plan.test.mts` cases pass unchanged.
- **T-3.7** A `ResultRow` written by `appendRows` and read back by `readResults` has exactly the keys `type`, `run`, `scenario`, `fingerprint`, `key`, `versions`, `outcome`, `attempts`, `unstable`, `class`, `detail`.

## Phase 4: The replay verb

**Touch set:**
- `src/lib/shared/scenarios/replay.mts`: new; select, run, confirm
- `src/lib/shared/scenarios/replay.test.mts`: new
- `src/lib/shared/scenarios/files.mts`: accepted hand-changed fingerprints
- `src/lib/shared/scenarios/files.test.mts`: accepted cases
- `src/lib/shared/paths.mts`: `STATE_FILES.scenarioAccepted`
- `src/lib/verbs/env/replay.mts`: new; `env replay <id>`
- `src/lib/verbs/env/replay.test.mts`: new; injected runner and adapter
- `src/lib/verbs/env/start.mts`: export the stack start, endpoints by service
- `src/lib/verbs/env/start.test.mts`: endpoints field
- `src/lib/verbs.mts`: add `replay` to the `env` group
- `src/lib/cli/registry.mts`: register `env replay`
- `src/lib/hooks/guard/bash/kernel.test.mts`: `env replay` is a kernel call
- `test/fixtures/env/fake-engine.mjs`: `PICKET_FAKE_PUBLISHED` for `port`
- `test/cli/env.test.mjs`: replay on a git copy
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `paths.mts` adds `scenarioAccepted: "scenarios/accepted.json"`; `files.mts` adds `readAccepted(root): Set<string>` and `acceptFingerprint(root, fingerprint)`. `start.mts` exports `startStack(ctx, engine, machine, id)` and its report gains `endpoints: Record<string, string>` (service name to URL, the same `compose port` answers); its render is unchanged.

`replay.mts` exports `type ScenarioRun = { id; fingerprint; outcome: "passed" | "failed" | "blocked" | "not run"; attempts: string[]; unstable: boolean; byHand: boolean; detail }`, `replayScenarios(input): Promise<ScenarioRun[]>` and `affected(scenarios, working: ContentKey, base: ContentKey)`. The input carries the `SavedScenario` list, the service names, the urls, the adapter, `env`, `today`, `newRunKey: () => string`, `timeoutMs` and `sleep`. Deprecated scenarios are skipped. A scenario with problems (D-002) is `blocked` with its first problem and makes no adapter call. A failed attempt runs once more with a new run key; the second outcome stands and `unstable` is true when the two differ. `affected` keeps the scenarios whose targets name an app whose working and base trees differ, or all of them when the `env` parts differ.

`env replay <id> [--affected] [--only <S-id>]` (not read-only; the two flags exclude each other) refuses a done or abandoned item, runs the machine check (with no engine it appends a `run` row of the requested mode, `full`, `affected` or `only`, with `reason: "no container engine"`, prints `not replayed: no container engine` and exits 2), starts the stack through `startStack`, computes the working and base keys, replays, classifies each run with `classify` against `lastKnown` under the base key, appends one `run` row (mode `full`, `affected` or `only`) and one `result` row per scenario, and accepts the fingerprint of each `byHand` scenario that was not `blocked`. It prints one line per scenario (`S-0002 new failure: step 2: expected status 201, got 500`, with ` · changed by hand` when so) and the summary `replayed 3 on picket-<key>: 1 passed, 1 new failure, 1 failing before the item`, or `no saved scenarios to replay`. It exits 2 when any class is blamed. Classes stay without a base run until phase 5. The fake engine answers `port` with `PICKET_FAKE_PUBLISHED` when that variable is set, else `:49153` as today.

**Done when:**
- **T-4.1** `replay.test.mts`: a card failing twice gives `outcome: "failed"`, two attempts and `unstable: false`; failing then passing gives `unstable: true`; a passing card makes one attempt; the two attempts' first requests carry different run keys.
- **T-4.2** A deprecated card is not run; a card with a rule 1 problem is `blocked` with that problem and the adapter records no call.
- **T-4.3** A card whose fingerprint does not match is run and returned with `byHand: true`; after the verb accepts it, a second replay returns `byHand: false`.
- **T-4.4** `affected` with keys differing only in orders keeps the cards naming `{orders}` and drops one naming only `{billing}`; keys differing in `env` keep both.
- **T-4.5** `replay.test.mts` (verb): with no engine the results file gets a `run` row with `reason: "no container engine"` and mode `full`, or mode `affected` under `--affected`, and the outcome is failed with exit 2.
- **T-4.6** With a stored base `passed` row under the base key, an item failure prints `new failure` and exits 2; with a stored base `failed` row it prints `failing before the item` and exits 0.
- **T-4.7** `test/cli/env.test.mjs`: on a git copy of the umbrella with an open item, the fake engine and `PICKET_FAKE_PUBLISHED` pointing at a server the test starts that answers `/health` with `ok`, `env replay <id>` exits 0, prints `S-0001 passed`, and `.picket/state/scenarios/results.jsonl` holds a `result` row for `S-0001` whose `versions` names orders.
- **T-4.8** `kernel.test.mts` asserts `kernelClass("env", "replay")` is `kernel`.

## Phase 5: The base run

**Touch set:**
- `src/lib/shared/scenarios/base-run.mts`: new; worktrees, stack, cleanup
- `src/lib/shared/scenarios/base-run.test.mts`: new; temporary repositories, injected runner
- `src/lib/verbs/env/replay.mts`: run the base for unmatched failures
- `src/lib/verbs/env/replay.test.mts`: base cases
- `test/env/lifecycle.engine.mjs`: a real-engine base comparison

**Changes:** `base-run.mts` exports `type BaseCheckout = { dir: string; path: string }`, `addBaseWorktrees(root, layout, state, stack): BaseCheckout[]` (one `git worktree add --detach <state>/env/base/<stack>/<dir or "root"> <base>` per checkout of the layout, with the root's `state.base` or the repository's `base`), `baseSources(root, model, checkouts): ServiceSource[]` (each app's context made relative to the umbrella, located with `locate`, then mapped into that checkout's base worktree; the version is the 7-character base commit) and `runBase(input): Promise<BaseOutcome>`. `runBase` reads the model from the root's base worktree, writes an override with `overrideDoc` for key `<key>-base` and the item's label, uses stack `picket-<key>-base`, and runs `build`, the revision proof, `up --detach --wait` and `port` through step 2's helpers, then `replayScenarios` for the scenarios it is given. In a `finally` it runs `compose -p picket-<key>-base down --volumes --remove-orphans`, `image rm` of the images it built, `git worktree remove --force` of each worktree and `git worktree prune`. It returns the runs, or the start failure.

`env replay` calls `runBase` once per replay, with every confirmed failure (outcome `failed`, `unstable` false) that `lastKnown` finds no base row for, appends `base` rows under the base key, and classifies again. A start failure classes those failures `no base result` with the detail `the base did not start: <cause>`. An item with no base commit skips the base run with `no base result: the item has no base commit`. Passing, blocked and unstable scenarios never trigger a base run.

**Done when:**
- **T-5.1** `base-run.test.mts`, with temporary repositories and an injected runner: the calls run in the order worktree add, build, image inspect, up, port, down with `--volumes --remove-orphans`, image rm; afterwards `git worktree list` shows only the main worktree.
- **T-5.2** The override gives orders a `build.context` under `.picket/state/env/base/` and the image `picket/orders-<key>-base:<base7>`.
- **T-5.3** A failing `up` still makes the `down` call and removes the worktrees, and the outcome carries `compose up failed`.
- **T-5.4** `replay.test.mts`: a confirmed failure with no base row starts one base run, which appends `base` rows under the base key; a second replay with the same base key makes no worktree call and classifies from the stored row.
- **T-5.5** A replay whose scenarios all pass, or fail only as `unstable`, makes no worktree call.
- **T-5.6** [DEFERRED: operations, the release workflow's test job] `test/env/lifecycle.engine.mjs`: an item that makes orders answer `/health` with 500 replays `S-0001` as `new failure` after a base run that passed it, and no `picket-*-base` container or base worktree remains.

## Phase 6: Verify and the gate read the replay

**Touch set:**
- `src/lib/shared/scenarios/results.mts`: add the replay summary
- `src/lib/shared/scenarios/results.test.mts`: summary cases
- `src/lib/verbs/verify/index.mts`: the `scenarios` result
- `src/lib/verbs/verify/index.test.mts`: its cases
- `src/lib/verbs/packet/packet.mjs`: the `scenarios` field
- `test/kernel/packet.test.mjs`: packet cases with results

**Changes:** `results.mts` adds `replaySummary(rows, item): { run: RunRow | null; counts: Partial<Record<ResultClass, number>>; blamed: { scenario: string; class: ResultClass }[] }` over the item's latest `full` run, and `summaryText(summary)`: `3 replayed: 1 passed, 1 new failure (S-0002), 1 failing before the item`, or `not replayed`, or `not replayed: <reason>`.

`verify` adds a result named `scenarios` inside the environment branch, after the `environment` result and only when that one read the model. With the working key equal to the base key it is ok with `no app or environment change since the base`. Otherwise it reads the item's latest `full` run: none, or one with a `reason`, fails with `not replayed: run picket env replay <id>` (the reason added); a run whose key id differs from the working key's fails with `stale: <apps> changed since the replay; run picket env replay <id>`; a blamed class fails naming each scenario and class; else it is ok with `summaryText`. It reads rows only and starts no stack.

`packet` adds, in the order and design `approve_phase` branch after the check lines and only when `.picket/env/compose.yaml` exists, a `scenarios` field with `summaryText(replaySummary(...))`.

**Done when:**
- **T-6.1** `index.test.mts`: in a temporary repository with the fixture environment and an injected runner, a latest `full` run under the working key holding a `new failure` for `S-0002` gives `FAIL scenarios` naming `S-0002`.
- **T-6.2** The same run holding only `passed` and `failing before the item` gives an ok `scenarios` result whose detail contains `1 failing before the item`.
- **T-6.3** With orders changed and no run, the result fails with `not replayed`; with nothing changed since the base it is ok with `no app or environment change since the base`.
- **T-6.4** A `full` run under another key id fails with `stale` naming orders; an `only` run under the working key does not satisfy the result.
- **T-6.5** Without `.picket/env/compose.yaml` the report has no `scenarios` result, and the existing verify tests pass unchanged.
- **T-6.6** `packet.test.mjs`: with the environment and run rows the packet prints a line starting `  scenarios ` holding the summary; without the environment it prints none, and the existing packet tests pass unchanged.

## Phase 7: The check keys, the logged body and the replacement gate

**Touch set:**
- `src/lib/shared/work/declared-checks.mts`: `service` and `replaces` keys
- `src/lib/shared/work/declared-checks.test.mts`: key cases
- `src/lib/shared/work/gate.mts`: the `replacement` gate
- `src/lib/shared/work/gate.test.mts`: gate cases
- `src/lib/shared/drive-log.mts`: `body` on a hit, `maskedBody`
- `src/lib/shared/drive-log.test.mts`: masking cases
- `src/lib/verbs/drive/index.mts`: log the masked request body
- `src/lib/verbs/drive/index.test.mts`: logged body cases
- `src/lib/verbs/env/replay.mts`: classes for replaced scenarios
- `src/lib/verbs/env/replay.test.mts`: replaced case
- `src/lib/verbs/route/index.test.mts`: the grant stops at a replacement

**Changes:** `HTTP_KEYS` adds `service` and `replaces`; `HttpCheck` gains `service?: string` and `replaces?: string`. Problems: `check <n> service must be an environment service name such as orders` (pattern `^[a-z0-9][a-z0-9_.-]*$`) and `check <n> replaces must be a scenario id such as S-0012` (pattern `^S-\d{4,}$`). A run check with either key keeps today's foreign-key problem. `Gate.kind` gains `"replacement"`; `ownGate` returns `{ kind: "replacement", reason: "replaces saved scenario S-0012" }` for a phase whose drive list holds a `replaces`, after the security and irreversible kinds, so `nextStep`, the packet's `gate` line and the run grant follow with no further change.

`DriveHit` gains `body?: string`. `maskedBody(text): string` parses JSON and replaces every string or number value under a key that `isSecretName` marks with `"***"`, at any depth; text that is not JSON goes through `masked(null, text)` (`src/lib/shared/env/config-entries.mts`). `driveOnce` logs `body: maskedBody(hit.body)` on each hit that sent a body, when the phase declares at least one HTTP check; otherwise no `body` key, as today.

`env replay` collects the `replaces` ids of every phase of the item and passes `replaced: true` to `classify` for those scenarios.

**Done when:**
- **T-7.1** `declared-checks.test.mts`: an HTTP check with `service: orders` and `replaces: S-0012` reads both; `service: Orders!` and `replaces: S-12` each give their own problem; `replaces` on a run check gives the foreign-key problem.
- **T-7.2** `gate.test.mts`: a phase whose check carries `replaces: S-0012` gives the `replacement` gate with that reason; the same phase with `security: true` gives the security kind.
- **T-7.3** `drive-log.test.mts`: `maskedBody('{"user":"a","password":"p","nested":{"apiKey":"k","n":1}}')` gives `{"user":"a","password":"***","nested":{"apiKey":"***","n":1}}`; `name=x&password=y` gives `name=x&password=***`; `{"sku":"PKT-a"}` is unchanged.
- **T-7.4** `index.test.mts` (drive): in a scratch item whose phase declares an HTTP check, `--hit 'POST /orders {"sku":"PKT-a","password":"p"}'` against a scratch server logs a hit whose `body` is `{"sku":"PKT-a","password":"***"}`; with `drive: true` the hit has no `body` key.
- **T-7.5** `replay.test.mts`: a failing scenario named by a `replaces` of the item is classed `replaced by this item` and the verb exits 0.
- **T-7.6** `route/index.test.mts`: under `run_through: 3`, `PHASE DONE` on phase 2 whose check carries `replaces: S-0012` writes no `phases/2.approved` and returns `run grant stops here: phase 2 replaces saved scenario S-0012; it takes its own approval`.

## Phase 8: The guard keeps agents out of the scenario folder

**Touch set:**
- `src/lib/hooks/guard/scope/index.mts`: deny edits under `SCENARIO_DIR`
- `src/lib/hooks/guard/scope/index.test.mts`: denial cases
- `src/lib/hooks/guard/scope/index.variants.test.mts`: new; closure test (C-020)
- `src/lib/hooks/guard/bash/index.test.mts`: shell writes get no allow
- `test/hooks/guard.scope.test.mjs`: the bundle denies

**Changes:** `denialReason` in `guard.scope` adds, for a root-relative path under `SCENARIO_DIR` followed by `/` (compared lower-case on `win32`, as `samePathCase` does), the denial `<rel> is a saved scenario, written by the kernel: keep one through a declared check the user approves, replace one with replaces; a person edits one by hand outside Claude Code`. It holds for every agent and the lead, since `guardScope` runs for every Edit and Write. Paths outside the umbrella root's folder (a fixture under `test/`) are untouched. `guard.bash` is not changed: a write redirect that is not a log sink falls through (`fallThrough("write-redirect")` in `judge.mts`) and `sed` without print-only is `unknown`, so neither is allowed without the user's prompt; the tests pin that. The closure test runs the seeds `.picket/env/scenarios/S-0001.md` (Edit) and `.picket/env/scenarios/S-0099.md` (Write of a new file) through the spellings absolute path, a `./` prefix, a `services/../` segment, an upper-case folder on `win32`, and a symbolic link to `.picket/env` inside the root, with `closureFailure` from `#test/variants.mts`.

**Done when:**
- **T-8.1** `index.test.mts`: Edit of `.picket/env/scenarios/S-0001.md` and Write of a new `.picket/env/scenarios/S-0099.md` are denied with a reason containing `written by the kernel`.
- **T-8.2** `index.variants.test.mts`: every spelling of both seeds is denied, and the test fails naming any spelling that is not.
- **T-8.3** Edit of `.picket/env/compose.yaml` and of `test/fixtures/env/umbrella/.picket/env/scenarios/S-0001.md` gets no denial from this rule.
- **T-8.4** guard.bash `index.test.mts`, for agent `picket:developer`: `echo x > .picket/env/scenarios/S-0001.md` and `sed -i s/a/b/ .picket/env/scenarios/S-0001.md` get no `allow` decision.
- **T-8.5** `test/hooks/guard.scope.test.mjs`: a PreToolUse Write payload for `.picket/env/scenarios/S-0001.md` piped into `dist/hooks/guard.scope.mjs` prints a deny decision whose reason contains `written by the kernel`.

## Phase 9: Keeping approved checks and replacing on approval

**Touch set:**
- `src/lib/shared/scenarios/keep.mts`: new; candidate cards, deprecation
- `src/lib/shared/scenarios/keep.test.mts`: new
- `src/lib/shared/scenarios/files.mts`: `nextScenarioId`, write kept files
- `src/lib/shared/scenarios/files.test.mts`: id cases
- `src/lib/shared/paths.mts`: `STATE_FILES.scenarioCandidates`
- `src/lib/verbs/env/replay.mts`: build and replay candidates
- `src/lib/verbs/env/replay.test.mts`: candidate cases
- `src/lib/shared/route/plan.mts`: the `keep` change on approval
- `src/lib/shared/route/plan.test.mts`: keep changes
- `src/lib/shared/route/apply.mts`: write kept files before the commit
- `src/lib/shared/route/commit.mts`: the phase commit takes kept paths
- `src/lib/shared/route/route.mts`: read candidates for the plan
- `src/lib/verbs/route/index.test.mts`: approval end to end
- `src/lib/verbs/packet/packet.mjs`: the `keeps` field
- `test/kernel/packet.test.mjs`: keeps lines

**Changes:** `keep.mts` exports `type Candidate = { covers; index; outcome: "passed" | "failed" | "blocked" | "not kept"; detail; text: string | null; replaces: string | null }`, `candidateCard(input): { card: Card } | { notKept: string }` and `deprecate(text, by): string`. The input is the item id, the `CheckResult`, the ran hit with its `body`, the criterion's text from the phase section, the drive row's `ts`, the model's apps and the phase's `files`. It applies D-006's rules in order, each refusal with its own `notKept` text: a run check; an outcome other than `pass` or `prefix`; a body holding `***`; no single service; a changing method whose target and body hold no `PKT-`. The card: header `kind`, `covers: ["<id>/<T-N.x>"]`, `intent`, `format: 1`, `supersedes` from `replaces`; one `request` with `{<service>}` and the ran path, `header content-type: application/json` when a body exists, the body with dates and `PKT-` rewritten as D-006 states; `expect status`; one `expect contains` per declared string. `deprecate` sets `status: deprecated` and `superseded_by` and rewrites through `writeScenario`.

`paths.mts` adds `scenarioCandidates: "scenarios/candidates"` (one `<id>.json` per item, keyed by phase). `env replay` builds the candidates of the current phase from `phaseCheckResults` and the drive log, runs each passed card once with `replayScenarios` and no second attempt, stores them, and prints `keep T-2.1: replay passed; kept on approval` or `keep T-2.2: not kept: <reason>`. `files.mts` adds `nextScenarioId(root, rows)`: one above the highest number among the folder's files and the `scenario` values of `results.jsonl`, four digits, from `S-0001`.

`Change` gains `{ kind: "keep"; phase: number; candidates: Candidate[]; line: string | null }`; `route.mts` reads the `passed` candidates of the approved phase; `phaseApproved` and `runGrantChanges` add the change before `commit` when there is one, and `withoutApproval` drops it. `applyChanges` writes the kept files after the nested commits and before `commitPhase`: each card gets the next id and a fresh fingerprint; a `replaces` naming an active file deprecates it, else the line says `S-0009 is no active saved scenario; nothing deprecated`. `commitPhase` takes the written paths and adds them to `add` and `owns`. Lines: `kept S-0002 from T-2.1; S-0001 deprecated, superseded by S-0002`.

`packet` adds a `keeps` field in the order and design `approve_phase` branch: one line per HTTP check of the phase, `T-2.1 POST /orders: kept on approval` (with `, replaces S-0001`), `T-2.2 POST /pay: not kept: <reason>`, or `not kept: not replayed on the environment` without a candidate; only when `.picket/env/compose.yaml` exists.

**Done when:**
- **T-9.1** `keep.test.mts`: a `POST /orders` check, status 201, `contains: ["id"]`, run with outcome `prefix` at `/api/orders` on `2026-11-15T10:00:00Z` with body `{"sku":"PKT-test-1","due":"2026-11-22"}`, gives target `{orders}/api/orders`, body `{"sku":"PKT-{run}-1","due":"{date:+7d}"}`, `expect status 201`, `expect contains "id"`, `kind: normal` and no `scenarioProblems`.
- **T-9.2** Each `notKept` reason of the Changes list has its own case asserting its text.
- **T-9.3** `replay.test.mts`: a phase with two HTTP checks whose candidates answer 201 and 500 stores one `passed` and one `failed` candidate, the second with `expected status 201, got 500`.
- **T-9.4** `route/index.test.mts`: approving the phase writes `.picket/env/scenarios/S-0002.md` with a matching fingerprint, and `git show --name-only --format= HEAD` lists it with the phase's files; with `replaces: S-0001` the old file reads `status: deprecated` and `superseded_by: S-0002`, the new one `supersedes: S-0001`, both in that commit, and no scenario file was removed.
- **T-9.5** A `rejected` verdict, a `failed` candidate and a nested checkout that refuses the commit each leave the scenario folder unchanged.
- **T-9.6** `files.test.mts`: files `S-0001` to `S-0003` and a results row naming `S-0005` give `S-0006`; an empty project gives `S-0001`.
- **T-9.7** `packet.test.mjs`: the `keeps` field shows the kept, replacing and not-kept lines for a phase with three HTTP checks, and no field without the environment.

## Phase 10: The fast lane and the contracts

**Touch set:**
- `src/lib/verbs/close/close.mts`: refuse a fast close the replay forbids
- `src/lib/verbs/close/index.test.mts`: refusal cases
- `src/skills/expediting/SKILL.md`: replay step, leaving the lane
- `src/skills/implementing/SKILL.md`: replay in the drive step
- `src/agents/developer.md`: replay before handing over
- `src/agents/architect.md`: `service` and `replaces` on checks
- `src/skills/documenting/templates/design.md`: the two optional keys
- `src/skills/documenting/templates/order.md`: the two optional keys
- `src/lib/shared/work/declared-checks.test.mts`: template round trip
- `test/repo/markdown-paths.test.mjs`: `ELSEWHERE` for the cited environment path

**Changes:** `close` adds `refuseUnreplayedFastClose(root, snap)` before the commit, only for a fast item in a project with `.picket/env/compose.yaml` and at least one active scenario: with no `affected` run row of the item it refuses `run picket env replay <id> --affected before closing`; when the latest one holds a blamed class it refuses `S-0002 new failure after this change: fix the change, or, if the request changes this behaviour on purpose, run picket set <id> status=abandoned and take it to the order lane`; a run row with a `reason` passes.

`picket:expediting` step 5 adds `picket env replay <id> --affected` in a project with `.picket/env/compose.yaml`, after `picket check` is green, and the Rules paragraph says a change meant to alter tested behaviour leaves the fast lane for the order lane as the re-admit case does. `picket:implementing` step 7 adds: in such a project, run `picket env replay <id>` after the declared checks; a new failure is fixed in the code; a failure the request causes on purpose is named on `Verified:` and handed to the gate; a changing request's drive body creates its data with a `PKT-` prefix so the check can be kept. `developer.md` step 4 names `picket env replay`. `architect.md`, order step 1, adds that an HTTP check may name `service` when several apps share the phase and `replaces: S-<id>` for a saved scenario the item changes on purpose. Both templates add `service` and `replaces` placeholders, marked optional, to the HTTP check. The texts cite `.picket/env/compose.yaml` and no other path under `.picket/env/`; it exists only in a host project (in this repository only under `test/fixtures/`, which no citing file's folder resolves to), so `markdown-paths.test.mjs` adds it to `ELSEWHERE` in a new group whose `why` is `in a host project's test environment`. Budgets hold: agents at most 120 lines, `SKILL.md` at most 150.

**Done when:**
- **T-10.1** `index.test.mts` (close): a fast item in a project with the environment and one active scenario, and no `affected` run, is refused with `run picket env replay <id> --affected before closing`, stays open, and nothing is committed.
- **T-10.2** A latest `affected` run with a `new failure` for `S-0002` refuses naming `S-0002` and `status=abandoned`; runs with only `passed` and `failing before the item`, or with `reason: "no container engine"`, let the close commit.
- **T-10.3** An order item, and a fast item in a project without the environment or without an active scenario, close as before; the existing close tests pass unchanged.
- **T-10.4** `picket:expediting` names `picket env replay <id> --affected` and the order lane for a change to tested behaviour; `picket:implementing` names `picket env replay` and `PKT-`; `developer.md` names `picket env replay`; `architect.md` names `service` and `replaces`.
- **T-10.5** The template round-trip test in `declared-checks.test.mts` fills the new `service` and `replaces` placeholders with samples of their shape and reads both templates with no problems.
- **T-10.6** `node scripts/test.mjs unit build product timing` exits 0, the budget and Markdown path tests included.

## Open questions

- **OQ-001** Which line budgets bind the scenario core and the HTTP adapter? The request asks for budgets enforced by a test and gives no number, and no input in reach sets one. Owner: product owner. Fallback: each budget is the landed line count rounded up to the next multiple of 50, written in `test/timing/budgets.test.mjs` in phase 2.
- **OQ-002** Should stored results be shared across machines (a tracked file) rather than kept under `.picket/state/`? Owner: product owner. Fallback: per machine; a machine's first unmatched failure builds the base once (D-004).
- **OQ-003** Step 2's OQ-004 reaches this item: `.picket/` is in `BOOKKEEPING_PREFIXES`, so `dirtyPaths` and the close summary skip `.picket/env/scenarios/`. Owner: product owner. Fallback: unchanged; the phase commit adds kept files by name (phase 9).
- **OQ-004** Draft section 1 says the gate's check runs on the environment in a project with one; this item keeps the drive log as the gate's source and replays only the candidate. Owner: product owner. Fallback: the drive log stays the gate's source.
- **OQ-005** Known defects (TF-008) need the `defect` and `known` header keys of draft 3.1, outside D-001's closed list. Owner: the architect of TF-008. Fallback: they join format 1 as optional keys, since the reader ships with the product.
- **OQ-006** Should `.claude/MEMORY.md` `## Language` gain entries for saved scenario, card, content key and run key, where "run" also names a replay's `run` row and a run check? Draft section 11 notes the file is at its limit. Owner: product owner. Fallback: no entries; the record uses "run key", "`run` row" and "run check" in full.

## Revision log
- 2026-11-15: T-1.4 reworded: `{home}` replaces `{HOME}`, which D-002's lower-case pattern never reads as a placeholder; cross-check finding.
- 2026-11-15: T-1.7 reworded: names the `picket drive --run ... --env` form, since a run check carries no environment; drive row unchanged.
- 2026-11-15: Phase 4 and T-4.5: the no-engine `run` row carries the requested mode, so the fast-lane close finds an `affected` row.
- 2026-11-15: Phase 10: the `ELSEWHERE` entry `.picket/env/compose.yaml` confirmed and named; `[INFERRED]` dropped.
