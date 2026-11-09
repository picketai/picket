Fix lane admission so `picket admit` never answers `fast` from the request text alone:
1. When a request names fewer files than the fast cap and no `--touched` list is given, admit answers `pending` (fast needs a touch set) instead of `fast`, and names what the lead must pass: `picket admit --request <file> --touched <paths>`. Only an answer with a touched list can be `fast`. Update the lane skills and CLAUDE.md block steps that run admit so the lead finds the touch set in code and re-runs admit before `picket open`, and the expediting skill no longer opens an item that its first edit re-admits to a heavier lane.
2. A request with three or more numbered items is never fast.
3. Add today's four misroutes to src/lib/shared/admission/admit-labelled.test.json with their correct lanes: the seven-item kernel gaps request (order), the session switch and project status line request (order), the three minor review findings request (order), and the descriptive mutate HEAD fallback bug report that admit read as research (fast).

## Brief
purpose: Stop picket admit from answering fast before the touch set is known, so no fast item is opened and then abandoned.
in scope: A pending answer when fewer files than the fast cap are named and no --touched list is given; numbered items as a signal; the lane skills' and CLAUDE.md block's admit steps; today's four misroutes in the labelled admission tests.
out of scope: Admit grepping the repository itself; design-lane signals; other kernel verbs.
