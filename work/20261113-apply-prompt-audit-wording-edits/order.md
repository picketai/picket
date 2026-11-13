---
kind: order
lane: order
title: Apply prompt audit wording edits
date: 2026-11-13
audience: developer
sources: work/20261113-apply-prompt-audit-wording-edits/request.md, work/20261113-apply-prompt-audit-wording-edits/preflight.txt, .claude/skills/benchmarking/SKILL.md, .claude/rules/harness-authoring.md, src/skills/reviewing/checklists/crosscheck.md, src/skills/expediting/SKILL.md, src/skills/reviewing/steps/pr.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, bench/run.mjs, bench/lib/spend.mjs, bench/README.md, bench/tasks, test/repo/references.test.mjs, test/repo/markdown-paths.test.mjs, test/cli/lane-check.test.mjs, src/lib/shared/git.mts, src/lib/shared/route/commit.mts, src/lib/shared/review-summary.mts, src/lib/verbs/summary/index.test.mts, src/lib/verbs/pullrequest/pull-request.mts
phases:
  - n: 1
    files: [src/skills/reviewing/checklists/crosscheck.md, src/skills/expediting/SKILL.md, src/skills/reviewing/steps/pr.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md]
    greps:
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: 'artifacts/plans/'
        absent: true
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: 'Example row: .- \[Critical\] work/<id>/design\.md#D-003:'
      - path: src/skills/expediting/SKILL.md
        pattern: 'admit --text'
        absent: true
      - path: src/skills/expediting/SKILL.md
        pattern: '^Re-run [^\n]*picket admit --request - '
      - path: src/skills/expediting/SKILL.md
        pattern: 'at most three'
      - path: src/skills/reviewing/steps/pr.md
        pattern: '\bsetx\b'
        absent: true
      - path: src/skills/ordering/SKILL.md
        pattern: 'the gate of CLAUDE\.md rule 4\b'
      - path: src/skills/designing/SKILL.md
        pattern: 'the gate of CLAUDE\.md rule 4\b'
    tests: true
    drive: false
  - n: 2
    files: [.claude/skills/benchmarking/SKILL.md, .claude/rules/harness-authoring.md]
    greps:
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: 'about 2 dollars each|order tasks 10 to 15|design tasks 20 to 25'
        absent: true
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: 'planned \$<total>'
      - path: .claude/rules/harness-authoring.md
        pattern: 'item 08a'
        absent: true
      - path: .claude/rules/harness-authoring.md
        pattern: 'until it is converted'
        absent: true
      - path: .claude/rules/harness-authoring.md
        pattern: 'test/repo/references\.test\.mjs'
      - path: .claude/rules/harness-authoring.md
        pattern: 'where it has no .when_to_use.'
      - path: .claude/rules/harness-authoring.md
        pattern: 'was assumed'
        absent: true
    tests: true
    drive: false
---
# Order: Apply prompt audit wording edits

## Problem

The prompt audit found eight instruction lines that disagree with the repository or with each other: dollar figures in the benchmarking skill that no longer match the task budgets, a rule citing a closed design record instead of the test that enforces it, an example row pointing at a folder that does not exist, an inline admit form the lane skills dropped, a Windows-only command, and two lane skills naming "rule 4" without saying whose. The binding constraints are that only wording changes (no code, test or kernel edit) and that every reworded line states what the code does today, checked against the source cited in each phase.

## Decisions

### D-001: Two phases split by audience
**Decision:** Phase 1 edits the five shipped skill files under `src/skills/`, which `npm run build` copies into the plugin; phase 2 edits the two files under `.claude/` that only this repository reads. Each phase ships alone, and a reviewer reads one audience at a time.
**Instead of:** one phase with all eight edits: it would need eight edit criteria plus the diff and test checks, past the cap of 8 criteria per phase.

### D-002: Every edit replaces text inside its existing line
**Decision:** Each edit rewrites words inside the line the request names and adds or removes no line, so the line counts the budgets test checks stay the same and the `file:line` citations in other records still point at the same text. The phase's **Changes** give the target wording; the developer copies it, and may only adjust it to fit the surrounding sentence.
**Instead of:** free rewording by the developer: the ordering and designing skills must end up with the same words, and only fixed wording guarantees that.

