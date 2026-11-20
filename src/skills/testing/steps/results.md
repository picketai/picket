# Testing: results

The runner decided each outcome. These records say what only you can know, each through one verb: `picket test classify`, `picket test note`, `picket test ask` or `picket test defect`. Put the text after `--why`, `--evidence`, `--question`, `--choices`, `--basis` and `--intent` in double quotes: unquoted, each of these verbs refuses the extra words and saves nothing.

1. Classify every failed case of the round, for example `picket test classify <id> C-03 product --evidence "POST /orders with an empty basket answered 201; T-2.1 says it is refused"`. The class is one of three:
   - `product`: the item does not do what the criterion says, on a request whose shape came from a source (step 2 of `steps/cases.md`) or from a passed case, checked against the criterion's words. Evidence: the request, the answer and the criterion's words it contradicts, as in the example above.
   - `test`: the case was wrong: a wrong path, a wrong expectation, data another case changed. A failure you doubt is classed `test` too: a shape no source showed, or an answer that points at the case's own input, such as a 500, or a 400 naming a field of a body you composed. Write a corrected case under a new id once the shape is found; the wrong one stays classed `test`. The corrected case is the one exception to one case per kind, and it counts against the round's cap.
   - `environment`: the stack failed the case, not the item: a service that did not start, a mock with no answer (the `gap:` part of the case line), a timeout on a dependency. Evidence: the step and the error the runner printed, or the gap. The kernel refuses `product` for a case with a gap.
2. A case whose first run failed and whose second run passed is recorded as passed and unstable; it needs no class, but an unstable case is never kept as a scenario. Name it in the block's sentence when it is the only passed case of its criterion.
3. Record each cell of the matrix with no case, such as `picket test note <id> T-2.1 boundary not-covered --why "the cap was reached"`. The outcome is one of three. `blocked`: a case could not run (no fixture user, a service down). `not-run`: the cell carries no risk for this criterion. `not-covered`: the cap stopped it.
4. Ask a question when the request gives no outcome for a business edge of a tested criterion, a value past a limit the request or its domain sets, even when no case depends on the answer; never leave such a gap only in the block. At most three per item. A technical edge (a size of 0, a malformed value) stays a `negative` or `boundary` case with the answer the request implies. When the request's words point to an answer, give it as the default:

   ```
   picket test ask <id> T-2.1 --question "Is an order with an empty basket an error?" --choices "yes, refuse it | no, store it as a draft" --default "yes, refuse it" --basis "T-2.1 says an order needs items"
   ```

   When no words of the request point to one, give no default:

   ```
   picket test ask <id> T-2.1 --question "Is a discount code worth more than the order total accepted?" --choices "yes, the total becomes 0 | no, refuse it with a 400"
   ```

   Two to four choices, each a complete answer. A default is one of them and needs `--basis`, the words of the request or the brief it rests on. A question about how the code works is not asked.
5. A criterion that cannot be tested as written (step 1 of `steps/matrix.md`) was recorded with `untestable`; the verdict goes to the architect for a rewording, so ask no question about it.
6. A request you sent on the way that answered against the request, an unchanged document or the base, outside every tested criterion, is a defect to record, never a planned case. Write steps that assert the correct answer and pass them on stdin in a quoted heredoc, such as `picket test defect <id> --kind negative --intent "an order with a negative quantity is refused" --evidence "POST /orders with quantity -1 answered 201; the API description says quantity is at least 1"`. The runner runs them and records the stack's answer as `K-01`; steps that pass, are blocked or meet a mock gap record nothing. A recorded defect never blocks the item: from the next round `picket test rerun` runs it again, and at close it becomes a known defect unless its latest rerun passed.
7. Run `picket test report <id>`. It writes `work/<id>/test.md` from the rows and prints the counts line and the derived verdict. A line `unclassified: C-03` means step 1 is not done; classify the case and run the report again.
8. The block repeats the counts line on `Results:`, the number of questions asked on `Questions:`, and ends with the token the report printed. The kernel refuses any other token.
