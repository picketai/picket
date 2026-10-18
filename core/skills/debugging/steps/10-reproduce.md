# Debugging, step 1: reproduce

A failure you have not seen yourself is a report, not a fact. Reproduce it before you reason about it.

## On the user's surface

Use the surface where the user saw the failure, not a nearby one:

- An endpoint: `picket drive --hit "GET /invoices?page=2"` (add `--hit "POST /path <json>"` per request). It starts the app on a free port, hits it, stops it and logs the evidence.
- A CLI: `picket drive --run "<command>"`.
- A test: `picket check`, which runs the detected test command and prints the failing tail.
- A drive longer than one command goes in a script under `.picket/state/scratch/` and runs as `picket drive --run "node <file>"`.

Capture two things for the block: the exact command, and the first output line that shows the failure (`500 {"error":{"message":"Cannot read properties of undefined (reading 'rate')"}}`). That pair is the `Reproduced:` line.

Ask the user only with a stated reason: "I need the request body you sent, because the failure depends on the line items." Never ask "can you reproduce it for me?".

## When it does not reproduce

Walk the branches in order. Each ends in a capture that reproduces it, or in a recorded "not reproduced" with what was tried.

1. **Environment difference.** Compare what differs between your run and theirs: runtime version (`node --version`), operating system, environment variables (names only, never values of secrets), configuration file, locale and time zone. Change one at a time toward theirs.
2. **Data difference.** The failure needs their input: an empty list, a null field, a very long string, a non-ASCII name, a value at a boundary (0, 1, the page size, the maximum). Build the smallest input from what they reported and try each boundary.
3. **Timing or ordering.** A flaky failure is often an order or a race. Run it 20 times (`picket check` in a loop script) and count failures; run the test alone and with its neighbours; change the test order when the runner allows. A failure in 1 of 20 runs is reproduced: record the count.
4. **State left by an earlier run.** A file, a cache, a database row or a global the previous test left behind. Run from a clean state, then after the suspected predecessor.

When every branch fails, stop here: the block says `Reproduced: not reproduced: <the branches tried>` and `Red: n/a: not reproduced, <why>`, and the first line says "strongest hypothesis". Skip to `steps/30-diagnose.md`.

## Done when

You hold a command and an output line that show the failure, or a list of branches tried that did not.
