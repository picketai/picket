---
kind: order
lane: order
title: Prepare the package for the next release
date: 2026-10-17
audience: developer
sources: [work/20261017-prepare-the-package-for-the-next-release/request.md, package.json, .github/scripts/release.mjs, .github/workflows/release.yml, core/bin/picket, core/bin/picket.mjs, core/lib/init.mjs, core/lib/paths.mjs, core/lib/escalation.mjs, core/lib/verify.mjs, core/hooks/hooks.json, core/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, .claude/scripts/lint.craft.mjs, core/skills/reviewing/steps/10-alignment.md, core/skills/reviewing/templates/patterns.md, core/skills/branching/templates/manifest.example.yaml, test/kernel/cli.test.mjs, test/kernel/plugin-layout.test.mjs, test/markdown-paths.test.mjs, test/budgets.test.mjs, README.md, docs/how-to.md, CONTRIBUTING.md, bench/README.md, npm pack --dry-run --json, git ls-files --eol, git log v1.0.0-alpha.1..HEAD]
phases:
  - n: 1
    files: [package.json, .gitattributes, core/bin/picket, core/skills/branching/templates/manifest.example.yaml, core/skills/reviewing/scripts/lint.craft.mjs, core/skills/reviewing/steps/10-alignment.md, core/skills/reviewing/templates/patterns.md, test/kernel/plugin-layout.test.mjs]
    greps:
      - path: package.json
        pattern: '"node": ">=20"'
      - path: package.json
        pattern: '"!\*\*/\*\.test\.\*"'
      - path: .gitattributes
        pattern: '^core/bin/picket text eol=lf\b'
      - path: core/skills/branching/templates/manifest.example.yaml
        pattern: 'git_dir: ~/code/umbrella/src/ExampleApiSvc/\.git'
      - path: core/skills/branching/templates/manifest.example.yaml
        pattern: '^(?![\s\S]*D:/workspace)'
        flags: i
      - path: core/skills/reviewing/scripts/lint.craft.mjs
        pattern: '\.\./\.\./\.\./lib/comments\.mjs'
      - path: core/skills/reviewing/steps/10-alignment.md
        pattern: 'CLAUDE_PLUGIN_ROOT\}/skills/reviewing/scripts/lint\.craft\.mjs'
      - path: core/skills/reviewing/templates/patterns.md
        pattern: 'CLAUDE_PLUGIN_ROOT\}/skills/reviewing/scripts/lint\.craft\.mjs'
    tests: true
    drive: true
  - n: 2
    files: [core/bin/picket.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: core/bin/picket.mjs
        pattern: 'usage: picket <verb>'
      - path: test/kernel/cli.test.mjs
        pattern: '"--version"'
      - path: test/kernel/cli.test.mjs
        pattern: '"--help"'
    tests: true
    drive: true
  - n: 3
    files: [README.md, docs/how-to.md, CONTRIBUTING.md, bench/README.md]
    greps:
      - path: README.md
        pattern: 'twelve hooks'
      - path: README.md
        pattern: 'picket-markdown'
      - path: README.md
        pattern: 'comparison-clean\.md'
      - path: README.md
        pattern: '^(?![\s\S]*rework-plan-2026-09-07)'
        flags: i
      - path: docs/how-to.md
        pattern: '2\.1\.302'
      - path: docs/how-to.md
        pattern: 'eight things'
      - path: docs/how-to.md
        pattern: 'picket-session@picketai'
      - path: docs/how-to.md
        pattern: 'PICKET_ESCALATE'
      - path: CONTRIBUTING.md
        pattern: '`refactor`'
      - path: CONTRIBUTING.md
        pattern: 'test:markdown'
      - path: bench/README.md
        pattern: 'approver-mcp'
    tests: true
    drive: false
---
# Order: Prepare the package for the next release

## Problem

`@picketai/picket` 1.0.0-alpha.1 shipped on 2026-10-10 and 84 commits have landed since. Today's `npm pack --dry-run` lists 222 entries, six of them test files from the mods (`status/hooks/band.test.ts`, `format.test.ts`, `register.test.tsx`, `session/hooks/format.test.ts`, `sessions.test.ts`, `markdown/hooks/picket-markdown.test.tsx`). Two shipped reviewing files cite `node .claude/scripts/lint.craft.mjs`, a script that exists only in this repository. `core/bin/picket` is LF in the index but CRLF in this working copy (`git ls-files --eol`: `i/lf w/crlf attr/`), so a pack from this machine ships a broken `#!/bin/sh` line. The branching manifest example ships `D:/workspace/github/AISpec/...`. `picket --help`, `picket help` and `picket --version` exit 1 with `unknown verb ""` (`core/bin/picket.mjs:379`). README, how-to, CONTRIBUTING and the bench README describe alpha.1, not the code. The binding constraints are that `npm test` stays green (budgets, Markdown paths, plugin layout), nothing under `core/` imports from outside `core/`, and nothing is published or tagged by this work.

## Decisions

### D-001: Test files drop out through one negation in `files`
**Decision:** `package.json` gains `"engines": { "node": ">=20" }` and a last `files` entry `"!**/*.test.*"`. npm-packlist reads a `!` entry as an exclusion across every included folder; a probe package on npm 10.4.0 packed `core/x/a.mjs` and `status/hooks/b.ts` and left out `core/x/a.test.mjs` and `status/hooks/b.test.tsx`. `test/kernel/plugin-layout.test.mjs` asserts both keys in its existing npm package test, so a later edit cannot drop them silently.
**Instead of:** an `.npmignore` in each mod folder: three files to keep in step for one rule, and their effect under a `files` entry is harder to read than one pattern beside the list it trims.
**Risks:**
- **RISK-001** CI publishes with npm 11.21.0, not the 10.4.0 the probe used. Mitigation: the release workflow's manual run ends in `npm publish --dry-run`, which prints the file list; CONTRIBUTING (phase 3) says to read it for `.test.` before tagging.

### D-002: lint.craft.mjs moves into the reviewing skill as a plain file move
**Decision:** `git mv .claude/scripts/lint.craft.mjs core/skills/reviewing/scripts/lint.craft.mjs`, then one edit: the import `../../core/lib/comments.mjs` becomes `../../../lib/comments.mjs`, which the plugin layout test ("every import under core/ is a Node built-in or a path inside core/") already checks. The usage comment block (lines 33 to 40) names the old path, so under the `comments` rule it goes stale and is deleted, never reworded; every other existing comment stays. Both citations become `node "${CLAUDE_PLUGIN_ROOT}/skills/reviewing/scripts/lint.craft.mjs" --range <range>`, the quoted form `documenting/scripts/filename.mjs` already uses. No test, script or doc outside those two files names the script (`git grep lint.craft` over tracked files, records excluded).
**Instead of:** a `picket lint-craft` verb: a new verb adds a CLI surface and touches the guard's verb sets for a reviewer-only instrument the request asks to move, not to promote.
**Risks:**
- **RISK-002** The moved file carries about 40 existing comment lines into the npm package. Mitigation: none in this order; the `comments` rule keeps existing comments, and a cleanup is a separate request.

### D-003: Help and version are flags read before any verb, version from the plugin manifest
**Decision:** At the top of `main`, before root resolution and the verb switch: `"version" in opt` prints the `version` of `core/.claude-plugin/plugin.json` (found through `pluginRoot()` in `core/lib/paths.mjs`) as plain text plus a newline and returns 0; `"help" in opt`, the verb `help`, or no verb at all prints a usage block and returns 0. The `in` test matters because `parse` gives `--help next` the value `next`. Usage is plain text on stdout: the line `usage: picket <verb> [args] [--pretty | --human]`, the verb list, and `picket --version`. The verb list becomes one module constant used by both the usage block and the existing unknown-verb error, so the two cannot drift. An unknown verb keeps exit 1 and its stderr message.
**Instead of:** reading `package.json`: the plugin cache copy holds only `core/` (the marketplace source is `./core`), so `../../package.json` is missing there, while the plugin layout test already pins the two versions equal.

### D-004: .gitattributes pins only the shell launcher to LF
**Decision:** A new `.gitattributes` holds one line, `core/bin/picket text eol=lf`. Because the index already holds LF, the developer rewrites this working copy's bytes to LF (for example a `node -e` that replaces CRLF), so `git status` shows no change to the file and only `.gitattributes` is staged. The exec bit is not an attribute: the file is 100755 in git (already tested), the release workflow packs on Linux from a checkout, and CONTRIBUTING (phase 3) says to publish only from that workflow because a pack on Windows drops the bit.
**Instead of:** `* text=auto eol=lf`: it renormalises every tracked file, a tree-wide diff that buries the release changes and touches files this order never reads.

### D-005: The docs describe the code as it is, with the release news in README's Status
**Decision:** README is the npm page, so its `## Status` replaces the rework-against-trunk paragraph with: alpha on npm under the `alpha` dist-tag, a short list of what is new since 1.0.0-alpha.1, and the pointer to `bench/results/comparison-clean.md` with its headline numbers. how-to, CONTRIBUTING and the bench README are corrected line by line against `core/lib/init.mjs`, `core/bin/picket.mjs`, `core/lib/escalation.mjs` and `ls bench bench/lib`. No CHANGELOG is written (OQ-001).
**Instead of:** a CHANGELOG.md beside the README list: a second copy of the same facts, and the project keeps one copy of every fact.

## Scope

**In:** the six package fixes, `picket --help`, `help`, bare `picket` and `--version`, the four documents named in the request.
**Out:** the version bump and tag (`npm version` at release time), publishing, `picket migrate` for the legacy `.claude/ledger` and `.claude/branching/manifest.yaml`, `bench/results/plugin-2026-10-17.json` (never staged or touched), short flags `-h` and `-v`, per-verb help, a CHANGELOG.

## Phase 1: Package contents

**Touch set:**
- `package.json`: engines and test-file negation
- `.gitattributes`: new, LF for the launcher
- `core/bin/picket`: working copy rewritten to LF
- `core/skills/branching/templates/manifest.example.yaml`: three local `git_dir` paths
- `.claude/scripts/lint.craft.mjs`: moved away with `git mv`
- `core/skills/reviewing/scripts/lint.craft.mjs`: new home, import fixed
- `core/skills/reviewing/steps/10-alignment.md`: line 62 cites plugin path
- `core/skills/reviewing/templates/patterns.md`: line 81 cites plugin path
- `test/kernel/plugin-layout.test.mjs`: asserts engines and negation

**Changes:** D-001 in `package.json` and the npm package test ("the npm package ships the plugin and its marketplace..."). D-004 `.gitattributes` and the LF rewrite of `core/bin/picket`. In `manifest.example.yaml` lines 22, 27 and 32, `D:/workspace/github/AISpec/src/<Name>/.git` becomes `~/code/umbrella/src/<Name>/.git`. D-002 move, import edit, usage-comment deletion, and the two citation edits; each edit replaces only the command span, so `10-alignment.md` stays at 62 lines.

**Done when:**
- **T-1.1** `npm pack --dry-run --json` lists no path containing `.test.`, still lists `status/hooks/band.ts`, and lists `core/skills/reviewing/scripts/lint.craft.mjs`.
- **T-1.2** `package.json` holds `"engines": { "node": ">=20" }` and `"!**/*.test.*"` as its last `files` entry, and the plugin layout test asserts both.
- **T-1.3** `git ls-files --eol core/bin/picket` prints `i/lf w/lf attr/text eol=lf`, `git status --short core/bin/picket` prints nothing, and the launcher test still reads mode 100755.
- **T-1.4** `git grep -n "D:/workspace" -- core status session markdown` prints nothing.
- **T-1.5** `.claude/scripts/lint.craft.mjs` no longer exists, and `node core/skills/reviewing/scripts/lint.craft.mjs --range HEAD~5..HEAD --json` prints the same JSON the old path printed for that range before the move.
- **T-1.6** `git grep -n "scripts/lint.craft" -- core` shows only the two `${CLAUDE_PLUGIN_ROOT}` citations, and `CLAUDE_PLUGIN_ROOT=core node "${CLAUDE_PLUGIN_ROOT}/skills/reviewing/scripts/lint.craft.mjs" --range HEAD~1..HEAD` exits 0 or 1, never 2.
- **T-1.7** `npm test` passes, budgets, Markdown paths and plugin layout included.

## Phase 2: Help and version

**Touch set:**
- `core/bin/picket.mjs`: usage, version, shared verb list
- `test/kernel/cli.test.mjs`: tests beside the usage-error test

**Changes:** D-003 in `main` and one verb-list constant that the `default:` branch at line 379 reuses. New tests in `test/kernel/cli.test.mjs` spawn `node core/bin/picket.mjs` with `spawnSync` and read status, stdout and stderr; the version test compares against `core/.claude-plugin/plugin.json`, never a literal.

**Done when:**
- **T-2.1** `picket --version` prints `1.0.0-alpha.1` and a newline on stdout, nothing on stderr, and exits 0, also when run from a temp directory outside any project.
- **T-2.2** `picket --help`, `picket help` and bare `picket` each print a block whose first line is `usage: picket <verb> [args] [--pretty | --human]` and which names every verb, on stdout, and exit 0.
- **T-2.3** `picket next --help` and `picket --help next` print the same usage and exit 0 without running `next`.
- **T-2.4** `picket bogus` still exits 1 with `unknown verb "bogus"` and the same verb list on stderr; the existing "usage errors exit 1" test passes unchanged.
- **T-2.5** The verb list appears once in `core/bin/picket.mjs`.
- **T-2.6** The new tests cover T-2.1 to T-2.4 and `npm test` passes.

## Phase 3: Documentation matches the code

**Touch set:**
- `README.md`: hooks, marketplace, layout, Status
- `docs/how-to.md`: mods, init, update, removal, reference
- `CONTRIBUTING.md`: init, tests, commits, releasing
- `bench/README.md`: lib and layout

**Changes:** D-005. README: line 34 "eleven hooks" becomes "twelve hooks" (`core/hooks/` holds 12 `.mjs` files, all in `hooks.json`); line 37 names the four plugins of the `picketai` marketplace with their folders (`picket` from `./core`, `picket-status` from `./status`, `picket-session` from `./session`, `picket-markdown` from `./markdown`); Layout adds `status/`, `session/`, `markdown/` and `core/themes/` with `core/lib/styling/` (what `picket setup-terminal` installs); Status as in D-005, listing `picket setup-terminal`, `picket uninstall`, `picket statusline`, `picket leave`, `picket next --latest`, `picket:explaining`, PowerShell commands in `guard.bash`, picket-status and picket-markdown installed by `init`, and picket-session as opt-in.

how-to: "What you get" names the two mods `init` installs and how to add picket-session (`claude plugin install picket-session@picketai --scope project`). Install: `picket --version` shows the command is on `PATH`. `init` does eight things: step 4 adds the ask rules `PowerShell(picket drive *)` and `PowerShell(picket check *)`, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` set to `"1"`, and `statusLine` `picket statusline` unless project, local or user settings already set one; steps 7 and 8 install `picket-status@picketai` and `picket-markdown@picketai`. `--no-install` prints each of the four install steps as `skipped`; the run-by-hand commands appear only when an install command fails. Tested Claude Code becomes 2.1.302. Updating and Removing gain the two mods' `claude plugin update` and `claude plugin uninstall` lines (picket-session when installed) and the `statusLine` and `env` entries to delete. The `guard.bash` troubleshooting row covers PowerShell commands too: in the default, acceptEdits and auto modes the agent reruns the command as `PICKET_ESCALATE="<why>" <command>` and you decide in the dialog, and cleanup is recorded with `picket leave` and listed when the item closes. Quick reference adds `/picket:explaining`, `picket setup-terminal` and `picket uninstall`.

CONTRIBUTING: the init paragraph matches how-to (status line, env flag, three plugins, `--no-install` skips the four `claude` commands, undo includes the two mods); Tests names `npm run test:status`, `test:session` and `test:markdown`; commit types add `refactor`; Releasing says `npm version` syncs `package.json` into the four plugin manifests through `.github/scripts/release.mjs sync-version`, to check `.test.` is absent from the dry-run file list, and to publish only from the workflow (D-004). bench/README: the `lib/` line lists the ten files of `bench/lib/` and the tree adds `test/`, `integration/`, `probe-ask.mjs` and `selfcheck.mjs`.

**Done when:**
- **T-3.1** README says "twelve hooks", names the four marketplace plugins and the three mod folders, and its Status names the `alpha` dist-tag, the items above and `bench/results/comparison-clean.md`, without `rework-plan-2026-09-07`.
- **T-3.2** how-to says `init` does eight things, its step list matches `core/lib/init.mjs` (settings keys, four install steps), its `--no-install` sentence matches `renderInit` output, and it names 2.1.302.
- **T-3.3** how-to's update and removal blocks name `picket-status@picketai` and `picket-markdown@picketai`, and its quick reference holds the three new rows.
- **T-3.4** CONTRIBUTING lists `refactor`, the three mod test scripts, four plugin manifests and `sync-version`.
- **T-3.5** Every file named on bench/README's `lib/` line exists in `bench/lib/`, and all ten are named.
- **T-3.6** No added line in the four files holds an em or en dash, and `npm test` passes (Markdown paths and names tests included).

## Open questions

- **OQ-001** Should the release carry a CHANGELOG.md for the 84 commits since v1.0.0-alpha.1? Owner: user. Fallback: none is written; README's Status carries the list of what is new.

## Revision log
