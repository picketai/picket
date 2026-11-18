---
kind: design
lane: design
title: Mock format, stub server, data catalog
date: 2026-11-18
audience: developer
sources:
  - work/20261118-mock-format-stub-server-data-catalog/request.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - src/lib/shared/env/standard.mts
  - src/lib/shared/env/rules.mts
  - src/lib/shared/env/build-plan.mts
  - src/lib/shared/scenarios/format.mts
  - src/lib/shared/scenarios/runner.mts
  - src/lib/shared/testing/cases.mts
  - src/lib/verbs/close/block.mts
  - https://raw.githubusercontent.com/docker/compose/v2.40.3/cmd/compose/run.go
phases:
  - n: 1
    files:
      - src/lib/shared/mocks/definition.mts
      - src/lib/shared/mocks/definition.test.mts
      - src/lib/shared/env/standard.mts
      - src/lib/verbs/env/check.mts
      - src/lib/verbs/env/check.test.mts
      - test/fixtures/env/stubbed/.picket/env/compose.yaml
      - test/fixtures/env/stubbed/.picket/env/mocks/payments-mock.md
      - test/fixtures/env/stubbed/.picket/env/mocks/fraud-mock.md
    greps:
      - path: src/lib/shared/mocks/definition.mts
        pattern: 'export function parseMock\b'
      - path: src/lib/shared/env/standard.mts
        pattern: '\bMOCK_DIR\b'
      - path: src/lib/verbs/env/check.mts
        pattern: '"E12"'
    tests: true
    drive:
      - covers: T-1.5
        command: 'CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/stubbed" node dist/bin/picket.mjs env check'
        exit_code: 2
        contains: ["E12 fraud-mock"]
    security: false
  - n: 2
    files:
      - src/lib/shared/mocks/stub-server.mjs
      - src/lib/shared/mocks/stub-server.test.mts
      - src/lib/shared/mocks/stub.mts
      - src/lib/shared/mocks/stub.test.mts
      - src/lib/shared/mocks/definition.mts
      - src/lib/shared/mocks/definition.test.mts
      - src/lib/shared/env/rules.mts
      - src/lib/shared/env/rules.test.mts
      - src/lib/shared/env/build-plan.mts
      - src/lib/shared/env/build-plan.test.mts
      - src/lib/shared/env/trial.mts
      - src/lib/verbs/env/start.mts
      - src/lib/verbs/env/start.test.mts
      - src/lib/verbs/env/trial.mts
      - src/lib/shared/scenarios/base-run.mts
      - src/lib/shared/testing/cases.mts
      - test/timing/budgets.test.mjs
      - test/fixtures/env/stubbed/.picket/env/compose.yaml
    greps:
      - path: src/lib/shared/mocks/stub-server.mjs
        pattern: '/__picket/received'
      - path: src/lib/shared/mocks/stub.mts
        pattern: '\bSTUB_PORT = 8080\b'
      - path: test/timing/budgets.test.mjs
        pattern: '\bstub_server_lines:'
    tests: true
    drive: false
    security: false
  - n: 3
    files:
      - src/lib/shared/mocks/stub.mts
      - src/lib/shared/mocks/stub.test.mts
      - src/lib/shared/scenarios/replay.mts
      - src/lib/shared/scenarios/replay.test.mts
      - src/lib/shared/scenarios/base-run.mts
      - src/lib/shared/testing/cases.mts
      - src/lib/shared/testing/cases.test.mts
      - src/lib/shared/testing/results.mts
      - src/lib/shared/testing/report.mts
      - src/lib/shared/testing/report.test.mts
      - src/lib/verbs/test/case.mts
      - src/lib/verbs/test/rerun.mts
      - src/lib/verbs/test/classify.mts
      - src/lib/verbs/test/record.test.mts
      - src/lib/verbs/env/replay.mts
      - test/timing/budgets.test.mjs
    greps:
      - path: test/timing/budgets.test.mjs
        pattern: '\bmock_adapter_lines:'
      - path: src/lib/shared/testing/results.mts
        pattern: '\bgaps\b'
      - path: src/lib/verbs/test/classify.mts
        pattern: '\bgaps\b'
    tests: true
    drive: false
    security: false
  - n: 4
    files:
      - src/lib/shared/mocks/definition.mts
      - src/lib/shared/mocks/definition.test.mts
      - src/lib/shared/scenarios/results.mts
      - src/lib/shared/scenarios/results.test.mts
      - src/lib/verbs/env/replay.mts
      - src/lib/verbs/env/replay.test.mts
      - src/lib/shared/testing/keep-cases.mts
      - src/lib/shared/testing/keep-cases.test.mts
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/index.test.mts
    greps:
      - path: src/lib/verbs/env/replay.mts
        pattern: 'verified up to'
      - path: src/lib/shared/mocks/definition.mts
        pattern: 'export function realService\b'
      - path: src/lib/shared/testing/keep-cases.mts
        pattern: '\bMOCK_SUFFIX\b'
        absent: true
    tests: true
    drive: false
    security: false
  - n: 5
    files:
      - src/lib/shared/catalog/entry.mts
      - src/lib/shared/catalog/entry.test.mts
      - src/lib/shared/scenarios/format.mts
      - src/lib/shared/env/standard.mts
      - src/lib/verbs/env/check.mts
      - src/lib/verbs/env/check.test.mts
      - test/fixtures/env/stubbed/.picket/env/catalog/customer.md
      - test/fixtures/env/stubbed/.picket/env/catalog/open-order.md
    greps:
      - path: src/lib/shared/catalog/entry.mts
        pattern: 'export function parseEntry\b'
      - path: src/lib/shared/env/standard.mts
        pattern: '\bCATALOG_DIR\b'
      - path: src/lib/verbs/env/check.mts
        pattern: '"E13"'
    tests: true
    drive:
      - covers: T-5.5
        command: 'CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/stubbed" node dist/bin/picket.mjs env check'
        exit_code: 2
        contains: ["E13 open-order"]
    security: false
  - n: 6
    files:
      - src/lib/shared/catalog/resolve.mts
      - src/lib/shared/catalog/resolve.test.mts
      - src/lib/shared/scenarios/values.mts
      - src/lib/shared/scenarios/values.test.mts
      - src/lib/shared/scenarios/rules.mts
      - src/lib/shared/scenarios/rules.test.mts
      - src/lib/shared/scenarios/runner.mts
      - src/lib/shared/scenarios/runner.test.mts
      - src/lib/shared/scenarios/replay.mts
      - src/lib/shared/scenarios/replay.test.mts
      - src/lib/shared/scenarios/keep.mts
      - src/lib/shared/scenarios/keep.test.mts
      - src/lib/shared/scenarios/base-run.mts
      - src/lib/shared/testing/cases.mts
      - src/lib/shared/testing/keep-cases.mts
      - src/lib/verbs/env/replay.mts
    greps:
      - path: src/lib/shared/scenarios/values.mts
        pattern: 'DATA_PREFIX = "data:"'
      - path: test/timing/budgets.test.mjs
        pattern: '\bscenario_core_lines: 600\b'
    tests: true
    drive: false
    security: false
  - n: 7
    files:
      - src/lib/verbs.mts
      - src/lib/cli/registry.mts
      - src/lib/shared/paths.mts
      - src/lib/shared/data/approvals.mts
      - src/lib/shared/data/approvals.test.mts
      - src/lib/verbs/data/show.mts
      - src/lib/verbs/data/approve.mts
      - src/lib/verbs/data/approve.test.mts
      - src/lib/hooks/guard/bash/payloads.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - src/lib/hooks/guard/bash/payloads.variants.test.mts
      - src/lib/hooks/guard/bash/kernel.test.mts
      - docs/reference/cli.md
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"data approve"'
      - path: src/lib/hooks/guard/bash/kernel.test.mts
        pattern: '\["comment", "data", "reply", "uninstall", "waive"\]'
      - path: src/lib/shared/paths.mts
        pattern: '\bdataApprovals\b'
      - path: docs/reference/cli.md
        pattern: '^## picket data\b'
    tests: true
    drive: false
    security: true
  - n: 8
    files:
      - src/lib/verbs.mts
      - src/lib/cli/registry.mts
      - src/lib/shared/paths.mts
      - src/lib/shared/env/standard.mts
      - src/lib/shared/data/connection.mts
      - src/lib/shared/data/connection.test.mts
      - src/lib/shared/data/runs.mts
      - src/lib/verbs/data/run.mts
      - src/lib/verbs/data/run.test.mts
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/block.mts
      - src/lib/verbs/close/index.test.mts
      - docs/reference/cli.md
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"data run"'
      - path: src/lib/shared/env/standard.mts
        pattern: 'PICKET_DATA_'
      - path: src/lib/verbs/close/block.mts
        pattern: 'Data: '
    tests: true
    drive: false
    security: true
  - n: 9
    files:
      - src/lib/shared/testing/brief.mts
      - src/lib/shared/testing/brief.test.mts
      - src/lib/verbs/test/brief.mts
      - src/skills/testing/steps/cases.md
      - src/skills/testing/steps/results.md
      - src/lib/shared/env/decisions.mts
      - src/lib/shared/env/decisions.test.mts
    greps:
      - path: src/skills/testing/steps/cases.md
        pattern: '\{data:'
      - path: src/lib/shared/testing/brief.mts
        pattern: 'Data catalog'
      - path: src/lib/shared/env/decisions.mts
        pattern: "until Picket's stub server exists"
        absent: true
    tests: true
    drive: false
    security: false
