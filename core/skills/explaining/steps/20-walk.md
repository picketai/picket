# Write the walkthrough

Fill the output shape in SKILL.md section by section. Keep the user's question verbatim on the first line.

## Starting data

One row per value the actor brings in or the system holds before the first step. `From` is where you read it; for a value the user gave, write `user, this conversation`. Illustrative values the user asked for are `[ASSUMED]` and say so in `From`.

## Walkthrough

One numbered step per thing that happens, in the order the application does it. Each step names:

- what the actor does or what the system does next, in plain words;
- the code location that does it (`path:line`), `[VERIFIED]` when you read that line; in concept mode, the URL and section heading that states the rule;
- the values going in, the rule applied, and the values coming out.

A rule you read in code is `[VERIFIED]`. A value you computed by applying that rule to verified inputs is `[INFERRED]`, and the step shows the computation with real numbers: "subtotal 40.00 + tax 8% = 43.20". A step that mixes sources takes the weakest marker of its parts.

Skip steps that change no value the user cares about, and say so in one line ("logging and metrics: no data change").

## End state

One row per value that changed, plus any value the user asked about that did not change. `Before` comes from `Starting data` or an earlier step; `From` names the step number that produced `After`.

## Not known

Every value the flow needs that you could not find, with where you searched and what the walkthrough shows in its place. Never fill one with a plausible value marked `[VERIFIED]` or `[INFERRED]`. Write `none` when nothing is missing. In concept mode this includes what no reliable source answered, even when a blog did.

## Sources

Concept and mixed mode only. One line per page fetched: the URL and what it grounded. A lead that grounded nothing is listed as a lead. A page the walkthrough did not follow, when two sources disagreed, is listed with the reason.

## Check before sending

- Every value in every table and step has a marker.
- Every `[VERIFIED]` cites a source the user can open or rerun: a path or command in codebase mode, a URL with its section in concept mode.
- Every `[INFERRED]` shows the steps from verified facts.
- Every gap is under `Not known`, not hidden behind an `[ASSUMED]` value without saying so.
- No secret value appears; masked personal data says it is masked.

Fix any line that fails, then send. Close with at most one line offering the next scenario or the research lane, never both.
