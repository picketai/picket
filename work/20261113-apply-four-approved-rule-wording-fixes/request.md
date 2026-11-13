Apply the four wording fixes the user approved one by one on 2026-11-13, from the audit of the rules, the output style and the CLAUDE.md block. Wording only, no behaviour or code change.

1. src/rules/security-paths.md line 3: the escalation command `picket admit --touched <paths>` returns no lane without request text. Replace the sentence with: "A change under one of these paths always takes the design lane, whatever `picket admit` said from the text alone: re-run admit with the request in a quoted heredoc and `--touched <paths>` (`picket admit --request - --touched <paths> --human`), and switch to the skill it names."

2. src/templates/claude-block.md line 8 and the same line of CLAUDE.md (rule 2): replace "Only `picket route` changes state." with "Only `picket` verbs change state; never edit it by hand." CLAUDE.md stays within its 2048-byte budget. In .claude/MEMORY.md, the Floor entry: replace "`route` as the only state mutator" with "`picket` verbs as the only state mutators, with `route` the only one that records a verdict".

3. src/output-styles/custom.md line 12: replace "an `<output_format>` block" with "a shell's or skill's `## Output` block".

4. src/rules/prose.md line 9: replace "A list past five items splits into "must" and "nice to have"." with "A list of recommendations or requirements past five items splits into "must" and "nice to have"."

## Brief
purpose: Remove one broken command and three contradictions from the always-loaded rules, the output style and the CLAUDE.md block
in scope: The exact replacement text in six files: security-paths.md, claude-block.md, CLAUDE.md, .claude/MEMORY.md, custom.md, prose.md
out of scope: Any kernel or behaviour change, and any wording the request does not name
