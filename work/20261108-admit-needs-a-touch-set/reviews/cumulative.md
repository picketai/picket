## Review: 20261108-admit-needs-a-touch-set · cumulative

Approved: every request sentence and every T-1.x to T-3.x criterion has code and test evidence, and I re-drove the admit answers from the source entry point.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "When a request names fewer files than the fast cap and no `--touched` list is given, admit answers `pending` (fast needs a touch set) instead of `fast`" | request.md:2 | PASS | src/lib/shared/admission/lane.mts:45; src/lib/verbs/admit/index.test.mts:59 |
| S-2 | "names what the lead must pass: `picket admit --request <file> --touched <paths>`" | request.md:2 | PASS | lane.mts:8; index.test.mts:64 |
| S-3 | "Only an answer with a touched list can be `fast`." | request.md:2 | PASS | lane.mts:45-46; the one exception is a forced `lane: fast` line (lane.mts:20), which is the user's word under D-001 |
| S-4 | "Update the lane skills and CLAUDE.md block steps that run admit so the lead finds the touch set in code and re-runs admit before `picket open`" | request.md:2 | PASS | src/templates/claude-block.md:7; CLAUDE.md:7; src/skills/expediting/SKILL.md:20-22; src/skills/debugging/SKILL.md:70 |
| S-5 | "the expediting skill no longer opens an item that its first edit re-admits to a heavier lane" | request.md:2 | PASS | expediting/SKILL.md:21 (admit with --touched, then open nothing unless fast); the old first-Edit re-check is gone |
| S-6 | "A request with three or more numbered items is never fast." | request.md:3 | PASS | signals.mts:43,100; lane.mts:38,70; index.test.mts:79 |
| S-7 | "the seven-item kernel gaps request (order)" and "the session switch and project status line request (order)" | request.md:4 | PASS | admit-labelled.test.json:132,133 |
| S-8 | "the three minor review findings request (order)" | request.md:4 | PASS | admit-labelled.test.json:134 |
| S-9 | "the descriptive mutate HEAD fallback bug report that admit read as research (fast)" | request.md:4 | PASS | admit-labelled.test.json:135, labelled fast; it is still a counted miss under OQ-001 |

Alignment: PASS (20 of 20 criteria)
Decisions: HONOURED
Regression: none. Consumers of `admit`, `laneOf`, `overridesAdmission` and `Signals` outside the plan: open/index.mts:76 (pending ranks with fast, as D-001 says), bench/test/tasks.test.mjs:13 (the developer logged this deviation in phase 1), and the verdict `admitted` field (a free string in verdict-log.mts:4). No other constructor of `Signals` exists. The expediting re-check at the first Edit was removed on purpose: D-004 and T-3.3 require it.
Sources: none
Questions: none
Findings: clean
- [Nit] src/lib/shared/admission/admit-labelled.test.json:133: entries 133 and 134 drop the trailing newline of their request.md files, but Changes says to drop it only for the kernel gaps entry. The developer logged this in phase 2. Admission gives the same answer either way.
Classes: none
Checked: the labelled share at HEAD by script is 7 of 134 misses (0.948); the six old misses plus the mutate entry match T-1.6 and T-2.5. The four new entries match their request.md files byte for byte, apart from the trailing newline, and the set holds 134 entries. Drives from src/bin/picket.mts: pending without --touched, fast with it, an empty `--touched ''` stays pending, the kernel gaps request gives order with "lists 7 numbered items", and a forced fast with 3 items stays fast. Tests run: the admission, admit, open, lane-check, init and budget suites, 85 pass, 0 fail. CLAUDE.md is 2352 bytes and starts with the template. lint.craft's TK1 on bench/test/tasks.test.mjs flags an edited helper in an existing test, not a new performance test. As the lead noted, the mutation result (scripts/docs.mjs:120, killed) belongs to the other item and covers no line of this one.

APPROVED