### D-003: The reach-table citation covers only what the test checks
**Decision:** `.claude/rules/harness-authoring.md` line 18 cites `test/repo/references.test.mjs` for the reach table (skills cite their own folders and the document kit, rules and the output style only the kit, agents only their preloaded skills), which `withinReach` (`test/repo/references.test.mjs:95`) enforces. The clause "its messages carry no `step:` line" becomes its own sentence after the table, because that test accepts `step:` values and never checks that they are absent (`test/repo/references.test.mjs:147`).
**Instead of:** citing the test for the whole sentence: the citation would claim a check that does not exist.

### D-004: The round-trip example states today's facts
**Decision:** The example on line 20 becomes a present-tense statement of three verified facts: `commitOwned` adds a path only when its caller passes it in `add` (`src/lib/shared/git.mts:249`; `src/lib/shared/route/commit.mts:40` calls it without one), the summary also finds an item's commits through the ledger's accept rows (`src/lib/shared/review-summary.mts:200`), and its test commits a phase without the work folder and expects the summary to find it (`src/lib/verbs/summary/index.test.mts:398`).
**Instead of:** changing only the verb tenses of the current sentence: "its test commits through `commitOwned`" would then be false, since that test commits with plain `git commit` and records an accept row.

### D-005: The benchmarking step quotes the dry run's plan
**Decision:** Line 31 of the benchmarking skill drops the three per-lane figures and tells the lead to quote the plan the dry run prints: one row per task with its budget (`bench/run.mjs:294`) and the `planned $<total>` line (`bench/run.mjs:296`). The gate-stop clause ("about 0.75 dollars") stays, since it is not a per-lane figure and the request does not name it. The stale figures are shown by the task files: fast budgets are 5 to 6 dollars (the line says about 2), order 8 to 14 (says 10 to 15), design 20 to 22 (says 20 to 25).
**Instead of:** updating the figures to the current budgets: they would go stale again at the next budget change, which the plan never does.
**Risks:**
- **RISK-001** The request calls the planned total "the worst case", but each budget caps one `claude -p` call and a gate stop is a new call (`bench/run.mjs:172`, `bench/README.md:64`), so a task with stops can spend more than its budget; the hard ceiling is `--max-usd`. Mitigation: OQ-001; phase 2 follows the request's reading meanwhile, and no criterion greps for the phrase.

## Scope

**In:**
- the eight wording edits the request lists, in the seven files it names
- the sentence split on line 18 of `harness-authoring.md` that D-003 needs

**Out:**
- the audit's flags: test-kind unlock, proofreading appends, cross-flow check, two saves
- "at most three" on line 20 of `src/skills/expediting/SKILL.md`
- any code, test, kernel, bench or `dist/` change
- the "worst case $44" figure on line 22 of `harness-authoring.md` (OQ-002)

## Phase 1: Shipped skills

**Touch set:**
- `src/skills/reviewing/checklists/crosscheck.md`: example row path, line 34
- `src/skills/expediting/SKILL.md`: re-run admit form, line 33
- `src/skills/reviewing/steps/pr.md`: platform-neutral PAT setup, line 5
- `src/skills/ordering/SKILL.md`: name CLAUDE.md rule 4, line 24
- `src/skills/designing/SKILL.md`: name CLAUDE.md rule 4, line 26

**Changes:**
- `crosscheck.md:34`: in the example row, replace `artifacts/plans/00012-payments.md#D-003` with `work/<id>/design.md#D-003`, the anchor form line 32 already gives. `artifacts/plans/` does not exist; `test/repo/markdown-paths.test.mjs:9` skips `work/` paths, so the placeholder passes the path check.
- `expediting/SKILL.md:33`: replace the opening `` Re-run `picket admit --text "<request>" --touched <comma-separated paths you have edited or must edit>` `` with `` Re-run the admit of step 2, `picket admit --request - --touched <comma-separated paths you have edited or must edit> --human` with the request in a quoted heredoc, ``. Everything from "whenever the touch set grows" to the end of the paragraph stays as it is, and line 20 is not touched.
- `pr.md:5`: replace `` a PAT in `AZDO_PAT`, set once with `setx AZDO_PAT <token>` or in the `env` block `` with `` a PAT in the `AZDO_PAT` environment variable, set in the environment Claude Code starts from or in the `env` block ``. The rest of the parenthesis stays. `patOf` (`src/lib/verbs/pullrequest/pull-request.mts:52`) reads exactly these two places.
- `ordering/SKILL.md:24` and `designing/SKILL.md:26`: replace `the gate of rule 4` with `the gate of CLAUDE.md rule 4`.

