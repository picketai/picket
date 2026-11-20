## Review: 20261120-admit-reads-three-wordings-rightly · cumulative

APPROVED: all three wordings now get the order lane, and the labelled set still misses the same seven entries it missed at base, now out of 151. The one regression found is Minor: it comes from a spelling close to the exception the plan wrote.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A change request that opens with a change verb the list lacks goes to the research lane." | request.md:2 | PASS | src/lib/shared/admission/signals.mts:41-42; signals.test.mts "every change verb opens a change" |
| S-2 | "A file name or identifier that contains a research word counts as asking a question." | request.md:3 | PASS | signals.mts:111; signals.test.mts "a research word inside a file name" |
| S-3 | "A request that only refers to something irreversible is treated as performing an irreversible step." | request.md:4 | PASS | signals.mts:28; signals.test.mts "the irreversible signal reads a named action" |
| S-4 | "Add the three request texts to the labelled admission cases with the lane each should get (order, order, order)" | request.md:5 | PASS | admit-labelled.test.json:150-152; probe: research, design and research at base, order for all three at head |
| S-5 | "keep every existing labelled case and closure passing" | request.md:5 | PASS | probe: the 148 base entries give the same answer at base and head; 31/31 admission tests pass |
Alignment: PASS (T-1.1 to T-1.7)
Decisions: HONOURED
Regression: 1 unrequested behaviour change
Sources: none
Questions: none
Findings: 1 minor
- [Minor] src/lib/shared/admission/signals.mts:42: the opener exception matches only "write a report" and "write the report", each with a single space. So "Write a short report on how pricing picks the tier.", "Write an analysis report on the cache." and "Write up how the cache invalidation works; no code changes." moved from research at base to order at head. D-001 names only "Create a report on X" as given up, and these are close variants of the phrase it keeps as research. A follow-up request could widen the exception to cover "write a short report", "write an analysis report" and "write up", or let "no code changes" outrank an opening change verb.
Classes: none
Checked: every labelled entry through `laneOf`, base against head in scratch copies (151 entries, the same seven misses, no other answer moved); the three texts match their sources exactly (classify as in design.md, leftovers before `## Brief`, benchmark with "Add" changed to "Build"); the T-1.1 to T-1.3 drives through dist print `lane: order`; targeted admission tests 31/31 pass; no comment lines added; mutation killed, `silenced` empty; the T-1.5 debugging answer holds; the shifts the plan accepts ("Make ... irreversible" to order, "Check whether the irreversible ..." to research, "Log" as an opener) confirmed and not counted.

APPROVED
