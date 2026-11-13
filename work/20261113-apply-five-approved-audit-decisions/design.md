---
kind: design
lane: design
title: Apply five approved audit decisions
date: 2026-11-13
audience: developer
sources: request.md, preflight.txt, src/skills/reviewing/checklists/alignment.md, src/skills/reviewing/checklists/traced.md, src/agents/reviewer.md, src/agents/architect.md, src/skills/designing/SKILL.md, src/skills/proofreading/SKILL.md, src/skills/proofreading/steps/apply.md, src/skills/proofreading/references/recurring-errors.md, .claude/skills/benchmarking/SKILL.md, .claude/rules/harness-authoring.md, test/repo/markdown-paths.test.mjs, test/repo/references.test.mjs, test/timing/budgets.test.mjs, bench/lib/spend.mjs, bench/run.mjs, src/lib/hooks/route/verdict/index.mts, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md
phases:
  - n: 1
    files: [src/skills/reviewing/checklists/alignment.md, src/skills/reviewing/checklists/traced.md, src/agents/reviewer.md]
    greps:
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'where the project already has them, architecture tests; another kind only when a'
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'and no fast-lane request, names that kind \| Major'
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'A criterion names a kind only in so many words'
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: '\bunlock\b'
        absent: true
      - path: src/skills/reviewing/checklists/traced.md
        pattern: 'consumers outside the plan.s scope included'
      - path: src/skills/reviewing/checklists/traced.md
        pattern: '\bcross-flow\b'
        absent: true
      - path: src/agents/reviewer.md
        pattern: 'Cumulative reviews run the regression step of the traced checklist'
      - path: src/agents/reviewer.md
        pattern: '\bcross-flow\b'
        absent: true
    tests: true
    drive: false
    security: false
  - n: 2
    files: [src/agents/architect.md, src/skills/designing/SKILL.md, .claude/skills/benchmarking/SKILL.md, .claude/rules/harness-authoring.md]
    greps:
      - path: src/agents/architect.md
        pattern: 'so the decisions and phase 1 are on disk for the user to read while you write the rest:'
      - path: src/agents/architect.md
        pattern: 'the developer starts on the first'
        absent: true
      - path: src/skills/designing/SKILL.md
        pattern: 'so the record is readable early; .ARTIFACT WRITTEN. follows the second save'
      - path: src/skills/designing/SKILL.md
        pattern: '\barrives early\b'
        absent: true
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: 'The plan is an estimate, not a ceiling: a budget caps one call'
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: 'the only hard limit, and the runner refuses a real run'
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: '\bworst case\b'
        absent: true
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: '0\.75 dollars'
        absent: true
      - path: .claude/rules/harness-authoring.md
        pattern: 'quote the planned total its dry run prints, and run it only on'
      - path: .claude/rules/harness-authoring.md
        pattern: '\bworst case\b'
        absent: true
    tests: true
    drive: false
    security: false
  - n: 3
    files: [src/skills/proofreading/SKILL.md, src/skills/proofreading/steps/apply.md, src/skills/proofreading/references/recurring-errors.md, test/repo/markdown-paths.test.mjs]
    greps:
      - path: src/skills/proofreading/SKILL.md
        pattern: 'and, when it exists, the project.s .\.picket/recurring-errors\.md. before pass 1\.'
      - path: src/skills/proofreading/SKILL.md
        pattern: 'append a line when a defect class repeats'
        absent: true
      - path: src/skills/proofreading/steps/apply.md
        pattern: 'Append to the project.s .\.picket/recurring-errors\.md., creating it on the first entry'
      - path: src/skills/proofreading/steps/apply.md
        pattern: 'own .references/recurring-errors\.md. is never edited: an update replaces it\.'
      - path: src/skills/proofreading/references/recurring-errors.md
        pattern: '^Error classes worth a targeted sweep in any project\. Read before pass 1\.'
      - path: src/skills/proofreading/references/recurring-errors.md
        pattern: '^## Words often confused\b'
      - path: src/skills/proofreading/references/recurring-errors.md
        pattern: '\bProject-specific\b'
        absent: true
      - path: src/skills/proofreading/references/recurring-errors.md
        pattern: 'none recorded yet'
        absent: true
      - path: test/repo/markdown-paths.test.mjs
        pattern: '"\.picket/recurring-errors\.md",'
    tests: true
    drive: false
    security: false
