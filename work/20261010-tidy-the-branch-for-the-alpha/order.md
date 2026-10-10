---
kind: order
lane: order
title: Tidy the branch for the alpha
date: 2026-10-10
audience: developer
sources: request.md; hello.sh; PLAN.md; README.md; CONTRIBUTING.md; .gitignore; tmp/ (24 files, opening of each); spike/HANDOFF.md; git ls-files spike (145 files); test/markdown-paths.test.mjs; test/names-picket.test.mjs; core/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; core/hooks/README.md; core/skills/benchmarking/SKILL.md; core/skills/documenting/SKILL.md; core/skills/reviewing/steps/10-alignment.md; core/skills/reviewing/templates/patterns.md; core/lib/pr.mjs; test/kernel/pr.test.mjs; core/lib/verify.mjs; artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md
phases:
  - n: 1
    files:
      - README.md
      - CONTRIBUTING.md
      - .gitignore
      - test/markdown-paths.test.mjs
      - test/names-picket.test.mjs
      - artifacts/reports/rework-plan-2026-09-07.md
      - artifacts/reports/latency-session-record-2026-09-03.md
      - artifacts/reports/agent-design-rules-2026-05-21.md
      - artifacts/reports/framework-survey-2026-05-26/findings-_synthesis.md
      - artifacts/reports/framework-survey-2026-05-26/findings-spec-kit.md
    greps:
      - path: README.md
        pattern: 'artifacts/reports/rework-plan-2026-09-07\.md'
      - path: .gitignore
        pattern: '^tmp/$'
    tests: true
    drive: false
  - n: 2
    files:
      - core/.claude-plugin/plugin.json
      - .claude-plugin/marketplace.json
      - core/hooks/README.md
      - core/skills/benchmarking/SKILL.md
      - core/skills/documenting/SKILL.md
      - core/lib/pr.mjs
      - test/kernel/pr.test.mjs
    greps:
      - path: core/.claude-plugin/plugin.json
        pattern: 'a software-development workflow for Claude Code'
      - path: .claude-plugin/marketplace.json
        pattern: 'a software-development workflow for Claude Code'
      - path: core/lib/pr.mjs
        pattern: 'Picket review: '
      - path: test/kernel/pr.test.mjs
        pattern: 'Picket review: CHANGES REQUIRED'
    tests: true
    drive: false
---
# Order: Tidy the branch for the alpha

## Problem

The framework branch still carries working material that no user of the alpha needs: an unrelated script, a finished rework plan at the root, 24 tracked notes in `tmp/`, and 145 files of packaging-spike output that CONTRIBUTING.md already promises to delete before the alpha. User-facing text under `core/` also calls the product a "harness", a word the glossary keeps for internal discussion only. Git history keeps every deleted file, so a deletion loses nothing; a file is moved to `artifacts/` only when something current still reads it.

## Decisions

### D-001: delete `spike/` and `hello.sh`, keep their record in git
**Decision:** Delete `hello.sh` (commit 5866824, cited only by the 2026-08-06 audit report, which is itself a record) and all of `spike/`: raw transcripts, hook logs, fixtures and a copy of the old kernel under `spike/tether/`. The spike's conclusions already live in SDR 00001 and the research work item `work/20261004-tether-plugin-spike-eleven-packaging-checks/`; both are records and may cite paths that no longer exist. With `spike/` gone, `spike/` leaves the record folders of `test/names-picket.test.mjs`, the unscanned prefixes of `test/markdown-paths.test.mjs`, and `.gitignore` (`spike/.runs/`).
**Instead of:** moving `spike/` under `artifacts/`: it would ship 145 files of old-name code and transcripts in every clone forever, while no current file reads them.

