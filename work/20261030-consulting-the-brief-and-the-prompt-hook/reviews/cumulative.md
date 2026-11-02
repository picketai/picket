## Review: 20261030-consulting-the-brief-and-the-prompt-hook · cumulative

The verdict is APPROVED. The staged fix moves the strategic flag to the end of the finding line, where `lint.schema` accepts it, and no Critical or Major finding is left open.

Requirements: PASS (8)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "understanding merges into consulting with discuss and interview modes and a capture step" | request.md:1 | PASS | src/skills/consulting/SKILL.md:23-25, steps/interview.md, steps/capture.md |
| S-2 | "a brief (purpose, in scope, out of scope) recorded by picket open" | request.md:1 | PASS | src/lib/verbs/open/index.mts:97, src/lib/shared/work/brief.mts:11 |
| S-3 | "sent by picket next to the analyst and the architect" | request.md:1 | PASS | src/lib/shared/work/send.mts:89,93; send.test "a brief adds purpose, in scope and out of scope" |
| S-4 | "a new UserPromptSubmit hook inject.consulting that adds one context line suggesting picket:consulting on direction and stress-test phrasings" | request.md:1 | PASS | src/lib/hooks.mts:20, src/lib/hooks/inject/consulting/index.mts:5,22-33 |
| S-5 | "strategy documents (charters, ratified SDRs) reach the architect" | request.md:1 | PASS | src/agents/architect.md:23 |
| S-6 | "a cross-check check for a decision contradicting a ratified SDR" | request.md:1 | PASS | src/skills/reviewing/checklists/crosscheck.md:9,20 |
| S-7 | "a [STRATEGIC REVIEW NEEDED] flag named by picket close" | request.md:1 | PASS | src/lib/verbs/close/close.mts:141, block.mts:19,24,31; src/agents/analyst.md:31 (staged) now places the flag where lint accepts it |
| S-8 | "CLAUDE.md rule 1 routes direction questions to consulting" | request.md:1 | PASS | CLAUDE.md:7, src/templates/claude-block.md:7 |
Alignment: PASS (21)
Decisions: HONOURED
Regression: 1 unrequested behaviour change (a `## Brief` section that the request text itself carries is read as a brief; see the Minor finding)
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/shared/work/brief.mts:18: `readBrief` takes the last `## Brief` section of any `request.md`, so a request opened without the flags but holding that section (for example, a pasted ticket) sends brief lines to the analyst or architect. The developer left this open in `phases/3.fixes.md` on D-001 grounds. Because it is Minor, it does not block.
Classes: none
Checked:
- The staged `src/agents/analyst.md:31` and `src/skills/documenting/templates/report.md` place the flag at the end of the `R-###` line. In the earlier probe, `lint.schema` passes that form, and `reportFindings` still returns the id for it.
- D-003's "as `[ARCHITECT REVIEW NEEDED]` sits today" matches the new wording.
- Nothing else changed since 997afd7 outside the work item and the unrelated agent-memory files.

APPROVED