---
# Design: Apply five approved audit decisions

## Problem

Ten instruction files contradict rules the user has already settled. The reviewer's test floor still speaks of an "unlock" the `tests` rule no longer has, and the regression check is written twice with two owners. The architect and designing texts claim the developer starts on the first save, while the kernel routes `ARTIFACT WRITTEN` only at turn end (`src/lib/hooks/route/verdict/index.mts:30`). Proofreading appends to a file under the plugin root, which SDR 00001 D-005 (Ratified) forbids, and the bench texts state dollar figures as if the plan were a ceiling, when `--max-usd` is the only limit the runner enforces (`bench/lib/spend.mjs:44`). The user approved the exact replacement text for each, one by one, in `request.md`; that text binds this record word for word.

## Decisions

### D-001: Test kinds follow the tests rule
**Decision:** Infrastructural decision. The reviewer's test-scope floor in `src/skills/reviewing/checklists/alignment.md` (lines 60, 64 and 69) grades a non-unit test kind against one source: a `**Done when:**` criterion or the fast-lane request that names the kind, as the always-loaded `tests` rule says. The new paragraph carries the rule's own example ("the export works" names none; "an integration test against the staging database" names one), checked against the rule text: they match. A kind named only in `**Changes:**` stays Ts1. This gives up the "logged deviation" escape the old paragraph allowed.
**Instead of:** keeping an unlock recorded in the phase summary or the plan: it lost because the developer and the reviewer would then read two different sources for the same permission, and `git grep -i unlock` finds the word nowhere else in the repository.
**Risks:**
- **RISK-001** A reviewer reads a kind named only in a phase's `**Changes:**` as permitted. Mitigation: the new paragraph says so in so many words, and grep T-1.3 pins it.

### D-002: One regression step, owned by the traced checklist
**Decision:** Infrastructural decision. Step 4 of `src/skills/reviewing/checklists/traced.md` becomes the only description of the cumulative regression check, widened to shared queries, guards, side-effecting calls and consumers outside the plan's scope; `src/agents/reviewer.md:39` only points to it and keeps the removed-guard check that every review runs. This follows the harness rule that procedure lives in the skill's step file and the agent shell points at it. It gives up a reviewer shell that can be read alone without the checklist.
**Instead of:** keeping the full text in the reviewer shell and having step 4 cite it: it lost because an agent shell names only skills, and the checklist is what the cumulative summary hands the reviewer.
**Risks:**
- **RISK-002** Phase and checkpoint reviews lose a check they used to run. Mitigation: the old shell text already limited the cross-flow check to cumulative reviews, so no scope loses it.

### D-003: Two saves, one token
**Decision:** Infrastructural decision. The architect still writes the design record in two saves, but the reason given is that the decisions and phase 1 are readable early, not that the developer starts on them. `ARTIFACT WRITTEN` comes once, after the second save, because the kernel reads verdict tokens from the agent's last message at turn end. Two lines change: `src/agents/architect.md:60` and `src/skills/designing/SKILL.md:22`. This gives up nothing the kernel did.
**Instead of:** emitting the token after the first save so the developer starts early: it lost because a token mid-turn routes nothing, and a second token would be a second verdict for one record.

### D-004: The bench plan is an estimate; `--max-usd` is the only hard limit
**Decision:** Infrastructural decision. `.claude/skills/benchmarking/SKILL.md:31` and `.claude/rules/harness-authoring.md:22` drop every hardcoded dollar figure ("worst case $44", "about 0.75 dollars") and point at the dry run's `planned $<total>` line. Read in `bench/lib/spend.mjs`: `callLimit` caps one call at the task budget or the money left, `spendRefusal` refuses a run with no `--max-usd` or a plan over it, and `bench/run.mjs` resumes the session for each gate stop, so each stop is a new call. The record states no figure of its own. This gives up a number the user could quote without running the dry run.
**Instead of:** keeping a worst-case figure and refreshing it when the suite changes: it lost because nothing derives the figure from the manifest, so it goes stale silently, while the dry run is always current.