---
# Design: Mock format, stub server, data catalog

## Problem

SDR 00004 TF-006 asks for two things the testing stage still lacks: a way to stand in for a service that cannot join the test environment, and a named, approved way to obtain each kind of test data (D-005, D-006 and D-011 of `artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md`). Today a `mock` service is any container the project picks (`src/lib/shared/env/decisions.mts:112` says so "until Picket's stub server exists"), every case is flagged with every started mock whether it touched one or not (`src/lib/shared/testing/cases.mts:43`), the closing line guesses the real service by cutting `-mock` off the name (`src/lib/shared/testing/keep-cases.mts:26`), and a scenario value can come only from captures, the run key, a test user or a relative date (`src/lib/shared/scenarios/values.mts`). The binding constraints: Picket owns both formats and the stub, each engine sits behind an adapter with a line budget, a format change is recorded again and never migrated, nothing may tie the design to one database engine or runtime (the product owner runs mostly dotnet and node on SQL Server 2016), the connection string is entered by hand and never written to a tracked file, report or log, and Compose `up` cannot run on this host (rootless Podman under the pasta AppArmor profile), so every live-container fact is deferred to a machine that can.

## Decisions

### D-001: A mock definition is a card in the scenario card shape
**Decision:** Infrastructural decision. A mock is defined in `.picket/env/mocks/<service>.md`, where `<service>` is the Compose service it serves (`payments-mock`). The file has the scenario card's shape: a `---` header read by yaml-lite with `replaces` (the real service's name), `source` (`recorded` with a `recorded: YYYY-MM-DD` date, or `api` with an `api:` path to the API description it was written from) and `format: 1`; then `when <METHOD> <path>` lines, each followed by indented `status <code>` (exactly one), `header <Name>: <value>` (any) and `body <text>` (at most one) lines. A path is literal segments and `*`, which matches one whole segment; the query string is never matched; the first `when` in file order that matches answers. No conditions, state or scripting. A definition with another `format` fails with a message that says to record it again, so no migration code can be asked for.
**Instead of:** one YAML list of answers per mock: a second shape beside the cards, and every JSON body would need YAML quoting that yaml-lite handles only for single-line scalars.
**Risks:**
- **RISK-001** A recorded answer carries a real token or personal value into a tracked file. Mitigation: the definition is a file a phase writes, so it passes the reviewer's security checklist at the gate; Picket adds no secret scan here because a mock of an identity provider must answer with token-shaped text.
- **RISK-002** Format 1 becomes a public contract once a release ships it. Mitigation: `format: 1` is checked on every file, and a later format change ships with "record again" as its only path, as D-005 of the SDR says.

