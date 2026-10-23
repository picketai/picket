---
kind: design
lane: design
title: Refactor item 09, hygiene
date: 2026-10-24
audience: developer
sources: [work/20261023-refactor-item-09-hygiene/request.md, artifacts/refactor/09-hygiene.md, artifacts/refactor/00-conventions.md, bench/lib/lanes.mjs, bench/test/adapters.test.mjs, bench/README.md, bench/report.mjs, src/lib/hooks/observe/drive/evidence.mts, .gitignore, .claude/settings.json, package.json, package-lock.json, scripts/test.mjs, test/repo/markdown-paths.test.mjs, src/lib/verbs/route/commit.mts, src/lib/shared/git.mts, src/lib/shared/comments.mjs, .claude/agent-memory/]
phases:
  - n: 1
    files: [bench/lib/lanes.mjs, bench/test/adapters.test.mjs, bench/README.md, bench/report.mjs, bench/results/]
    greps:
      - path: bench/lib/lanes.mjs
        pattern: 'HARNESSES_WITH_LANES = \["plugin"\];'
      - path: bench/README.md
        pattern: 'bench/results/baseline-trunk\.json bench/results/plugin-2026-10-18\.json --check'
      - path: bench/report.mjs
        pattern: '^(?![\s\S]*rework)'
        flags: i
      - path: bench/test/adapters.test.mjs
        pattern: '^(?![\s\S]*rework)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/hooks/observe/drive/evidence.mts, .claude/settings.json]
    greps:
      - path: src/lib/hooks/observe/drive/evidence.mts
        pattern: '^(?![\s\S]*logdigest)'
        flags: i
      - path: src/lib/hooks/observe/drive/evidence.mts
        pattern: '^(?![\s\S]*write\|contract)'
        flags: i
      - path: .claude/settings.json
        pattern: '^(?![\s\S]*(vitest|eslint|\.claude/scripts))'
        flags: i
      - path: .claude/settings.json
        pattern: '"Bash\(npx tsc\*\)"'
      - path: .claude/settings.json
        pattern: '"Write\(dist/\*\*\)"'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [.gitignore]
    greps:
      - path: .gitignore
        pattern: '^# build and dependencies\b'
      - path: .gitignore
        pattern: '^# runtime and scratch\b'
      - path: .gitignore
        pattern: '^# old state locations from earlier versions\b'
      - path: .gitignore
        pattern: '^(?![\s\S]*(artifacts/sessions|tsconfig\.json|\.mjs))'
        flags: i
    tests: true
    drive: false
    security: false
  - n: 4
    files: [package.json, package-lock.json]
    greps:
      - path: package.json
        pattern: '"type": "module"'
      - path: package.json
        pattern: '^(?![\s\S]*opensrc)'
        flags: i
      - path: package-lock.json
        pattern: '^(?![\s\S]*opensrc)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 5
    files: [.claude/agent-memory/, .claude/MEMORY.md, work/20261023-refactor-item-05-hooks/verdicts.jsonl]
    greps:
      - path: .claude/agent-memory/picket-architect/block-format-couplings.md
        pattern: 'src/lib/verbs/pullrequest/threads\.mts'
      - path: .claude/agent-memory/picket-architect/record-edits-ride-phase-commits.md
        pattern: 'src/lib/verbs/route/commit\.mts'
      - path: .claude/agent-memory/picket-architect/verify-grep-patterns.md
        pattern: 'src/lib/verbs/verify/index\.mts'
      - path: .claude/agent-memory/picket-reviewer/review-summary-drops-claude-paths.md
        pattern: 'picket summary'
      - path: .claude/agent-memory/picket-architect/state-folder-facts.md
        pattern: 'runtime and scratch group'
      - path: .claude/agent-memory/picket-architect/mts-conversion-facts.md
        pattern: '^(?![\s\S]*kernel-sources)'
        flags: i
    tests: true
    drive: false
    security: false
