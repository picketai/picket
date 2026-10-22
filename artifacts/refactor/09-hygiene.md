# 09: Hygiene

Status: approved (2026-10-22).

Small clean-ups the rest of the refactor leaves for last: benchmark results nothing reads, dead scripts and the patterns that name them, a `.gitignore` with stale comments and repeats, two unused permission rules, an abandoned work item left untracked, a personal tool wired into `package.json`, and agent memories that will cite old paths. Nothing here changes what Picket does.

## Today and target

### `bench/results/`: 19 tracked files, about 890 KB

Each file, and what outside `work/`, `artifacts/` and `bench/results/` uses it:

| File | Used by | Proposal |
|---|---|---|
| `ask-probe.json` | `bench/probe-ask.mjs` (writes it), `test/hooks/handlers.test.mjs`, `docs/design/status-line-canvas/project/Transcript*.dc.html`, an architect memory | keep |
| `baseline-trunk.json` | `.claude/rules/harness-authoring.md`, `bench/README.md`, `core/skills/benchmarking/SKILL.md` | keep |
| `comparison-clean.md` | `README.md` | keep |
| `plugin-2026-10-18.json` | nothing; the newest run | keep, the next baseline |
| `rework.json` | `bench/README.md` and `bench/report.mjs` comments, as an example | remove; the example switches to `plugin-2026-10-18.json` |
| `baseline-trunk.log`, `phase5.log`, `phase5.err` (empty) | nothing, anywhere | remove |
| `comparison.md`, `plugin-2026-10-17.json`, `plugin-alpha.json`, `plugin-core.json`, `plugin-init.json`, `plugin-init-gate13.json`, `rework-2026-10-02.json`, `rework-before-hookfix.json`, `rework-clean.json`, `rework-clean-raw.json`, `rework-separate-core.json` | closed work items and old reports only | remove |

Removed with `git rm`; history keeps them, and a closed item that cites one reads it with `git show <commit>:bench/results/<file>`. With the `rework` results gone, `bench/lib/lanes.mjs:1` drops `"rework"` from `HARNESSES_WITH_LANES`.

### Dead files and patterns

| What | Evidence | Proposal |
|---|---|---|
| `.claude/bin/statusline.mjs` | unused since `6c72f54` (2026-10-10, "drop the ccstatusline status line and its config"); only its own comment names it | remove |
| `.claude/scripts/logdigest.mjs` | added in `56cac95` (2026-08-05) for the developer; no skill or agent uses it now; only old bench results show it run | remove |
| `/logdigest\.mjs\b/` in `core/lib/drive-evidence.mjs:51` | product code that knows a script of this repository | remove with the script |
| `/lint\.(write\|contract)\.mjs\b/` in `core/lib/drive-evidence.mjs:53` | no such files in the repository | remove |
| `Bash(node .claude/scripts/*)` in `.claude/settings.json` | nothing left to run there | remove |

No test names `logdigest` or the `lint.*` scripts (`git grep` over `test/` and `bench/` finds them only inside old results).

### `.gitignore`: 47 lines

- Comments name files that no longer exist: `hooks/emit.metrics.mjs`, `telemetry/report.mjs`, `hooks/observe.bash.mjs`, `guard.verdict.mjs`.
- `node_modules`, `node_modules/`, `node_modules/*`, and `.opensrc`, `.opensrc/`, `.opensrc/*`.
- `artifacts/sessions/*` and `artifacts/sessions/.map/`: the folder does not exist.
- `.claude/telemetry/`, `.claude/state/` and `.claude/ledger/` exist in this checkout from older versions and stay ignored.

Target, three groups, one line per entry:

```gitignore
# build and dependencies
dist/
node_modules/
.opensrc/

# runtime and scratch
.picket/state/
bench/.cache/
bench/.runs/
bench/results/spend.log
bench/results/smoke*.json
bench/results/probe*.json
bench/fixture/node_modules/
.worktrees/
work/*/sources/
.claude/settings.local.json
tmp/

# old state locations from earlier versions (picket migrate moves what it knows)
.claude/telemetry/
.claude/state/
.claude/ledger/
.claude/branching/
```

The `status/`, `session/`, `markdown/` `tsconfig.json` lines move with the mods (07a) to `src/mods/*/tsconfig.json`.

### `.claude/settings.json`

