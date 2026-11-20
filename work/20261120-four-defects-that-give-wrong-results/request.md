Fix four small defects that can give a wrong result:
1. A "continue with a fresh developer" reply at a resolve_block gate during a fix round skips the developer. On 20261120-browser-adapter-for-scenario-steps the developer stalled while fixing cumulative review findings; after the user's c, picket reply answered review_cumulative because every phase was approved, so the review would have run on unfixed code. After such a reply the next step is the developer's fix_findings again.
2. src/lib/shared/mocks/stub.mts (readTraffic, about line 106) reads an unreachable stub as an empty log. When the read before a run fails and the read after it succeeds, the whole earlier log, gaps included, is counted as that run's traffic. A failed read must not turn earlier traffic into the run's own.
3. At the set_case_cap gate a reply of 309 or more digits passes the number pattern, becomes Infinity, is saved as null, and the gate asks again (src/lib/verbs/reply/table.mts, about line 114). Refuse a total that is not a safe integer.
4. picket test defect has no cap per round, while cases are capped. Give it a cap per round, shown in the brief and enforced by the verb, so recording defects cannot turn into exploratory testing.

## Brief
purpose: Close four small defects that can each produce a wrong result: a review on unfixed code, traffic blamed on the wrong run, a cap reply saved as nothing, and uncapped defect recording.
in scope: The reply and next step after a continue at a stall during a fix round; readTraffic in src/lib/shared/mocks/stub.mts on a failed read; the total accepted at the set_case_cap gate; a cap per round for picket test defect, in the brief and the verb; unit tests for each
out of scope: The admission wording defect (its own item); new gate options or verdict tokens; the number six per criterion; the setting testing; any benchmark run