---
# Design: Refactor item 09, hygiene

## Problem

Item 09 is the last item of the refactor: small clean-ups that change nothing Picket does, approved by the user as decisions Z-1 to Z-8 in `artifacts/refactor/09-hygiene.md`. Three of them are already done at HEAD (21384cd): the two `dist/**` deny rules and `dist/` in `.gitignore` landed in item 01 (half of Z-4), and the abandoned debugging-skill item was committed in 4eab316 (Z-5). The rest is checked here against HEAD, because items 01 to 08b moved the files the draft cites: the drive evidence patterns now live in `src/lib/hooks/observe/drive/evidence.mts`, and the agent memories cite modules that became `.mts` folders. Binding constraints: files under `.claude/` are the lead's to edit and stage; tracked deletions need an escalated `git rm`; nothing under `.opensrc/`, `tmp/` or other untracked files is deleted; the `comments` rule forbids rewording a comment, so a comment the change makes stale is deleted.

## Decisions

### D-001: `bench/results/` keeps four files (Z-1)
**Decision:** Infrastructural decision. Keep `ask-probe.json` (read by `src/lib/shared/escalation.test.mts:12`), `baseline-trunk.json` (the skill and rule baseline), `comparison-clean.md` (README and CHANGELOG cite it) and `plugin-2026-10-18.json` (the newest run). The other 15 tracked files leave with `git rm`; history keeps them (`git show <commit>:bench/results/<file>`). `"rework"` leaves `HARNESSES_WITH_LANES` in `bench/lib/lanes.mjs:1`, so the test assertion at `bench/test/adapters.test.mjs:98` (a `rework` run graded on its own lane names) goes with it and the test at line 94 is retitled without the word. The example in `bench/README.md:28` switches to `plugin-2026-10-18.json`; probed at HEAD, `node bench/report.mjs bench/results/baseline-trunk.json bench/results/plugin-2026-10-18.json --check` exits 0. The example comment at `bench/report.mjs:6` is deleted rather than switched, because the `comments` rule allows deleting a stale comment and never rewording one; this is the one place the design departs from the draft's wording.
**Instead of:** keeping every result file: nothing that runs reads the 15, and they cost about 890 KB in every clone.
**Risks:**
- **RISK-001** A closed work item cites a removed file. Mitigation: `work/`, `artifacts/` and `bench/results/` are not scanned by `test/repo/markdown-paths.test.mjs`; the file stays readable with `git show`.
- **RISK-002** An old results file with `harness: "rework"` would now be graded with trunk lane names. Mitigation: no tracked file has that harness after the removal (`plugin-2026-10-18.json` holds only `plugin` records).

### D-002: Dead scripts and the patterns that name them go (Z-2)
**Decision:** Infrastructural decision. `.claude/bin/statusline.mjs` and `.claude/scripts/logdigest.mjs` leave the tree; the lead runs the `git rm` because both sit under `.claude/`. In `src/lib/hooks/observe/drive/evidence.mts` the `NEUTRAL` list loses lines 50 to 53: the `logdigest` pattern, the `lint.(write|contract)` pattern (no such scripts exist) and the two comment lines above them, which the removal makes stale. No test names either pattern (`git grep` over `src/` and `test/` finds them only in fixture data).
**Instead of:** keeping the patterns as harmless: product code that knows one repository's private script names is the coupling item 03 removed elsewhere.
**Risks:**
- **RISK-003** A `node .../logdigest.mjs` command would now count as drive evidence. Mitigation: the script no longer exists; any other `node` command already counts as a drive.

### D-003: `.gitignore` in three groups (Z-3)
**Decision:** Infrastructural decision. The file becomes the draft's target verbatim, 18 entries under three header lines:

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