### D-002: triage `tmp/` by one rule, and make `tmp/` ignored local scratch
**Decision:** A note moves to `artifacts/reports/` when it describes something outside this repository's pre-rework layout or carries a check still due; otherwise it is deleted. Kept (13, moved with `git mv`): `latency-session-record.md` becomes `artifacts/reports/latency-session-record-2026-09-03.md` (its checklist is due); the competitor survey, `findings-_synthesis.md` and the ten `findings-*.md`, moves unchanged into `artifacts/reports/framework-survey-2026-05-26/`; `agent-design-rules.md` (rules derived from the MAST paper, independent of our layout) becomes `artifacts/reports/agent-design-rules-2026-05-21.md`. Deleted (11): the seven `followup-*.md` (each Done or Scrapped on 2026-05-24 against the pre-rework five-agent layout), `agent-guidelines-findings.md` (a draft mapped to that layout), `skill-optimisation-suggestions.md` (a backlog for the pre-rework skills), `prompt-latency-optimisation.md` (a one-off prompt, run) and `latency-worklog.md` (the finished session's running state). `.gitignore` gains `tmp/`, so local notes there are never committed and never reach the path test, which lists untracked files too.
**Instead of:** moving all 24 notes: the follow-ups and the backlog describe files and agents that no longer exist, so kept they would mislead more than inform.
**Risks:**
- **RISK-001** The user's auto-memory points at `tmp/latency-session-record.md`. Mitigation: the lead updates that memory to the new path after the phase (outside the repository, outside this order).

### D-003: `PLAN.md` moves to `artifacts/reports/rework-plan-2026-09-07.md`
**Decision:** README.md:49 rests its Status headline on the plan's section 4.2, so the plan stays as a dated report and the README cites the new path in backticks, which `test/markdown-paths.test.mjs` then checks exists.
**Instead of:** deleting it and citing only `bench/results/comparison-clean.md`: the README sentence names the plan's research and status table, which the bench report does not carry.

### D-004: "harness" becomes "Picket" where it names the product to a user
**Decision:** Replace the word where it means this product in text a user sees: the plugin description in `core/.claude-plugin/plugin.json` and its twin in `.claude-plugin/marketplace.json` ("a software-development workflow for Claude Code"), `core/hooks/README.md`, the prose of `core/skills/benchmarking/SKILL.md` and `core/skills/documenting/SKILL.md`, and the PR summary header `**Harness review: <verdict>**` that `core/lib/pr.mjs` posts to Azure DevOps (becomes `**Picket review: <verdict>**`). It stays where it is a flag, an internal name or the engineering term: `--harness` in the benchmarking skill, the `harness-authoring` rule, `refs/harness/pr/`, `harness.json`, `harness.mjs`, code comments, and "architecture harness" (a test harness) in the reviewing skill's Ts3 rows.
**Instead of:** "framework" as the replacement noun: Picket is a set of lanes a request flows through, which "workflow" names more exactly.
**Risks:**
- **RISK-002** Anything that searches posted PR comments for "Harness review" stops matching. Mitigation: no code in this repository reads that text back; the alpha has no outside users yet.

## Scope

**In:** the five request items; CONTRIBUTING.md, `.gitignore` and the two path tests where they name `spike/` or `tmp/`; the marketplace twin of the plugin description; the PR summary header.
**Out:** README.md:3 and README.md:45, which also call the product a harness (OQ-001); the parenthetical `(spike/out/7.jsonl)` in `.claude/agent-memory/picket-architect/claude-cli-plugin-facts.md`, which is not a backticked path and fails no test; code comments that say "harness" (the `comments` rule forbids rewording them); the user's auto-memory (the lead).

## Phase 1: Retire the spike, the script and the scratch notes

**Touch set:**
- `hello.sh`: deleted, unrelated script
- `spike/`: deleted, all 145 tracked files
- `tmp/`: 11 notes deleted, 13 moved (D-002)
- `PLAN.md`: moved to `artifacts/reports/rework-plan-2026-09-07.md`
- `artifacts/reports/`: receives the moved records
- `README.md`: line 49 cites the moved plan
- `CONTRIBUTING.md`: lines 41 and 55, folder list
- `.gitignore`: drop `spike/.runs/`, add `tmp/`
- `test/markdown-paths.test.mjs`: drop `spike/` and `tmp/` prefixes
- `test/names-picket.test.mjs`: drop `spike/` record folder

