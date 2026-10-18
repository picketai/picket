# Debugging, step 2: localize

Narrow the failure to one line and one reason, with evidence at every step. A guess about where the bug is goes on the hypothesis list, never into the code.

## Shrink the input

Remove parts of the failing input while it still fails: half the line items, then half again; drop optional fields; shorten strings. Stop at the smallest input that still fails. Example: an invoice with 40 lines fails; 20 still fail; 10 pass; the 11th line has `quantity: 0`, and an invoice with that one line fails. That one line is the input for the red test.

## Halve the code path

List the steps between the entry point and the failure (handler, validation, pricing, storage). Capture a real value at the midpoint, never infer it: a temporary log line, a debugger breakpoint, or a test that calls the midpoint function with the shrunk input. If the value is already wrong there, the bug is upstream; if it is right, downstream. Halve again until one function is left.

Every temporary edit made to capture a value is undone before the block. Note it as you make it, so none is forgotten.

## Bisect when it used to work

"It worked yesterday" means a good commit exists. Confirm one good and one bad commit by running the reproduction on each, then let git search between them:

```
git bisect start <bad> <good>
git bisect run <the reproduction command, exit 0 when good>
git bisect reset
```

The first bad commit narrows the cause to its diff. Always end with `git bisect reset`, so the working tree is back on the branch.

## Test hypotheses one at a time

Write each hypothesis as "if X then Y": "if the rate is read before the config loads, then the first request fails and the second passes". Test it with the smallest experiment that could prove it false. Record the result:

- Disproved: undo every change it made, and list it under `Ruled out` with its evidence (`second request also fails: drive log line 14`).
- Supported: keep it, and look for a capture that confirms it (step 3 writes it as a test).

Never stack two changes in one experiment, and never keep a change that "might help": it hides the cause without naming it.

## Done when

One function, one line and one reason are named with a capture behind them, or the hypotheses left are listed with the evidence for and against each.
