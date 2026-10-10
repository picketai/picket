---
kind: order
lane: order
title: Drop ccstatusline from project settings
date: 2026-10-10
audience: developer
sources: [request.md, .claude/settings.json, .claude/ccstatusline.json, .claude/bin/statusline.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/init.test.mjs, bench/test/adapters.test.mjs, core/lib/init.mjs, core/lib/verify.mjs]
phases:
  - n: 1
    files: [.claude/settings.json, .claude/bin/statusline.mjs]
    greps:
      - path: .claude/settings.json
        pattern: '"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"\s*\},\s*"permissions"'
      - path: .claude/bin/statusline.mjs
        pattern: 'from disk\.\r?\n// Standalone, with no ccstatusline in the picture, still works:'
    tests: true
    drive: false
---
# Order: Drop ccstatusline from project settings

## Problem

`.claude/settings.json:5` wires the project status line to `npx -y ccstatusline@latest --config .claude/ccstatusline.json`. The user now runs a user-level status-bar mod (outside this repo, under `~/.claude/dev-mods`) that replaces it, and has already removed the `statusLine` from `~/.claude/settings.json`. The project entry must go so it does not override the mod, and nothing in the repo may reference the mod.

What else references the setup, verified by search: `.claude/ccstatusline.json` is read only by that settings command. `.claude/bin/statusline.mjs:8-9` has two comment lines that point at `.claude/ccstatusline.json` and quote the settings entry. No test, init template, `core/` file, `README.md` or `CONTRIBUTING.md` references `ccstatusline` or `statusLine`. `core/lib/init.mjs` never writes a `statusLine`, and the settings tests (`test/kernel/plugin-layout.test.mjs:80`, `bench/test/adapters.test.mjs:17`) check only `hooks` and the init output. A search of `~/.claude/dev-mods` finds no read of `ccstatusline.json` or `statusline.mjs`.

## Decisions

### D-001: Remove the project statusLine key
**Decision:** Delete the whole `statusLine` object from `.claude/settings.json` and change nothing else in that file. Project settings override user settings in Claude Code, so leaving it would keep ccstatusline on screen in this repo and hide the mod. With it gone, `env` is followed directly by `permissions`.
**Instead of:** pointing `statusLine` at `node .claude/bin/statusline.mjs` (the standalone shape): it would still override the user's mod, which is the thing this request removes.

### D-002: Delete .claude/ccstatusline.json and its two stale comment lines
**Decision:** Delete `.claude/ccstatusline.json` with `git rm`. Its only reader is the settings command removed in D-001, so after this phase it is dead config that suggests a setup the repo no longer uses. Deleting it makes `.claude/bin/statusline.mjs` lines 8 and 9 stale (they name the deleted file and quote the removed entry), so the comments rule requires deleting those two lines, not rewording them. The rest of `statusline.mjs`, the `--widget` flag included, stays as it is: it still runs standalone and removing it is a separate request.
**Instead of:** keeping the file as a ready config in case the user goes back to ccstatusline: git history keeps it (`git show d1fe581:.claude/ccstatusline.json`), and a kept file with no reader is a cost every later reader pays.
**Risks:**
- **RISK-001** The user wants ccstatusline back later. Mitigation: restore both files from `d1fe581`; the deletion is one commit and fully reversible.

## Scope

**In:**
- the `statusLine` key in `.claude/settings.json`
- the file `.claude/ccstatusline.json`
- the two stale comment lines at `.claude/bin/statusline.mjs:8-9`

**Out:**
- any other line of `.claude/bin/statusline.mjs`, including the `--widget` mode and its header lines 2 to 7 and 10 to 11
- `~/.claude/settings.json` and the status-bar mod (user-level, outside the repo)
- the legacy paths `picket preflight` reports (`.claude/ledger`, `.claude/branching/manifest.yaml`)
- past work items that mention ccstatusline

## Phase 1: Remove the ccstatusline wiring

**Touch set:**
- `.claude/settings.json`: remove the statusLine object
- `.claude/ccstatusline.json`: delete the file with git rm
- `.claude/bin/statusline.mjs`: delete stale comment lines 8 and 9

**Changes:** Remove lines 5 to 8 of `.claude/settings.json` (the `"statusLine": { ... },` object) so the file stays valid JSON with the same key order otherwise. Run `git rm .claude/ccstatusline.json`. In `.claude/bin/statusline.mjs`, delete the line starting `// Wired through ccstatusline's custom-command widget` and the line after it (`//   "statusLine": { "command": "npx -y ccstatusline@latest ...`); no other edit to that file. Stage all three.

**Done when:**
- **T-1.1** `node -e "const s=require('./.claude/settings.json'); process.exit('statusLine' in s ? 1 : 0)"` exits 0, and the file still parses as JSON.
- **T-1.2** `.claude/settings.json` keeps its other keys with unchanged values: `env`, `permissions`, `outputStyle`, `disableClaudeAiConnectors`.
- **T-1.3** `git ls-files .claude/ccstatusline.json` prints nothing and the file does not exist on disk.
- **T-1.4** `git grep -n "ccstatusline.json" -- . ":!work/"` prints nothing.
- **T-1.5** `git diff --cached -- .claude/bin/statusline.mjs` shows exactly two deleted lines and no added lines.
- **T-1.6** `echo {} | node .claude/bin/statusline.mjs` exits 0 and prints a status line.
- **T-1.7** `npm test` passes.

## Open questions

none

## Revision log