The repeats (`node_modules`, `.opensrc` three times each), the comments naming missing files, `artifacts/sessions` and the three root `tsconfig.json` lines go. Checked at HEAD: the root `status/`, `session/` and `markdown/` folders hold no files, `.claude/telemetry/` holds only the two files the old lines named, and `picket migrate` moves the legacy state and branching folders (`src/lib/verbs/migrate/migrate.mjs`), so no file becomes untracked. `guard.comments` has no comment syntax for `.gitignore` (`LANGS` in `src/lib/shared/comments.mjs`), and the user approved the header lines in the draft.
**Instead of:** a minimal edit that only drops repeats: the stale comments and the dead mod lines would stay, and the draft was approved as a whole file.
**Risks:**
- **RISK-004** A path ignored today becomes visible. Mitigation: phase 3 compares `git status --porcelain --untracked-files=all` before and after, and checks every kept entry with `git check-ignore`.

### D-004: `.claude/settings.json` drops three allow rules (Z-4)
**Decision:** Infrastructural decision. The lead removes `Bash(npx vitest*)`, `Bash(npx eslint*)` and `Bash(node .claude/scripts/*)` from `permissions.allow`; `Bash(npx tsc*)` stays; the `Edit(dist/**)` and `Write(dist/**)` deny rules are already present (item 01). vitest runs only inside bench run repositories, started by `bench/lib/grade.mjs` and `bench/lib/fixture.mjs` through `execFileSync`, never through a Claude Code permission in this project. The change only narrows permissions, so the phase is `security: false`: a removed rule makes a command ask, never pass.
**Instead of:** leaving the rules: an allow rule for a tool nobody uses is a silent pass for a command nobody reviewed.
**Risks:**
- **RISK-005** A session somewhere still runs `npx vitest` in this checkout. Mitigation: it now asks instead of passing; nothing is denied.