### D-005: Proofreading writes only into the project
**Decision:** Infrastructural decision. Proofreading reads the plugin's `references/recurring-errors.md` and, when present, the project's tracked `.picket/recurring-errors.md`, and appends new classes only to the project file, creating it on the first entry. The plugin file becomes a generic list ("Words often confused", no project section). This satisfies SDR 00001 D-005 (nothing writes under the plugin root, which an update replaces). `.gitignore` ignores only `.picket/state/` and `.picket/private-terms.txt`, so the new file is tracked. The backticked `.picket/recurring-errors.md` in the approved text fails `test/repo/markdown-paths.test.mjs`, because that path does not exist and creating it is out of scope. A probe on a clone of `b8b414e9` with the request's text applied gave three misses (the three proofreading files); with `".picket/recurring-errors.md"` added to the test's `ELSEWHERE` group "created at run time or kept machine-local", the paths and references tests passed 11 of 11. The phase adds that one data line, which gives up the brief's "no test change" for one excused path; OQ-001 puts this to the user.
**Instead of:** writing the path without backticks so the test does not see it: it lost because that changes text the user approved word for word, and the repository writes every path in backticks.
**Risks:**
- **RISK-003** The user holds to "no test change". Mitigation: phase 3 runs last, so phases 1 and 2 ship either way, and OQ-001 is answered at the phase 2 gate before phase 3 starts.
- **RISK-004** A later item creates `.picket/recurring-errors.md` in this repository. Mitigation: the test's elsewhere check then fails with `now exists`, which names the entry to remove.

## Scope

**In:**
- The fourteen replacements in `request.md` lines 3 to 23, byte for byte, in the ten files the brief names.
- One `ELSEWHERE` entry in `test/repo/markdown-paths.test.mjs` (D-005, OQ-001).

**Out:**
- Any code, kernel or other test change; creating `.picket/recurring-errors.md`.
- The audit's low flags, the rules, the output style and kernel-written messages.
- Any line of the ten files beyond those the request names.

## Phase 1: Reviewer instructions follow the tests rule and own one regression step

**Touch set:**
- `src/skills/reviewing/checklists/alignment.md`: test-scope floor, lines 60, 64, 69
- `src/skills/reviewing/checklists/traced.md`: regression step 4, line 12
- `src/agents/reviewer.md`: cross-flow paragraph, line 39

**Changes:** Replace the three passages in `alignment.md` with the text at `request.md:4`, `request.md:5` and `request.md:6`, step 4 of `traced.md` with the text at `request.md:18`, and the whole paragraph at `reviewer.md:39` with the text at `request.md:19`. Copy the replacement text from `request.md` exactly, inner quotes and backticks included. The Ts1 row keeps its id, check name and `Major` severity; only the fail-condition cell changes. No other line moves (D-001, D-002).

**Done when:**
- **T-1.1** `alignment.md` line 60 reads exactly the replacement given at `request.md:4`.
- **T-1.2** The Ts1 row's fail-condition cell reads exactly the replacement given at `request.md:5`, and the row still ends `| Major |`.
- **T-1.3** `alignment.md` line 69 reads exactly the replacement given at `request.md:6`, and `git grep -n -w unlock -- src/skills/reviewing/checklists/alignment.md` prints nothing.
- **T-1.4** `traced.md` step 4 reads exactly the replacement given at `request.md:18`.
- **T-1.5** `reviewer.md` line 39 reads exactly the replacement given at `request.md:19`, and `git grep -n cross-flow -- src/` prints nothing.
- **T-1.6** Against the before-image, the base commit `b8b414e9`, `git diff --numstat b8b414e9 -- src/skills/reviewing/checklists/alignment.md src/skills/reviewing/checklists/traced.md src/agents/reviewer.md` prints `3 3` for `alignment.md` and `1 1` for each of the other two.
- **T-1.7** `npm test`'s unit, build, product and timing steps each print `exit 0`. Its `mods` step is red on the base under Claude Code 2.1.323: the before-image, captured 2026-11-13 by `picket verify` on a tree with no `src/` or `test/` change, holds 27 `error TS` lines. After the phase, `grep -c "error TS" .picket/state/verify-test.log` still prints 27.

## Phase 2: Architect, designing and bench texts match the kernel and the runner

**Touch set:**
- `src/agents/architect.md`: two-saves reason, line 60
- `src/skills/designing/SKILL.md`: step 3 token timing, line 22
- `.claude/skills/benchmarking/SKILL.md`: procedure item 1, line 31
- `.claude/rules/harness-authoring.md`: fast lane comparison offer, line 22

