---
kind: order
lane: order
title: Fix plugin packaging review follow-ups
date: 2026-10-07
audience: developer
sources: request; cumulative review of 20261006-package-core-as-the-plugin-design; core/skills/documenting/scripts/filename.mjs; core/lib/paths.mjs; core/lib/hooks/observe.drive.mjs; core/lib/hooks/guard.bash.mjs; core/lib/drive-evidence.mjs; core/skills/benchmarking/SKILL.md; core/bin/tether; core/agents/developer.md; core/skills/expediting/steps/30-check.md; bench/.runs/events/gate-13-api-key-auth-r1-muy8wys9.jsonl; test/skills/filename.test.mjs; test/hooks/hooks.test.mjs
phases:
  - n: 1
    files:
      - core/skills/documenting/scripts/filename.mjs
      - core/lib/kernel-call.mjs
      - core/lib/hooks/observe.drive.mjs
      - core/lib/hooks/guard.bash.mjs
      - test/skills/filename.test.mjs
      - test/hooks/hooks.test.mjs
    greps:
      - path: core/skills/documenting/scripts/filename.mjs
        pattern: projectRoot\(\)
      - path: core/lib/hooks/observe.drive.mjs
        pattern: kernel-call\.mjs
      - path: core/lib/hooks/guard.bash.mjs
        pattern: kernel-call\.mjs
    tests: true
    drive: true
  - n: 2
    files:
      - core/skills/benchmarking/SKILL.md
      - core/bin/tether.mjs
      - core/lib/packet.mjs
      - core/lib/unsafe.mjs
      - core/lib/work.mjs
      - core/lib/repos.mjs
      - core/lib/review.mjs
      - core/lib/sources.mjs
      - core/lib/pr.mjs
      - .gitignore
    greps:
      - path: core/skills/benchmarking/SKILL.md
        pattern: --harness plugin\|trunk
      - path: core/skills/benchmarking/SKILL.md
        pattern: compare plugin and trunk
      - path: .gitignore
        pattern: ^spike/\.runs/$
    tests: true
    drive: false
  - n: 3
    files:
      - core/agents/developer.md
      - core/skills/expediting/steps/30-check.md
    greps:
      - path: core/agents/developer.md
        pattern: exit 126
      - path: core/skills/expediting/steps/30-check.md
        pattern: exit 126
    tests: true
    drive: false
---
# Order: Fix plugin packaging review follow-ups

## Problem

The cumulative review of 20261006-package-core-as-the-plugin-design left six follow-ups. Two are real defects in installed projects: `filename.mjs` finds the project four folders above itself, which is the plugin cache once the plugin is installed, so SDR and ADR numbering restarts at 00001; and `observe.drive` treats any word `tether` after a space as a kernel call, so `cd ~/src/tether && npm start` is logged as inspection and the drive is lost. The rest is hygiene (stale `rework` usage, comments naming `harness` verbs, an unignored `spike/.runs/`) and one undiagnosed exit 126, diagnosed below as environmental.

## Decisions

### D-001: filename.mjs takes the root from projectRoot()
**Decision:** `filename.mjs` imports `projectRoot` from `core/lib/paths.mjs` (relative `../../../lib/paths.mjs`) and scans `artifacts/adr`, `artifacts/plans` and `artifacts/strategy/decisions` under `projectRoot()`. That honours `CLAUDE_PROJECT_DIR` first and otherwise walks up from the cwd to the first folder holding `.tether/` or `.claude/`, the same root every kernel verb uses. The comment at lines 11 to 14 describes the old anchor, so it is deleted with `REPO_ROOT`.
**Instead of:** a plain `process.cwd()` scan: run from `src/`, it finds no `artifacts/` and restarts numbering at 00001, the exact bug the old comment warned about.
**Risks:**
- **RISK-001** A project with neither marker nor `CLAUDE_PROJECT_DIR` gets the cwd as root. Mitigation: the same fallback every kernel verb has; `tether init` writes `.tether/`.

