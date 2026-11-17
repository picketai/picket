# Testing: results

The runner decided each outcome. These records say what only you can know, each through one verb: `picket test classify`, `picket test note` or `picket test ask`.

1. Classify every failed case of the round with `picket test classify <id> <case> <class> --evidence <what the stack answered>`. The class is one of three:
   - `product`: the item does not do what the criterion says. Evidence: the request, the answer and the criterion's words it contradicts, such as `POST /orders with an empty basket answered 201; T-2.1 says it is refused`.
   - `test`: the case was wrong: a wrong path, a wrong expectation, data another case changed. Write a corrected case under a new id; the wrong one stays classed `test`.
   - `environment`: the stack failed the case, not the item: a service that did not start, a mock with no answer, a timeout on a dependency. Evidence: the step and the error the runner printed.
2. A case whose first run failed and whose second run passed is recorded as passed and unstable; it needs no class, but an unstable case is never kept as a scenario. Name it in the block's sentence when it is the only passed case of its criterion.
3. Record each cell of the matrix with no case: `picket test note <id> <criterion> <kind> <blocked | not-run | not-covered> --why <text>`. `blocked`: a case could not run (no fixture user, a service down). `not-run`: the cell carries no risk for this criterion. `not-covered`: the cap stopped it.
4. Ask a question only when the request leaves a business matter open and a case depends on the answer, at most three per item:

   ```
   picket test ask <id> T-2.1 --question "Is an order with an empty basket an error?" --choices "yes, refuse it | no, store it as a draft" --default "yes, refuse it" --basis "T-2.1 says an order needs items"
   ```

   Two to four choices, each a complete answer. A default is one of them and needs `--basis`, the words of the request or the brief it rests on. A question about how the code works is not asked.
5. A criterion that cannot be tested as written (step 1 of `steps/matrix.md`) was recorded with `untestable`; the verdict goes to the architect for a rewording, so ask no question about it.
6. Run `picket test report <id>`. It writes `work/<id>/test.md` from the rows and prints the counts line and the derived verdict. A line `unclassified: C-03` means step 1 is not done; classify the case and run the report again.
7. The block repeats the counts line on `Results:`, the number of questions asked on `Questions:`, and ends with the token the report printed. The kernel refuses any other token.
