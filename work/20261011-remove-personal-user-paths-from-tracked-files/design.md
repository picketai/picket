---
kind: design
lane: design
title: Remove personal user paths from tracked files
date: 2026-10-11
audience: developer
sources: request.md; git grep over the tree for the long and short user folder names, the project-folder spelling, users/v and the first name; core/lib/hooks/guard.scope.mjs:7 and :62; core/lib/work.mjs:105-122; core/lib/verify.mjs:58-61; core/lib/yaml-lite.mjs:19-33; core/lib/hooks/lint.schema.mjs; core/lib/source-paths.mjs:12; work/20260925-rename-research-artifact-to-research-md/design.md:7; JSON.parse of the five bench/results files
phases:
  - n: 1
    files:
      - artifacts/reports/aispec-toolkit-remaining-cost-token-analysis.md
      - bench/results/rework-before-hookfix.json
      - bench/results/rework-clean-raw.json
      - bench/results/baseline-trunk.json
      - bench/results/rework-2026-10-02.json
      - bench/results/rework.json
      - work/20261010-ship-picket-session-mod-with-picket-init/order.md
      - work/20261010-ship-picket-status-mod-with-picket-init/order.md
      - core/lib/source-paths.mjs
      - work/20261010-ship-picket-session-mod-with-picket-init/request.md
      - work/20261010-ship-picket-status-mod-with-picket-init/request.md
      - work/20261011-remove-personal-user-paths-from-tracked-files/request.md
      - work/20261008-project-extensions-with-manifests/phases/5.block.md
    greps:
      - path: artifacts/reports/aispec-toolkit-remaining-cost-token-analysis.md
        pattern: '^(?![\s\S]*<user>)'
        flags: i
      - path: artifacts/reports/aispec-toolkit-remaining-cost-token-analysis.md
        pattern: '`~/\.claude/skills/jira-items/SKILL\.md`'
      - path: bench/results/rework-before-hookfix.json
        pattern: '^(?![\s\S]*<user>)'
        flags: i
      - path: bench/results/rework-clean-raw.json
        pattern: '^(?![\s\S]*<user>)'
        flags: i
      - path: bench/results/baseline-trunk.json
        pattern: '^(?![\s\S]*<SHORT>~1[.]APE)'
        flags: i
      - path: bench/results/rework-2026-10-02.json
        pattern: '^(?![\s\S]*<SHORT>~1[.]APE)'
        flags: i
      - path: bench/results/rework.json
        pattern: '^(?![\s\S]*<SHORT>~1[.]APE)'
        flags: i
      - path: work/20261010-ship-picket-session-mod-with-picket-init/order.md
        pattern: '~/\.claude/dev-mods/de97e3bc-8880-46d8-ace6-e34748490980/picket-session'
      - path: work/20261010-ship-picket-status-mod-with-picket-init/order.md
        pattern: '~/\.claude/dev-mods/8201c917-9661-457e-8cfd-c7e258af389f/picket-status'
      - path: core/lib/source-paths.mjs
        pattern: '^(?![\s\S]*<SHORT>~1[.]APE)'
        flags: i
      - path: core/lib/source-paths.mjs
        pattern: 'Windows 8\.3 short names \(`RUNNER~1`\) resolved,'
      - path: work/20261008-project-extensions-with-manifests/phases/5.block.md
        pattern: '^(?![\s\S]*(<user>|<SHORT>~1[.]APE))'
        flags: i
      - path: work/20261011-remove-personal-user-paths-from-tracked-files/request.md
        pattern: '^(?![\s\S]*<user>)'
        flags: i
    tests: true
    drive: false
    security: false
---
# Design: Remove personal user paths from tracked files

## Problem

Eight tracked record files spell out the author's Windows home folder, either as the long name `C:\Users\<user>` (both slash directions, and with doubled backslashes inside JSON strings) or as the 8.3 short name `C:/Users/<SHORT>~1.APE`. The request names four of them; a fresh `git grep` finds four more of the same kind (report line 5, `rework-clean-raw.json`, and three bench files with the short name). Three binding constraints shape the scrub: the five bench JSON files must stay valid JSON, `guard.scope` denies any write to kernel-owned work item files (`core/lib/hooks/guard.scope.mjs:7`), and `request.md` is saved byte for byte and never rewritten because the cumulative review traces a change back to it (`core/lib/work.mjs:105-109`). Git history keeps every old spelling; this change cleans the current tree only.

## Decisions

