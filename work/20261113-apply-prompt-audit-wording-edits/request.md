Apply the eight wording edits the prompt audit proposed to instruction files, with no behaviour or code change:
- .claude/skills/benchmarking/SKILL.md line 31: replace the hardcoded per-lane dollar figures with the plan the dry run prints (each task's budget and the `planned $<total>` line, the worst case).
- .claude/rules/harness-authoring.md line 18: cite test/repo/references.test.mjs as the reach table's enforcer instead of item 08a (D-008); reword "(or, until it is converted, its description)" to "or its description where it has no `when_to_use`"; line 20: state the round-trip example in the present tense.
- src/skills/reviewing/checklists/crosscheck.md line 34: the example row uses work/<id>/design.md#D-003 instead of the missing artifacts/plans path.
- src/skills/expediting/SKILL.md line 33: re-run the admit of step 2 (quoted heredoc form) instead of the inline --text form; the paragraph itself stays, and "at most three" on line 20 stays.
- src/skills/reviewing/steps/pr.md line 5: platform-neutral wording for setting AZDO_PAT instead of setx.
- src/skills/ordering/SKILL.md line 24 and src/skills/designing/SKILL.md line 26: "the gate of CLAUDE.md rule 4".

## Brief
purpose: Bring eight instruction lines back in line with the repository and with each other, as the prompt audit proposed
in scope: Wording edits in .claude/skills/benchmarking/SKILL.md, .claude/rules/harness-authoring.md, src/skills/reviewing/checklists/crosscheck.md, src/skills/expediting/SKILL.md line 33, src/skills/reviewing/steps/pr.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md
out of scope: The audit's flags (test-kind unlock, proofreading appends, cross-flow check, two saves), the 'at most three' wording in expediting, any code, test or kernel change
