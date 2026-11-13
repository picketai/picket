---
kind: order
lane: order
title: Apply four approved rule wording fixes
date: 2026-11-13
audience: developer
sources: work/20261113-apply-four-approved-rule-wording-fixes/request.md, src/rules/security-paths.md, src/rules/prose.md, src/templates/claude-block.md, CLAUDE.md, .claude/MEMORY.md, src/output-styles/custom.md, test/timing/budgets.test.mjs, test/kernel/init.test.mjs
phases:
  - n: 1
    files: [src/rules/security-paths.md, src/templates/claude-block.md, CLAUDE.md, .claude/MEMORY.md, src/output-styles/custom.md, src/rules/prose.md]
    greps:
      - path: src/rules/security-paths.md
        pattern: 're-run admit with the request in a quoted heredoc and `--touched <paths>` \(`picket admit --request - --touched <paths> --human`\), and switch to the skill it names\.'
      - path: src/rules/security-paths.md
        pattern: '\bswitch skills\b'
        absent: true
      - path: src/templates/claude-block.md
        pattern: 'Only `picket` verbs change state; never edit it by hand\.'
      - path: src/templates/claude-block.md
        pattern: 'Only `picket route` changes state'
        absent: true
      - path: CLAUDE.md
        pattern: 'Only `picket` verbs change state; never edit it by hand\.'
      - path: CLAUDE.md
        pattern: 'Only `picket route` changes state'
        absent: true
      - path: .claude/MEMORY.md
        pattern: '`picket` verbs as the only state mutators, with `route` the only one that records a verdict'
      - path: .claude/MEMORY.md
        pattern: '`route` as the only state mutator\b'
        absent: true
      - path: src/output-styles/custom.md
        pattern: 'a shell.s or skill.s `## Output` block'
      - path: src/output-styles/custom.md
        pattern: 'output_format'
        absent: true
      - path: src/rules/prose.md
        pattern: 'A list of recommendations or requirements past five items splits into "must" and "nice to have"\.'
      - path: src/rules/prose.md
        pattern: '\bA list past five items\b'
        absent: true
    tests: true
    drive: false
---
# Order: Apply four approved rule wording fixes

## Problem
The always-loaded security-paths rule tells the lead to escalate with `picket admit --touched <paths>`, which prints `lane: (none)` without request text (probed in a scratch repo on base 00bff4bb: no text gives `lane: (none) · re-run with the request on stdin`, the heredoc form with `--touched src/auth/login.ts` gives `lane: design`). Three more lines contradict the system: CLAUDE.md rule 2 and the Floor glossary entry name `route` as the only state mutator, the output style cites an `<output_format>` block no shell carries, and the prose rule splits every list past five items. The user approved the replacement text for each on 2026-11-13. Two budgets bind: CLAUDE.md at most 2048 bytes and the injected rule text at most 10000 characters (`test/timing/budgets.test.mjs`), and CLAUDE.md must start with `src/templates/claude-block.md` verbatim (`test/kernel/init.test.mjs`).

## Decisions
### D-001: One phase, verbatim in-place replacement
**Decision:** All four fixes land in one phase as six single-line edits, each replacing only the named text with the request's exact wording and leaving every other byte, the line wrapping included, as it is. Fix 2 must change `src/templates/claude-block.md` and `CLAUDE.md` together, since the init test requires the repository's CLAUDE.md to start with the template. The text is the user's, approved line by line, so the developer copies it from the request and never from this record.
**Instead of:** one phase per fix: four gates for six one-line edits cost more review than they buy, and nothing in one fix depends on another.
**Risks:**
- **RISK-001** `src/output-styles/custom.md` line 12 is hard-wrapped near 80 columns and grows by 4 characters; rewrapping the paragraph would change more lines than the request names. Mitigation: keep the edit on line 12 alone; T-1.6 checks that each file changes by exactly one line.