### D-001 (r2): Home prefix becomes `~`, the rest of that path takes forward slashes
**Decision:** Infrastructural decision. In this record, `<user>` and `<SHORT>` stand for the author's long and short folder names, which the record does not spell out. In every hit, replace the user folder prefix (`C:\Users\<user>`, `C:/Users/<user>`, `C:\\Users\\<user>` inside JSON, `C:/Users/<SHORT>~1.APE`, `C:\\Users\\<SHORT>~1.APE` inside JSON) with `~`, and write the remainder of that one path with forward slashes. Examples: `C:\Users\<user>\.claude\skills\jira-items\SKILL.md` becomes `~/.claude/skills/jira-items/SKILL.md`; the JSON text `C:\\Users\\<user>\\.claude.json` becomes `~/.claude.json`; `C:/Users/<SHORT>~1.APE/AppData/Local/Temp/claude/invoices-head.json` becomes `~/AppData/Local/Temp/claude/invoices-head.json`. Everything else on the line stays byte for byte, including the rest of each bench command string and its existing truncation. The repository already uses this form (`work/20260925-rename-research-artifact-to-research-md/design.md:7` lists `~/.local/share/claude/versions/2.1.282`), and `yaml-lite` reads `~/...` as a plain string, not null (`core/lib/yaml-lite.mjs:21` maps only a bare `~` to null).
**Instead of:** a Windows-shaped placeholder such as `C:\Users\someone\...`: the request asks for `~/.claude/...`, and a single home placeholder reads the same on every platform.
**Risks:**
- **RISK-001** A bench command such as `ls -lt "~/.claude/projects/"*/*.jsonl` no longer replays literally, because the shell does not expand `~` inside double quotes. Mitigation: these strings are recorded evidence of past runs; `bench/run.mjs` regenerates results and never reads them back as commands.
- **RISK-002** A JSON edit leaves a lone backslash or breaks a string. Mitigation: replace the whole escaped segment (`C:\\Users\\<user>\\` up to the next path part) so no `\\` remains before the first forward slash; T-1.3 parses all five files.

### D-002 (r2): Scope by pattern over the tree, not by the four named files
**Decision:** Infrastructural decision. The phase covers every tracked file that an agent may write and that holds a Windows user folder path in any spelling: the four files the request names plus `bench/results/rework-clean-raw.json` (lines 398, 1191), `bench/results/baseline-trunk.json` (1582, 1587), `bench/results/rework-2026-10-02.json` (582) and `bench/results/rework.json` (2437), and line 5 of the report besides line 222. The request's goal is a tree without those paths; the four names were a sample from a narrower grep.
**Instead of:** editing only the four named files: report line 5 and both `rework-clean-raw.json` hits would keep the long folder name, so the request's own goal and the lead's grep check would fail.
**Risks:**
- **RISK-003** Four extra bench files grow the diff and the review surface. Mitigation: each edit changes only the path prefix on lines already listed above; T-1.5 checks that every file changes in place, with as many lines added as removed.

### D-003 (r2): Kernel-owned files are scrubbed by the lead on the user's instruction; the developer only stages them
**Decision:** Infrastructural decision. Four hits sit in kernel-owned files: `work/20261010-ship-picket-session-mod-with-picket-init/request.md:1`, `work/20261010-ship-picket-status-mod-with-picket-init/request.md:1`, this item's own `work/20261011-remove-personal-user-paths-from-tracked-files/request.md:1`, and `work/20261008-project-extensions-with-manifests/phases/5.block.md:9`. `guard.scope` denies agent writes to `request.md` and `phases/`, so the user ruled (OQ-002) and the lead applied the edits outside the guard on that explicit instruction. The two old requests now read `~/.claude/dev-mods/<uuid>/picket-<name>`; this item's request reads "(the Windows user folder)"; `5.block.md:9` keeps its short-name versus long-name contrast as `C:/Users/RUNNER~1/…` and `C:/Users/runneradmin/…`. The developer never writes these files; the phase stages them as they are, so they land in the phase commit.
**Instead of:** leaving them unchanged with a pathspec exclusion in the done-when grep: the user chose a clean tree over keeping each `request.md` byte for byte.
**Risks:**
- **RISK-004** The cumulative review compares the change with a `request.md` that no longer holds the original path. Mitigation: only the path text changed; the named files and intent are the same, and git history keeps the original bytes.

### D-004 (r2): The short name in `core/lib/source-paths.mjs:12` becomes `RUNNER~1`
**Decision:** Infrastructural decision. The doc comment at `core/lib/source-paths.mjs:12` uses the author's short folder name as its example of a Windows 8.3 short name, and it ships in the published package. The user approved the swap (OQ-001) and the lead recorded it with `picket comment`, so `guard.comments` lets the replacement line through. The line becomes exactly `` * One spelling per location: symlinks and Windows 8.3 short names (`RUNNER~1`) resolved,``; nothing else in the comment or the file changes.
**Instead of:** deleting the example: the parenthesis is what tells a reader which spelling "short name" means.
**Risks:**
- **RISK-005** The edit drifts from the approved text, and `guard.comments` denies it. Mitigation: copy the approved line byte for byte; the `RUNNER~1` grep in the frontmatter checks it.

## Scope

**In:**
- Path prefixes in the eight files listed in D-002, rewritten as D-001 says.
- A check that the five bench JSON files still parse.
- The `core/lib/source-paths.mjs:12` comment example (D-004).
- Staging the four kernel-owned files the lead already edited (D-003).