### D-002: one kernel-call test, shared by guard.bash and observe.drive
**Decision:** New module `core/lib/kernel-call.mjs` exports `kernelVerbStart(words)`, moved from `guard.bash.mjs` with `normalizeRoot`, `KERNEL_LAUNCHER` and `KERNEL_SCRIPT`. It first skips leading `NAME=value` words, then returns the index after `tether` (any path, `.exe` or not) or after `node <path>/{tether,harness}.mjs`, else `null`. `guard.bash.mjs` calls it on the shell-quote tokens of each segment. `observe.drive.mjs` drops `KERNEL_CALL`, splits the command into segments on `&&`, `||`, `;` and `|` (as `isDriveCommand` does), strips leading `(` and `{`, splits each on whitespace, strips surrounding quotes from each word, and counts the command as a kernel call when any segment's words pass. Example: `cd ~/src/tether && npm start` gives segments `cd ~/src/tether` and `npm start`, neither starts with the launcher, so the row is `drive`; `API_KEY=k tether drive --hit "GET /h"` is a kernel call, so the row stays `inspect`.
**Instead of:** anchoring the `KERNEL_CALL` regex inside observe.drive: a second definition of "kernel call" is how the two hooks drifted apart in the first place.
**Risks:**
- **RISK-002** Skipping env assignments makes guard.bash scan wrapped commands it used to miss, so `FOO=1 tether drive --run "rm -rf src"` now denies. Mitigation: that is the fail-closed direction; a test keeps the benign `tether drive --run "npm run cli -- list"` at no decision.

### D-003: stale comments are deleted, never reworded
**Decision:** Each comment that names an old `harness` verb is deleted, as the comments rule requires. Where the verb sits inside a prose block or a JSDoc block, the whole block goes, since a block with one sentence cut out reads wrong. Where it is one entry of a list-style file-layout block, only that entry goes (plus a `//` spacer line left dangling).
**Instead of:** replacing `harness` with `tether` in place: the rule forbids rewording an existing comment.

### D-004: exit 126 is a Windows process-start denial, so the launcher stays and the drive guidance changes
**Decision:** The gate-13 failures were not the launcher. Bisecting the failing `tether drive --run` argument showed that Windows refuses to start `node.exe` whenever its command line carries `execSync}=require('child_process');const k='test-key-123';const p=spawn(`: `node -e "process.exit(0)" "<that text>"` fails with exit 126 and `Permission denied` from Git Bash with no launcher involved, and PowerShell gets `Access is denied` from CreateProcess. Each fragment alone starts fine, which points at endpoint protection matching the command line. Since `tether drive --run` puts its argument on a command line twice (the launcher's `node` and the drive's shell), no launcher change can avoid it. The fix is guidance: a drive longer than one simple command goes in a script file under the OS temp folder and runs as `tether drive --run "node <file>"`, and exit 126 with `Permission denied` on node means "move the code into a file", not "debug the launcher". The sentence goes where each lane already reads the drive procedure: `core/agents/developer.md` step 3 (order and design lanes) and `core/skills/expediting/steps/30-check.md` (fast lane, main session, which never reads the developer shell).
**Instead of:** rewriting `core/bin/tether` (a `.cmd` shim, or passing arguments through the environment): the drive's own shell still receives the command text on its command line, so the denial comes back one process later.
**Risks:**
- **RISK-003** The policy may match other inline code too. Mitigation: the guidance keys on the symptom (exit 126, `Permission denied` on node), not on the one pattern found.

## Scope

**In:** the six follow-ups named in the request, with tests for the two code defects.
**Out:** any change to `core/bin/tether`; the endpoint-protection policy itself; `npm run tether -- <verb>` detection in observe.drive (agents call `tether` from PATH).

## Phase 1: Project root and kernel-call detection

**Touch set:**
- `core/skills/documenting/scripts/filename.mjs`: root from projectRoot()
- `core/lib/kernel-call.mjs`: shared kernel-call test
- `core/lib/hooks/observe.drive.mjs`: segment-anchored kernel call
- `core/lib/hooks/guard.bash.mjs`: import the shared test
- `test/skills/filename.test.mjs`: numbering in an installed project
- `test/hooks/hooks.test.mjs`: drive and guard cases

**Changes:** D-001 in `filename.mjs`: import `projectRoot`, replace every `REPO_ROOT` with one `const root = projectRoot()`, delete `REPO_ROOT` and the comment at lines 11 to 14. D-002: create `core/lib/kernel-call.mjs`, move `normalizeRoot`, `KERNEL_LAUNCHER`, `KERNEL_SCRIPT` and `kernelVerbStart` there with the env-assignment skip, import it in `guard.bash.mjs` (whose `wrappedCommands` keeps using the returned index), and replace `KERNEL_CALL` in `observe.drive.mjs` with the segment test. Tests run the script and the hooks as child processes with `CLAUDE_PROJECT_DIR` removed from the child env unless the case sets it.