### D-002: Existing budget and init tests are the evidence, no new test
**Decision:** The phase adds no test. The greps in the frontmatter pin each new sentence and the absence of each old one, and the existing tests cover the binding constraints: the CLAUDE.md byte budget, the injected rule budget and the template-prefix check. Derived sizes after the edit: CLAUDE.md 2022 + 22 = 2044 of 2048 bytes; the injected rule text 9760 + 98 (security-paths) + 35 (prose) = 9893 of 10000 characters, measured with `joinedRules()` on the current dist, whose `rules/` matches `src/rules/`.
**Instead of:** a unit test asserting each new sentence: it would pin wording that the next approved rewording breaks, and the greps already check the same text.
**Risks:**
- **RISK-002** The budget test reads CLAUDE.md's raw size, and a CRLF save adds one byte per line (25 lines, 2069 bytes), which fails the 2048 budget. Mitigation: all six files are LF today (zero CR bytes counted); the developer saves them LF.
- **RISK-003** `picket verify` runs `npm test`, and on base 00bff4bb its `mods` step (`claude plugin validate --strict dist`) already exits 1 with 27 `error TS` lines, while unit, build, product and timing exit 0 (`.picket/state/verify-test.log`, 2026-11-13). The verify `tests` check is therefore red before any edit. Mitigation: T-1.7 states the base's step results as the pass condition, so a red mods step with an unchanged count is not this phase's failure.

## Scope
**In:**
- The four replacements the request names, in `src/rules/security-paths.md`, `src/templates/claude-block.md`, `CLAUDE.md`, `.claude/MEMORY.md`, `src/output-styles/custom.md` and `src/rules/prose.md`.

**Out:**
- Any kernel, hook or test change, including `picket admit`'s own hint text.
- Any other wording in these files or elsewhere, such as the older audit reports under `artifacts/reports/` that mention `<output_format>`.

## Phase 1: Apply the four wording fixes
**Touch set:**
- `src/rules/security-paths.md`: line 3, escalation command sentence
- `src/templates/claude-block.md`: line 8, rule 2 state sentence
- `CLAUDE.md`: line 8, same rule 2 sentence
- `.claude/MEMORY.md`: line 27, Floor glossary entry
- `src/output-styles/custom.md`: line 12, contract obligation example
- `src/rules/prose.md`: line 9, list split sentence

**Changes:**
- `src/rules/security-paths.md` line 3: replace the sentence that begins "A change under one of these paths" and ends "and switch skills." with fix 1's text from the request, verbatim.
- `src/templates/claude-block.md` line 8 and `CLAUDE.md` line 8: replace "Only `picket route` changes state." with fix 2's sentence.
- `.claude/MEMORY.md` line 27: replace "`route` as the only state mutator" with fix 2's Floor text; the rest of the entry stays.
- `src/output-styles/custom.md` line 12: replace "an `<output_format>` block" with fix 3's text; no rewrap (RISK-001).
- `src/rules/prose.md` line 9: replace the list split sentence with fix 4's sentence.

**Done when:**
- **T-1.1** `src/rules/security-paths.md` carries fix 1's sentence ending "and switch to the skill it names." and no longer contains "switch skills".
- **T-1.2** `src/templates/claude-block.md` and `CLAUDE.md` both carry "Only `picket` verbs change state; never edit it by hand." and neither contains "Only `picket route` changes state".
- **T-1.3** `.claude/MEMORY.md`'s Floor entry reads "the verdict tokens, `picket` verbs as the only state mutators, with `route` the only one that records a verdict, the guards, the user gate, the budgets."
- **T-1.4** `src/output-styles/custom.md` line 12 reads "token, a shell's or skill's `## Output` block, a template heading), the contract wins." and the file no longer contains `output_format`.
- **T-1.5** `src/rules/prose.md` carries "A list of recommendations or requirements past five items splits into "must" and "nice to have"." and no longer contains "A list past five items".
- **T-1.6** `git diff --numstat 00bff4bb -- src CLAUDE.md .claude/MEMORY.md` lists exactly the six touch set paths, each with `1` added and `1` deleted.
- **T-1.7** `wc -c CLAUDE.md` prints 2044, and `npm test` reports `unit`, `build`, `product` and `timing` at exit 0 (the budget and init tests run there), with the `mods` step printing 27 `error TS` lines, as on the base.

## Open questions
none

## Revision log