**Out:**
- Git history rewrite (filter-repo, force push): the old spellings stay in past commits.
- The author's full name as the author credit in `LICENSE`, `package.json`, the plugin manifests, `test/release.test.mjs` and `work/20261010-publishable-package-neutral-examples/`: a published author credit, not a path.
- `/home/vlad/...` in `artifacts/reports/agent-skill-audit-2026-08-06.md` and report line 140, and `vladapetre/AISpec` in `work/20261010-rename-tether-to-picket/design.md:446`: not Windows user paths, and each one is the subject of the finding it sits in.
- The truncated tail `"C:/Users/VL` at the end of `bench/results/rework.json:2437`: the recorder cut the string there; it holds no folder name.
- The user's uncommitted edits to `CLAUDE.md` and `core/bin/picket.mjs`.

## Phase 1: Replace user folder paths with `~` in tracked records

**Touch set:**
- `artifacts/reports/aispec-toolkit-remaining-cost-token-analysis.md`: lines 5 and 222
- `bench/results/rework-before-hookfix.json`: lines 96 and 101
- `bench/results/rework-clean-raw.json`: lines 398 and 1191
- `bench/results/baseline-trunk.json`: lines 1582 and 1587
- `bench/results/rework-2026-10-02.json`: line 582
- `bench/results/rework.json`: line 2437, first path only
- `work/20261010-ship-picket-session-mod-with-picket-init/order.md`: lines 7 and 88
- `work/20261010-ship-picket-status-mod-with-picket-init/order.md`: lines 7 and 99
- `core/lib/source-paths.mjs`: line 12, approved comment swap
- `work/20261010-ship-picket-session-mod-with-picket-init/request.md`: stage only, already edited
- `work/20261010-ship-picket-status-mod-with-picket-init/request.md`: stage only, already edited
- `work/20261011-remove-personal-user-paths-from-tracked-files/request.md`: stage only, already edited
- `work/20261008-project-extensions-with-manifests/phases/5.block.md`: stage only, already edited

**Changes:** On each listed line, replace the user folder prefix and the rest of that path as D-001 says, with the Edit tool after a Read of the line range (the bench files are long, so read with `offset` and `limit`). Nothing else on the line changes. In the two `order.md` files, the `sources:` entry on line 7 becomes `~/.claude/dev-mods/<uuid>/picket-<name>` and the backslash path in the `**Changes:**` line becomes `~/.claude/dev-mods/<uuid>/picket-<name>/`. Those edits re-run `lint.schema` over the closed orders; if it blocks on content that predates this change, stop with a block instead of fixing other lines. In `core/lib/source-paths.mjs`, replace line 12 with the approved text in D-004. Do not write the four kernel-owned files; stage them as they are, with the eight records and `core/lib/source-paths.mjs`.

**Done when:**
- **T-1.1** `git grep -nIi '<user>'` prints nothing.
- **T-1.2** `git grep -nIi '<SHORT>~1[.]APE'` prints nothing.
- **T-1.3** `node -e` running `JSON.parse` on each of the five `bench/results` files in the touch set exits 0 for all five.
- **T-1.4** Report line 222 contains `` `~/.claude/skills/jira-items/SKILL.md` ``, and `bench/results/rework-clean-raw.json` lines 398 and 1191 end their hint with `in ~/.claude.json.`
- **T-1.5** `git diff --cached --numstat` lists the twelve tracked touch set files (eight records, `core/lib/source-paths.mjs`, three kernel-owned files), each with equal added and removed counts; any other staged path is under `work/20261011-remove-personal-user-paths-from-tracked-files/`.
- **T-1.6** `npm test` passes.
- **T-1.7** `git diff --cached --name-only` does not list `CLAUDE.md` or `core/bin/picket.mjs`.

## Open questions

- **OQ-001** [resolved 2026-10-11] May the doc comment at `core/lib/source-paths.mjs:12` swap the author's short folder name for a neutral one? The user said yes; the lead recorded the approval with `picket comment`. See D-004 (r2).
- **OQ-002** [resolved 2026-10-11] Should the four kernel-owned hits in D-003 be edited by hand? The user said yes; the lead applied the edits on that instruction. See D-003 (r2).

## Revision log

- 2026-10-11: D-003 (r2): kernel-owned hits edited by the lead on the user's instruction, developer stages them; T-1.1 exclusions dropped; OQ-002 resolved.
- 2026-10-11: D-004 (r2): comment example becomes `RUNNER~1` under a recorded `picket comment` approval; T-1.2 exclusion dropped; OQ-001 resolved.
- 2026-10-11: D-001 (r2): record writes folder names as `<user>` and `<SHORT>~1.APE`; T-1.1, T-1.2 and grep patterns use `[.]`, so the record passes its own grep.
- 2026-10-11: D-002 (r2): rationale names the long folder name in words instead of spelling it; scope unchanged.