**Changes:** Replace the clause at `architect.md:60` with the text at `request.md:9`, the sentence at `designing/SKILL.md:22` with the text at `request.md:10`, procedure item 1 at `benchmarking/SKILL.md:31` with the text at `request.md:22`, and the clause at `harness-authoring.md:22` with the text at `request.md:23`. Copy the text from `request.md` exactly; the rest of each line stays as it is (D-003, D-004). The designing skill's `description` frontmatter is not touched.

**Done when:**
- **T-2.1** `architect.md` line 60 contains the replacement given at `request.md:9`, and the text "the developer starts on the first" appears nowhere in it.
- **T-2.2** `src/skills/designing/SKILL.md` line 22 contains the replacement given at `request.md:10`, and "arrives early" appears nowhere in it.
- **T-2.3** `.claude/skills/benchmarking/SKILL.md` line 31 reads exactly the replacement given at `request.md:22`.
- **T-2.4** `.claude/rules/harness-authoring.md` line 22 contains the replacement given at `request.md:23`.
- **T-2.5** `git grep -n -e 'worst case' -e '\$44' -e '0\.75 dollars' -- .claude/skills/benchmarking/SKILL.md .claude/rules/harness-authoring.md` prints nothing.
- **T-2.6** Against the before-image `b8b414e9`, `git diff --numstat b8b414e9 --` the four touch-set paths prints `1 1` for each.
- **T-2.7** `npm test`'s unit, build, product and timing steps each print `exit 0`, and its `mods` step shows the base's 27 `error TS` lines and no more (before-image as in T-1.7).

## Phase 3: Proofreading writes only into the project

**Touch set:**
- `src/skills/proofreading/SKILL.md`: step 3 read order, line 24
- `src/skills/proofreading/steps/apply.md`: step 6 append target, line 10
- `src/skills/proofreading/references/recurring-errors.md`: intro, heading, project section
- `test/repo/markdown-paths.test.mjs`: excuse the not-yet-created path

**Changes:** Replace step 3 at `SKILL.md:24` with the text at `request.md:13` and step 6 at `apply.md:10` with the text at `request.md:14`. In `recurring-errors.md`, replace line 3 with the text at `request.md:15`, rename the line 7 heading to `## Words often confused`, and remove the blank line, `## Project-specific` and `(none recorded yet)` at the end, so the file ends with the `Undefined acronyms` bullet and one newline. In `test/repo/markdown-paths.test.mjs`, add `".picket/recurring-errors.md",` to the `ELSEWHERE` group whose `why` is "created at run time or kept machine-local", on the line before `".picket/state/",`; nothing else in the test changes (D-005, OQ-001). Do not create `.picket/recurring-errors.md`.

**Done when:**
- **T-3.1** `src/skills/proofreading/SKILL.md` line 24 reads exactly the replacement given at `request.md:13`.
- **T-3.2** `src/skills/proofreading/steps/apply.md` line 10 reads exactly the replacement given at `request.md:14`.
- **T-3.3** `recurring-errors.md` line 3 reads exactly the replacement given at `request.md:15`, line 7 reads `## Words often confused`, and the file holds neither `Project-specific` nor `(none recorded yet)`.
- **T-3.4** Against the before-image `b8b414e9`, `git diff --numstat b8b414e9 --` the four touch-set paths prints `1 1` for `SKILL.md`, `1 1` for `apply.md`, `2 6` for `recurring-errors.md` and `1 0` for the test (the counts the probe on a clone of the base gave for the request's text).
- **T-3.5** `node --test test/repo/markdown-paths.test.mjs test/repo/references.test.mjs` passes every test.
- **T-3.6** `.picket/recurring-errors.md` does not exist, and `git ls-files .picket/recurring-errors.md` prints nothing.
- **T-3.7** `npm test`'s unit, build, product and timing steps each print `exit 0`, and its `mods` step shows the base's 27 `error TS` lines and no more (before-image as in T-1.7).

## Open questions

- **OQ-001** The brief puts every test change out of scope, but the approved text cites `.picket/recurring-errors.md` in backticks, and `test/repo/markdown-paths.test.mjs` then fails on three misses. Does the user accept the one `ELSEWHERE` line D-005 adds? Owner: the user, at the phase 2 gate. Fallback: phase 3 carries the line; if the user declines, phase 3 is rejected at its gate and the only other green path is dropping the backticks, which changes approved text and goes back to the user.

## Revision log
