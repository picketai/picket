---
kind: design
lane: design
title: Separate core paths, state and config
date: 2026-10-05
audience: developer
sources: [request, .claude/MEMORY.md, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, .claude/lib/work.mjs, .claude/lib/config.mjs, .claude/lib/check.mjs, .claude/lib/cost.mjs, .claude/lib/drive.mjs, .claude/lib/git.mjs, .claude/lib/pr.mjs, .claude/lib/preflight.mjs, .claude/lib/repos.mjs, .claude/lib/review.mjs, .claude/lib/verify.mjs, .claude/lib/admit.mjs, .claude/lib/gate.mjs, .claude/lib/next.mjs, .claude/bin/harness.mjs, .claude/hooks/emit.ledger.mjs, .claude/hooks/guard.bash.mjs, .claude/hooks/guard.block.mjs, .claude/hooks/guard.comments.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/inject.state.mjs, .claude/hooks/lint.schema.mjs, .claude/hooks/monitor.context.mjs, .claude/hooks/observe.drive.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/lib/project-root.mjs, .claude/hooks/lib/drive-evidence.mjs, .claude/settings.json, .gitignore, bench/run.mjs, bench/report.mjs, bench/adapters/rework.mjs, bench/adapters/plugin.mjs, bench/lib/grade.mjs, bench/results/rework-clean.json, test/budgets.test.mjs, test/markdown-paths.test.mjs, test/hooks/hooks.test.mjs]
phases:
  - n: 1
    files: [.claude/lib/paths.mjs, .claude/lib/work.mjs, .claude/hooks/guard.bash.mjs, .claude/hooks/guard.comments.mjs, .claude/hooks/emit.ledger.mjs, .claude/hooks/observe.drive.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/inject.state.mjs, .claude/hooks/lib/drive-evidence.mjs, test/kernel/paths.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/lib/paths.mjs
        pattern: "export function projectRoot\\("
      - path: .claude/lib/paths.mjs
        pattern: "export function statePath\\("
      - path: .claude/hooks/guard.bash.mjs
        pattern: "statePath\\("
      - path: test/kernel/paths.test.mjs
        pattern: "import\\.meta"
    tests: true
    drive: true
    security: false
  - n: 2
    files: [.claude/lib/check.mjs, .claude/lib/config.mjs, .claude/lib/cost.mjs, .claude/lib/drive.mjs, .claude/lib/git.mjs, .claude/lib/pr.mjs, .claude/lib/preflight.mjs, .claude/lib/repos.mjs, .claude/lib/review.mjs, .claude/lib/verify.mjs, .claude/bin/harness.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/guard.bash.mjs, test/kernel/paths.test.mjs, test/kernel/config.test.mjs]
    greps:
      - path: .claude/lib/git.mjs
        pattern: "BOOKKEEPING_PREFIXES"
      - path: .claude/hooks/guard.scope.mjs
        pattern: "lib/paths\\.mjs"
      - path: .claude/hooks/guard.bash.mjs
        pattern: "stateRel\\("
      - path: test/kernel/paths.test.mjs
        pattern: "paths\\.mjs"
    tests: true
    drive: true
    security: true
  - n: 3
    files: [bench/adapters/rework.mjs, bench/adapters/plugin.mjs, bench/test/adapters.test.mjs, CONTRIBUTING.md, README.md]
    greps:
      - path: bench/adapters/rework.mjs
        pattern: "harness-authoring\\.md"
      - path: bench/test/adapters.test.mjs
        pattern: "harness-authoring"
      - path: CONTRIBUTING.md
        pattern: "harness-authoring"
    tests: true
    drive: false
    security: false
  - n: 4
    files: [.claude/lib/paths.mjs, .claude/lib/migrate.mjs, .claude/bin/harness.mjs, .claude/lib/preflight.mjs, .claude/hooks/guard.scope.mjs, .gitignore, bench/run.mjs, bench/lib/grade.mjs, test/kernel/migrate.test.mjs, test/hooks/hooks.test.mjs, .claude/agents/developer.md, .claude/skills/reviewing/SKILL.md, .claude/skills/branching/SKILL.md, .claude/hooks/README.md, test/markdown-paths.test.mjs]
    greps:
      - path: .claude/lib/paths.mjs
        pattern: "guard\\.log"
      - path: .claude/lib/paths.mjs
        pattern: "branching\\.yaml"
      - path: .gitignore
        pattern: "^\\.tether/state/\\r?$"
      - path: .claude/lib/migrate.mjs
        pattern: "export function migrate\\("
      - path: .claude/bin/harness.mjs
        pattern: "migrate"
      - path: test/kernel/migrate.test.mjs
        pattern: "guard-bash\\.log"
      - path: bench/lib/grade.mjs
        pattern: "\\.tether/"
    tests: true
    drive: true
    security: true
  - n: 5
    files: [.claude/lib/config.mjs, .claude/lib/config.schema.json, .claude/lib/admit.mjs, .claude/hooks/lint.schema.mjs, .claude/lib/preflight.mjs, .claude/lib/migrate.mjs, .tether/config.json, CLAUDE.md, .claude/rules/security-paths.md, README.md, bench/adapters/rework.mjs, bench/adapters/plugin.mjs, bench/run.mjs, test/kernel/config.test.mjs, test/kernel/migrate.test.mjs]
    greps:
      - path: .tether/config.json
        pattern: "\"version\": 1"
      - path: .claude/lib/config.schema.json
        pattern: "\"lanes\""
      - path: .claude/lib/config.schema.json
        pattern: "\"commands\""
      - path: .claude/lib/config.mjs
        pattern: "KNOWN_KEYS"
      - path: .claude/lib/config.mjs
        pattern: "assertNotDestructive"
      - path: CLAUDE.md
        pattern: "\\.tether/config\\.json"
    tests: true
    drive: true
    security: true
  - n: 6
    files: [.claude/lib/hook.mjs, .claude/lib/hooks/emit.ledger.mjs, .claude/lib/hooks/inject.state.mjs, .claude/lib/hooks/lint.schema.mjs, .claude/lib/hooks/monitor.context.mjs, .claude/lib/hooks/observe.drive.mjs, .claude/lib/hooks/route.verdict.mjs, .claude/lib/transcript.mjs, .claude/lib/turn-block.mjs, .claude/lib/source-paths.mjs, .claude/lib/drive-evidence.mjs, .claude/hooks/emit.ledger.mjs, .claude/hooks/inject.state.mjs, .claude/hooks/lint.schema.mjs, .claude/hooks/monitor.context.mjs, .claude/hooks/observe.drive.mjs, .claude/hooks/route.verdict.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: .claude/lib/hook.mjs
        pattern: "export (async )?function runHook\\("
      - path: .claude/hooks/emit.ledger.mjs
        pattern: "runHook"
      - path: .claude/hooks/route.verdict.mjs
        pattern: "runHook"
      - path: test/hooks/handlers.test.mjs
        pattern: "emitLedger"
    tests: true
    drive: true
    security: false
  - n: 7
    files: [.claude/lib/hooks/guard.bash.mjs, .claude/lib/hooks/guard.scope.mjs, .claude/lib/hooks/guard.comments.mjs, .claude/lib/hooks/guard.block.mjs, .claude/lib/vendor/shell-quote-parse.mjs, .claude/hooks/guard.bash.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/guard.comments.mjs, .claude/hooks/guard.block.mjs, test/hooks/handlers.test.mjs, CONTRIBUTING.md]
    greps:
      - path: .claude/hooks/guard.bash.mjs
        pattern: "runHook"
      - path: .claude/lib/hooks/guard.bash.mjs
        pattern: "export (async )?function guardBash\\("
      - path: test/hooks/handlers.test.mjs
        pattern: "guardBash"
      - path: CONTRIBUTING.md
        pattern: "\\.claude/lib/vendor/shell-quote-parse\\.mjs"
    tests: true
    drive: true
    security: true
  - n: 8
    files: [bench/results/rework-separate-core.json]
    greps:
      - path: bench/results/rework-separate-core.json
        pattern: "\"harness\": \"rework\""
      - path: bench/results/rework-separate-core.json
        pattern: "order-07-summary-endpoint"
    tests: true
    drive: true
    security: false
---
# Design: Separate core paths, state and config

## Problem

Step 3 of the Tether plan moves the core into `core/` as a plugin, and SDR-00001 D-005 says nothing may write under the plugin root. Today the kernel and hooks spell `.claude` paths inline in 22 files, write runtime state into `.claude/ledger/`, `.claude/state/` and `.claude/branching/`, read settings from `.claude/harness.json`, and `guard.bash.mjs:52` builds its log path from its own location (SDR-00001 TF-003). The binding layout (`.claude/MEMORY.md`, 2026-10-04) is `.tether/config.json` tracked, `.tether/state/` ignored, one paths module, and hooks as thin shells over kernel verbs. This session runs on the harness being changed, so every phase must leave `npm test` green and the hooks working, and the ledger and drive log must survive the move.

## Decisions

### D-001: One paths module owns every location
**Decision:** Infrastructural decision. A new `.claude/lib/paths.mjs` is the only module that knows where things live. It holds the one `.claude` literal in the kernel and hooks, as `HOST_DIR`, the folder Claude Code owns (`settings.local.json`, `MEMORY.md`, `PROJECT-MAP.md`, `agent-memory/`), plus `TETHER_DIR = ".tether"` and `WORK_DIR = "work"`. Everything else is derived: `projectRoot(from)`, `repoRelative(event, filePath)`, `stateDir(root)`, `statePath(root, name)`, `stateRel(name)`, `configPath(root)`, `configRel()`, `branchingManifestPath(root)`, `hostPath(root, ...segments)`, `hostRel(...segments)`, `workRoot(root)`, `STATE_FILES` (`ledger`, `driveLog`, `guardLog`) and `BOOKKEEPING_PREFIXES` (`work/`, `.claude/`, `.tether/`). The `*Rel` forms return POSIX repo-relative strings for messages, so a message reads the same on Windows. Functions take `root` like `workDir(id, root)` does today; the module does no I/O beyond the `existsSync` marker probe in `projectRoot`. File names inside a work item (`state.yaml`, `phases/`) stay with `work.mjs`, which owns that aggregate; it takes its root from `workRoot`. `hooks/lib/project-root.mjs` merges into this module, so one root resolution remains instead of two; the root marker is the nearest ancestor holding `.tether/` or `.claude/`, after `CLAUDE_PROJECT_DIR`.
**Instead of:** a `Paths` object built once per root and passed around: it would change the signature of every kernel function for no gain over the `root` argument they already take.
**Risks:**
- **RISK-001** The module grows into a grab bag of helpers. Mitigation: locations only; anything that reads or writes a file stays in its own module, and `test/kernel/paths.test.mjs` pins the export list.
- **RISK-002** A path is still built inline after the move. Mitigation: phase 2 adds a test that fails on any code line under `.claude/lib`, `.claude/hooks` or `.claude/bin` that contains `.claude`, except in `paths.mjs`.

### D-002: Runtime state is one flat folder, `.tether/state/`
**Decision:** Infrastructural decision. Every file the harness writes at run time goes to `.tether/state/`: `ledger.jsonl`, `drive-log.jsonl`, `guard.log` (renamed from `guard-bash.log`, as the plan names it), `branching.yaml` (from `.claude/branching/manifest.yaml`), `check-<step>.log`, `<id>.review.md`, and the sanctioned test-log sink of `guard.bash`. `.gitignore` gains `.tether/state/`. The dead `.claude/state/drive-log.jsonl` writer in `hooks/lib/drive-evidence.mjs` (`appendEvidence`, `readEvidence`, `treeHash`, `drivesForCurrentPhase`, `classifyVerification`, `claimMatchesObserved`, none imported anywhere) is deleted rather than moved. `guard.scope` keeps denying model writes under the state folder, with one named exception, `branching.yaml`, because the `branching` skill writes it with the Write tool.
**Instead of:** subfolders per writer (`state/ledger/`, `state/branching/`): nothing reads across them, and a flat folder is one ignore line and one guard rule.
**Risks:**
- **RISK-003** The `branching.yaml` exception lets a model write one state file. Mitigation: it is the manifest the skill already writes today under `.claude/branching/`; the exception is one name in `paths.mjs`, tested in `hooks.test.mjs`.

### D-003: Settings live in `.tether/config.json`, versioned, with a JSON Schema
**Decision:** Infrastructural decision. `config.mjs` stays the one reader and reads `.tether/config.json`. Version 1 holds `version`, `security_paths`, `sources` (moved unchanged from `harness.json`), `lanes` (`fast.max_files` 3, `order.max_phases` 3, `order.max_decisions` 5, `design.max_phases` 10, `design.max_decisions` 8) and `commands` (`test`, `lint`, `build`, `run`, each a string that overrides detection). The published contract is `.claude/lib/config.schema.json`. The loader checks each known key by code, falls back to that key's default on a wrong type, and returns `warnings` for an unknown key, a wrong type or a `version` other than 1; a malformed file keeps today's `error`. A test pins the schema's `properties` and `default` values to the loader's `KNOWN_KEYS` and defaults, so the two cannot drift. `admit.mjs` and `lint.schema.mjs` take their caps from `lanes`; `detectTooling` lets `commands` override what it detects, and every configured command passes `assertNotDestructive` before `check`, `verify` or `drive` runs it. A missing file means all defaults, as today; `tether init` (step 4) writes it.
**Instead of:** validating at run time against the schema file with a small validator: a second interpreter of JSON Schema to keep correct, when a dozen typed keys are checked in a few lines.
**Risks:**
- **RISK-004** A configured command runs without a permission prompt through the allow-listed `harness check`. Mitigation: `assertNotDestructive` on every configured command; the phase that adds `commands` is marked security.
- **RISK-005** The rule texts still state the default caps when a project changes them. Mitigation: out of scope here; step 3's rule injection can render configured values (Scope, Out).

### D-004: A clear break with one migration verb, `harness migrate`
**Decision:** Infrastructural decision. The kernel reads only the new locations; it never falls back to the old ones. A new `.claude/lib/migrate.mjs` behind `harness migrate [--dry-run]` moves legacy state into `.tether/state/` (rename when the target is missing; append when both `.jsonl` or `.log` files exist, since the ledger and drive-log readers are order-independent; drop a legacy `check-*.log` or `*.review.md` when a newer one exists) and, from phase 5, writes `.tether/config.json` from `.claude/harness.json` with `version: 1` and deletes `harness.json`; when both config files exist it keeps `config.json` and reports the conflict. It is idempotent and prints what it did. `preflight` warns while any legacy location exists. A project that runs a copied harness, such as the owner's other umbrella project, is untouched: its own copy keeps its own paths until it takes the new core in step 4, whose `tether init` calls the same `migrate` function.
**Instead of:** dual reads (new path, else old): every reader would carry two paths for good, which the "no `.claude` literal" done-when forbids, and step 4 needs the move as code anyway.
**Risks:**
- **RISK-006** Between a flip landing and `harness migrate` running, `harness cost` and `harness verify` see only the new rows. Mitigation: the flip phases run `harness migrate` before `harness verify`, and a criterion checks the migrated row count.
- **RISK-007** A hook appends while `migrate` moves the same file. Mitigation: rename is atomic; the append path appends legacy bytes to the live file and never rewrites it.

### D-005: Hooks are thin shells over kernel handlers
**Decision:** Infrastructural decision. Each `.claude/hooks/<kind>.<name>.mjs` shrinks to an import of `runHook` from `.claude/lib/hook.mjs` and of one handler from `.claude/lib/hooks/<kind>.<name>.mjs`. A handler is `(event, ctx) => output | null`, where `ctx` is `{ root }` and `output` is the JSON object the hook prints today; it never reads stdin, writes stdout or calls `process.exit`. `runHook(handler, { onBadInput: "exit" | "empty" })` parses stdin, resolves `ctx`, awaits the handler, prints the output, swallows a thrown error and always exits 0, which is what every hook does today (`inject.state` uses `"empty"`). `hooks/lib/*` moves to `.claude/lib/`, the vendored tokenizer to `.claude/lib/vendor/`. Each hook stays its own Node process (SDR-00001 D-004), and the existing spawn tests in `hooks.test.mjs` stay the regression net with their assertions unchanged.
**Instead of:** one `harness hook <name>` dispatcher: `harness.mjs` imports every kernel module, so each tool call would pay that cold start against the 200 ms budget, and SDR-00001 rejected one dispatcher per event.
**Risks:**
- **RISK-008** `guard.bash` exits from `decide` and `fallThrough`; turning those into returns can change a decision. Mitigation: its own phase, marked security, with the unchanged spawn tests plus handler-level tests over the same commands.
- **RISK-009** A half-moved hook fails to import while this session runs on it. Mitigation: create the handler module first, switch each shell in one write, delete old helpers last; a failing hook exits non-zero, which Claude Code treats as non-blocking.

### D-006: A test forbids any path built from a module's own location
**Decision:** Infrastructural decision. `test/kernel/paths.test.mjs` scans every `.mjs` under `.claude/lib`, `.claude/hooks` and `.claude/bin` (vendored code excluded) and fails on `import.meta.url`, `import.meta.dirname`, `import.meta.filename`, `__dirname`, `__filename` or `process.argv[1]`. A hook test runs `guard.bash` against a temporary root and asserts its trace line lands in that root's `statePath(root, STATE_FILES.guardLog)` and that no file appears under `.claude/hooks/`. Relative `import()` specifiers stay allowed: they load code, never write.
**Instead of:** a test that runs every hook and diffs the core tree: it proves only the paths the tests exercise, while the static ban covers every module at once.
**Risks:**
- **RISK-010** Step 3 needs a read-only path to the plugin's own `rules/`. Mitigation: that read uses `CLAUDE_PLUGIN_ROOT` through `paths.mjs`; if a self-location read is ever needed, the allow-list in this test names `paths.mjs` alone.

### D-007: `harness-authoring` is this repository's rule and never installs
**Decision:** Infrastructural decision. The rule stays at `.claude/rules/harness-authoring.md`, where it governs editing this repository. The shipped set is the four rules SDR-00001 D-003 names; the installers that exist today, `bench/adapters/rework.mjs` and `bench/adapters/plugin.mjs`, skip `harness-authoring.md`, and `bench/test/adapters.test.mjs` asserts an installed tree holds the four and not the fifth. Step 3 moves the four into `core/rules/` and leaves this one behind. `CONTRIBUTING.md` says it is repository-only.
**Instead of:** folding the rule into `CONTRIBUTING.md`: it would stop loading when someone edits `.claude/**`, which is the moment it exists for.
**Risks:**
- **RISK-011** Bench runs lose a rule they loaded when an agent read a skill file, which moves cost. Mitigation: the effect can only lower tokens; phase 8's paired `--check` measures it.

### D-008: Parity is proven by one paired bench run behind the owner's go
**Decision:** Infrastructural decision. Phase 8 runs `node bench/run.mjs --harness rework --tasks lane:fast,order-07-summary-endpoint --runs 1 --out bench/results/rework-separate-core.json` and passes when `node bench/report.mjs bench/results/rework-clean.json bench/results/rework-separate-core.json --check` exits 0, the paired rule in `bench/report.mjs` (`pairedCheck`). The fast lane exercises `harness check`, the guards and the ledger; order-07 adds the verdict router, phase verify over the drive log and the gate. Recorded spend for that set is 9.42 dollars (`rework-clean.json`) and 10.38 dollars (`rework.json`); the `benchmarking` skill's rule of thumb gives at most 27. Phase 7 is marked security, so it always stops at the user, and the lead puts the dry run and that quote in phase 7's gate packet; approving phase 7 is the owner's go, and phase 8 never starts on a run grant.
**Instead of:** the full 14-task suite at five runs: 13 to 40 dollars of quota to measure paths that the subset already exercises.
**Risks:**
- **RISK-012** `rework-clean.json` was recorded at `a380774`, 60 commits back, so a regression from older work can fail the check. Mitigation: OQ-001; on a failed check, a base-commit run of the same set separates the cause, behind its own go.

## Scope

**In:**
- `paths.mjs`, and every location in `.claude/lib`, `.claude/hooks` and `.claude/bin` routed through it.
- Runtime state in `.tether/state/`, settings in `.tether/config.json` with a schema, lanes and commands.
- `harness migrate`, and `preflight` warnings for legacy locations.
- Hooks as thin shells over handlers in `.claude/lib/hooks/`.
- The self-location ban test and the `guard.bash` log move (TF-003).
- `harness-authoring` kept out of every installed tree.
- Markdown that names a moved path, the bench adapters and graders that filter `.claude/`, and one paired bench run.

**Out:**
- `core/`, the plugin manifest, the `tether:` rename, rule injection, `tether init` and `tether doctor` (steps 3 and 4).
- The 28 `node .claude/bin/harness.mjs` calls in Markdown, which change with the CLI rename in step 3.
- `.tether/extensions/` and the `extensions` key (step 5).
- `.claude/MEMORY.md`, `.claude/PROJECT-MAP.md`, `.claude/agent-memory/` and `.claude/settings*.json`: host-owned, they stay and are reached through `hostPath`.
- Rule texts that state the default caps; `.claude/scripts/`, whose `.claude` mentions are usage comments.
- Any change to the owner's other project that runs a copied harness.

## Phase 1: Paths module, and no write beside a hook
**Touch set:**
- `.claude/lib/paths.mjs`: new, the one paths module
- `.claude/lib/work.mjs`: re-exports `projectRoot`; `workRoot` from paths
- `.claude/hooks/lib/project-root.mjs`: deleted, merged into paths
- `.claude/hooks/guard.comments.mjs`: imports `repoRelative` from paths
- `.claude/hooks/guard.bash.mjs`: trace under `statePath`; `projectRoot` import
- `.claude/hooks/emit.ledger.mjs`: ledger file from paths
- `.claude/hooks/observe.drive.mjs`: drive log from paths
- `.claude/hooks/route.verdict.mjs`: review block path and message
- `.claude/hooks/inject.state.mjs`: glossary path and heading
- `.claude/hooks/lib/drive-evidence.mjs`: drop the dead evidence writer
- `test/kernel/paths.test.mjs`: new, TF-003 ban and root tests
- `test/hooks/hooks.test.mjs`: guard trace lands under root
**Changes:** Create `paths.mjs` with the D-001 interface. In this phase the derived locations still point where the files are today: `stateDir` is `.claude/ledger`, `configPath` is `.claude/harness.json`, `branchingManifestPath` is `.claude/branching/manifest.yaml`, `STATE_FILES.guardLog` is `guard-bash.log`; all of them are built from `HOST_DIR`, so phases 4 and 5 change one line each. `projectRoot(from = process.cwd())` honours `CLAUDE_PROJECT_DIR`, then the nearest ancestor holding `TETHER_DIR` or `HOST_DIR`, then returns `resolve(from)`; `repoRelative(event, filePath)` moves over unchanged and resolves its root from `event.cwd`. `work.mjs` re-exports `projectRoot` so its importers do not change. Delete `hooks/lib/project-root.mjs`; `guard.bash` calls `projectRoot(input.cwd)` where it called `projectRoot(input)`. `trace()` in `guard.bash` appends to `statePath(projectRoot(), STATE_FILES.guardLog)` and drops `fileURLToPath`, `dirname` of `import.meta.url` and the stale comment above it; no allow, deny or fall-through decision changes. `emit.ledger`, `observe.drive`, `route.verdict` and `inject.state` take every location and every path they print from paths, with byte-identical output. In `drive-evidence.mjs` keep `isDriveCommand` and its tables; delete the D-002 dead exports, `DRIVE_LOG`, `EXCLUDES` and imports they alone used. Add the D-006 tests.
**Done when:**
- **T-1.1** `test/kernel/paths.test.mjs` fails when any `.mjs` under `.claude/lib`, `.claude/hooks` or `.claude/bin`, vendor excluded, contains `import.meta.url`, `import.meta.dirname`, `import.meta.filename`, `__dirname`, `__filename` or `process.argv[1]`, and it passes on the tree.
- **T-1.2** A hook test pipes a payload into `guard.bash.mjs` with `CLAUDE_PROJECT_DIR` set to a temporary root; one line appears in that root's `statePath(root, STATE_FILES.guardLog)`, and the file listing of `.claude/hooks/` is the same before and after.
- **T-1.3** `projectRoot` tests: `CLAUDE_PROJECT_DIR` wins; otherwise the nearest ancestor with `.tether/` or `.claude/` is returned; with neither, the start folder is returned.
- **T-1.4** `.claude/hooks/lib/project-root.mjs` does not exist, and `drive-evidence.mjs` exports `isDriveCommand` and no `appendEvidence`, `readEvidence` or `treeHash`.
- **T-1.5** `npm test` passes with the existing assertions on the ledger row, the drive log, the saved review block and the SessionStart glossary heading unchanged.
- **T-1.6** `node .claude/bin/harness.mjs cost` reports the same `rows` count before and after the phase, since no state file moved.

## Phase 2: Kernel and guards read every location from paths
**Touch set:**
- `.claude/lib/check.mjs`: log folder and `log` field
- `.claude/lib/config.mjs`: config file and env hint from paths
- `.claude/lib/cost.mjs`: ledger file from paths
- `.claude/lib/drive.mjs`: drive log from paths
- `.claude/lib/git.mjs`: default prefixes from `BOOKKEEPING_PREFIXES`
- `.claude/lib/pr.mjs`: `settings.local.json` through `hostPath`
- `.claude/lib/preflight.mjs`: `PROJECT-MAP.md` through `hostPath`
- `.claude/lib/repos.mjs`: manifest through `branchingManifestPath`
- `.claude/lib/review.mjs`: diff filter prefixes from paths
- `.claude/lib/verify.mjs`: drive log from paths
- `.claude/bin/harness.mjs`: source messages name `configRel()`
- `.claude/hooks/guard.scope.mjs`: state deny rule from `stateRel`
- `.claude/hooks/guard.bash.mjs`: log sink and allow reason from `stateRel`
- `test/kernel/paths.test.mjs`: the code-literal ban
- `test/kernel/config.test.mjs`: config-name ownership moves to paths
**Changes:** Behaviour does not change; every location and every printed path now comes from `paths.mjs`. `git.dirtyPaths` defaults to `BOOKKEEPING_PREFIXES`; `git.linesAddedSince` and both filters in `review.mjs` use `BOOKKEEPING_PREFIXES` plus `artifacts/`. `.tether/` joins those filters now, while nothing lives there, so phases 4 and 5 need no filter edit. `guard.scope` builds its state-folder deny test from `stateRel("")`; `guard.bash` sets its sink folder from `stateRel("")` and builds the allow reason from it; the matching logic in `isSanctionedLogSink` is unchanged. `config.mjs` takes `CONFIG_FILE` from `configRel()` and its env hint from `hostRel("settings.local.json")`. The ban test reads every `.mjs` under `.claude/lib`, `.claude/hooks` and `.claude/bin`, skips `paths.mjs` and `vendor/`, skips lines whose trimmed text starts with `//`, `/*` or `*` (OQ-002), and fails on any other line containing `.claude`. The `config.test.mjs` ownership test now asserts that `paths.mjs` is the only kernel file naming the config file's base name.
**Done when:**
- **T-2.1** The ban test in `test/kernel/paths.test.mjs` passes on the tree and fails when a code line containing `.claude` is added to any kernel or hook file other than `paths.mjs`.
- **T-2.2** The existing `guard.scope` test denying a model write under the state folder, and the `guard.bash` tests that auto-allow a test redirect into the sink and fall through on `$VAR` in the target, pass with their targets built from `stateRel`.
- **T-2.3** `harness check` reports its log as `stateRel("check-test.log")`, still `.claude/ledger/check-test.log` in this phase.
- **T-2.4** `config.test.mjs` asserts `paths.mjs` is the only file under `.claude/lib` that names the config file, and it passes.
- **T-2.5** `npm test` passes and `harness cost` reports the same `rows` count as before the phase.

## Phase 3: `harness-authoring` stays in this repository
**Touch set:**
- `bench/adapters/rework.mjs`: skips the repository-only rule
- `bench/adapters/plugin.mjs`: skips it when copying rules
- `bench/test/adapters.test.mjs`: an installed tree holds four rules
- `CONTRIBUTING.md`: names the rule repository-only
- `README.md`: layout line for `.claude/rules/`
**Changes:** `rework.mjs` exports `REPOSITORY_ONLY = ["rules/harness-authoring.md"]`, paths relative to `.claude/`, and its install filter skips them next to `SKIP`; `plugin.mjs` applies the same list to its rules copy. A new adapter test runs `rework.install` into a temporary folder from this repository and asserts `.claude/rules/` holds `prose.md`, `comments.md`, `work-items.md` and `security-paths.md` and not `harness-authoring.md`. `CONTRIBUTING.md` says the rule governs this repository only and is never installed; `README.md`'s rules line lists the four shipped rules and marks the fifth repository-only. The rule file itself does not change.
**Done when:**
- **T-3.1** The adapter test passes: a `rework` install holds the four shipped rules and no `harness-authoring.md`.
- **T-3.2** `.claude/rules/harness-authoring.md` is unchanged and still loads in this repository (its `paths:` frontmatter is untouched).
- **T-3.3** `CONTRIBUTING.md` and `README.md` name `harness-authoring` as repository-only, and `test/markdown-paths.test.mjs` passes.
- **T-3.4** `npm test` passes.

## Phase 4: Runtime state moves to `.tether/state/`, with `harness migrate`
**Touch set:**
- `.claude/lib/paths.mjs`: state under `.tether/state/`; legacy locations
- `.claude/lib/migrate.mjs`: new, moves legacy state
- `.claude/bin/harness.mjs`: `migrate [--dry-run]` verb; stale comment
- `.claude/lib/preflight.mjs`: `legacy_paths` warning
- `.claude/hooks/guard.scope.mjs`: `branching.yaml` exception; stale comment
- `.claude/hooks/guard.bash.mjs`: stale sink comments deleted
- `.claude/lib/check.mjs`, `.claude/lib/cost.mjs`, `.claude/lib/verify.mjs`: stale comments deleted
- `.gitignore`: ignores `.tether/state/`
- `bench/run.mjs`, `bench/lib/grade.mjs`: skip `.tether/` wherever they skip `.claude/`
- `test/kernel/migrate.test.mjs`: new
- `test/hooks/hooks.test.mjs`, `test/kernel/check.test.mjs`, `test/kernel/drive.test.mjs`, `test/kernel/verify.test.mjs`, `test/kernel/review.test.mjs`: locations through paths
- `.claude/agents/developer.md`, `.claude/skills/expediting/steps/30-check.md`, `.claude/skills/inspecting/SKILL.md`, `.claude/skills/reviewing/SKILL.md`, `.claude/skills/branching/SKILL.md`, `.claude/skills/summarizing/SKILL.md`, `.claude/hooks/README.md`: name the new paths
- `test/markdown-paths.test.mjs`: `ELSEWHERE` entries for the new state paths
**Changes:** In `paths.mjs`, `stateDir` becomes `<root>/.tether/state`, `STATE_FILES.guardLog` becomes `guard.log`, `branchingManifestPath` becomes `statePath(root, "branching.yaml")`, and a frozen `LEGACY` map names the old locations (`.claude/ledger/`, `.claude/branching/manifest.yaml`, `.claude/harness.json`), all built from `HOST_DIR`. `migrate(root, { dryRun })` returns `{ moved: [{ from, to, how }], skipped: [], removed: [] }` with `how` one of `renamed`, `appended`, `dropped`, following D-004; it renames `guard-bash.log` to `guard.log` and the manifest to `branching.yaml`, then removes emptied legacy folders. `harness migrate` prints that result; `--human` renders one line per file. `preflight` adds `legacy_paths` at `warn` while any `LEGACY` state location exists, with the detail "run harness migrate". `guard.scope` denies model writes under `stateRel("")` except `stateRel("branching.yaml")`. `.gitignore` gains `.tether/state/` and keeps the old lines, since other worktrees still run older kernels. Delete the comments this phase makes stale, never reword them. Tests take every state location from `paths.mjs`, so the next move edits no test. After `npm test` is green, run `harness migrate` in this worktree, then `harness verify`.
**Done when:**
- **T-4.1** `stateRel("ledger.jsonl")` is `.tether/state/ledger.jsonl`, `STATE_FILES.guardLog` is `guard.log`, and `branchingManifestPath(root)` ends in `.tether/state/branching.yaml`.
- **T-4.2** `migrate.test.mjs`: a legacy ledger with no target is renamed; with both present the target holds its own rows followed by the legacy rows; `guard-bash.log` becomes `guard.log`; the manifest becomes `branching.yaml`; a second run moves nothing; `--dry-run` changes no file.
- **T-4.3** `preflight` shows `legacy_paths` at `warn` while `.claude/ledger/` exists and no such check after `migrate`.
- **T-4.4** `guard.scope` denies a Write to `.tether/state/ledger.jsonl` and allows one to `.tether/state/branching.yaml`; `guard.bash` auto-allows `npm test > .tether/state/phase-1.log 2>&1` and falls through on `npm test > .claude/ledger/x.log`.
- **T-4.5** In this worktree, after `harness migrate`, `.claude/ledger/` is gone and `harness cost` reports at least as many `rows` as it did before the phase.
- **T-4.6** `git check-ignore .tether/state/ledger.jsonl` exits 0, and every `.claude/` filter in `bench/run.mjs` and `bench/lib/grade.mjs` has a `.tether/` twin.
- **T-4.7** No scanned Markdown cites `.claude/ledger` or `.claude/branching`, and `npm test` passes.

## Phase 5: Settings move to `.tether/config.json`, with a schema
**Touch set:**
- `.claude/lib/paths.mjs`: `configPath` is `.tether/config.json`
- `.claude/lib/config.mjs`: `version`, `lanes`, `commands`, `warnings`; stale comments
- `.claude/lib/config.schema.json`: new, the published contract
- `.claude/lib/admit.mjs`: caps from `lanes`
- `.claude/hooks/lint.schema.mjs`: caps from `lanes`
- `.claude/lib/preflight.mjs`: `commands` override detection; config warnings
- `.claude/lib/migrate.mjs`: converts `.claude/harness.json`
- `.claude/hooks/guard.scope.mjs`: stale comment deleted
- `.tether/config.json`: new, written by `harness migrate`
- `.claude/harness.json`: deleted by `harness migrate`
- `CLAUDE.md`, `.claude/rules/security-paths.md`: name `.tether/config.json`
- `README.md`: layout lines for `.tether/`
- `bench/adapters/rework.mjs`, `bench/adapters/plugin.mjs`: copy `.tether/config.json`
- `bench/run.mjs`: `harness_dirty` also watches `.tether`
- `test/kernel/config.test.mjs`, `test/kernel/migrate.test.mjs`, `test/kernel/admit.test.mjs`, `test/kernel/gate.test.mjs`, `test/kernel/packet.test.mjs`, `test/kernel/sources.test.mjs`, `test/hooks/hooks.test.mjs`: config written at `configPath(root)`
**Changes:** `config.mjs` exports `KNOWN_KEYS`, `DEFAULT_LANES` and `loadConfig(root, env)` returning `{ version, security_paths, sources, lanes, commands, error, warnings }`, per D-003. `lanes` merges per lane and per field over `DEFAULT_LANES`; a non-positive or non-integer cap keeps the default with a warning. Each `commands` value must be a non-empty string that passes `assertNotDestructive`, or it is dropped with a warning. `config.schema.json` is JSON Schema 2020-12 with `properties` for the five keys, each carrying its `default`. `admit.mjs` keeps `CAPS` exported, derived from `DEFAULT_LANES`, and reads `loadConfig(root).lanes` per call; `lint.schema.mjs` takes `max_phases` and `max_decisions` for `order` and `design` from it. `detectTooling` overlays `commands` on what it detects. `preflight`'s `config` check also lists `warnings`. `migrate` writes `.tether/config.json` (`version: 1` first, then the legacy keys, two-space JSON, trailing newline), then deletes `.claude/harness.json`; both present means keep, report, delete nothing. Order the work so the window is short: migrate step and tests first, then the `configPath` flip, then `harness migrate` at once, because until it runs the guards see no sources.
**Done when:**
- **T-5.1** `config.test.mjs`: a file with every key returns them; `lanes.order.max_phases: "x"` gives 3 and a warning; an unknown key and `version: 2` each give a warning; malformed JSON keeps the defaults and sets `error`.
- **T-5.2** A test pins `config.schema.json`: its `properties` keys equal `KNOWN_KEYS` and each `default` equals the loader's default.
- **T-5.3** With `lanes.fast.max_files: 1`, `admit` keeps a two-file request out of the fast lane; with `lanes.order.max_phases: 2`, `lint.schema` reports a three-phase order.
- **T-5.4** `commands.test: "node -e 1"` makes `detectTooling(root).test` that command; `commands.test: "rm -rf ."` is dropped with a warning and detection stands.
- **T-5.5** `migrate.test.mjs`: `harness.json` becomes `config.json` with `version: 1` and the same `sources`, and `harness.json` is gone; with both present nothing is deleted and the conflict is reported.
- **T-5.6** In this worktree `.tether/config.json` is tracked with `"version": 1` and the `analysis` source, `.claude/harness.json` is gone, and `harness preflight <id>` shows the `source:analysis` check as before the phase.
- **T-5.7** The phase 2 ban test and `test/markdown-paths.test.mjs` pass, and `npm test` passes.

## Phase 6: Hooks that are not guards become thin shells
**Touch set:**
- `.claude/lib/hook.mjs`: new, `runHook`
- `.claude/lib/hooks/emit.ledger.mjs`, `.claude/lib/hooks/inject.state.mjs`, `.claude/lib/hooks/lint.schema.mjs`, `.claude/lib/hooks/monitor.context.mjs`, `.claude/lib/hooks/observe.drive.mjs`, `.claude/lib/hooks/route.verdict.mjs`: new handlers
- `.claude/hooks/emit.ledger.mjs`, `.claude/hooks/inject.state.mjs`, `.claude/hooks/lint.schema.mjs`, `.claude/hooks/monitor.context.mjs`, `.claude/hooks/observe.drive.mjs`, `.claude/hooks/route.verdict.mjs`: become shells
- `.claude/hooks/lib/transcript.mjs`, `.claude/hooks/lib/turn-block.mjs`, `.claude/hooks/lib/source-paths.mjs`, `.claude/hooks/lib/drive-evidence.mjs`: moved to `.claude/lib/`
- `.claude/hooks/guard.bash.mjs`, `.claude/hooks/guard.scope.mjs`, `.claude/hooks/guard.comments.mjs`, `.claude/hooks/guard.block.mjs`: import paths only
- `.claude/lib/preflight.mjs`, `test/kernel/sources.test.mjs`: import `source-paths.mjs` from its new place
- `.claude/hooks/README.md`, `CONTRIBUTING.md`: where a hook's logic lives
- `test/hooks/handlers.test.mjs`: new
**Changes:** `runHook(handler, { onBadInput = "exit" })` per D-005. Handlers are named for the hook: `emitLedger`, `injectState` (run with `onBadInput: "empty"`), `lintSchema`, `monitorContext`, `observeDrive`, `routeVerdict`, each `(event, ctx)` returning the object the hook prints today or `null`. Bodies move over with `ctx.root` in place of their own `projectRoot` call; the strings they print do not change. A shell is a shebang, two imports and one `runHook` call. Move the four helpers with `git mv` to `.claude/lib/` and fix every import; `.claude/hooks/lib/` ends empty and is removed. The guards change only their import lines in this phase. `handlers.test.mjs` calls handlers directly and checks the shell shape of the six.
**Done when:**
- **T-6.1** Each of the six shells imports only `runHook` and its handler and has at most 5 non-empty lines; a test in `handlers.test.mjs` enforces it.
- **T-6.2** No file under `.claude/lib/hooks/` contains `process.exit`, `readFileSync(0` or `process.stdout`; the same test enforces it.
- **T-6.3** Called directly, `emitLedger` appends one v2 row under `statePath(root, STATE_FILES.ledger)`, `routeVerdict` on a pull request review returns context naming `stateRel`, and `injectState` with an empty event lists open work items.
- **T-6.4** `.claude/hooks/lib/` does not exist, and the spawn tests in `test/hooks/hooks.test.mjs` pass with their assertions unchanged.
- **T-6.5** The hook cold-start test in `test/budgets.test.mjs` passes, and `npm test` passes.

## Phase 7: Guard hooks become thin shells
**Touch set:**
- `.claude/lib/hooks/guard.bash.mjs`: the body of `guard.bash`, moved with `git mv`
- `.claude/lib/hooks/guard.scope.mjs`, `.claude/lib/hooks/guard.comments.mjs`, `.claude/lib/hooks/guard.block.mjs`: new handlers
- `.claude/hooks/guard.bash.mjs`, `.claude/hooks/guard.scope.mjs`, `.claude/hooks/guard.comments.mjs`, `.claude/hooks/guard.block.mjs`: become shells
- `.claude/hooks/vendor/shell-quote-parse.mjs`: moved to `.claude/lib/vendor/`
- `test/kernel/paths.test.mjs`: vendor exclusion follows the move
- `test/hooks/handlers.test.mjs`: guard handlers; shell shape for all ten
- `CONTRIBUTING.md`, `.claude/hooks/README.md`: vendor path and guard layout
**Changes:** `guardBash(event, ctx)` returns the `hookSpecificOutput` object for allow or deny, or `null` for fall-through. `decide` and `fallThrough` return values instead of exiting, and every caller already returns their result, so control flow keeps its shape. `trace` takes the root and the raw command as arguments instead of module state and still writes one line per call. The tokenizer still loads with top-level `await import("../vendor/shell-quote-parse.mjs")`, then the `shell-quote` package; with neither, the handler traces and returns `null`. `guardScope`, `guardComments` and `guardBlock` move over unchanged in their rules. Run each guard's spawn tests after its own switch, not at the end.
**Done when:**
- **T-7.1** The shell-shape test covers every `.mjs` in `.claude/hooks/`, all ten pass, and `.claude/hooks/` holds only the ten shells and `README.md`.
- **T-7.2** Called directly, `guardBash` denies `rm -rf x`, allows `git status`, allows `npm test > .tether/state/p.log 2>&1`, returns `null` for `cat a > b`, and writes one trace line per call under `statePath(root, STATE_FILES.guardLog)`.
- **T-7.3** Called directly, `guardScope` denies `work/<id>/state.yaml` and `.tether/state/ledger.jsonl` and allows `.tether/state/branching.yaml`.
- **T-7.4** The guard spawn tests in `test/hooks/hooks.test.mjs` pass with their assertions unchanged, and so does the hook cold-start test.
- **T-7.5** The tokenizer lives at `.claude/lib/vendor/shell-quote-parse.mjs`, and the ban tests of phases 1 and 2 pass.
- **T-7.6** `node bench/run.mjs --harness rework --tasks lane:fast,order-07-summary-endpoint --dry` lists 7 tasks, and the developer's block quotes that list for the gate packet.

## Phase 8: The benchmark shows parity with the baseline
**Touch set:**
- `bench/results/rework-separate-core.json`: new results file
- `bench/results/rework-clean.json`: the baseline, read only
**Changes:** This phase spends quota and starts only on the owner's go (D-008). Phase 7 always stops at the user, being marked security; the lead runs the dry run under the `benchmarking` skill and puts the task list and the quote (about 10 dollars by `rework-clean.json` and `rework.json`, at most 27 by the skill's rule of thumb) in that gate packet. Approving phase 7 is the go; a run grant never reaches this phase. The developer runs `node bench/run.mjs --harness rework --tasks lane:fast,order-07-summary-endpoint --runs 1 --out bench/results/rework-separate-core.json` in the background on a clean tree, drops records that failed on an API or session limit and re-runs those tasks, then runs `node bench/report.mjs bench/results/rework-clean.json bench/results/rework-separate-core.json --check`. A failed check ends the phase with `PHASE STALLED` and the report table, for OQ-001.
**Done when:**
- **T-8.1** `bench/results/rework-separate-core.json` holds 7 records, one per task of `lane:fast` plus `order-07-summary-endpoint`, with `manifest.harness` `rework` and `manifest.harness_dirty` false.
- **T-8.2** `node bench/report.mjs bench/results/rework-clean.json bench/results/rework-separate-core.json --check` exits 0.
- **T-8.3** No record carries an error from an API or session limit.
- **T-8.4** No record's `changed_files` lists a path under `.tether/` or `.claude/`.

## Open questions

- **OQ-001** Which run proves "equal to the baseline": `rework-clean.json` (recorded at `a380774`, 60 commits back, no extra spend) or a fresh run of the same seven tasks at the base commit `b5cc4bb` (about 10 dollars more)? Owner: the owner. Fallback: phase 8 checks against `rework-clean.json`; on a failed check the base-commit run is proposed, behind its own go.
- **OQ-002** The done-when says no `.claude` path literal in the kernel or hooks, but some comments name `.claude` paths that stay true after the move (the wiring example in `guard.bash.mjs`, the usage lines in `statusline.mjs`, the contract-heading note in `turn-block.mjs`). The comments rule allows deleting only stale comments. Owner: the owner. Fallback: the ban test checks code lines only, and those comments stay.
- **OQ-003** Should `guard.scope` deny model writes to `.tether/config.json`, given the plan says people edit it after `init`? Owner: the owner. Fallback: no guard, as for `.claude/harness.json` today; the loader refuses destructive `commands`.

## Revision log