### D-005: `opensrc` leaves the repository, not the disk (Z-6)
**Decision:** Infrastructural decision. The `opensrc` script and dev dependency leave `package.json`; `package-lock.json` loses the root `devDependencies` entry and the `node_modules/opensrc` block (it has no dependencies of its own). Both files are edited by hand. `npm uninstall opensrc` is not used because it deletes `node_modules/opensrc/`, an untracked install the user may still run; `npm install` is not run either. `.opensrc/` stays ignored and untouched. The next `npm ci` or `npm install` the user runs prunes `node_modules/opensrc/`; that is their call.
**Instead of:** `npm install --package-lock-only`: it rewrites the lock from the registry and can touch unrelated entries, while the hand edit is two known spans.
**Risks:**
- **RISK-006** The lock and `package.json` disagree and the release workflow's `npm ci` fails. Mitigation: `npm ls --package-lock-only` must exit 0 after the edit (it exits 0 at HEAD).
- **RISK-007** Without `npm run opensrc` the user loses the `OPENSRC_HOME` wiring. Mitigation: the user sets `OPENSRC_HOME` once in the shell profile (the draft's R-3).

### D-006: `"type": "module"` (Z-7)
**Decision:** Infrastructural decision. `package.json` changes `"type": "commonjs"` to `"type": "module"`. Checked at HEAD: no tracked `.js`, `.cjs` or `.jsx` file exists; `dist/` holds none; the root `tsconfig.json` includes only `src` (without `src/mods`) and `test/support`, which hold no `.ts` file; the bench fixture has its own `package.json`. The only files whose format follows the package type are the mods' `.ts` and `.tsx` files and `test/repo/mod-contracts/claude-code.d.ts`. The mods run on Bun inside Claude Code (C-018), checked by the mods step of `npm test` (`claude plugin validate` and `claude plugin test`, no quota; `claude` 2.1.308 is on PATH here), and the contract fixture is type-checked by `test/repo/mod-contracts.test.mjs`.
**Instead of:** keeping `commonjs`: it is false for a package of `.mjs` and `.mts` files and makes any future `.js` file CommonJS by accident.
**Risks:**
- **RISK-008** A mod loads differently under the new type. Mitigation: phase 4 requires `mods: exit 0` in the `npm test` output, not `mods: skipped`.

### D-007 (r2): Agent memories refreshed and the leftovers committed (Z-8)
**Decision:** Infrastructural decision. Every file under `.claude/agent-memory/` was scanned on 2026-10-24 for backticked and bare paths that no longer exist, for `picket` verbs outside the registry and for hook names outside `src/lib/hooks.mts`, and each remaining claim about a moved module was re-read in its new home. Phase 5 lists the stale spots that scan found, each with its exact old and new text. Agents keep writing memories while the run goes on, so the set is not fixed: phase 5 starts by rescanning every modified or untracked file under `.claude/agent-memory/` as it stands then, and every stale citation the rescan finds is fixed the same way. The lead makes the edits and stages them together with every modified or untracked memory file at that time, `.claude/MEMORY.md` (the Procedure and Checklist glossary entries, checked current) and the late reviewer line in `work/20261023-refactor-item-05-hooks/verdicts.jsonl`. New text cites repository paths in full and only paths that exist, because `test/repo/markdown-paths.test.mjs` scans memory files, untracked ones included. The phase runs last, after `.gitignore` changes, because one memory cites a `.gitignore` line number.
**Instead of:** committing the memories as they are: four of them would keep sending agents to `src/lib/route.mjs`, `src/lib/verify.mjs` and other files that no longer exist.
**Risks:**
- **RISK-009** An edit cites a path the scan rejects and `npm test` turns red. Mitigation: phase 5 runs `npm test` after the lead's edits; no new text cites a `dist/` path in backticks.

## Scope

**In:**
- Z-1, Z-2, the rest of Z-3 and Z-4, Z-6, Z-7 and Z-8 as decided above.
- The adapter test assertion that depends on the `rework` harness.

**Out:**
- Z-5 (done in 4eab316) and the `dist/**` deny rules and `dist/` ignore line (done in item 01).
- Anything under `.opensrc/`, `tmp/`, `node_modules/` or the empty root `status/`, `session/`, `markdown/` and `core/` folders: untracked, left on disk.
- The comment at `bench/run.mjs:67` naming a `rework` worktree: stale before this item, so the `comments` rule leaves it.
- `.claude/agent-memory/` files that agents write after phase 5 commits.

## Phase 1: Benchmark results and the rework harness

**Touch set:**
- `bench/results/`: 15 tracked files removed
- `bench/lib/lanes.mjs`: drop `"rework"` at line 1
- `bench/test/adapters.test.mjs`: drop line 98, retitle line 94
- `bench/README.md`: example at line 28
- `bench/report.mjs`: delete stale comment at line 6

**Changes:**
- Remove with one escalated command, run alone: `PICKET_ESCALATE="item 09 phase 1, T-1.1" git rm -q` followed by these 15 paths under `bench/results/`: `baseline-trunk.log`, `comparison.md`, `phase5.err`, `phase5.log`, `plugin-2026-10-17.json`, `plugin-alpha.json`, `plugin-core.json`, `plugin-init-gate13.json`, `plugin-init.json`, `rework-2026-10-02.json`, `rework-before-hookfix.json`, `rework-clean-raw.json`, `rework-clean.json`, `rework-separate-core.json`, `rework.json`. The ignored files in that folder (`probe.json`, `smoke*.json`, `spend.log`) stay on disk.
- `bench/lib/lanes.mjs:1` becomes `const HARNESSES_WITH_LANES = ["plugin"];`.
- `bench/test/adapters.test.mjs`: delete the `run("rework", "design", "design")` assertion; the test title becomes `a plugin run is graded on its own lane names, a trunk run on trunk's`.
- `bench/README.md:28` becomes `node bench/report.mjs bench/results/baseline-trunk.json bench/results/plugin-2026-10-18.json --check`.
- `bench/report.mjs`: delete line 6 (`//   node bench/report.mjs bench/results/trunk.json bench/results/rework.json --check`); no other comment line changes.

**Done when:**
- **T-1.1** `git ls-files bench/results` prints exactly `ask-probe.json`, `baseline-trunk.json`, `comparison-clean.md` and `plugin-2026-10-18.json` under `bench/results/`.
- **T-1.2** `git grep -n rework -- bench ':!bench/results'` prints only `bench/run.mjs:67`.
- **T-1.3** `bench/README.md` line 28 names `plugin-2026-10-18.json`; `git diff HEAD -- bench/report.mjs` shows one deleted line and no added line.
- **T-1.4** `node bench/report.mjs bench/results/baseline-trunk.json bench/results/plugin-2026-10-18.json --check` exits 0 and prints the metric table.
- **T-1.5** `npm run bench:test` and `npm test` exit 0.

## Phase 2: Dead scripts, their patterns and three allow rules

**Touch set:**
- `src/lib/hooks/observe/drive/evidence.mts`: delete lines 50 to 53
- `.claude/bin/statusline.mjs`: removed by the lead
- `.claude/scripts/logdigest.mjs`: removed by the lead
- `.claude/settings.json`: three allow rules out, by the lead

**Changes:**
- Developer: in `evidence.mts`, delete the four lines after the `git` bookkeeping pattern in `NEUTRAL`: the comment `// The digest of a test log is a report about a suite run, not a drive.`, the `/logdigest\.mjs\b/,` entry, the comment `// The harness's own sweeps.` and the `/lint\.(write|contract)\.mjs\b/,` entry. The `git` pattern becomes the last entry; nothing else in the file changes.
- Lead, asked by the developer at the start of the phase: run `git rm -q .claude/bin/statusline.mjs .claude/scripts/logdigest.mjs` alone, and delete these three lines from `permissions.allow` in `.claude/settings.json`: `"Bash(node .claude/scripts/*)",`, `"Bash(npx vitest*)",`, `"Bash(npx eslint*)",`. `"Bash(npx tsc*)"` and the `deny` list stay as they are. The lead stages both changes; the developer lists the three `.claude/` paths on the block's Files line, the two scripts marked deleted.

**Done when:**
- **T-2.1** `evidence.mts` contains neither `logdigest` nor the `lint.(write|contract)` pattern, and `git diff HEAD -- src/lib/hooks/observe/drive/evidence.mts` shows four deleted lines and no added line.
- **T-2.2** `git ls-files .claude/bin .claude/scripts` prints nothing.
- **T-2.3** `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"` exits 0; `permissions.allow` has 22 entries, none naming `vitest`, `eslint` or `.claude/scripts`, and still `Bash(npx tsc*)`; `permissions.deny` is still `Edit(dist/**)`, `Write(dist/**)`.
- **T-2.4** After `npm run build`, importing `dist/lib/hooks/observe/drive/evidence.mjs` gives `isDriveCommand("npm test") === false`, `isDriveCommand("git commit -m x") === false` and `isDriveCommand("curl localhost:5000/orders") === true`.
- **T-2.5** `npm test` exits 0.

## Phase 3: `.gitignore` in three groups

**Touch set:**
- `.gitignore`: replaced whole with the D-003 block

**Changes:**
- Before editing, save `git status --porcelain --untracked-files=all` to the session scratchpad.
- Replace the file with the D-003 block exactly: three header lines, 18 entries, one blank line between groups, a final newline, no other line.

**Done when:**
- **T-3.1** `.gitignore` holds the D-003 block and nothing else; `grep -v '^$' .gitignore | sort | uniq -d` prints nothing.
- **T-3.2** `git check-ignore --no-index -q` exits 0 for each of `dist/x`, `node_modules/x`, `.opensrc/sources.json`, `.picket/state/x`, `bench/.cache/x`, `bench/.runs/x`, `bench/results/spend.log`, `bench/results/smoke-trunk.json`, `bench/results/probe.json`, `bench/fixture/node_modules/x`, `.worktrees/x`, `work/x/sources/a.md`, `.claude/settings.local.json`, `tmp/x`, `.claude/telemetry/ledger.jsonl`, `.claude/state/x`, `.claude/ledger/x`, `.claude/branching/x`.
- **T-3.3** `git status --porcelain --untracked-files=all` prints the saved lines plus ` M .gitignore` and the work item's own files, and nothing else.
- **T-3.4** `npm test` exits 0.

## Phase 4: `package.json` without `opensrc`, as a module

**Touch set:**
- `package.json`: type, script and dev dependency
- `package-lock.json`: two `opensrc` spans

**Changes:**
- `package.json`: `"type": "commonjs"` becomes `"type": "module"`; delete the `"opensrc"` line in `scripts` and the `"opensrc": "^0.7.2"` line in `devDependencies`, keeping the JSON valid.
- `package-lock.json`, by hand: delete `"opensrc": "^0.7.2",` from `packages[""].devDependencies` and the whole `"node_modules/opensrc": { ... },` entry. No `npm install`, `npm uninstall` or `npm ci`; `node_modules/` and `.opensrc/` are not touched.

**Done when:**
- **T-4.1** `package.json` has `"type": "module"` and neither file contains `opensrc`.
- **T-4.2** `npm ls --package-lock-only` exits 0.
- **T-4.3** `.opensrc/sources.json` and `node_modules/opensrc/package.json` still exist.
- **T-4.4** `npm test` exits 0 and its output has `mods: exit 0`, not `mods: skipped`.
- **T-4.5** `npm pack --dry-run --json` lists no `.js`, `.cjs` or `.jsx` file, and `node dist/bin/picket.mjs state 20261023-refactor-item-09-hygiene` prints the item's state.
- **T-4.6** `npm run bench:test` exits 0.

## Phase 5: Agent memories and the leftovers committed

**Touch set:**
- `.claude/agent-memory/`: rescan, edits, then every modified or untracked file staged
- `.claude/MEMORY.md`: staged as it is
- `work/20261023-refactor-item-05-hooks/verdicts.jsonl`: staged as it is

**Changes:** all edits by the lead, in `.claude/agent-memory/`.
- Rescan first (developer, read only): for every modified or untracked file under `.claude/agent-memory/` that `git status --porcelain --untracked-files=all` lists when the phase starts, check that each repository path it cites exists, that each `picket <verb>` is in `src/lib/verbs.mts`, and that each hook name is in `src/lib/hooks.mts`. Send the lead path, line, old and new text for each hit not listed below; new text cites existing paths in full. Then the edits found on 2026-10-24, line numbers as at 21384cd:
- `picket-architect/block-format-couplings.md` line 3: `(pr.mjs finding lines,` becomes `(pullrequest threads.mts finding lines,`. Line 10: the text before ` by position,` becomes ``- `FINDING` in `src/lib/verbs/pullrequest/threads.mts` parses reviewer finding lines as `- [Severity] path:line: text` (or with a spaced dash before the text)``. Line 11 becomes ``- `parseBlock` in `src/lib/shared/work/block.mts` reads field labels with `FIELD_LABEL` (`Root cause` or one capitalised word), so any other two-word label is not a field until `FIELD_LABEL` changes.`` Line 13: `CLAUDE.md was 2043 of 2048 bytes` becomes `CLAUDE.md was 2046 of 2048 bytes on 2026-10-24`.
- `picket-architect/MEMORY.md` line 10: `pr.mjs parses finding lines by position, packet one-word labels, CLAUDE.md 2043/2048 bytes` becomes `PR finding lines parse by position, packet one-word labels, CLAUDE.md 2046/2048 bytes`.
- `picket-architect/record-edits-ride-phase-commits.md` line 8: ``(src/lib/route.mjs, `add: [work/${id}]`)`` becomes ``(`src/lib/verbs/route/commit.mts`, `add: [workRel(id)]`)``.
- `picket-architect/verify-grep-patterns.md` line 8: ``as `new RegExp(pattern, "m")` (src/lib/verify.mjs)`` becomes ``as `new RegExp(pattern, flags ?? "m")` (`src/lib/verbs/verify/index.mts`)``.
- `picket-architect/mts-conversion-facts.md`: delete line 12 (the `test/support/kernel-sources.mts` sentence; that file now scans `.mjs` and `.mts`) and the blank line after it.
- `picket-architect/hook-path-couplings.md` line 11 becomes ``- `test/kernel/extensions.test.mjs` picks guard start files from the guard hook folders since item 05; its old `^guard\..+\.mjs$` filter still runs beside that and matches nothing.`` Line 13: `line 209` becomes `line 259`.
- `picket-architect/skill-base-directory-facts.md` line 8: ``Agents read skill files at `core/skills/...` or, in this repo, `src/skills/...`, guided by`` becomes ``Since item 01, `npm run claude` passes `--plugin-dir dist` (`scripts/claude.mjs`), so the base line now names the built dist skills folder instead of core (inferred from the launcher, not re-read in a transcript). Agents read skill files in the plugin root's skills folder or, in this repo, under `src/skills/`, guided by``.
- `picket-architect/claude-cli-plugin-facts.md` line 20 becomes ``- The release CI runner has no Claude Code CLI, so the mods step of `npm test` (`scripts/test.mjs`) skips when `claude` is not on PATH.``
- `picket-architect/state-folder-facts.md` line 8: `(line 29, checked 2026-10-18)` becomes `(runtime and scratch group, checked 2026-10-24)`.
- `picket-developer/new-files-pass-check-then-fail.md` line 8: `with test/kernel/yaml-lite-corpus.json, which` becomes ``with the yaml-lite corpus fixture (now `src/lib/util/yaml-lite-corpus.test.json`), which``.
- `picket-reviewer/review-summary-drops-claude-paths.md` line 3 becomes `description: picket summary omits .claude/, work/, .picket/ and artifacts/ paths, so changed_files misses settings, rule and agent-memory edits in this repo`. Line 8 becomes ``Since refactor item 01 the product lives in `src/`, but `picket summary` still drops every path under `.claude/`, `work/`, `.picket/` and `artifacts/` by design (`isNonProduct` in `src/lib/shared/git.mts`), so this repo's settings, rule and agent-memory edits never reach `changed_files`.``
- Then the lead stages `.claude/agent-memory/`, `.claude/MEMORY.md` and `work/20261023-refactor-item-05-hooks/verdicts.jsonl`; the developer runs the checks and lists those three paths on the block's Files line.

**Done when:**
- **T-5.1** The phase 5 greps pass, and `git grep -nE "src/lib/route\.mjs|src/lib/verify\.mjs|harness review-summary|kernel/yaml-lite-corpus|line 29|line 209|2043" -- .claude/agent-memory` prints nothing.
- **T-5.2** `git status --porcelain -- .claude/agent-memory .claude/MEMORY.md work/20261023-refactor-item-05-hooks` shows every entry staged (first column `A` or `M`, second column blank) and no `??` line.
- **T-5.3** `npm test` exits 0, `test/repo/markdown-paths.test.mjs` included.
- **T-5.4** After the approval commit, the same `git status` command prints nothing, and the commit holds only paths under `.claude/agent-memory/`, `.claude/MEMORY.md`, `work/20261023-refactor-item-05-hooks/verdicts.jsonl` and `work/20261023-refactor-item-09-hygiene/`.
- **T-5.5** The block names each file the rescan covered and each extra edit it led to, or says it found none.

## Open questions

none

## Revision log

- 2026-10-24: D-007 (r2): fixed edit and memory counts replaced by a rescan of every modified or untracked memory when phase 5 starts; agents keep writing memories.