### D-002: Picket's stub runs in the mock's own pinned Node image, wired by the start override
**Decision:** Infrastructural decision. The stub server is one dependency-free program, `src/lib/shared/mocks/stub-server.mjs`, built to `dist/lib/shared/mocks/stub-server.mjs` like every other `.mjs` (`isBuiltModule` in `scripts/build.mjs`). It is written as plain `.mjs` because it reads `process.argv` and runs alone inside a container; the convention scans read `.mts` only. At `env start`, `env trial` and the base run, the kernel copies the program and a JSON form of each definition into `.picket/state/env/<stack>/stub/` and adds, for each mock service that has a definition, an override with the command, two read-only binds, a healthcheck that runs the program with `--health`, and container port 8080 (the port the env fixture's `payments-mock` already serves on) with no host port. `compose.yaml` keeps what the project owns: the service name, the `mock` role label, the Node image pinned by digest (rule E6), and the wiring of the app to `http://<service>:8080`. The stub answers `GET /__picket/health`, logs every request it receives and serves the log at `GET /__picket/received`, and answers a request no `when` matches with status 501 and a body naming the method and path. A mock service with no definition stays the project's own container, as today.
**Instead of:** a stub image Picket publishes to a registry: it adds a release pipeline and a published image that becomes a contract of its own, for one small program.
**Risks:**
- **RISK-003** A dotnet-only project must pull a Node image just for its mocks. Mitigation: any image that runs Node at the plugin's own floor (`engines.node` `>=22` in `package.json`) works, and the setup text (phase 9) names it; the cost is one pinned image.
- **RISK-004** The image named in `compose.yaml` holds no `node`, so the stub never becomes healthy. Mitigation: `compose up --wait` fails and `env start` already refuses with the cause (`composeOrRefuse` in `src/lib/verbs/env/start.mts`).

### D-003: Mock traffic, read around each run, decides the mock flag and the gap
**Decision:** Infrastructural decision. Before and after each scenario run (a tester case, a rerun, a replay, a base run) the replay layer reads `/__picket/received` from every stub of the stack through the HTTP adapter it already holds. A run is flagged with each stub that received a request during it, plus every project-owned mock container, whose traffic Picket cannot see, so the flag never claims less than happened. A request the stub could not answer becomes a gap, `payments-mock has no answer for POST /refunds`, on the run's result. A failed case with a gap cannot be classed `product`: the kernel refuses it, because the draft (section 2.6) says a gap is reported as a gap in the mock and never as a product defect.
**Instead of:** the stack-level flag of today: it marks a case that never touched the mock and cannot see a gap at all.
**Risks:**
- **RISK-005** A stub restarts between the two reads and its log shrinks. Mitigation: a shorter log after the run counts whole as the run's traffic.

### D-004: The flow and closing lines name the real service from the definition
**Decision:** Infrastructural decision. The real name behind a mock is the definition's `replaces`; a project-owned container falls back to today's rule of cutting `-mock`. Replay results store each run's mocks and gaps, `env replay` prints one line per flow with mocked traffic (`flow checkout: verified up to payments, which is mocked`), and the closing line `Not verified end to end:` names the real services behind the mocks of the tester's final round and of the item's latest full or affected replay, so an item with testing off still says what no test reached.
**Instead of:** a mock-to-service map in `x-picket`: a second place to keep in step with the definitions.

### D-005: The data catalog is a folder of entry cards, read before a scenario's own steps
**Decision:** Domain logic in the scenario model: a catalog entry is a value object naming one data need and how it is met. Each entry is `.picket/env/catalog/<entry>.md` in the card shape: header `kind` (`create`, `find`, `fixed`, `user` or `sql`), `need` (words), `how` (`fixed` only: how the record was made), `file` and `service` (`sql` only: the file under `.picket/env/data/` and the `data` service that runs it), `role` and `fields` (`user` only), `format: 1`; then scenario step lines. A scenario takes a value as `{data:<entry>.<capture>}`; before its own steps the runner runs each entry it names once, with the same run key, and a failing entry blocks the run with "no matching data", "data drift" or "could not create data", never a failure. Data from a `create` entry is the scenario's own and may be changed; data from every other kind is shared and read-only, which the keep rule (`writesUnownedData` in `src/lib/shared/scenarios/keep.mts`) enforces. The kernel never runs an entry's SQL file on its own; a `sql` entry's steps only find what the file made.
**Instead of:** one `.picket/env/catalog.yaml` as the draft (section 3.5) names it: yaml-lite reads no block scalars (`src/lib/util/yaml-lite.mts` lines 2 to 3), so entry steps would need a second step syntax and parser.
**Risks:**
- **RISK-006** The scenario core (`format.mts`, `rules.mts`, `values.mts`, `runner.mts`) is near its 600-line budget. Mitigation: entry reading and resolution live in `src/lib/shared/catalog/`; the core gains only the `data:` placeholder, and the budget test runs unchanged.

### D-006: The user approves a SQL file by its digest, through a lead-only `picket data` group
**Decision:** Infrastructural decision. A new verb group `picket data` (`show`, `approve`, `run`) is lead-only as a whole: `leadOnly: true` on the group entry in `src/lib/verbs.mts` feeds `LEAD_ONLY_VERBS` in `src/lib/hooks/guard/bash/kernel.mts`, which already reads the flag from any entry, so no spawned agent runs it in any spelling. `data show <path>` prints the file in full with its sha256; `data approve <path> --sha256 <hex>` records the approval only when the file's digest still equals the one shown. Approvals live in `.picket/state/data/approvals.jsonl`, which guard.scope already denies to agent edits (`STATE_PREFIX` in `src/lib/hooks/guard/scope/index.mts`). Any change to a file's bytes needs a new approval.
**Instead of:** a tracked approvals file under `.picket/env/`: the approval would travel with the repository, but it needs a new guard.scope entry and lets a phase commit an approval no user gave on that machine; machine-local approval costs each developer one approval per file.

### D-007: An approved SQL file runs through the `data` service, with the connection passed by name
**Decision:** Infrastructural decision. `picket data run <id> <entry>` runs `compose --profile picket-data run --rm --no-deps -T -e PICKET_DATA_<SERVICE> -v <file>:/picket/run.sql:ro <service>` on the item's stack. Compose resolves an `-e` name with no value from its own environment (`getEnvironment(project.Environment.Resolve)` in `cmd/compose/run.go` at v2.40.3), so the connection string goes from the shell that started Claude Code to the container and never appears in an argument, a file or a log. Picket's whole contract with the database is that pair: the file at `/picket/run.sql` and the variable; the project's `data` service image and command choose the client (`sqlcmd`, `psql`, `mysql`), so no engine is built in. Picket reads only the server and database names out of the string, for the run's output line, its state row and the closing line, and masks the whole string and its password field in any client output it prints.
**Instead of:** a database driver in the kernel: it ties Picket to engines, and the SDR (D-006) rules it out.
**Risks:**
- **RISK-007** A run reaches the wrong database; the guards against that are TF-007. Mitigation: the output and closing lines name server and database on every run (the draft's section 10 default), and the run happens only on the lead's command.
- **RISK-008** The developer agent can read the variable from its own shell. Mitigation: the `security-paths` rule forbids echoing a secret; denying it outright is TF-007's.

### D-008: The stub program and the mock adapter each carry a line budget
**Decision:** Infrastructural decision. `test/timing/budgets.test.mjs` gains `stub_server_lines` for `stub-server.mjs` (phase 2) and `mock_adapter_lines` for `src/lib/shared/mocks/stub.mts` (phase 3, once traffic reading has landed in it), each set to the file's landed line count rounded up to the next multiple of 50, the rule `scenario_adapter_lines` already follows.
**Instead of:** a number fixed in this record before the code exists: it would have no inputs to derive it from.

## Scope

**In:**
- The mock definition format, its check (E12), the stub program, its wiring at start, trial and the base run, and the two line budgets.
- Mock traffic per run: the mock flag on results, gaps, the classify refusal, flow lines and the closing line's real names.
- Catalog entry cards, their check (E13), `{data:<entry>.<capture>}` resolution and the ownership rule.
- `picket data show|approve|run`, the approvals and runs state, and the closing line for SQL runs.
- The tester's brief, the testing skill's case step and the setup text learning both.

**Out:**
- The database guards (TF-007), known defects (TF-008), the browser adapter (TF-009).
- Another test tool's mock format, migration of a format, a verb that records a mock from a real service (OQ-003).
- Use outside Claude sessions, and the `testing` setting.

## Phase 1: Mock definitions are read and checked

**Touch set:**
- `src/lib/shared/scenarios/format.mts`: card shape to copy, read only
- `src/lib/shared/mocks/definition.mts`: new reader and checker
- `src/lib/shared/mocks/definition.test.mts`: new unit tests
- `src/lib/shared/env/standard.mts`: add the mocks folder constant
- `src/lib/verbs/env/check.mts`: report E12 findings
- `src/lib/verbs/env/check.test.mts`: E12 cases
- `test/fixtures/env/stubbed/.picket/env/compose.yaml`: new fixture for drives
- `test/fixtures/env/stubbed/.picket/env/mocks/payments-mock.md`: valid definition
- `test/fixtures/env/stubbed/.picket/env/mocks/fraud-mock.md`: orphan definition

**Changes:**
- `standard.mts`: `MOCK_DIR`, the folder `.picket/env/mocks` built from `ENV_DIR`.
- `definition.mts`, the definition aggregate's reader (D-001):
  - `MockAnswer = { line: number; method: string; path: string; status: number; headers: [string, string][]; body: string | null }`.
  - `MockDefinition = { service: string; replaces: string; source: "recorded" | "api"; recorded: string | null; api: string | null; format: 1; answers: MockAnswer[] }`.
  - `parseMock(text: string, service: string): { definition: MockDefinition | null; problems: string[] }`, header through `frontmatter` of `src/lib/util/yaml-lite.mts` as `parseScenario` does. Header keys are closed (`replaces`, `source`, `recorded`, `api`, `format`); `recorded` is required with `source: recorded` and is a `YYYY-MM-DD` date, `api` is required with `source: api`. Words are closed: `when` at the line start, `status`, `header` and `body` indented under it. A path starts with `/`, holds no `?` or `#`, uses `*` only as a whole segment, and never starts with `/__picket/`. A second answer with the same method and path is a problem. Each problem names the line, as the scenario reader does (`when 3: ...`).
  - `listMocks(root: string): { service: string; path: string; definition: MockDefinition | null; problems: string[] }[]`, one per `.md` file under `MOCK_DIR`, the service taken from the file name; empty when the folder is missing.
  - `mockFindings(root: string, model: EnvModel): Finding[]` with rule `E12` and the file's service as the finding's service: every problem, a file whose service is not in the model, a service whose role is not `mock`, and an `api` path that does not exist under the root.
- `check.mts`: `environmentReport` adds `mockFindings(root, model)` to its findings.
- The `stubbed` fixture: `compose.yaml` with `x-picket.version: 1` and no app, holding `payments-mock` (role `mock`, an image pinned by digest, a healthcheck), `payments-mock.md` valid with two answers, one using `*`, and `fraud-mock.md` for a service `compose.yaml` lacks.

**Done when:**
- **T-1.1** A unit test parses a definition with `replaces: payments`, `source: recorded`, `recorded: 2026-11-18`, `format: 1` and two `when` blocks, and gets both answers in file order with method, path, status, headers and body.
- **T-1.2** Unit tests get one named problem each for: an unknown header key, `format: 2` (the message says to record the definition again), `source: recorded` without `recorded`, `source: api` without `api`, an answer with no `status`, a second `body`, a path with `?`, a path under `/__picket/`, `*` inside a segment (`/a*`), an unknown word, and a repeated method and path.
- **T-1.3** A unit test of `mockFindings` on a temporary project reports E12 for a definition of a missing service, for a definition of a service with role `dependency`, and for an `api` path that does not exist, and reports nothing for a project with no `mocks` folder.
- **T-1.4** `picket env check` on a temporary project with a broken definition prints a line starting `E12 <service>:` and exits 2, in `check.test.mts` with the fake engine.
- **T-1.5** `CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/stubbed" node dist/bin/picket.mjs env check` exits 2 and prints `E12 fraud-mock`.

## Phase 2: Picket's stub serves a mock

**Touch set:**
- `src/lib/shared/mocks/stub-server.mjs`: new stub program
- `src/lib/shared/mocks/stub-server.test.mts`: integration test of the stub
- `src/lib/shared/mocks/stub.mts`: new adapter, files and override
- `src/lib/shared/mocks/stub.test.mts`: adapter unit tests
- `src/lib/shared/mocks/definition.mts`: E12 owns stub ports, volumes
- `src/lib/shared/mocks/definition.test.mts`: the new E12 cases
- `src/lib/shared/env/rules.mts`: E3 skips a stubbed mock
- `src/lib/shared/env/rules.test.mts`: E3 cases
- `src/lib/shared/env/build-plan.mts`: merge stub fragments into override
- `src/lib/shared/env/build-plan.test.mts`: override shape test
- `src/lib/shared/env/stack-start.mts`: endpoint lookup, read only
- `src/lib/shared/env/trial.mts`: trial stack gets stubs
- `src/lib/verbs/env/start.mts`: wire stubs at start
- `src/lib/verbs/env/start.test.mts`: start with a stubbed mock
- `src/lib/verbs/env/trial.mts`: static rules with stubs
- `src/lib/shared/scenarios/base-run.mts`: base stack gets stubs
- `src/lib/shared/testing/cases.mts`: stub endpoints for cases
- `test/timing/budgets.test.mjs`: stub program line budget
- `test/fixtures/env/stubbed/.picket/env/compose.yaml`: payments-mock becomes stubbed
- `scripts/build.mjs`: `.mjs` is built, read only

**Changes:**
- `stub-server.mjs` (D-002), only `node:` modules, no import of Picket code:
  - exports `startStub({ definition, host, port }): Promise<{ port: number; close(): Promise<void> }>` and `answerFor(answers, method, path)`;
  - as a program, `node stub-server.mjs <definition.json>` listens on `0.0.0.0:8080`, and `node stub-server.mjs --health` exits 0 when `http://127.0.0.1:8080/__picket/health` answers 200, else 1;
  - routes: `GET /__picket/health` gives 200; `GET /__picket/received` gives a JSON array of `{ method, path, answered }` in arrival order, path without its query; any other request is matched on method and path, the query ignored, and answered with the first matching answer's status, headers and body, or with 501, `text/plain`, body `<service> has no answer for <METHOD> <path>`; requests under `/__picket/` are not logged.
- The compiled definition is `{ service, answers: [{ method, path, status, headers, body }] }`, written by the adapter from `MockDefinition`.
- `stub.mts`, the adapter:
  - `STUB_PORT = 8080`; the program path is `stub-server.mjs` beside the module (`import.meta.dirname`, which is the bundle's own folder once built);
  - `stubbedMocks(model, mocks): string[]`: mock services with a definition that parsed without problems;
  - `prepareStubs(root, stack, model, mocks, program?): Record<string, object>`: copies the program and writes `<service>.json` to `statePath(root, "env/<stack>/stub/")`, and returns per service the override fragment: `command: ["node", "/picket/stub-server.mjs", "/picket/mock.json"]`, two `bind` volumes with `read_only: true`, `healthcheck.test: ["CMD", "node", "/picket/stub-server.mjs", "--health"]` with the interval, timeout and retries the env fixture's services use, and `ports: [{ target: 8080 }]`; refuses with "the stub program is missing: rebuild Picket" when the program file is absent;
  - `withStubPorts(services, stubbed): EnvService[]`: the stubbed services carry port target 8080, so `serviceEndpoints` finds them.
- `build-plan.mts`: `overrideDoc(model, sources, key, id, stubs = {})` merges a service's fragment beside its item label.
- `rules.mts`: `staticFindings(model, stubbed: readonly string[] = [])`; E3 skips a stubbed service.
- `definition.mts`: `mockFindings` adds E12 for a service with a definition that declares `ports` or `volumes` in `compose.yaml` ("the stub owns its port and files: remove them").
- `start.mts`, both trial modules and `base-run.mts`: read `listMocks` (the base run from its base checkout, state under the root), refuse on E12 errors as on static ones, pass the fragments to `overrideDoc`, and look endpoints up through `withStubPorts`. `cases.mts` `stackOf` uses `withStubPorts` too.
- `budgets.test.mjs`: `stub_server_lines` per D-008, checked like `scenario_adapter_lines`.
- The `stubbed` fixture's `payments-mock` drops its healthcheck and runs on a Node 22 or later image pinned by digest.

**Done when:**
- **T-2.1** An integration test starts the stub on `127.0.0.1` with port 0 from the compiled `stubbed` fixture definition: `POST /charges` gets the answer's status, headers and body; `GET /charges/ch_9?x=1` is answered by `/charges/*`; `GET /charges/ch_9/refunds` gets 501 with the body `payments-mock has no answer for GET /charges/ch_9/refunds`.
- **T-2.2** In the same test, `GET /__picket/received` then returns those three requests in order with `answered` true, true and false; `GET /__picket/health` returns 200 and is not in the log.
- **T-2.3** A unit test of `overrideDoc` with a stub fragment shows, for `payments-mock`, the command, two read-only binds, the `--health` healthcheck and port target 8080 with no `published`; a mock with no definition gets only the item label, as before.
- **T-2.4** Unit tests of the rules: a stubbed mock with no healthcheck gets no E3; an unstubbed mock with no healthcheck still gets E3; a stubbed mock that declares `ports` gets E12.
- **T-2.5** `env start` with the fake engine on a temporary project with a stubbed mock writes `stub-server.mjs` and `payments-mock.json` under `.picket/state/env/<stack>/stub/`, the override file it passes to Compose names both, and the report's endpoints hold `payments-mock`.
- **T-2.6** `budgets.test.mjs` holds `stub_server_lines` equal to `stub-server.mjs`'s landed line count rounded up to the next multiple of 50, and the test fails when the file is longer.
- **T-2.7** [DEFERRED: QA, release QA pass] On a machine whose engine runs Compose `up`, `picket env start` on a project with a stubbed `payments-mock` reports the stack up, and `GET {payments-mock}/__picket/health` answers 200.

## Phase 3: Cases see mock traffic and gaps

**Touch set:**
- `src/lib/shared/mocks/stub.mts`: read and compare traffic
- `src/lib/shared/mocks/stub.test.mts`: traffic unit tests
- `src/lib/shared/scenarios/replay.mts`: runs carry mocks and gaps
- `src/lib/shared/scenarios/replay.test.mts`: traffic per run
- `src/lib/shared/scenarios/base-run.mts`: pass stubs to replay
- `src/lib/shared/testing/cases.mts`: stack stubs, case line
- `src/lib/shared/testing/cases.test.mts`: case line with a gap
- `src/lib/shared/testing/results.mts`: case row gains gaps
- `src/lib/shared/testing/report.mts`: Gaps section
- `src/lib/shared/testing/report.test.mts`: Gaps section test
- `src/lib/shared/testing/derive.mts`: verdict rules, read only
- `src/lib/verbs/test/case.mts`: row from the run
- `src/lib/verbs/test/rerun.mts`: row from the run
- `src/lib/verbs/test/classify.mts`: refuse product on a gap
- `src/lib/verbs/test/record.test.mts`: classify tests live here
- `src/lib/verbs/env/replay.mts`: pass stubs to replay
- `test/timing/budgets.test.mjs`: adapter line budget

**Changes:**
- `stub.mts` (D-003): `TrafficEntry = { method: string; path: string; answered: boolean }`; `readTraffic(adapter, stubs: Record<string, string>, timeoutMs): Promise<Record<string, TrafficEntry[]>>`, through the `HttpAdapter` of `src/lib/shared/scenarios/http.mts`, a stub that does not answer reading as an empty log; `trafficBetween(before, after): { mocks: string[]; gaps: string[] }`, where a log shorter after than before counts whole, and each unanswered entry gives `<service> has no answer for <METHOD> <path>`.
- `replay.mts`: `ReplayInput` gains `stubs: Record<string, string>` (stub service to URL) and `ownMocks: string[]`; `ScenarioRun` gains `mocks: string[]` and `gaps: string[]`. `replayOne` reads traffic before and after `confirmed`; a scenario that ran lists the stubs with traffic and every own mock; one blocked before running lists none.
- `base-run.mts` and `src/lib/verbs/env/replay.mts` pass `stubs` and `ownMocks` from their stack.
- `cases.mts`: `ItemStack` replaces `mocks` with `stubs` and `ownMocks`; `CaseRun` gains `mocks` and `gaps`; `caseLine` adds `· gap: <gap>` for each gap after the mock part.
- `results.mts`: `CaseRow` gains `gaps?: string[]`; a row written before this phase reads as no gaps.
- `case.mts` and `rerun.mts` take `mocks` and `gaps` from the run, not from the stack.
- `classify.mts`: `product` is refused for a case with gaps: `<case> met a gap in a mock (<gap>); a gap is never a product defect: class it environment, or add the answer to the definition`.
- `report.mts`: a `## Gaps` section with one line per gap and case, after Unclassified.
- `budgets.test.mjs`: `mock_adapter_lines` for `stub.mts` per D-008.

**Done when:**
- **T-3.1** A unit test of `replayScenarios` with a scripted adapter: a run during which `payments-mock`'s log grows lists `payments-mock` in `mocks`; a stub whose log did not grow is absent; a project-owned mock is listed on every run that ran and on none that was blocked before running.
- **T-3.2** An unanswered entry gives the gap `payments-mock has no answer for POST /refunds` on the run, the case line ends with `· gap: payments-mock has no answer for POST /refunds`, and the report holds a `## Gaps` section with that line.
- **T-3.3** `picket test classify <id> C-01 product` on a failed case with a gap is refused with a message naming the gap; `environment` on the same case is recorded.
- **T-3.4** A case row without a `gaps` field, as rows written before this phase are, gives the same case line, report table and derived verdict as before, in a test that feeds such a row.
- **T-3.5** A unit test of `trafficBetween`: a log of 3 entries before and 1 after counts that 1 entry as the run's traffic.
- **T-3.6** `budgets.test.mjs` holds `mock_adapter_lines` equal to `stub.mts`'s landed line count rounded up to the next multiple of 50, and the test fails when the file is longer.

## Phase 4: Replays and the closing line name what was mocked

**Touch set:**
- `src/lib/shared/mocks/definition.mts`: real name behind a mock
- `src/lib/shared/mocks/definition.test.mts`: real name tests
- `src/lib/shared/scenarios/results.mts`: result rows gain mocks, gaps
- `src/lib/shared/scenarios/results.test.mts`: item mocks reader
- `src/lib/verbs/env/replay.mts`: store mocks, print flow lines
- `src/lib/verbs/env/replay.test.mts`: flow line tests
- `src/lib/shared/testing/keep-cases.mts`: real names from definitions
- `src/lib/shared/testing/keep-cases.test.mts`: notProven tests
- `src/lib/verbs/close/close.mts`: union tester and replay mocks
- `src/lib/verbs/close/block.mts`: closing line, read only
- `src/lib/verbs/close/index.test.mts`: closing line tests

**Changes:**
- `definition.mts` (D-004): `realService(mocks, mock): string`, the `replaces` of the mock's definition, else the name without a trailing `-mock` (moved here from `keep-cases.mts` with `MOCK_SUFFIX`).
- `results.mts`: `ResultRow` gains `mocks?: string[]` and `gaps?: string[]`; `itemMocks(rows, item): string[]`, the mocks of the results of the item's latest run row with mode `full` or `affected`, a row without the field reading as none.
- `src/lib/verbs/env/replay.mts`: result rows store the run's `mocks` and `gaps`; `ReplayLine` gains `flow` (the card's `flow`, `(none)` without one) and `mocks`; a gap joins the line's detail as on a case line; after the summary line, `renderReplay` prints one line per flow whose runs had mocks: `flow <flow>: verified up to <real names joined by " and ">, which is mocked` (`which are mocked` for two or more).
- `keep-cases.mts`: `notProven(rows, round, real: (mock: string) => string)`.
- `close.mts`: `testedFacts` takes the tester round's mocks (when a round exists) and `itemMocks(readResults(root), id)`, maps each through `realService(listMocks(root), …)`, and gives `unproved` sorted and unique; `block.mts` prints it unchanged as `Not verified end to end:`.

**Done when:**
- **T-4.1** A verb test of `env replay` with the fake engine and a scripted adapter finds the run's `mocks` and `gaps` on each stored result row.
- **T-4.2** A render test: two scenarios of flow `checkout` through `payments-mock` (`replaces: payments`) and one of flow `search` with no mock give exactly one flow line, `flow checkout: verified up to payments, which is mocked`; a mocked scenario with no flow gives `flow (none): …`.
- **T-4.3** A close test: final-round cases through `payments-mock`, whose definition says `replaces: payments-api`, and through `ledger-mock`, which has none, print `Not verified end to end: ledger, payments-api`.
- **T-4.4** A close test on an item with no tester verdict whose latest full replay stored `mocks: ["payments-mock"]` prints `Not verified end to end: payments` when `payments-mock` has no definition.
- **T-4.5** A unit test of `itemMocks`: a result row without `mocks` reads as none, and a `base` run of the item is ignored.

## Phase 5: Catalog entries are read and checked

**Touch set:**
- `src/lib/shared/catalog/entry.mts`: new entry reader and checker
- `src/lib/shared/catalog/entry.test.mts`: entry unit tests
- `src/lib/shared/scenarios/format.mts`: export the step reader
- `src/lib/shared/scenarios/rules.mts`: placeholder grammar, read only
- `src/lib/shared/scenarios/values.mts`: test user variable, read only
- `src/lib/shared/env/standard.mts`: catalog and data folders
- `src/lib/verbs/env/check.mts`: report E13 findings
- `src/lib/verbs/env/check.test.mts`: E13 cases
- `test/fixtures/env/stubbed/.picket/env/catalog/customer.md`: valid create entry
- `test/fixtures/env/stubbed/.picket/env/catalog/open-order.md`: find entry that writes

**Changes:**
- `format.mts`: `readSteps` is exported; nothing else changes.
- `standard.mts`: `CATALOG_DIR` (`.picket/env/catalog`) and `DATA_DIR` (`.picket/env/data`), built from `ENV_DIR`.
- `entry.mts` (D-005):
  - `EntryKind = "create" | "find" | "fixed" | "user" | "sql"`; `CatalogEntry = { name; kind; need; how: string | null; file: string | null; service: string | null; role: string | null; fields: string[]; steps: Step[]; captures: string[] }`.
  - `parseEntry(text, name): { entry: CatalogEntry | null; problems: string[] }`: closed header keys (`kind`, `need`, `how`, `file`, `service`, `role`, `fields`, `format`), `format: 1`, a name matching `^[a-z][a-z0-9-]*$`, steps through `readSteps`.
  - Kind rules: `find`, `fixed` and `sql` send only `GET` requests; `create` sends at least one `POST`, `PUT` or `PATCH` whose target or body holds `PKT-{run}`; every kind but `user` captures at least one value; `user` has `role` and `fields` and no steps; `fixed` has `how`; `sql` has `file` and `service`; no step holds `{data:`.
  - `listEntries(root)`, one per `.md` file under `CATALOG_DIR`.
  - `entryFindings(root, model, scenarios, env): Finding[]` with rule `E13` and the entry or scenario as subject: each problem; a `sql` `file` that resolves outside `DATA_DIR` or does not exist; a `sql` `service` whose role is not `data`; entry steps checked by `scenarioProblems` against the model's services; a saved scenario's `{data:<entry>.<capture>}` naming no entry or no capture of it; and, as `pending`, a `user` field whose `userVariable(role, field)` is unset, naming the variable and never a value.
- `check.mts`: adds `entryFindings`.
- Fixture: `customer.md` creates a customer through `{payments-mock}` and captures `id`; `open-order.md` is a `find` entry with a `POST`.

**Done when:**
- **T-5.1** A unit test parses one entry of each of the five kinds and gets its header fields, steps and captures.
- **T-5.2** Unit tests get one named problem each for: a `find`, `fixed` or `sql` entry with a `POST`; a `create` entry with no changing request holding `PKT-{run}`; an entry with no capture; a `user` entry with steps; a step holding `{data:`; an unknown `kind`; the name `Open_Order`.
- **T-5.3** `entryFindings` reports E13 for a `sql` entry whose `file` is `../compose.yaml`, `/etc/hosts` or missing, and for one whose `service` has role `dependency`.
- **T-5.4** `entryFindings` reports E13 for a saved scenario using `{data:customer.ref}` when `customer` captures only `id`, and a pending finding naming `PICKET_USER_BUYER_PASSWORD` for a `user` entry `buyer` with field `password` when the variable is unset.
- **T-5.5** `CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/stubbed" node dist/bin/picket.mjs env check` exits 2 and prints `E13 open-order`.

## Phase 6: Scenarios take data from the catalog

**Touch set:**
- `src/lib/shared/catalog/resolve.mts`: new resolution before a run
- `src/lib/shared/catalog/resolve.test.mts`: resolution unit tests
- `src/lib/shared/scenarios/values.mts`: the data placeholder
- `src/lib/shared/scenarios/values.test.mts`: data placeholder tests
- `src/lib/shared/scenarios/rules.mts`: data is a value source
- `src/lib/shared/scenarios/rules.test.mts`: rule 3 with data
- `src/lib/shared/scenarios/runner.mts`: data in scope, captures out
- `src/lib/shared/scenarios/runner.test.mts`: captures returned
- `src/lib/shared/scenarios/replay.mts`: resolve before each attempt
- `src/lib/shared/scenarios/replay.test.mts`: blocked texts
- `src/lib/shared/scenarios/keep.mts`: create data counts as owned
- `src/lib/shared/scenarios/keep.test.mts`: ownership tests
- `src/lib/shared/scenarios/base-run.mts`: base catalog from base checkout
- `src/lib/shared/testing/cases.mts`: catalog into case input
- `src/lib/shared/testing/keep-cases.mts`: pass create entries
- `src/lib/verbs/env/replay.mts`: catalog into replay input

**Changes:**
- `values.mts`: `DATA_PREFIX = "data:"`; `ValueScope` gains `data: Record<string, string>` keyed `<entry>.<capture>`; a `data:` name reads it, else blocks with `{data:<entry>.<capture>} has no value`.
- `rules.mts`: `isSource` accepts `data:<entry>.<capture>`; the rule 3 message lists "a catalog entry" among the sources.
- `runner.mts`: `RunInput` gains `data`; `RunOutcome` gains `captures`, so an entry's run hands its values back.
- `resolve.mts`: `dataRefs(card): string[]`, entry names in order of first use; `resolveData(card, catalog, run): Promise<{ data } | { blocked: string }>` runs each named entry's steps once as a card, with the attempt's run key, and maps a failed or blocked entry run by kind: `find` to `no matching data: <entry>`, `fixed` to `data drift: <entry> is missing`, `sql` to `no matching data: <entry>; its SQL file runs with picket data run`, `create` to `could not create data: <entry>`; a name that is no entry blocks with `no catalog entry <entry>`.
- `replay.mts`: `ReplayInput` gains `catalog: CatalogEntry[]`; `attempt` draws one run key, resolves the data, and runs the card with it, a blocked resolution giving a `blocked` outcome.
- `keep.mts`: `writesUnownedData(card, created: readonly string[])` counts a changing request as owned when its target or body holds `PKT-` or `{data:<a created entry>.`; `keep-cases.mts` passes the names of the `create` entries; the declared-check path passes none.
- The replay verb, `base-run.mts` (from its base checkout) and `cases.mts` `runCaseInput` pass `listEntries`.

**Done when:**
- **T-6.1** A unit test with a scripted adapter runs a scenario holding `request PUT {orders}/customers/{data:customer.id}` with a `create` entry `customer`: the adapter sees the entry's `POST`, whose body holds `PKT-` and the attempt's run key, then the `PUT` to `/customers/<the captured id>`.
- **T-6.2** Unit tests get outcome `blocked`, never `failed`, with the texts `no matching data: open-order`, `data drift: <entry> is missing`, `no matching data: <entry>; its SQL file runs with picket data run` and `could not create data: customer` for a failing entry of each kind.
- **T-6.3** An entry named twice in one scenario runs once per attempt, counted on the scripted adapter.
- **T-6.4** `scenarioProblems` accepts `{data:customer.id}`, and its rule 3 message for an unknown placeholder names a catalog entry among the sources.
- **T-6.5** `writesUnownedData` is false for a `PUT` to `{orders}/customers/{data:customer.id}` when `customer` is a `create` entry and true when it is a `find` entry; the existing `PKT-` cases keep their results.
- **T-6.6** `budgets.test.mjs` passes with `scenario_core_lines` still 600.

## Phase 7: The user approves SQL files

**Touch set:**
- `src/lib/verbs.mts`: lead-only data group
- `src/lib/cli/registry.mts`: register show and approve
- `src/lib/shared/paths.mts`: approvals state file
- `src/lib/shared/data/approvals.mts`: new digest and approval store
- `src/lib/shared/data/approvals.test.mts`: approval unit tests
- `src/lib/verbs/data/show.mts`: new show verb
- `src/lib/verbs/data/approve.mts`: new approve verb
- `src/lib/verbs/data/approve.test.mts`: show and approve tests
- `src/lib/hooks/guard/bash/kernel.mts`: lead-only from entries, read only
- `src/lib/hooks/guard/bash/payloads.mts`: denial reason for data
- `src/lib/hooks/guard/bash/payloads.test.mts`: denial tests
- `src/lib/hooks/guard/bash/payloads.variants.test.mts`: closure seeds
- `src/lib/hooks/guard/bash/kernel.test.mts`: pinned lead-only list
- `src/lib/hooks/guard/scope/index.mts`: state is protected, read only
- `docs/reference/cli.md`: regenerated reference

**Changes:**
- `verbs.mts` (D-006): `GroupEntry` gains `leadOnly?: boolean`; a group `data` with `leadOnly: true`, subverbs `show` (`readOnly: true`) and `approve`.
- `registry.mts`: `"data show"` and `"data approve"` load `src/lib/verbs/data/show.mts` and `approve.mts`.
- `paths.mts`: `STATE_FILES.dataApprovals = "data/approvals.jsonl"`.
- `approvals.mts`: `sqlFile(root, path): string` resolves a path written relative to `.picket/env/` (`data/customer.sql`) and refuses one that lands outside `DATA_DIR` after resolving, absolute paths included; `fileDigest(abs)`, sha256 hex of the bytes; `approvalStatus(root, path): "approved" | "not approved" | "changed since approval"` from the latest row for the path; `recordApproval(root, path, sha256, session, now)` appends `{ path, sha256, at, session }`.
- `show.mts`: `data show <path>` prints `<path> · sha256:<hex> · <status>`, a blank line, then the file in full.
- `approve.mts`: `data approve <path> --sha256 <64 hex>` refuses a digest that differs from the file's now (`the file changed since it was shown; run picket data show <path> again`), else records and prints `approved <path> sha256:<first 12 hex>`.
- `payloads.mts`: `leadOnlyReason` gives `data` its own text: `picket data` shows, approves and runs SQL against a database, so only the lead runs it on the user's word.
- Tests: both pinned lists in `kernel.test.mts` gain `data`; `payloads.test.mts` gains the reason and the denials; the closure test gains seeds for `picket data show`, `picket data approve` and `picket data run`, bare and inside `picket drive --run`.
- `npm run docs` regenerates `docs/reference/cli.md`.

**Done when:**
- **T-7.1** A verb test of `data show data/customer.sql` on a temporary project prints `data/customer.sql · sha256:<64 hex> · not approved`, a blank line and the file's text in full.
- **T-7.2** `data approve` with the digest show printed appends one row with `path`, `sha256`, `at` and `session` to `.picket/state/data/approvals.jsonl`, and `data show` then says `approved`.
- **T-7.3** `data approve` with another digest is refused with `the file changed since it was shown`; after one byte of an approved file changes, `data show` says `changed since approval`.
- **T-7.4** `data show` and `data approve` refuse `../compose.yaml`, `/etc/hosts` and `data/../compose.yaml`.
- **T-7.5** `LEAD_ONLY_VERBS` is exactly `comment`, `data`, `reply`, `uninstall`, `waive`; guard.bash denies a spawned developer `picket data approve data/a.sql --sha256 <hex>` and `picket drive --run "picket data show data/a.sql"` with the `data` reason and lets the lead run both; the closure test passes with the new seeds.
- **T-7.6** `docs/reference/cli.md` holds a `## picket data` section, and `npm test` passes.

## Phase 8: The kernel runs an approved SQL file

**Touch set:**
- `src/lib/verbs.mts`: add the run subverb
- `src/lib/cli/registry.mts`: register run
- `src/lib/shared/paths.mts`: runs state file
- `src/lib/shared/env/standard.mts`: connection variable name
- `src/lib/shared/env/engine.mts`: compose arguments, read only
- `src/lib/shared/data/connection.mts`: new server and database reader, mask
- `src/lib/shared/data/connection.test.mts`: connection unit tests
- `src/lib/shared/data/runs.mts`: new run rows
- `src/lib/verbs/data/run.mts`: new run verb
- `src/lib/verbs/data/run.test.mts`: run verb tests
- `src/lib/verbs/close/close.mts`: closing facts for runs
- `src/lib/verbs/close/block.mts`: Data line
- `src/lib/verbs/close/index.test.mts`: Data line test
- `docs/reference/cli.md`: regenerated reference

**Changes:**
- `standard.mts`: `dataVariable(service)`, `PICKET_DATA_` and the service name in upper snake case, the shape `urlVariable` uses (`orders-sql` gives `PICKET_DATA_ORDERS_SQL`).
- `paths.mts`: `STATE_FILES.dataRuns = "data/runs.jsonl"`.
- `connection.mts` (D-007): `connectionTarget(text): { server: string; database: string }`, from `key=value;` pairs (`server`, `data source`, `address`, `addr`, `host`; `database`, `initial catalog`, `dbname`; keys in any case) or a URL (`host:port` and the first path segment), `unknown` for a part not found; `maskConnection(text, connection)` replaces the whole string and its `password` or `pwd` value with `***`.
- `runs.mts`: `appendDataRun(root, row)` and `itemDataRuns(root, item)`; a row is `{ at, item, entry, path, sha256, server, database, status }`.
- `run.mts`: `data run <id> <entry>` refuses a closed item, an entry that is missing or not `sql`, a file not approved or changed since approval (naming `picket data show <path>`), and an unset or empty `dataVariable(service)` (naming the variable and saying Picket never stores it); then, on the item's stack name and its recorded files (only `compose.yaml` when no stack is recorded), it runs `--profile picket-data run --rm --no-deps -T -e <variable> -v <absolute file>:/picket/run.sql:ro <service>` through `runCompose`; it appends a run row and prints `ran <path> on server <server>, database <database> through <service>: exit <status>`, plus, on a failure, `failureCause` passed through `maskConnection`.
- `close.mts` and `block.mts`: `Closing` gains `data`, the item's run rows; the block prints one `Data: <entry> ran on server <server>, database <database>, exit <status>` line each, after the tested lines.
- `verbs.mts` and `registry.mts`: subverb `run`; `npm run docs` regenerates `docs/reference/cli.md`.

**Done when:**
- **T-8.1** With an approved file and `PICKET_DATA_ORDERS_SQL` set, a logging runner receives `--profile picket-data run --rm --no-deps -T -e PICKET_DATA_ORDERS_SQL -v <root>/.picket/env/data/customer.sql:/picket/run.sql:ro orders-sql` after the Compose project flags, and no argument holds the variable's value.
- **T-8.2** `data run` is refused for a file never approved, for one changed since approval, for an unset and for an empty variable (the message names the variable and holds no value), for an entry of kind `find`, and for a `done` item.
- **T-8.3** `connectionTarget` gives server `tcp:sql01,1433` and database `orders_test` for `Server=tcp:sql01,1433;Database=orders_test;User Id=qa;Password=s3cret`, `db.test:5432` and `orders_test` for `postgresql://qa:s3cret@db.test:5432/orders_test`, and `unknown` twice for `orders`.
- **T-8.4** A client failure whose stderr holds the connection string and `s3cret` prints the exit status and a cause holding `***` and not `s3cret`.
- **T-8.5** The run row in `.picket/state/data/runs.jsonl` holds `item`, `entry`, `path`, `sha256`, `server`, `database` and `status` and no part of the connection string; the closing block of that item prints `Data: customer ran on server sql01, database orders_test, exit 0`.
- **T-8.6** [DEFERRED: QA, release QA pass] Against a SQL Server 2016 test database and the product owner's `data` service, an approved file adds its rows, `picket data run` exits 0, and a `sql` entry's find steps then locate them.

## Phase 9: The tester and the setup learn mocks and the catalog

**Touch set:**
- `src/lib/shared/testing/brief.mts`: Data catalog section
- `src/lib/shared/testing/brief.test.mts`: brief section test
- `src/lib/verbs/test/brief.mts`: pass the catalog entries
- `src/skills/testing/steps/cases.md`: data placeholders, gap line
- `src/skills/testing/steps/results.md`: gap is environment
- `src/lib/shared/env/decisions.mts`: mock step names the definition
- `src/lib/shared/env/decisions.test.mts`: request text test

**Changes:**
- `brief.mts`: `compileBrief` takes the catalog entries and adds a `## Data catalog` section, one line per entry, `- <name> (<kind>): <need>; captures <names>`, and no section when there are none; the brief verb passes `listEntries(root)`.
- `cases.md`: step 4 adds that a value may come from the brief's catalog as `{data:<entry>.<capture>}`, and that a case changes only data it created or a `create` entry made; step 7 adds that `· gap:` means the mock's definition has no answer, which is classed `environment`.
- `results.md`: the `environment` bullet names the case line's `gap:` part.
- `decisions.mts`: `hostStep` for a mock says to add the `mock` service `<label>-mock` on a Node 22 or later image pinned by digest with its answers in `.picket/env/mocks/<label>-mock.md`, which Picket's stub serves, or a container the project picks; the "until Picket's stub server exists" text goes.

**Done when:**
- **T-9.1** A unit test of `compileBrief` on a temporary project with a `create` entry `customer` prints `- customer (create): <its need>; captures id` under `## Data catalog`, and no such section without a catalog.
- **T-9.2** A unit test of the env init request text for a host chosen as a mock finds `.picket/env/mocks/<label>-mock.md` and "pinned by digest", and not "until Picket's stub server exists".
- **T-9.3** `src/skills/testing/steps/cases.md` shows `{data:<entry>.<capture>}` and the meaning of `gap:`, and `budgets.test.mjs` passes with every step file at 80 lines or fewer.

## Open questions

- **OQ-001** SQL Server 2016's `sqlcmd` may take a server, database, user and password as separate flags rather than one connection string, so the `data` service's command would split `PICKET_DATA_<SERVICE>` itself. Owner: the product owner. Fallback: Picket's contract stays the variable and `/picket/run.sql` (D-007); the project's `data` service runs a small shell wrapper that splits the string, and phase 8's deferred check uses it.
- **OQ-002** `.claude/rules/harness-authoring.md` asks for a one-line rationale next to each budget number, which is a code comment the `comments` rule lets in only through `picket comment`. Owner: the user. Fallback: the developer adds `stub_server_lines` and `mock_adapter_lines` without a comment and proposes the line on its block (`landed N lines rounded up to 50 (design D-008)`) for the user to approve or decline.
- **OQ-003** Should a later item add a verb that records a mock's answers from the real service, so "record again" after a format change is one command? Owner: the product owner. Fallback: a definition is written or recorded again by hand; `format` mismatch messages say so.
- **OQ-004** Should the test stage's user stop for "blocked: no matching data" offer running a `sql` entry as a reply choice, and should the gate packet print the server and database of each SQL run, as the draft's section 10 default says? Owner: the product owner. Fallback: the user asks the lead, or runs `! picket data run <id> <entry>`, before replying; the run's output and the closing `Data:` line name server and database.
- **OQ-005** A user-facing reference of the mock definition and catalog entry formats is an external document this item does not write. Owner: the user. Fallback: the env init steps (phase 9), the testing skill and the E12 and E13 messages name each word and each mistake.

## Revision log