**Changes:** Use `git rm -r` for the deletions and `git mv` for every move, so each kept file shows as a rename. README.md:49 starts "`artifacts/reports/rework-plan-2026-09-07.md` carries the plan, ..." with the rest of the sentence unchanged. CONTRIBUTING.md:41 lists the skipped Markdown as under `work/`, `artifacts/`, `bench/results/` and the examples folder of each skill (the test already skips all of `artifacts/`). CONTRIBUTING.md:55 drops the `spike/` and `tmp/` sentences and says `artifacts/` holds dated reports and decision records. In `test/markdown-paths.test.mjs`, `UNSCANNED_PREFIXES` loses `spike/` and `tmp/`. In `test/names-picket.test.mjs`, `RECORD_FOLDERS` loses `spike/` and the `isRecord` assertion drops `spike/a.md`. No content of a moved file changes.

**Done when:**
- **T-1.1** `git ls-files hello.sh PLAN.md spike tmp` prints nothing.
- **T-1.2** `git diff --cached -M --name-status` shows the 13 kept files and `PLAN.md` as renames (`R`) to the paths in D-002 and D-003, and the 11 other notes as deletions.
- **T-1.3** README.md names no `PLAN.md` and cites `artifacts/reports/rework-plan-2026-09-07.md`.
- **T-1.4** `.gitignore` holds `tmp/` and no `spike/` line; `git grep -n -e "spike/" -e "tmp/" -- CONTRIBUTING.md test/markdown-paths.test.mjs test/names-picket.test.mjs` prints nothing.
- **T-1.5** With an untracked `tmp/note.md` citing `` `no/such/file.md` ``, `node --test test/markdown-paths.test.mjs` still passes; the file is then removed.
- **T-1.6** `npm test` passes.

## Phase 2: Picket, not harness, in what users read

**Touch set:**
- `core/.claude-plugin/plugin.json`: description wording
- `.claude-plugin/marketplace.json`: same description, kept identical
- `core/hooks/README.md`: lines 12, 22 and 26
- `core/skills/benchmarking/SKILL.md`: lines 4, 35 and 40 only
- `core/skills/documenting/SKILL.md`: line 4
- `core/lib/pr.mjs`: line 174, PR summary header
- `test/kernel/pr.test.mjs`: assert the new header

**Changes:** Per D-004. Both manifests read "Picket: a software-development workflow for Claude Code with four lanes, four agents and one kernel." In `core/hooks/README.md`, "kept from the previous harness" (twice) becomes "kept from the earlier copy-in version", and "the harness working" becomes "Picket working". In the benchmarking skill, "against a harness" becomes "against the plugin or trunk build", "are not harness results" becomes "are not Picket results", and "whether the harness routed" becomes "whether Picket routed"; lines 17 and 25 to 27 keep `--harness`. In the documenting skill, "the harness writes" becomes "Picket writes". In `pr.mjs`, the summary header becomes `**Picket review: ${verdict}**`; the existing `buildThreads` test gains an assertion on it. Code comments that say "harness" stay.

**Done when:**
- **T-2.1** `grep -rniw harness core --include=*.md --include=*.json` prints exactly 7 lines: benchmarking SKILL.md lines 17, 25, 26 and 27 (the flag) and the three reviewing Ts3 lines (`10-alignment.md:57`, `patterns.md:76`, `patterns.md:81`).
- **T-2.2** The `description` in `core/.claude-plugin/plugin.json` equals the plugin entry's `description` in `.claude-plugin/marketplace.json`, and neither holds "harness".
- **T-2.3** `claude plugin validate core` and `claude plugin validate .` both pass (offline, no model call).
- **T-2.4** `test/kernel/pr.test.mjs` asserts `threads[0].comments[0].content` starts with `**Picket review: CHANGES REQUIRED**`, and `git grep -n "Harness review" -- core test` prints nothing.
- **T-2.5** `npm test` passes.

## Open questions

- **OQ-001** README.md:3 ("A software-development harness for Claude Code ... measures the harness itself") and README.md:45 ("against a harness") also call the product a harness, outside `core/`. Should they follow D-004? Owner: user. Fallback: unchanged in this order.

## Revision log
