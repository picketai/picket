Apply four wording edits the user approved one by one on 2026-11-13. Wording only: no code, test or kernel change. Use the exact replacement text below.

1. .claude/MEMORY.md, the "Procedure" glossary entry (lines 48 to 50). Keep the "**Procedure**:" line. Replace the definition line "A step file in the skills' shared procedures folder that two or more skills or agents follow (the phase loop, the gate, the cumulative review). It has one owner and is cited, never copied." with "The ordered steps for one task, kept in a step file of the skill that uses it. It has one owner; a shell or a SKILL.md points at it and never copies it." Replace "_Avoid_: shared step, common step" with "_Avoid_: shared step, common step, shared procedure".

2. .claude/skills/benchmarking/SKILL.md line 15: the usage line gains the dry verb. Replace "`/benchmarking <run|baseline|check|report> [--harness plugin|trunk] [--tasks all|lane:<lane>|<id,...>] [--runs N]`" with "`/benchmarking <dry|run|baseline|check|report> [--harness plugin|trunk] [--tasks all|lane:<lane>|<id,...>] [--runs N]`".

3. src/skills/reviewing/checklists/crosscheck.md line 3, first sentence: replace "Read-only artifact-consistency pass before Phase 1, and again after an amendment when the architect asks." with "Read-only artifact-consistency pass before Phase 1, and again after an amendment, when `picket next` says `review_crosscheck`."

4. src/rules/prose.md line 15: replace "no narration of tool use, no padded recap." with "no narration of a single tool call ("Now I will read the file"), no padded recap. In the main session, a long run of tool calls still gets a one-line update when a result lands or the direction changes." The rest of the line stays.

## Brief
purpose: Correct four instruction lines the user reviewed one by one: a stale glossary entry, a usage line, who triggers the re-check, and the narration ban
in scope: The exact replacements in the request, in .claude/MEMORY.md, .claude/skills/benchmarking/SKILL.md, src/skills/reviewing/checklists/crosscheck.md and src/rules/prose.md
out of scope: Any code, test or kernel change; the admit hint in src/lib/verbs/admit/index.mts, which is its own item; the low flags the user chose to leave
