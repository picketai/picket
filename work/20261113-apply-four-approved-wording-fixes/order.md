---
kind: order
lane: order
title: Apply four approved wording fixes
date: 2026-11-13
audience: developer
sources: work/20261113-apply-four-approved-wording-fixes/request.md, work/20261113-apply-four-approved-wording-fixes/preflight.txt, .claude/MEMORY.md, .claude/skills/benchmarking/SKILL.md, src/skills/reviewing/checklists/crosscheck.md, src/rules/prose.md, .claude/rules/harness-authoring.md, src/lib/shared/work/next-step.mts, src/lib/hooks/inject/rules/index.mts, test/repo/references.test.mjs, test/repo/dashes.test.mjs, package.json
phases:
  - n: 1
    files: [.claude/MEMORY.md, .claude/skills/benchmarking/SKILL.md, src/skills/reviewing/checklists/crosscheck.md, src/rules/prose.md]
    greps:
      - path: .claude/MEMORY.md
        pattern: '^The ordered steps for one task, kept in a step file of the skill that uses it\. It has one owner; a shell or a SKILL\.md points at it and never copies it\.'
      - path: .claude/MEMORY.md
        pattern: '^_Avoid_: shared step, common step, shared procedure\b'
      - path: .claude/MEMORY.md
        pattern: 'shared procedures folder'
        absent: true
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: '^`/benchmarking <dry\|run\|baseline\|check\|report> \[--harness plugin\|trunk\]'
      - path: .claude/skills/benchmarking/SKILL.md
        pattern: '<run\|baseline'
        absent: true
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: 'again after an amendment, when `picket next` says `review_crosscheck`\.'
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: 'when the architect asks'
        absent: true
      - path: src/rules/prose.md
        pattern: 'no narration of a single tool call \("Now I will read the file"\), no padded recap\. In the main session, a long run of tool calls still gets a one-line update when a result lands or the direction changes\. Test, build and verification outcomes always stay, failures included\.'
      - path: src/rules/prose.md
        pattern: 'no narration of tool use'
        absent: true
    tests: true
    drive: false
---
# Order: Apply four approved wording fixes

## Problem

Four instruction lines say something the repository no longer does. The "Procedure" glossary entry in `.claude/MEMORY.md:49` describes a shared procedures folder that does not exist under `src/skills/`, while `.claude/rules/harness-authoring.md:9` already places procedure in the step file of the skill that uses it. The benchmarking usage line (`.claude/skills/benchmarking/SKILL.md:15`) omits the `dry` verb its own table offers at line 23. The cross-check opener (`src/skills/reviewing/checklists/crosscheck.md:3`) says the architect asks for the re-check, but the kernel triggers it: `picket next` returns `review_crosscheck` after an amended drift (`src/lib/shared/work/next-step.mts:92`). The prose rule (`src/rules/prose.md:15`) bans all narration of tool use, which the user narrowed. The binding constraints are the user's exact replacement text and no code, test or kernel change.

## Decisions

### D-001: One phase for all four edits
**Decision:** The four edits ship as one phase. Each is a single in-line replacement in a different file, six criteria cover them (one per file, the diff shape, the test run), and no edit depends on another, so splitting adds a gate without making a review smaller.
**Instead of:** two phases split by audience (the shipped `src/` files against the repository-only `.claude/` files), as the previous wording item did: that split was forced by its criteria cap, which four edits do not reach.

### D-002: The user's text is copied verbatim
**Decision:** The developer copies each replacement exactly as the request gives it, punctuation and backticks included, and changes nothing else on the line or in the file. Every edit replaces text inside an existing line, so each file keeps its line count (checked with a scratch replay: 86, 39, 35 and 16 lines before and after), the budgets in `test/timing/budgets.test.mjs` cannot move, and `file:line` citations in other records still land on the same lines. The greps in the frontmatter were run on the replayed text: every presence grep is false on the base and true after, every absence grep the reverse.
**Instead of:** letting the developer smooth the wording into the surrounding sentence: the user approved each line word by word, so any deviation reopens that approval.
**Risks:**
- **RISK-001** The new prose rule line contains straight double quotes inside a sentence; an editor or a shell heredoc can turn them into curly quotes or escape them. Mitigation: the prose grep matches the straight quotes and the parentheses literally, so a changed character fails `picket verify`.

## Scope

**In:**
- the four replacements the request lists, in `.claude/MEMORY.md`, `.claude/skills/benchmarking/SKILL.md`, `src/skills/reviewing/checklists/crosscheck.md` and `src/rules/prose.md`

**Out:**
- any code, test or kernel change
- the admit hint in `src/lib/verbs/admit/index.mts`, which is its own item
- the low flags the user chose to leave
- the agent memory file `.claude/agent-memory/picket-architect/skill-base-directory-facts.md`, which also mentions the procedures folder but is not an instruction line the user reviewed

## Phase 1: Replace the four lines

**Touch set:**
- `.claude/MEMORY.md`: Procedure glossary entry, lines 49 to 50
- `.claude/skills/benchmarking/SKILL.md`: usage line 15 gains dry
- `src/skills/reviewing/checklists/crosscheck.md`: line 3 names the trigger
- `src/rules/prose.md`: line 15 narrows the narration ban

**Changes:**
- `.claude/MEMORY.md`: keep line 48 (`**Procedure**:`). Replace line 49 with "The ordered steps for one task, kept in a step file of the skill that uses it. It has one owner; a shell or a SKILL.md points at it and never copies it." Replace line 50 with "_Avoid_: shared step, common step, shared procedure".
- `.claude/skills/benchmarking/SKILL.md` line 15: replace `<run|baseline|check|report>` with `<dry|run|baseline|check|report>`; the rest of the usage line stays.
- `src/skills/reviewing/checklists/crosscheck.md` line 3: the first sentence becomes "Read-only artifact-consistency pass before Phase 1, and again after an amendment, when `picket next` says `review_crosscheck`." The rest of the line stays.
- `src/rules/prose.md` line 15: replace "no narration of tool use, no padded recap." with "no narration of a single tool call ("Now I will read the file"), no padded recap. In the main session, a long run of tool calls still gets a one-line update when a result lands or the direction changes." The text before and after stays.

**Done when:**
- **T-1.1** `.claude/MEMORY.md` line 48 still reads `**Procedure**:`, line 49 holds the new definition, line 50 reads `_Avoid_: shared step, common step, shared procedure`, and the file no longer contains "shared procedures folder".
- **T-1.2** `.claude/skills/benchmarking/SKILL.md` line 15 starts with `` `/benchmarking <dry|run|baseline|check|report> `` and the file no longer contains `<run|baseline`.
- **T-1.3** `src/skills/reviewing/checklists/crosscheck.md` line 3 starts with the new first sentence naming `picket next` and `review_crosscheck`, and the file no longer contains "when the architect asks".
- **T-1.4** `src/rules/prose.md` line 15 holds the new narration sentence and the line still ends "Test, build and verification outcomes always stay, failures included."; the file no longer contains "no narration of tool use".
- **T-1.5** Against the base commit `80123bcc`, `git diff --numstat` for the phase shows `.claude/MEMORY.md` with 2 lines added and 2 removed, each other touch set file with 1 and 1, and no other file.
- **T-1.6** `npm test` exits 0 in its typecheck, unit, build, product and timing steps, including `test/repo/references.test.mjs` and `test/repo/dashes.test.mjs`; the `mods` step prints 27 `error TS` lines, the count `claude plugin validate --strict dist` printed on the base on 2026-11-13 under Claude Code 2.1.323.

## Open questions

none

## Revision log