- Remove `Bash(npx vitest*)` and `Bash(npx eslint*)`: neither tool is used here.
- Keep `Bash(npx tsc*)`: `tsc` is the type checker from item 01.
- Remove `Bash(node .claude/scripts/*)` (above).
- Add `Edit(dist/**)` and `Write(dist/**)` to `deny` (item 01, L-7).

### The abandoned work item

`work/20261018-add-a-picket-debugging-skill/` (`lane: fast`, `status: abandoned`, 2026-10-18; superseded by `d3a5a8d`) is untracked and keeps `git status` dirty. It is committed, as the seven other abandoned items are. Chosen by the user on 2026-10-22.

### `opensrc`

The user still uses `opensrc`. The repository tracks only its wiring: the `opensrc` script in `package.json` (`set "OPENSRC_HOME=%cd%\.opensrc" && opensrc`, Windows-only syntax) and the `opensrc` dev dependency (and its `package-lock.json` entries). The `.opensrc/` folder (`repos/`, `sources.json`) is already ignored and never tracked.

The script and the dev dependency leave `package.json`; the `.opensrc/` folder and its files stay on disk untouched, and `.opensrc/` stays ignored. The user runs it as `npx opensrc` with `OPENSRC_HOME` set in the shell profile, or keeps a global install. Chosen by the user on 2026-10-22: remove it from the repository, do not delete files.

### `package.json` type

`"type": "commonjs"` while every file is `.mjs` (and `.mts` after item 01): becomes `"type": "module"`. No file changes meaning, because every import names its extension; the package then states what it is.

### After the refactor lands

Eight files in `.claude/agent-memory/` cite paths or verbs the refactor changes (`git grep` for `core/lib`, `core/bin`, `review-summary`, `picket new`, `setup-terminal`): `picket-architect/block-format-couplings.md` (2), `guard-log-replay.md`, `record-edits-ride-phase-commits.md`, `statusline-contract.md`, `verify-grep-patterns.md`, `picket-reviewer/MEMORY.md`, `probe-guards-directly.md` (2), `review-summary-drops-claude-paths.md` (3). The refactor's last phase refreshes them, as `65e530c` did after earlier items.

`tmp/layout-probe/` holds the item 01 timing copies; it is ignored and the user deletes it when they like (the Bash guard blocked deleting it from the session).

### Kept

`work/` (98 items; the phase markers find each phase's commit), `artifacts/reports/` (19 files, not shipped), `artifacts/refactor/` (the record of this refactor), `docs/design/` (15 files, 121 KB: the design system and the status-line canvases the PicketAI look came from).

## Decisions

### Z-1: `bench/results/` keeps four files
`ask-probe.json`, `baseline-trunk.json`, `comparison-clean.md`, `plugin-2026-10-18.json`; the other 15 leave the tree; `bench/README.md`'s example uses `plugin-2026-10-18.json`; `"rework"` leaves `bench/lib/lanes.mjs`.

### Z-2: Dead scripts and the patterns that name them go
`.claude/bin/statusline.mjs`, `.claude/scripts/logdigest.mjs`, the two patterns in `drive-evidence.mjs`, the `.claude/scripts` allow rule.

### Z-3: `.gitignore` in three groups
No repeats, no comments that name missing files, `artifacts/sessions` gone.

### Z-4: `.claude/settings.json`
`vitest` and `eslint` rules go, `tsc` stays, the two `dist/**` deny rules come in.

### Z-5: The abandoned work item is committed
Chosen by the user.

### Z-6: `opensrc` leaves the repository, not the disk
Script and dev dependency out of `package.json`; `.opensrc/` ignored and untouched. Chosen by the user.

### Z-7: `"type": "module"`

### Z-8: Agent memories are refreshed in the refactor's last phase

## Migration

One commit at the start (Z-1 to Z-7, independent of the code items) and one step at the end (Z-8).

- Z-5 can land on its own at any time.
- Z-4's deny rules land with item 01's build, since `dist/` exists only then.

## Risks

- R-1: removed results are cited by closed work items; `git show` reads them from history, and nothing that runs reads them.
- R-2: `"type": "module"` would change a `.js` file's meaning; there is none in the tracked tree (the bench fixture has its own `package.json`).
- R-3: without the `npm run opensrc` script, the user sets `OPENSRC_HOME` once in their shell profile.

## Affects

- 01: the deny rules; `dist/` in `.gitignore`.
- 07a: the mods' `tsconfig.json` ignore lines move with the mods.
- 08b: `bench/README.md`'s example.

## Open questions

None.