**Done when:**
- **T-1.1** `crosscheck.md` line 34 cites `work/<id>/design.md#D-003`, and the file no longer contains `artifacts/plans/`.
- **T-1.2** `expediting/SKILL.md` line 33 starts with "Re-run" and names `picket admit --request - --touched` with a quoted heredoc; the file no longer contains `admit --text`, and line 20 still reads "at most three".
- **T-1.3** `pr.md` line 5 names `AZDO_PAT` as an environment variable or an `env` entry in `.claude/settings.local.json`, and the file no longer contains `setx`.
- **T-1.4** `ordering/SKILL.md` line 24 and `designing/SKILL.md` line 26 both read "the gate of CLAUDE.md rule 4".
- **T-1.5** Against the base commit `d87c9924`, `git diff --numstat` for the phase shows exactly the five touch set files, each with one line added and one removed.
- **T-1.6** `npm test` passes, including `test/repo/references.test.mjs`, `test/repo/markdown-paths.test.mjs`, `test/repo/dashes.test.mjs` and `test/cli/lane-check.test.mjs`.

## Phase 2: Repository instructions

**Touch set:**
- `.claude/skills/benchmarking/SKILL.md`: quote the dry-run plan, line 31
- `.claude/rules/harness-authoring.md`: test citation and example, lines 18, 20

**Changes:**
- `benchmarking/SKILL.md:31`: replace `Dry-run and quote the cost before spending: fast tasks run about 2 dollars each, order tasks 10 to 15, design tasks 20 to 25, and every gate stop` with `` Dry-run and quote the plan it prints before spending: each task's budget and the `planned $<total>` line, the worst case; every gate stop ``. The rest of the item stays. If OQ-001 is answered against the request's reading, write `` the `planned $<total>` line; the `--max-usd` cap, not the plan, is the ceiling `` in place of `` the `planned $<total>` line, the worst case ``.
- `harness-authoring.md:18`, three replacements in the line:
  - `` A skill's `when_to_use` (or, until it is converted, its description) carries `` becomes `` A skill's `when_to_use`, or its description where it has no `when_to_use`, carries `` (two of the 17 skills have no `when_to_use`).
  - `References follow the reach table of item 08a (D-008):` becomes `` References follow the reach table that `test/repo/references.test.mjs` enforces: ``.
  - `` frontmatter, and its messages carry no `step:` line. `` becomes `` frontmatter. An agent's messages carry no `step:` line. `` (D-003).
- `harness-authoring.md:20`: replace the sentence starting `Example: the summary found` with `` Example: `commitOwned` commits the work folder only when its caller adds it, so the summary also finds an item's commits through the ledger's accept rows, and its test commits a phase without that folder and expects the summary to find the commit. `` (D-004).

**Done when:**
- **T-2.1** `benchmarking/SKILL.md` line 31 names the plan the dry run prints and the `planned $<total>` line, and holds none of "about 2 dollars each", "order tasks 10 to 15" or "design tasks 20 to 25".
- **T-2.2** `harness-authoring.md` line 18 cites `test/repo/references.test.mjs` for the reach table, says "or its description where it has no `when_to_use`", and holds neither "item 08a" nor "until it is converted".
- **T-2.3** `harness-authoring.md` line 18 states "An agent's messages carry no `step:` line." as a sentence of its own after the reach table.
- **T-2.4** `harness-authoring.md` line 20 ends with the present-tense example of D-004, and the file no longer contains "was assumed".
- **T-2.5** Against the base commit `d87c9924`, `git diff --numstat` for the phase shows `benchmarking/SKILL.md` with one line added and one removed and `harness-authoring.md` with two and two, and no other file.
- **T-2.6** `npm test` passes, including `test/timing/budgets.test.mjs` and `test/repo/markdown-paths.test.mjs`.

## Open questions

- **OQ-001** The request calls the planned total "the worst case", but the code caps each call, not each run, at the task budget (`bench/run.mjs:172`, `bench/README.md:64`), so a task with gate stops can spend past its planned share; only `--max-usd` is a hard ceiling. Keep "the worst case" or name `--max-usd` as the ceiling? Owner: the user. Fallback: the request's reading, "the worst case".
- **OQ-002** Line 22 of `harness-authoring.md` says the fast lane comparison's "worst case $44". The figure matches the eight fast task budgets (6+6+5+5+5+6+5+6 = 44), but it carries the same per-call premise as OQ-001 and will go stale with the budgets. Reword it to the dry run's plan in a later item? Owner: the user. Fallback: unchanged, it is out of this request's scope.

## Revision log