**Done when:**
- **T-1.1** In a temp project holding `.tether/` and `artifacts/strategy/decisions/00003-x.md`, `node core/skills/documenting/scripts/filename.mjs sdr "pricing"` prints `00004-pricing` with the cwd at the project root and with the cwd at `<project>/src`, `CLAUDE_PROJECT_DIR` unset.
- **T-1.2** The same command run from an unrelated cwd with `CLAUDE_PROJECT_DIR=<project>` prints `00004-pricing`.
- **T-1.3** `filename.mjs` contains no `REPO_ROOT` and no comment mentioning `.claude/skills/documenting/scripts`.
- **T-1.4** observe.drive logs `kind: "drive"` for `cd ~/src/tether && npm start` and `kind: "inspect"` for `tether next x`, `cd repo && tether check`, `API_KEY=k tether drive --hit "GET /h"` and `node core/bin/tether.mjs state x`.
- **T-1.5** guard.bash denies `FOO=1 tether drive --run "rm -rf src"`; the existing cases at `test/hooks/hooks.test.mjs:335` to `:354` keep their decisions.
- **T-1.6** `KERNEL_CALL` appears nowhere under `core/`, and `kernelVerbStart` is defined only in `core/lib/kernel-call.mjs`.
- **T-1.7** `npm test` passes.

## Phase 2: Benchmarking usage, stale comments, ignore spike runs

**Touch set:**
- `core/skills/benchmarking/SKILL.md`: plugin|trunk, not rework
- `core/bin/tether.mjs`: delete line 103 comment
- `core/lib/packet.mjs`: delete header and JSDoc blocks
- `core/lib/unsafe.mjs`: delete lines 1 to 3
- `core/lib/work.mjs`: delete request.md entry
- `core/lib/repos.mjs`: delete repos.yaml entry
- `core/lib/review.mjs`: delete JSDoc at 145 to 149
- `core/lib/sources.mjs`: delete JSDoc at 270 to 274
- `core/lib/pr.mjs`: delete JSDoc at 113 to 117
- `.gitignore`: ignore `spike/.runs/`

**Changes:** In `SKILL.md`, the description's `"compare trunk and rework"` becomes `"compare plugin and trunk"` and line 17's `[--harness trunk|rework]` becomes `[--harness plugin|trunk]`, matching `HARNESSES` in `bench/run.mjs`. Per D-003: delete `tether.mjs:103`; `packet.mjs` lines 1 to 5 and the JSDoc at 132 to 135; `unsafe.mjs` lines 1 to 3; `work.mjs` line 10; `repos.mjs` lines 4 to 6 (the spacer and the two-line `repos.yaml` entry); and the JSDoc blocks at `review.mjs:145-149`, `sources.mjs:270-274`, `pr.mjs:113-117`. Re-read each block before deleting; line numbers are as of `f2b0c9d`. Add `spike/.runs/` to `.gitignore` next to `bench/.runs/`.

**Done when:**
- **T-2.1** `grep -rnE "^\s*(//|\*|/\*\*).*\bharness (new|set|next|state|route|packet|drive|check|pr)\b" core --include=*.mjs` prints nothing.
- **T-2.2** `grep -n rework core/skills/benchmarking/SKILL.md` prints nothing, and line 17 reads `[--harness plugin|trunk]`.
- **T-2.3** `git status --porcelain spike/` prints nothing while `spike/.runs/` exists on disk.
- **T-2.4** `git diff --stat` for the eight `.mjs` files shows deletions only.
- **T-2.5** `npm test` passes.

## Phase 3: Drive guidance for the exit-126 denial

**Touch set:**
- `core/agents/developer.md`: script-file drives, exit 126 meaning
- `core/skills/expediting/steps/30-check.md`: same guidance, fast lane

**Changes:** Per D-004, after the `tether drive` sentence in `developer.md` step 3 and after the drive code block in `30-check.md`, add the same short paragraph: a drive longer than one simple command goes in a script file under the OS temp folder (for example `$TEMP/tether-drive.mjs`) and runs as `tether drive --run "node <file>"`, never as inline `node -e` code; exit 126 with `Permission denied` on node means the machine refused that command line, so move the code into a file instead of debugging the launcher. No change to `core/bin/tether`.

**Done when:**
- **T-3.1** On this machine in Git Bash, `node -e "process.exit(0)" "execSync}=require('child_process');const k='test-key-123';const p=spawn("` exits 126, while `node <file>` for a file holding that same text as a string literal exits 0; the developer quotes both exit codes in the phase block.
- **T-3.2** `core/agents/developer.md` and `core/skills/expediting/steps/30-check.md` each name exit 126, `Permission denied`, and `tether drive --run "node <file>"`.
- **T-3.3** `git diff --stat f2b0c9d -- core/bin/tether` prints nothing.
- **T-3.4** `npm test` passes, including `test/budgets.test.mjs` for the edited agent and step file.

## Open questions

- **OQ-001** Which product enforces the process-start denial (Defender attack surface reduction or another endpoint agent), and can bench runs get an exclusion? Owner: user. Fallback: Phase 3's guidance ships either way; bench tasks that drive with inline code keep failing on this machine until then.

## Revision log
