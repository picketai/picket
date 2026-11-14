---
kind: design
lane: design
title: Standard test environment and env verbs
date: 2026-11-14
audience: developer
sources:
  - work/20261114-standard-test-environment-and-env-verbs/request.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - src/lib/verbs.mts
  - src/lib/cli/registry.mts
  - src/lib/hooks.mts
  - src/lib/hooks/hook-spec.mts
  - src/lib/util/process.mts
  - src/lib/shared/checkouts.mts
  - src/lib/shared/repos.mts
  - src/lib/shared/host-sessions.mts
  - src/lib/shared/work/send.mts
  - src/lib/shared/work/state.mts
  - src/lib/verbs/open/index.mts
  - src/lib/verbs/close/close.mts
  - src/lib/verbs/verify/index.mts
  - src/lib/hooks/guard/bash/kernel.mts
  - scripts/test.mjs
  - compose-spec/compose-go types/types.go, types/project.go, types/healthcheck.go (main, read 2026-11-14)
  - docker/compose docs/reference compose_config.md, compose_version.md, compose_up.md, compose_down.md, compose.md (main, read 2026-11-14)
  - docker/cli system_info.md and containers/podman podman-info.1.md (main, read 2026-11-14)
  - Claude Code 2.1.325 binary (SessionEnd reasons and hook time budget)
