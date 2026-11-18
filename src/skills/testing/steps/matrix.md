# Testing: matrix

The matrix has one row per tested criterion and one column per case kind. Each cell gets a case, or a note that says why it has none.

1. List the tested criteria from the brief's `## Criteria`, with their text. A criterion whose text cannot be checked on a running system (it names no observable answer, or a word like "fast" with no number) is untestable: record it with a note such as `picket test note <id> T-3.1 untestable --why "fast names no number"` and give it no cases.
2. Read each criterion against the six case kinds and mark the cells that carry a real risk:
   - `normal`: the main path the request describes works, with valid data.
   - `boundary`: the edges of a value the request names: zero, one, the maximum, an empty list, the first and last day. A boundary the request gives no outcome for gets no case: it becomes a question, as step 4 of `steps/results.md` says.
   - `negative`: invalid input is refused with the answer the request implies (a 400 with a reason), and nothing is stored.
   - `permission`: both ways. A user without the right is refused, and a user with it is let through. A refusal alone proves nothing if no one can pass.
   - `state`: the order of events matters: the same request twice, an action on something already closed or deleted.
   - `integration`: the answer depends on another service; check what reaches the caller when that service answers.
3. Spend the cap the brief's `## Limits` names: at most six cases per criterion per round, one per kind. A normal case comes first for every criterion; every criterion needs a passed case of its own before the round can be approved.
4. A cell with no real risk gets no case. Record it so the report shows it was weighed: `picket test note <id> T-2.1 permission not-run --why "the endpoint has no roles"`.
5. A cell with a risk you cannot run this round (the cap is reached, a fixture is missing) is recorded too: `not-covered` when the cap stopped it, `blocked` when the environment did.
6. From round 2, start from the brief's `## Earlier rounds`: `picket test rerun <id>` has already run them again. Add cases only where a fix changed the behaviour a criterion describes.

Example: `T-2.1 an order total includes tax` gives a `normal` case (one item, tax added), a `boundary` case (a zero-price item), a `negative` case (a negative quantity is refused) and a `not-run` note for `permission` when the endpoint has no roles.