phases:
  - n: 1
    files: [src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/shared/env/engine.mts, src/lib/shared/env/engine.test.mts, src/lib/verbs/env/check.mts, src/lib/verbs/env/check.test.mts, src/lib/hooks/guard/bash/kernel.test.mts, test/fixtures/env/fake-engine.mjs, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"env check": \(\) => import\("\.\./verbs/env/check\.mts"\)'
      - path: src/lib/shared/env/engine.mts
        pattern: '\bPICKET_ENGINE\b'
      - path: src/lib/shared/env/engine.mts
        pattern: 'export function machineReport\b'
    tests: true
    drive:
      - covers: T-1.6
        command: node dist/bin/picket.mjs env check
        exit_code: 0
        contains: ["Linux containers"]
    security: false
  - n: 2
    files: [src/lib/shared/env/standard.mts, src/lib/shared/env/standard.test.mts, src/lib/shared/env/model.mts, src/lib/shared/env/model.test.mts, src/lib/shared/env/rules.mts, src/lib/shared/env/rules.test.mts, src/lib/shared/env/engine.mts, src/lib/shared/env/engine.test.mts, src/lib/verbs/env/check.mts, src/lib/verbs/env/check.test.mts, test/fixtures/env/umbrella/.picket/env/compose.yaml, test/fixtures/env/umbrella/.picket/env/docker/orders/Dockerfile, test/fixtures/env/umbrella/services/orders/package.json, test/fixtures/env/umbrella/services/orders/server.mjs, test/fixtures/env/compose-config.json, test/fixtures/env/fake-engine.mjs, test/env/model.engine.mjs, scripts/test.mjs, test/cli/env.test.mjs]
    greps:
      - path: src/lib/shared/env/standard.mts
        pattern: 'io\.github\.picketai\.'
      - path: src/lib/shared/env/rules.mts
        pattern: 'export function staticFindings\b'
      - path: scripts/test.mjs
        pattern: 'env: skipped, no container engine'
    tests: true
    drive:
      - covers: T-2.5
        command: node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["rules passed"]
      - covers: T-2.6
        command: node scripts/test.mjs env
        exit_code: 0
        contains: ["env: skipped, no container engine"]
    security: false
  - n: 3
    files: [src/lib/shared/env/profiles.mts, src/lib/shared/env/profiles.test.mts, src/lib/shared/env/config-entries.mts, src/lib/shared/env/config-entries.test.mts, src/lib/shared/env/scan.mts, src/lib/shared/env/scan.test.mts, src/lib/shared/paths.mts, src/lib/verbs/env/init.mts, src/lib/verbs/env/init.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, test/fixtures/env/umbrella/services/billing/Billing.csproj, test/fixtures/env/umbrella/services/billing/appsettings.json, test/fixtures/env/umbrella/services/legacy/Legacy.csproj, test/fixtures/env/umbrella/services/legacy/web.config, test/fixtures/env/umbrella/services/orders/.env, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/env/config-entries.mts
        pattern: 'export function masked\b'
      - path: src/lib/shared/env/scan.mts
        pattern: 'export function scanUmbrella\b'
      - path: src/lib/cli/registry.mts
        pattern: '"env init": \(\) => import\("\.\./verbs/env/init\.mts"\)'
    tests: true
    drive:
      - covers: T-3.7
        command: node dist/bin/picket.mjs env init --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["S1", "picket env init --create"]
    security: true
  - n: 4
    files: [src/lib/shared/env/decisions.mts, src/lib/shared/env/decisions.test.mts, src/lib/shared/env/instep.mts, src/lib/shared/env/instep.test.mts, src/lib/verbs/env/init.mts, src/lib/verbs/env/init.test.mts, src/lib/verbs/env/check.mts, src/lib/verbs/env/check.test.mts, test/fixtures/env/umbrella/.picket/env/compose.yaml, test/fixtures/env/compose-config.json, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/env/decisions.mts
        pattern: 'export function requestText\b'
      - path: src/lib/shared/env/instep.mts
        pattern: 'export function inStepFindings\b'
      - path: src/lib/verbs/env/init.mts
        pattern: '\bcreateItem\b'
    tests: true
    drive:
      - covers: T-4.7
        command: node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["pending: billing"]
    security: true
  - n: 5
    files: [src/lib/shared/env/build-plan.mts, src/lib/shared/env/build-plan.test.mts, src/lib/shared/env/stacks.mts, src/lib/shared/env/stacks.test.mts, src/lib/shared/env/engine.mts, src/lib/verbs/env/start.mts, src/lib/verbs/env/start.test.mts, src/lib/verbs/env/stop.mts, src/lib/verbs/env/stop.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, test/fixtures/env/fake-engine.mjs, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/env/build-plan.mts
        pattern: '\bGIT_INDEX_FILE\b'
      - path: src/lib/shared/env/build-plan.mts
        pattern: 'org\.opencontainers\.image\.revision'
      - path: src/lib/cli/registry.mts
        pattern: '"env start": \(\) => import\("\.\./verbs/env/start\.mts"\)'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/env/trial.mts, src/lib/shared/env/trial.test.mts, src/lib/verbs/env/trial.mts, src/lib/verbs/env/trial.test.mts, src/lib/verbs/env/check.mts, src/lib/verbs/env/check.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, test/cli/env.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/env/trial.mts
        pattern: '--remove-orphans'
      - path: src/lib/cli/registry.mts
        pattern: '"env trial": \(\) => import\("\.\./verbs/env/trial\.mts"\)'
    tests: true
    drive:
      - covers: T-6.5
        command: node dist/bin/picket.mjs env trial --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["trial passed twice"]
    security: false
  - n: 7
    files: [src/lib/hooks.mts, src/lib/hooks/hook-spec.mts, src/lib/hooks/env/stacks/index.mts, src/lib/hooks/env/stacks/index.test.mts, test/hooks/env.stacks.test.mjs, test/repo/hook-list.test.mjs, test/repo/plugin-layout.test.mjs, docs/reference/hooks.md, src/lib/shared/env/stacks.mts, src/lib/verbs/env/status.mts, src/lib/verbs/env/status.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts, test/fixtures/env/fake-engine.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/hooks.mts
        pattern: '"env\.stacks"'
      - path: src/lib/hooks.mts
        pattern: '"SessionEnd"'
      - path: src/lib/cli/registry.mts
        pattern: '"env status": \(\) => import\("\.\./verbs/env/status\.mts"\)'
    tests: true
    drive:
      - covers: T-7.7
        command: node dist/bin/picket.mjs env status --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["no stacks"]
    security: false
  - n: 8
    files: [src/lib/shared/env/purge.mts, src/lib/shared/env/purge.test.mts, src/lib/verbs/env/purge.mts, src/lib/verbs/env/purge.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/index.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, test/fixtures/env/fake-engine.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/env/purge.mts
        pattern: '--remove-orphans'
      - path: src/lib/shared/env/purge.mts
        pattern: '"volume",\s*"rm"'
        absent: true
      - path: src/lib/verbs/close/close.mts
        pattern: '\bpurgeStack\b'
      - path: src/lib/shared/env/purge.mts
        pattern: '\bpurged\b'
    tests: true
    drive:
      - covers: T-8.5
        command: node dist/bin/picket.mjs env purge picket-zzzz --root test/fixtures/env/umbrella
        exit_code: 0
        contains: ["nothing to remove"]
    security: false
  - n: 9
    files: [src/lib/verbs/verify/index.mts, src/lib/verbs/verify/index.test.mts, src/lib/shared/env/instep.mts, src/lib/shared/env/instep.test.mts]
    greps:
      - path: src/lib/shared/env/instep.mts
        pattern: 'export function splitByChange\b'
      - path: src/lib/verbs/verify/index.mts
        pattern: '\bsplitByChange\b'
    tests: true
    drive: true
    security: false
  - n: 10
    files: [test/env/lifecycle.engine.mjs, test/fixtures/env/umbrella/.picket/env/compose.yaml, scripts/test.mjs]
    greps:
      - path: scripts/test.mjs
        pattern: '\.engine\.mjs'
    tests: true
    drive: true
    security: false
---
# Design: Standard test environment and env verbs

## Problem

SDR 00004 (`artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md`, D-003, D-004, TF-002) ratified one enforced test environment per project: `.picket/env/` at the umbrella root on the Compose Specification, run by Docker or Podman with Linux containers, with service roles, check rules, a setup verb that decides with the user and creates a work item, and a lifecycle from build to purge (detail in `artifacts/strategy/drafts/testing-and-test-environment.md` section 2). The user's constraint of 2026-11-14 binds the shape: dotnet, node and SQL Server are prepared for, but no runtime, database engine or connection type is built in. Two facts of this machine bind the testing: neither `docker` nor `podman` is installed, and `npm test` must stay free of real infrastructure, so every engine call needs a seam and the real-engine runs happen where an engine exists (the CI `test` job runs `npm test` on ubuntu).

## Decisions

### D-001: Compose reads the environment, Picket reads Compose's model
**Decision:** Infrastructural decision. Picket never parses `compose.yaml`. The engine adapter runs `<engine> compose --project-directory <root>/.picket/env -f <root>/.picket/env/compose.yaml config --profiles`, then the same with `config --format json` and one `--profile <name>` per listed profile, and `model.mts` reads that JSON. Compose resolves interpolation, `extends`, `include`, anchors and short forms, so the standard is the real Compose Specification, not a subset. Every profile is enabled because compose-go leaves profile-disabled services out of `services` (`Project.DisabledServices` has `json:"-"`), and the top-level `x-picket` block survives because `Project.MarshalJSON` copies top-level extensions (service-level `x-` keys are dropped, so Picket uses none). Flags and output were read from the Compose reference and compose-go source on 2026-11-14.
**Instead of:** vendoring a YAML parser and reading the file: Picket would re-implement Compose's merge and interpolation rules, and `yaml-lite` throws on the nesting a Compose file has.
**Risks:**
- **RISK-001** Every rule needs an installed engine, `env check` included. Mitigation: the machine check runs first and names what to install; the fixture's fake engine runs the rules in tests and drives.
- **RISK-002** The recorded fixture model is written from compose-go struct tags, not captured from a real run. Mitigation: phase 2's `env` test step compares the live model with the recorded one wherever an engine exists, and the CI test job has one.

### D-002 (r2): The environment file holds every decision
**Decision:** Infrastructural decision. A Compose service carries its role in the label `io.github.picketai.role` (`app`, `dependency`, `mock`, `data`, `seed`). A `shared` service is not a Compose service, because Compose has no service that is never started: it is an entry `x-picket.shared.<name>.address` holding the name of the variable that holds its address, never the address. The top-level `x-picket` block has a closed key list: `version: 1`, `shared`, `wiring` (rows `{ service, file, key, by: env | file | keep, variable?, replaced? }`), `ignored` (scanned folders that are not services) and `pending` (rows `{ service, what }` for parts left to the user). "In step" is then a set comparison between a scan and this one model, with no second state file. Because the comparison needs nothing else, `picket verify` runs it too: in a project with an environment, a phase fails while an out-of-step finding lies on a path the item changed, so the environment change travels in the item that changes the system; a finding on a path the item did not change is a verify warning, not a failure (draft section 2.2). [IRREVERSIBLE] once released: the label names and the `x-picket` keys become a public contract inside users' repositories; a later change needs `x-picket.version: 2` and a reader for both versions. The label prefix waits on OQ-001.
**Instead of:** a separate decisions file beside `compose.yaml`: two files drift, and every in-step check would have to read and reconcile both.
**Risks:**
- **RISK-003** `x-picket` grows into a second configuration language. Mitigation: an unknown key is a finding (rule E8), and adding a key needs a version bump.

### D-003: One engine adapter, judged by what the engine reports
**Decision:** Infrastructural decision. `src/lib/shared/env/engine.mts` is the only module that spawns the engine, through an injected runner, so unit tests pass recorded answers. The program is `PICKET_ENGINE` from the context's environment, else the first of `docker` and `podman` whose `info --format json` exits 0; a value ending in `.mjs` runs under `process.execPath` (the fixture's fake engine). The requirements are the engine's OS type `linux` (Docker `OSType`, Podman `host.os`) and Compose major version 2 or later from `compose version --format json`. The host operating system is not checked: native Windows passes when Docker Desktop runs Linux containers and fails in Windows containers mode. Memory and free disk are printed, never judged (OQ-002). Engine output that is a JSON array or JSON lines reads the same.
**Instead of:** checking the host OS for WSL2: the user's developers run Claude Code on native Windows with Docker Desktop, which works and would be refused.
**Risks:**
- **RISK-004** `podman compose` may delegate to podman-compose 1.x. Mitigation: the Compose version check fails and its line names docker-compose v2 as the provider to install.
- **RISK-005** The `.mjs` branch is product code that serves tests. Mitigation: it is one branch with its own unit test; its maintenance cost is that line.

### D-004: The scan is tables, not branches
**Decision:** Infrastructural decision. `profiles.mts` holds one row per runtime: marker files, a test that a marker is a service, whether it runs in a Linux container, the default Dockerfile choice, the request step for a Picket-written Dockerfile, and how a configuration key becomes a variable name. Rows: `dotnet` (a `.csproj` with the Web SDK or `OutputType` Exe; a library `.csproj` defaults to ignored; keys `A:B` become `A__B`), `dotnet-framework` (a `.csproj` with `TargetFrameworkVersion`; not Linux, defaults to shared), `node` (`package.json`, nested ones folded into the outer service), `go`, `java`, `python`, `rust`, `ruby`, `php`, and `container` (a `Dockerfile` with no other marker). Only `dotnet` and `node` carry a Picket-written Dockerfile step; every other row defaults to "user". `config-entries.mts` holds the readers (JSON through the vendored jsonc parser, .NET XML `<add key value>` and `<add name connectionString>`, dotenv, properties) and lists any other configuration-named file (YAML, TOML, INI) as one file-level entry. The address-like test and the masking rules know no engine: they are the patterns phase 3 states, checked on the examples there. A new runtime or reader is one row.
**Instead of:** one scanner module per runtime: each new runtime would be new code with its own test file.
**Risks:**
- **RISK-006** A large .NET solution yields many candidates. Mitigation: library projects default to ignored, so the user changes only the exceptions.
- **RISK-007** A secret slips through masking into the scan, the printed list or the request. Mitigation: masking by key name, by connection-string pair key and by URL user info, and tests that feed every fixture secret and assert its absence from output, `scan.json` and `request.md` (phases 3 and 4 carry `security: true`).

### D-005 (r2): Setup in two calls, and the kernel creates the item
**Decision:** Infrastructural decision. `picket env init` checks the machine (on a missing requirement it stops, names what to install and writes nothing), scans, saves `.picket/state/env/scan.json` with a fingerprint, and prints each decision with its id, default and choices, ending with the line that passes changes. `picket env init --create [--decide "S2=user,C4=file"]` scans again, refuses when the fingerprint differs, applies the changes to the defaults, writes a request that lists every step, and creates the item with `createItem` in the lane `admit` gives that request. With an environment present it lists only what is out of step (an update) and refuses with "in step" when nothing is. It writes nothing under `.picket/env/`. An outside host is decided once per host, with its own id `H<n>`: `mock` (the default, per draft section 2.2), `dependency` (a ready image pinned by digest) or `shared` (an address variable). These three are the forms SDR 00004 D-003 means by "a service outside the umbrella is a dependency" (draft section 2.7 lists them), so the default stays within the ratified decision.
**Instead of:** an interactive prompt inside the verb: the lead runs `picket` through the Bash tool with no terminal, so the questions must travel through the user's turn.
**Risks:**
- **RISK-008** The user's reply cannot be mapped to ids. Mitigation: each printed line carries its id and choices, and an unknown id or choice refuses naming the valid ones.

### D-006: Builds through a generated override, versions from git
**Decision:** Infrastructural decision. `env start <id>` writes `.picket/state/env/<stack>/compose.picket.yaml` (JSON text, which is YAML) and runs Compose with both files. An `app`'s build context maps through the item's layout (`locate` in `src/lib/shared/checkouts.mts`): a repository with a recorded worktree builds from the worktree, any other from the root checkout. The version is the 7-character HEAD of that checkout when the context matches HEAD, else `<head7>-t<tree7>`, where the tree id comes from `git add -A` of the context into a temporary index and `git write-tree --prefix`, so a staged phase gets its own tag and the real index is untouched. Names: image `picket/<service>-<item>:<version>`, stack `picket-<item>`, `<item>` the lowercase ticket key or `instanceTag(id)` (`src/lib/shared/work/send.mts`). Build labels `org.opencontainers.image.revision=<version>` and `io.github.picketai.item=<id>`; container labels `io.github.picketai.item=<id>`. After the build, `image inspect` must show the revision label equal to the version, or start refuses. A Dockerfile outside the original context is written as an absolute path.
**Instead of:** tagging by commit alone and refusing a changed context: gate checks run on staged phases before the approval commit, so the changed context is the common case.
**Risks:**
- **RISK-009** Tree ids write loose objects into the repository. Mitigation: they are unreachable objects that `git gc` prunes.
- **RISK-010** Compose warns on an absolute Dockerfile path. Mitigation: the warning passes through as a line; phase 10 checks the build itself on a real engine.

### D-007 (r2): Sessions own stacks through one state file
**Decision:** Infrastructural decision. `.picket/state/env/stacks.json` maps each stack to `{ item, session, files, started }`, written by `env start`. A new hook `env.stacks`: on SessionEnd with a reason other than `clear` or `resume` it starts a detached `compose -p <stack> stop` for each stack of that session and returns at once (the 2.1.325 binary gives SessionEnd hooks 1500 ms unless a hook asks for more; its reasons are `clear`, `resume`, `logout`, `prompt_input_exit`, `other`). On SessionStart with source `startup` it stops stacks whose session is not in `liveSessionIds` (`src/lib/shared/host-sessions.mts`) and adds a context line for stacks whose item is done or abandoned. `env status` asks the engine for every stack labelled with the item label. `picket close` and `env purge` remove the stack's containers, networks and volumes (`compose down --volumes --remove-orphans`) and the images labelled with the item [IRREVERSIBLE]. A verb's output is printed only after its run returns, so printing cannot come first: the list is written to `.picket/state/env/purged/<stack>-<timestamp>.json` before the first removal call, and a failed write stops the purge with nothing removed. They never remove external volumes, `x-picket.shared` services or the build cache.
**Instead of:** a session label on each container: labels are fixed when a container is created, so a stack started again in a later session would keep its first owner.
**Risks:**
- **RISK-011** A crash leaves stacks running. Mitigation: the startup sweep stops them.
- **RISK-012** An agent purges an open item's volumes. Mitigation: `env purge` refuses an open or blocked item; only `close` purges an item it is closing.

### D-008: A fixture umbrella, a fake engine, and a test step that needs an engine
**Decision:** Infrastructural decision. `test/fixtures/env/umbrella/` is a small system: `orders` (node, built), `billing` (dotnet web, its Dockerfile left to the user as a pending row), `legacy` (dotnet framework with `web.config`, shared), a mock and a dependency on small images pinned by digest, a seed, and a SQL Server tools client with role `data` behind the `picket-data` profile, which nothing starts. `test/fixtures/env/compose-config.json` is its recorded model and `test/fixtures/env/fake-engine.mjs` a node program that answers `info`, `compose version`, `config`, `image inspect`, `port` and `ps`, and logs other calls. Unit tests inject runners, CLI tests and drives use the fake engine, and a new `env` step in `scripts/test.mjs` runs `test/env/*.engine.mjs` against a real engine, printing `env: skipped, no container engine` without one, as the `mods` step does without `claude`.
**Instead of:** node tests that skip themselves when no engine exists: a skipped test is a silenced move that `guard.silenced` denies.
**Risks:**
- **RISK-013** The step pulls images on every CI run. Mitigation: only small pinned images are started; the SQL Server tools image sits behind a profile and is never pulled.
- **RISK-014** Fixture files trip repository-wide scans (names, links, conventions). Mitigation: each phase that adds fixture files runs the whole `npm test`.

## Scope

**In:**
- The `picket env` verbs `check`, `init`, `start`, `stop`, `trial`, `status`, `purge`.
- The standard: roles, labels, the `picket-data` profile, the `x-picket` block, the names of images, stacks and address variables.
- The check rules E1 to E10 and the machine check.
- The scan with runtime profiles and configuration readers, secret masking, and the work item `env init` creates.
- The lifecycle: build from worktree or root checkout, revision proof, start, stop at session end, the startup sweep, purge at close.
- `picket verify` holding a phase to the environment for the files the item changed.
- The fixture umbrella, the fake engine and the `env` test step.

**Out:**
- Saved scenarios and replay (TF-003), the tester (TF-004), the mock format, stub server and data catalog with SQL files (TF-006), the database guards (TF-007).
- Running declared checks on the environment at the gate (TF-003 builds on `env start`).
- Windows containers, Kubernetes, testing against a deployed environment.
- Any template for a runtime other than dotnet and node; every other runtime is detected and left to the user.

## Phase 1: The engine adapter and the machine check

**Touch set:**
- `src/lib/verbs.mts`: add the `env` group with `check`
- `src/lib/cli/registry.mts`: register `env check`
- `src/lib/shared/env/engine.mts`: new; adapter and machine report
- `src/lib/shared/env/engine.test.mts`: new; recorded-answer unit tests
- `src/lib/verbs/env/check.mts`: new; the `env check` verb
- `src/lib/verbs/env/check.test.mts`: new; verb tests
- `src/lib/hooks/guard/bash/kernel.test.mts`: `env check` joins the read subverbs
- `test/fixtures/env/fake-engine.mjs`: new; the fake engine program
- `test/cli/env.test.mjs`: new; spawns the built CLI
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `VERB_NAMES` gains `env: { summary: "build, start, check and remove the project's test environment", subverbs: { check: { summary: "check the machine and the environment against the standard", readOnly: true } } }`. `engine.mts` exports:
- `type EngineKind = "docker" | "podman" | "other"`, `type EngineRunner = (program: string, args: string[]) => ProgramResult` (the shape of `spawnProgram` in `src/lib/util/process.mts`), `type Engine = { program: string; prefix: string[]; kind: EngineKind; run: (args: string[]) => ProgramResult }`.
- `findEngine(env, cwd, runner): Engine | null` per D-003. `PICKET_ENGINE`, when set, is the only candidate, so a failing value gives `null`; a value ending in `.mjs` resolves against `cwd` and runs as `process.execPath` with the path as `prefix`. Kind: `docker` or `podman` by the program's base name, else `other` (read with the Docker shape first, then the Podman shape).
- `type MachineReport = { ok: boolean; engine: { program: string; kind: EngineKind } | null; os_type: string | null; compose: string | null; memory_bytes: number | null; free_disk_bytes: number | null; missing: string[] }` and `machineReport(engine, root, runner): MachineReport`. `compose` is the version without a leading `v`. Free disk comes from `statfsSync(root)` (`bavail * bsize`). Missing lines, exactly: `no container engine: install Docker or Podman`; `the engine runs <os> containers: switch it to Linux containers`; `Compose version 2 or later is missing: install the Compose v2 plugin (for podman compose, docker-compose v2 as its provider)`.
- `jsonRecords(text): unknown[]`, which reads a JSON array or JSON lines.
- `realRunner`, built on `spawnProgram`; only the verb entry passes it.

`src/lib/verbs/env/check.mts` exports `verb` (usage `env check`, output `json`). It reads the engine from `ctx.env` and `ctx.cwd`, returns `failed` (exit 2) when `ok` is false, and renders `engine: <program> (Linux containers, Compose <version>)`, then `memory: <GiB> GiB · free disk: <GiB> GiB` with one decimal, or one `missing: <line>` per gap. `test/fixtures/env/fake-engine.mjs` answers `info --format json` with `{"OSType":"linux","MemTotal":8589934592}` and `compose version --format json` with `{"version":"v2.99.0-fixture"}`, and exits 1 with a line for anything else (later phases add answers). Run `npm run docs` and stage the page.

**Done when:**
- **T-1.1** `engine.test.mts`: a runner where `docker info` returns `{"OSType":"linux","MemTotal":17179869184}` and `docker compose version` returns `{"version":"v2.29.1"}` gives `{ ok: true, engine: { program: "docker", kind: "docker" }, os_type: "linux", compose: "2.29.1", memory_bytes: 17179869184, missing: [] }`, with `free_disk_bytes` a number.
- **T-1.2** A runner where both programs fail gives `ok: false`, `engine: null`, `os_type`, `compose` and `memory_bytes` all `null`, and `missing` equal to `["no container engine: install Docker or Podman"]`; `OSType` `windows` gives `ok: false` and the Linux containers line; a Compose version `1.29.2`, or a failing `compose version`, gives `ok: false` and the Compose line.
- **T-1.3** A runner where `docker` fails and `podman info` returns `{"host":{"os":"linux","memTotal":8589934592}}` gives kind `podman`, `os_type` `linux` and `memory_bytes` 8589934592.
- **T-1.4** `PICKET_ENGINE=podman` picks `podman` while `docker` answers; `PICKET_ENGINE=test/fixtures/env/fake-engine.mjs` makes the recorded call `process.execPath` with the path resolved against `cwd` as its first argument.
- **T-1.5** `jsonRecords` returns the same two records for `[{"a":1},{"a":2}]` and for `{"a":1}` and `{"a":2}` on two lines.
- **T-1.6** `node dist/bin/picket.mjs env check`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `Linux containers`; `test/cli/env.test.mjs` spawns it with that value and with `PICKET_ENGINE=picket-no-such-engine`, which exits 2 and prints `no container engine`.
- **T-1.7** `kernel.test.mts` asserts `kernelClass("env", "check")` is `safe` and `kernelClass("env", undefined)` is `kernel`.

## Phase 2: The model, the static rules and the fixture umbrella

**Touch set:**
- `src/lib/shared/env/standard.mts`: new; names, roles, labels, profile
- `src/lib/shared/env/standard.test.mts`: new; name rules
- `src/lib/shared/env/model.mts`: new; Compose JSON to model
- `src/lib/shared/env/model.test.mts`: new; reads the recorded model
- `src/lib/shared/env/rules.mts`: new; rules E1 to E8
- `src/lib/shared/env/rules.test.mts`: new; one failing copy per rule
- `src/lib/shared/env/engine.mts`: add the two `config` calls
- `src/lib/shared/env/engine.test.mts`: assert the call arguments
- `src/lib/verbs/env/check.mts`: run the rules after the machine check
- `src/lib/verbs/env/check.test.mts`: findings and exit codes
- `test/fixtures/env/umbrella/.picket/env/compose.yaml`: new; the standard environment
- `test/fixtures/env/umbrella/.picket/env/docker/orders/Dockerfile`: new; Picket-written node Dockerfile
- `test/fixtures/env/umbrella/services/orders/package.json`: new; node service
- `test/fixtures/env/umbrella/services/orders/server.mjs`: new; answers `/health`
- `test/fixtures/env/compose-config.json`: new; the recorded model
- `test/fixtures/env/fake-engine.mjs`: answer the `config` calls
- `test/env/model.engine.mjs`: new; live model equals recorded
- `scripts/test.mjs`: new `env` step
- `test/cli/env.test.mjs`: spawn `env check` on the fixture

**Changes:** `standard.mts` exports `LABEL_PREFIX = "io.github.picketai."` (OQ-001), `ROLE_LABEL`, `ITEM_LABEL`, `ROLES = ["app", "dependency", "mock", "data", "seed"] as const`, `LONG_RUNNING` (app, dependency, mock), `DATA_PROFILE = "picket-data"`, `X_PICKET = "x-picket"`, `ENV_DIR = ".picket/env"`, `COMPOSE_FILE = "compose.yaml"`, and `itemKey(state)` (lowercase ticket key through `ticketKey` in `checkouts.mts`, else `instanceTag(id)`), `stackName(key)` = `picket-<key>`, `imageName(service, key, version)` = `picket/<service>-<key>:<version>` lowercased, `urlVariable(service)` = `PICKET_URL_` plus the service upper-cased with `-` and `.` as `_`.

`model.mts` exports `type EnvService = { name; role: string | null; build: { context: string; dockerfile: string | null } | null; image: string | null; healthcheck: { test: string[]; disable: boolean } | null; ports: { target: number; published: string | null }[]; volumes: { type: string; source: string | null; target: string; read_only: boolean }[]; profiles: string[]; environment: Record<string, string | null>; labels: Record<string, string> }`, `type XPicket = { version: unknown; shared: Record<string, { address: string }>; wiring: WiringRow[]; ignored: string[]; pending: PendingRow[]; unknown_keys: string[] }`, `type EnvModel = { name: string; services: EnvService[]; picket: XPicket | null }` and `readModel(json: unknown): EnvModel`. Fields follow compose-go's JSON tags; a missing optional field reads as `null` or empty.

`rules.mts` exports `type Finding = { rule: string; service: string | null; level: "error" | "pending"; message: string }` and `staticFindings(model): Finding[]`:
- E1 every service has `ROLE_LABEL` with a value in `ROLES`.
- E2 an `app` has `build`.
- E3 an `app`, `dependency` or `mock` has a healthcheck with a `test` and no `disable`.
- E4 no port has `published` (a fixed host port).
- E5 a `volume` mount has a `source` (named); a `bind` mount is `read_only`.
- E6 a service with `image` and no `build` names an image pinned with `@sha256:`.
- E7 a `data` service lists `DATA_PROFILE` in `profiles`.
- E8 `x-picket` exists with `version: 1`, no unknown key, and each shared `address` matching `^[A-Z_][A-Z0-9_]*$`.

`engine.mts` gains `readModelJson(engine, root): unknown`, which runs `compose --project-directory <root>/.picket/env -f <root>/.picket/env/compose.yaml config --profiles`, then the same with `config --format json` and one `--profile <name>` per line of the first answer. `env check` without `.picket/env/compose.yaml` fails with `no environment: .picket/env/compose.yaml is missing`; otherwise it renders the machine lines, then `rules passed` when no finding is an `error`, and one `<rule> <service>: <message>` line per finding, and exits 2 on any `error` finding. The line carries no count, so it reads the same as later phases add rules.

The fixture `compose.yaml`: `orders` (app, build context `../../services/orders`, Dockerfile `docker/orders/Dockerfile`, healthcheck on `/health`, port target 8080 unpublished, named volume `orders-data`, `PAYMENTS_URL: http://payments-mock:8080`), `payments-mock` (mock, small HTTP image pinned by digest, healthcheck), `cache` (dependency, small image pinned by digest, healthcheck), `orders-seed` (seed, pinned, writes into `orders-data`, `orders` depends on its successful completion), `billing-db-client` (data, a SQL Server command-line tools image pinned by digest, profile `picket-data`), and `x-picket: { version: 1, shared: { legacy: { address: PICKET_SHARED_LEGACY } } }`. The developer pins real digests. `compose-config.json` is the JSON that file gives per compose-go's tags, with contexts as absolute paths under a placeholder root.

`scripts/test.mjs` gains the step `env` after `product`: it imports `findEngine` from `dist/lib/shared/env/engine.mjs` with `process.env`, prints `env: skipped, no container engine` and returns 0 without one, and otherwise runs `node --test` over every `test/env/*.engine.mjs`. `model.engine.mjs` reads the live model of the fixture and compares it with the recorded one, with build contexts made relative to the umbrella on both sides.

**Done when:**
- **T-2.1** `model.test.mts` reads `compose-config.json` into five services whose `role`, `build`, `image` (digest present or `null`), `ports`, `volumes` and `profiles` are each asserted, and `picket.shared` equal to `{ legacy: { address: "PICKET_SHARED_LEGACY" } }` with `unknown_keys` empty.
- **T-2.2** `rules.test.mts`: the fixture model gives no finding; one-change copies give exactly one finding each: no role label (E1), an `app` with `image` only (E2), a `mock` without healthcheck (E3), `published: "8080"` (E4), a volume with no `source` and a writable bind (E5, two findings), `cache` as `busybox:1.36` (E6), `billing-db-client` without the profile (E7), and `x-picket.extras` (E8).
- **T-2.3** `engine.test.mts`: `readModelJson` makes the `config --profiles` call, then the `config --format json --profile picket-data` call, both with `--project-directory` and `-f` under the given root.
- **T-2.4** `standard.test.mts`: an item with source `PROJ-481` gives stack `picket-proj-481` and image `picket/orders-proj-481:4f2a91c`; an item with no ticket uses `instanceTag(id)`; `urlVariable("payments-mock")` is `PICKET_URL_PAYMENTS_MOCK`.
- **T-2.5** `node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `rules passed`; `check.test.mts` shows the missing-file failure with exit 2.
- **T-2.6** `node scripts/test.mjs env`, driven with `--env PICKET_ENGINE=picket-no-such-engine`, exits 0 and prints `env: skipped, no container engine`.
- **T-2.7** [DEFERRED: operations, the release workflow's test job] On a machine with Docker, the `env` step runs `test/env/model.engine.mjs` and the live model of the fixture equals the recorded one.

## Phase 3: The scan and its masking

**Touch set:**
- `src/lib/shared/env/profiles.mts`: new; runtime profile rows
- `src/lib/shared/env/profiles.test.mts`: new
- `src/lib/shared/env/config-entries.mts`: new; readers, address test, masking
- `src/lib/shared/env/config-entries.test.mts`: new
- `src/lib/shared/env/scan.mts`: new; walk, candidates, ids, defaults
- `src/lib/shared/env/scan.test.mts`: new
- `src/lib/shared/paths.mts`: `STATE_FILES` gains the env files
- `src/lib/verbs/env/init.mts`: new; `env init` without `--create`
- `src/lib/verbs/env/init.test.mts`: new
- `src/lib/verbs.mts`: add `init` to the `env` group
- `src/lib/cli/registry.mts`: register `env init`
- `test/fixtures/env/umbrella/services/billing/Billing.csproj`: new; dotnet web project
- `test/fixtures/env/umbrella/services/billing/appsettings.json`: new; address and SQL Server entries
- `test/fixtures/env/umbrella/services/legacy/Legacy.csproj`: new; framework project
- `test/fixtures/env/umbrella/services/legacy/web.config`: new; appSettings and connectionStrings
- `test/fixtures/env/umbrella/services/orders/.env`: new; outside host and key
- `test/cli/env.test.mjs`: spawn `env init` on a temporary copy
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `STATE_FILES` gains `envScan: "env/scan.json"`, `envStacks: "env/stacks.json"` and `envTrial: "env/trial.json"`. `profiles.mts` exports `type RuntimeProfile = { name; markers: string[]; isService: (markerText: string) => boolean; linux: boolean; dockerfileStep: string | null; variableFor: (key: string) => string }` and `PROFILES` with the rows of D-004. `variableFor`: dotnet `A:B` to `A__B`; dotenv keys stay as they are; every other row upper snake case.

`config-entries.mts` exports `type ConfigEntry = { file; key: string | null; value: string | null; address: boolean }`, `readConfigFile(path, text)`, `isAddressLike(key, value)` and `masked(key, value)`. The rules, as checked on the examples below with a probe on 2026-11-14:
- address-like: a URL with a scheme and `://`; `jdbc:<x>:`; `host:port` where the host holds a letter; a pair `server`, `data source`, `host`, `hostname`, `address`, `addr`, `network address`, `endpoint`, `accountendpoint` or `contact points` `=` a value anywhere in the text after a start, `;`, `(` or space; or a last key segment ending in `url`, `uri`, `endpoint`, `host`, `address`, `connectionstring` or `dsn` with a non-empty value.
- masked: a last key segment containing `password`, `passwd`, `pwd`, `secret`, `token`, `apikey`, `api_key`, `credential`, `privatekey`, `private_key`, `sas` or `signature` masks the whole value as `***`; otherwise the value of a pair `password`, `pwd`, `secret`, `token`, `api key`, `accountkey` or `sharedaccesskey`, and the password of URL user info, become `***`.

`scan.mts` exports `type Scan = { fingerprint: string; services: ScannedService[]; entries: ScannedEntry[] }`, `ScannedService = { id: "S<n>"; path; name; runtime; linux; dockerfile: string | null; choices: string[]; default: string }`, `ScannedEntry = { id: "C<n>"; service: string | null; file; key: string | null; value: string | null; target: { kind: "service"; name } | { kind: "local" } | { kind: "outside"; host } | null; choices: ["env", "file", "keep"]; default; variable: string | null }` and `scanUmbrella(root): Scan`. The walk skips `.git`, `node_modules`, `.worktrees`, `bin`, `obj`, `dist`, `build`, `out`, `target`, `vendor`, `.picket`, `work` and `.claude`, and folds a candidate into an ancestor of the same runtime. Service choices are `use` (only with a Dockerfile in the folder), `write` (only with a `dockerfileStep`), `user`, `shared` and `ignore`; the default is `use`, else `write`, else `user`, except `shared` for a non-Linux row and `ignore` for a non-service marker. An entry's default is `file` for a .NET XML file and `env` otherwise; only address-like entries and unread files are listed. `target`: a host equal to a scanned service name, ignoring `-` and `_`, is that service; `localhost` and `127.0.0.1` are `local`; anything else is `outside`. Ids follow sorted paths; the fingerprint is the SHA-256 of the scan with masked values.

`env init` (not read-only) runs the machine check; on a gap it fails, printing the missing lines and writing nothing. It saves the scan to `.picket/state/env/scan.json`, renders one line per service and entry (id, path, runtime or key, masked value, target, default, choices), and ends with `Show this list to the user; pass changes to the defaults with picket env init --create --decide "<id>=<choice>,..."`.

**Done when:**
- **T-3.1** `config-entries.test.mts`: `isAddressLike` is true for `Server=localhost,1433;Database=Billing;User Id=sa;Password=x`, `Data Source=db01;Initial Catalog=Legacy;Integrated Security=True`, `Host=pg;Port=5432`, `mongodb://user:pw@mongo:27017/db`, `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=ora1)(PORT=1521)))`, `jdbc:sqlserver://db:1433;databaseName=x`, `redis:6379` and key `PAYMENTS_URL` with `https://payments.example.com`, and false for key `Logging:LogLevel:Default` with `Information` and key `Time` with `12:30`.
- **T-3.2** `masked` gives `Server=localhost,1433;Database=Billing;User Id=sa;Password=***`, `mongodb://user:***@mongo:27017/db`, `jdbc:sqlserver://db:1433;databaseName=x;password=***`, and `***` for key `Payments:ApiKey`.
- **T-3.3** `scan.test.mts` on the fixture: services orders (node, Linux, no Dockerfile, default `write`), billing (dotnet, default `write`) and legacy (dotnet-framework, `linux: false`, default `shared`); entries `Services:Orders:Url` (target `local`, default `env`, variable `Services__Orders__Url`), `ConnectionStrings:Billing` (default `env`), legacy `OrdersUrl` (default `file`) and orders `PAYMENTS_URL` (target outside `payments.example.com`, variable `PAYMENTS_URL`).
- **T-3.4** `profiles.test.mts`: a `.csproj` with `Sdk="Microsoft.NET.Sdk"` and no `OutputType` Exe defaults to `ignore`; a folder with `go.mod` is runtime `go` with default `user`; a `package.json` inside a node service folder is folded into it.
- **T-3.5** `test/cli/env.test.mjs` runs `env init` with the fake engine on a temporary copy of the umbrella: stdout and the saved `scan.json` contain none of `fixture-secret-1`, `fixture-secret-2` and `fixture-secret-3` (the fixture's three secret values) and do contain `Password=***`.
- **T-3.6** With `PICKET_ENGINE=picket-no-such-engine` on a temporary copy, `env init` exits 2, prints `no container engine`, and no `.picket/state/env/scan.json` exists afterwards.
- **T-3.7** `node dist/bin/picket.mjs env init --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `S1` and `picket env init --create`.

## Phase 4: Decisions become a work item, and the in-step rule

**Touch set:**
- `src/lib/shared/env/decisions.mts`: new; apply choices, write the request
- `src/lib/shared/env/decisions.test.mts`: new
- `src/lib/shared/env/instep.mts`: new; scan against model, rule E9
- `src/lib/shared/env/instep.test.mts`: new
- `src/lib/verbs/env/init.mts`: `--create`, `--decide`, update mode
- `src/lib/verbs/env/init.test.mts`: create, refuse, update
- `src/lib/verbs/env/check.mts`: add E9 and the pending lines
- `src/lib/verbs/env/check.test.mts`: E9 and pending
- `test/fixtures/env/umbrella/.picket/env/compose.yaml`: `x-picket` wiring and pending rows
- `test/fixtures/env/compose-config.json`: the same rows recorded
- `test/cli/env.test.mjs`: create an item on a temporary copy
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `decisions.mts` exports `applyDecisions(scan, text): Decided` (text `<id>=<choice>` pairs split on `,`; an unknown id or a choice not in the row's `choices` throws `Refused` naming the valid ids or choices) and `requestText(decided, mode: "setup" | "update", date): string`. The request opens with one sentence naming the standard (SDR 00004 D-003) and the date, then `## Steps`, numbered, one step per decision:
- setup only, first: write `.picket/env/compose.yaml` with `x-picket.version: 1` that passes rules E1 to E8.
- a service: `use` names the Dockerfile; `write` names `.picket/env/docker/<name>/Dockerfile` with the profile's `dockerfileStep`; `user` adds a `pending` row; `shared` adds `x-picket.shared.<name>.address` naming `PICKET_SHARED_<NAME>`; `ignore` adds the path to `ignored`. Every built service gets role `app`.
- an entry: `env` names the variable and a `wiring` row; `file` names a replaced file under `.picket/env/config/<service>/` and a `wiring` row; `keep` a `wiring` row with `by: keep`.
- an outside host (per D-005, one `H<n>` per distinct host among the entries with an outside target, numbered by sorted host): `mock` adds a `mock` service named after the first label of the host plus `-mock` (until Picket's stub server exists, a container the project picks); `dependency` adds a `dependency` service of that first label on a ready image pinned by digest; `shared` adds `x-picket.shared.<label>.address` naming `PICKET_SHARED_<LABEL>`.
- last: `picket env check` exits 0, then `picket env trial` passes.

Values appear masked. `instep.mts` exports `inStepFindings(scan, model): Finding[]`, rule E9: a scanned service with no Compose service whose build context is its folder and no `shared`, `ignored` or `pending` entry; an address-like entry with no `wiring` row for its file and key; a `by: env` row whose variable is absent from that service's `environment`; a `by: file` row whose `replaced` file is missing. Rows and entries of a service with a `pending` row give `level: "pending"` lines, not errors; entries of a `shared` or `ignored` service need no `wiring` row and get no request step. `env check` adds E9 when a scan is possible and prints `pending: <service>: <what>` per pending line. `env init --create` scans again and refuses with `the umbrella changed since the scan; run picket env init again` on a different fingerprint, with `no scan yet; run picket env init` without one. With an environment present it keeps only the E9 findings' services and entries (mode `update`, title `Bring the test environment in step`) and refuses with `the environment is in step; nothing to do` when there are none; without one it is mode `setup`, title `Set up the test environment`. It creates the item with `createItem` in `admit(root, request).lane` and prints the id and `picket next <id>`.

**Done when:**
- **T-4.1** `decisions.test.mts`: `S3=user,C2=keep` on the fixture scan gives S3 `user`, C2 `keep`, H1 (`payments.example.com`) `mock` and every other row its default; `S9=use` refuses naming every valid id (S, C and H), and `S1=paint` and `H1=paint` refuse naming that row's choices.
- **T-4.2** `requestText` for the fixture defaults holds a numbered step per service and per entry of a built service, names `.picket/env/docker/orders/Dockerfile`, `Services__Orders__Url`, `PICKET_SHARED_LEGACY` and `payments-mock`, and ends with the `picket env check` and `picket env trial` step; with `H1=dependency` it names a `payments` dependency pinned by digest and no `payments-mock`.
- **T-4.3** `instep.test.mts`: the fixture scan against the fixture model gives no error, and pending lines for billing only; dropping the `PAYMENTS_URL` wiring row gives one E9 naming its file and key; removing `PAYMENTS_URL` from orders' `environment` gives one E9 naming the variable; adding `services/stock/package.json` gives one E9 naming `services/stock`.
- **T-4.4** On a temporary copy (`test/cli/env.test.mjs`), `env init` then `env init --create` creates one work item whose `request.md` contains none of the three fixture secrets and contains `Password=***`.
- **T-4.5** A file added to the copy between `env init` and `env init --create` makes `--create` exit 2 with `the umbrella changed since the scan` and creates no work item.
- **T-4.6** On the copy with the fixture environment plus `services/stock/package.json`, `--create` writes a request naming `services/stock` and no other service; without that folder it exits 2 with `the environment is in step`.
- **T-4.7** `node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `pending: billing`.

## Phase 5: Build and start an item's stack

**Touch set:**
- `src/lib/shared/env/build-plan.mts`: new; sources, versions, override
- `src/lib/shared/env/build-plan.test.mts`: new; temporary git repositories
- `src/lib/shared/env/stacks.mts`: new; `stacks.json` read and write
- `src/lib/shared/env/stacks.test.mts`: new
- `src/lib/shared/env/engine.mts`: `compose` call helper for a stack
- `src/lib/verbs/env/start.mts`: new; `env start <id>`
- `src/lib/verbs/env/start.test.mts`: new
- `src/lib/verbs/env/stop.mts`: new; `env stop <id>`
- `src/lib/verbs/env/stop.test.mts`: new
- `src/lib/verbs.mts`: add `start`, `stop`
- `src/lib/cli/registry.mts`: register both
- `test/fixtures/env/fake-engine.mjs`: answer `image inspect` and `port`
- `test/cli/env.test.mjs`: start and stop on a temporary copy
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `build-plan.mts` exports `type ServiceSource = { service; checkout: string; context: string; dockerfile: string | null; version: string }`, `sourceFor(root, layout, service): ServiceSource` (per D-006: the context made relative to the umbrella goes through `locate`; the checkout is the worktree or the owning repository's root checkout; a Dockerfile outside the original context becomes absolute), `contextVersion(checkoutDir, contextRel): string` (per D-006, the temporary index under the system temporary folder passed to `gitRun` as `GIT_INDEX_FILE`, removed afterwards) and `overrideDoc(model, sources, key, id): object` (each `app`: `image`, `build.context`, `build.dockerfile` when set, `build.labels` with the revision and item labels, `labels` with the item label; every other started service: `labels` with the item label). `stacks.mts` exports `type StackEntry = { item; session: string | null; files: string[]; engine: { program; prefix: string[] }; started: string }`, `readStacks(root)`, `recordStack(root, stack, entry)` and `dropStack(root, stack)`.

`env start <id>` refuses a done or abandoned item and an environment with an E1 to E8 error. It writes the override to `.picket/state/env/<stack>/compose.picket.yaml`, runs `compose -p <stack> --project-directory ... -f compose.yaml -f <override> build <apps>`, checks each app image with `image inspect` (the revision label from `Config.Labels` must equal the version, else it refuses with `<image> was not built from <version>` before `up`), runs `up --detach --wait`, records the stack with `ctx.session`, and prints one line per app (`<service> · built from <checkout> at <version>`) and `<urlVariable>=http://127.0.0.1:<port>` for each started service with a port, from `compose port <service> <target>` with `0.0.0.0` read as `127.0.0.1`. `env stop <id>` runs `compose -p <stack> stop` with the recorded files and keeps the entry. The fake engine answers `image inspect` with the tag of the image it is asked about as the revision label, and `port` with `0.0.0.0:49153`.

**Done when:**
- **T-5.1** `build-plan.test.mts`: with a layout whose repository `services/orders` has the worktree `services/orders/.worktrees/feat-x`, orders builds from that worktree and every other app from the root checkout; a Dockerfile `../../.picket/env/docker/orders/Dockerfile` becomes an absolute path.
- **T-5.2** In a temporary repository, a clean context gives the 7-character HEAD; an edited file in the context gives `<head7>-t` plus 7 hex characters; undoing the edit gives the HEAD form again; `git diff --cached --name-only` is empty after each call.
- **T-5.3** `overrideDoc` for the fixture gives orders `image` `picket/orders-<key>:<version>` with `build.labels` `org.opencontainers.image.revision` equal to the version and `io.github.picketai.item` equal to the id, and gives `payments-mock`, `cache` and `orders-seed` only the item label.
- **T-5.4** `start.test.mts` with an injected runner: the calls run in the order build, image inspect, up, port; an inspect answer with another revision refuses with `was not built from` and makes no `up` call; a pass records the stack with the context's session.
- **T-5.5** `stop.test.mts`: the stop call is `compose -p picket-<key> ... stop`, and the stacks entry stays.
- **T-5.6** On a temporary git copy with an open item, `env start <id>` with the fake engine exits 0 and prints `PICKET_URL_ORDERS=http://127.0.0.1:49153`, and `.picket/state/env/stacks.json` names the stack.

## Phase 6: The trial start

**Touch set:**
- `src/lib/shared/env/trial.mts`: new; two starts, record, rule E10
- `src/lib/shared/env/trial.test.mts`: new
- `src/lib/verbs/env/trial.mts`: new; `env trial`
- `src/lib/verbs/env/trial.test.mts`: new
- `src/lib/verbs/env/check.mts`: add E10
- `src/lib/verbs/env/check.test.mts`: E10 cases
- `src/lib/verbs.mts`: add `trial`
- `src/lib/cli/registry.mts`: register `env trial`
- `test/cli/env.test.mjs`: trial on a temporary copy
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `trial.mts` exports `runTrial(engine, root, model, sources): TrialResult` and `trialFinding(root, modelJson): Finding | null`. A trial uses the key `trial` (stack `picket-trial`, images `picket/<service>-trial:<version>`, item label `trial`), builds every app from the root checkout, and runs twice: `build`, `up --detach --wait`, `down --volumes --remove-orphans`. The `down` runs after a failed `up` too. Afterwards it removes the images labelled with item `trial`. It writes `.picket/state/env/trial.json` = `{ fingerprint, passed, at }`, the fingerprint being the SHA-256 of the model JSON text. E10 is a `pending` line (`pending: trial: run picket env trial`) when that file is missing, so a new environment is named as unconfirmed without failing, as user-filled parts are; it is an `error` when the fingerprint differs from the current model's or `passed` is false. `env trial` (not read-only) exits 2 on a failed run and prints `trial passed twice` on success.

**Done when:**
- **T-6.1** `trial.test.mts`: the calls are build, up, down, build, up, down, then the image removal, with stack `picket-trial` throughout.
- **T-6.2** A failing second `up` still makes the second `down` call, writes `passed: false`, and the verb exits 2.
- **T-6.3** `trialFinding` gives E10 with no record, with a record of another fingerprint, and with `passed: false`, and `null` after a pass on the same model.
- **T-6.4** `check.test.mts`: the fixture with no trial record exits 2 naming E10; with a passing record for its model it exits 0.
- **T-6.5** `node dist/bin/picket.mjs env trial --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `trial passed twice`.

## Phase 7: Stop at session end, the startup sweep, and status

**Touch set:**
- `src/lib/hooks.mts`: `SessionEnd` event and the `env.stacks` hook
- `src/lib/hooks/hook-spec.mts`: SessionEnd payload and SessionStart `source`
- `src/lib/hooks/env/stacks/index.mts`: new; the hook
- `src/lib/hooks/env/stacks/index.test.mts`: new
- `test/hooks/env.stacks.test.mjs`: new; spawns the bundle
- `test/repo/hook-list.test.mjs`: `EXPECTED_GROUPS` gains the hook
- `test/repo/plugin-layout.test.mjs`: ten events
- `docs/reference/hooks.md`: regenerated by the build
- `src/lib/shared/env/stacks.mts`: stacks by session, by item state
- `src/lib/verbs/env/status.mts`: new; `env status`
- `src/lib/verbs/env/status.test.mts`: new
- `src/lib/verbs.mts`: add `status` (read-only)
- `src/lib/cli/registry.mts`: register `env status`
- `src/lib/hooks/guard/bash/kernel.test.mts`: `env status` is a read subverb
- `test/fixtures/env/fake-engine.mjs`: answer `ps` with an empty list
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `HOOK_EVENTS` gains `"SessionEnd"`. `Payloads` gets `SessionStart: CommonPayload & { source?: string }` and `SessionEnd: CommonPayload & { reason?: string }`; `OutputFor<"SessionEnd">` is `never`, so its handler returns `null`. `HOOKS["env.stacks"]` is on `SessionStart` and `SessionEnd`, with a summary naming both actions. The hook calls no engine probe: it reads `stacks.json` and, per D-007, starts each stop as a detached, silent process (`<program> <prefix> compose -p <stack> <-f files> stop`) through a `Spawn` it takes as a parameter, as `notify.user` does. On SessionStart with source `startup` it also returns a context line per stack whose item is done or abandoned: `<stack>: item <id> is <status>; run picket env purge <stack>`. `env status` (read-only) lists from `<engine> ps -a --format json --filter label=io.github.picketai.item` each Compose project with its item id, the item's status from `work/<id>/state.yaml` or `unknown`, and running or stopped; with none it prints `no stacks`.

**Done when:**
- **T-7.1** `index.test.mts`: SessionEnd with reason `prompt_input_exit`, and `stacks.json` holding two stacks of that session and one of another, spawns exactly two detached stops (options `detached: true`, `stdio: "ignore"`) and returns `null`; reasons `clear` and `resume` spawn nothing.
- **T-7.2** SessionStart with source `startup` stops a stack whose session is not in a temporary sessions folder and leaves a live one; sources `resume`, `clear` and `compact` stop nothing.
- **T-7.3** SessionStart with a stack whose item is done returns context containing `item <id> is done; run picket env purge picket-<key>`.
- **T-7.4** `hook-list.test.mjs` expects `env.stacks` last in the SessionStart group and a group `["SessionEnd", undefined, ["env.stacks"]]`; `plugin-layout.test.mjs` expects ten events including `SessionEnd`.
- **T-7.5** `status.test.mts`: rows for stacks of an open item, a done item and an unknown id show `open`, `done` and `unknown`; `kernel.test.mts` asserts `env status` is `safe`.
- **T-7.6** `node scripts/test.mjs timing` exits 0, with `dist/hooks/env.stacks.mjs` inside the cold-start budget.
- **T-7.7** `node dist/bin/picket.mjs env status --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `no stacks`.

## Phase 8: Purge at close

**Touch set:**
- `src/lib/shared/env/purge.mts`: new; list, then remove
- `src/lib/shared/env/purge.test.mts`: new
- `src/lib/verbs/env/purge.mts`: new; `env purge <stack>`
- `src/lib/verbs/env/purge.test.mts`: new
- `src/lib/verbs.mts`: add `purge`
- `src/lib/cli/registry.mts`: register `env purge`
- `src/lib/verbs/close/close.mts`: purge the closing item's stack
- `src/lib/verbs/close/index.mts`: pass the engine runner
- `src/lib/verbs/close/block.mts`: render the environment line
- `src/lib/verbs/close/index.test.mts`: close with and without an environment
- `test/fixtures/env/fake-engine.mjs`: answer `volume ls`, `network ls`, `image ls`
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `purge.mts` exports `type Resources = { containers: string[]; volumes: string[]; networks: string[]; images: string[] }`, `listResources(engine, stack, id): Resources` (containers, volumes and networks filtered by `label=com.docker.compose.project=<stack>`, images by the item label) and `purgeStack(engine, root, stack, id, now): Resources`. It lists first and writes `{ stack, item, at, resources }` to `.picket/state/env/purged/<stack>-<timestamp>.json` (timestamp from `now`, colons removed). Only after that write succeeds does it run `compose -p <stack> [-f files] down --volumes --remove-orphans` [IRREVERSIBLE: the stack's named volumes and the test state in them are deleted] and `image rm` for each listed image, then drop the stacks entry. A failed write throws `Refused` (`purge stopped: cannot record <path>: <reason>`) before any removal call. It never runs `volume rm`, so external volumes stay. The evidence file is the record captured before the removal; the returned list and its path are what the caller prints. `env purge <stack>` refuses when the stack's item is open or blocked (`<stack> belongs to <id>, which is <status>; close it first`), prints `nothing to remove` when the list is empty, and otherwise prints the list and `removed`. `close` purges only when `.picket/env/compose.yaml` exists or `stacks.json` names the item; its result gains `environment: { removed: Resources | null; warning: string | null } | null`, rendered as one line, and an engine failure becomes a warning (`environment not removed: <reason>`) that never stops the close.

**Done when:**
- **T-8.1** `purge.test.mts`: the list calls come before the `down --volumes --remove-orphans` call, the `image rm` call names exactly the listed images, no call is `volume rm`, and the stacks entry is gone.
- **T-8.2** `env purge` refuses a stack whose item is open or blocked, naming the status, with no `down` call; a done, abandoned or unknown item's stack is purged.
- **T-8.3** `close` of an item with a stacks entry and an environment returns `environment.removed` holding the listed resources, and with no engine returns `environment.warning` `environment not removed: no container engine` while the item still ends `done`.
- **T-8.4** `close` in a root with no `.picket/env/compose.yaml` and no stacks entry makes no engine call and returns `environment: null`.
- **T-8.5** `node dist/bin/picket.mjs env purge picket-zzzz --root test/fixtures/env/umbrella`, driven with `--env PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, exits 0 and prints `nothing to remove`.
- **T-8.6** `purge.test.mts`: at the moment the injected runner receives the `down` call, the evidence file under `.picket/state/env/purged/` already exists and holds the stack, the item and the listed resources; with a file in place of that folder, the purge refuses with `purge stopped: cannot record`, and the runner never gets a `down` or `image rm` call.
**Irreversible:** `compose down --volumes` deletes the stack's named volumes; the evidence file under `.picket/state/env/purged/`, written before the first removal call, is the record of what was removed.

## Phase 9: Verify holds a phase to the environment

**Touch set:**
- `src/lib/verbs/verify/index.mts`: the `environment` result
- `src/lib/verbs/verify/index.test.mts`: its cases
- `src/lib/shared/env/instep.mts`: split findings by the item's changed paths
- `src/lib/shared/env/instep.test.mts`: the split

**Changes:** `instep.mts` gains `splitByChange(findings, changed: string[]): { caused: Finding[]; other: Finding[] }`: a finding is caused when its path (a service folder or an entry's file) equals or lies under a changed path, or a changed path lies under it. `verify` adds a result named `environment` only when `.picket/env/compose.yaml` exists: it scans, reads the model through the engine, and takes the changed paths as the phase's plan paths plus `changedSince(<checkout>, base)` of each checkout in the item's layout (`src/lib/shared/git.mts`). Caused E9 errors fail the result, naming each; the other E9 errors go to the report's `warnings`; pending lines never fail. No engine fails the result with `environment not checked: <missing line>`. `VerifyOptions` gains the runner; only the verb entry passes the real one. The guard's verify classification stays as it is: the only added call is `compose config`, which runs no project code.

**Done when:**
- **T-9.1** `index.test.mts`: in a temporary repository with the fixture environment, an item whose phase adds `services/stock/package.json` gets a failed `environment` result naming `services/stock`.
- **T-9.2** The same out-of-step folder present at the base and untouched by the item gives a passing `environment` result and a warning naming it.
- **T-9.3** With no `.picket/env/compose.yaml`, the report has no `environment` result and the existing verify tests pass unchanged.
- **T-9.4** With the environment and an injected runner where no engine answers, the `environment` result fails with `environment not checked: no container engine`.
- **T-9.5** `instep.test.mts`: `splitByChange` puts a finding for `services/stock` under `caused` for the changed path `services/stock/package.json`, and under `other` for `services/orders/server.mjs`.

## Phase 10: The fixture system on a real engine

**Touch set:**
- `test/env/lifecycle.engine.mjs`: new; start, address, stop, purge, trial
- `test/fixtures/env/umbrella/.picket/env/compose.yaml`: confirm the pinned digests pull
- `scripts/test.mjs`: the `env` step runs every `*.engine.mjs`

**Changes:** `lifecycle.engine.mjs` copies the umbrella into a temporary folder, makes it a git repository with one commit, opens an item with `picket open`, and drives the built CLI with the real engine: `env check`, `env trial`, `env start <id>` (then a GET to `PICKET_URL_ORDERS` plus `/health`), `env stop <id>`, `env purge`, and a final `ps -a`, `volume ls` and `image ls` filtered by the item label. It never touches a stack it did not start. The `env` step's glob covers it with no change other than the file list.

**Done when:**
- **T-10.1** [DEFERRED: operations, the release workflow's test job] `env trial` on the fixture passes twice and `env start <id>` prints `PICKET_URL_ORDERS`, whose `/health` answers 200.
- **T-10.2** [DEFERRED: operations, the release workflow's test job] The orders image's `org.opencontainers.image.revision` label equals the version `env start` printed, and the absolute Dockerfile path under `.picket/env/docker/orders/` built.
- **T-10.3** [DEFERRED: operations, the release workflow's test job] After `env stop`, the stack's containers are exited; after `env purge`, no container, volume, network or image with the item label remains.
- **T-10.4** [DEFERRED: QA, before the standard is announced to projects] The same run passes on Podman with docker-compose v2 as the compose provider.
- **T-10.5** [DEFERRED: QA, before the product owner's rollout to Windows developers] The same run passes on native Windows with Docker Desktop on the WSL2 back end.
- **T-10.6** `scripts/test.mjs` lists `test/env/lifecycle.engine.mjs` in the `env` step and `node scripts/test.mjs product` does not run it (its name does not end in `.test.mjs`).

## Open questions

- **OQ-001** Which reverse-domain prefix do Picket's labels carry: `io.github.picketai.` or a domain the product owns? It becomes a public contract at release (D-002). Owner: product owner. Fallback: `io.github.picketai.`.
- **OQ-002** Should low memory or free disk print a warning, and below which values? The record states no threshold because no input in reach gives one. Owner: product owner. Fallback: `env check` prints both values and never warns.
- **OQ-003** Which of the product owner's real services run in Linux containers (SDR 00004 RISK-002)? Owner: product owner. Fallback: the scan proposes `shared` for every `dotnet-framework` service, and the user changes it at `env init`.
- **OQ-004** `.picket/` is in `BOOKKEEPING_PREFIXES` (`src/lib/shared/paths.mts`), so `dirtyPaths` and the close summary skip changes under `.picket/env/`, which is now product configuration. Should `.picket/env/` leave that list? Owner: architect of TF-003. Fallback: unchanged; plan paths still commit the files.
- **OQ-005** The gate packet does not show verify warnings, so an environment difference the item did not cause shows in `picket verify` output only, where the draft (section 2.2) wanted a packet line. Owner: architect of TF-003. Fallback: verify warnings only.

## Revision log
- 2026-11-14: D-007 (r2): purge writes its resource list to a state file before removing, since output prints only after the run; phase 8 gains T-8.6.
