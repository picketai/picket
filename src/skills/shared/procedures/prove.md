# Prove before change, check, drive

Read this before the first edit of a fast-lane change and of every developer phase. It decides what the block's `Red:`, `Root cause:`, `Tests:`, `Lint:` and `Verified:` lines say.

## Name the kind of change first

One of three, before any edit:

- A bug: the code does something wrong that a user or a test can observe.
- A refactor: the code changes shape and its observable behaviour must not.
- Anything else (a feature, docs, config): `Red: n/a: <reason>`, for example `Red: n/a: new endpoint, no prior behaviour`.

## A bug: red first

1. Write the smallest unit test that fails for the reported reason. It names the behaviour (`rounds a 0.5 fee up`), not the ticket.
2. Run it through `picket check` before touching the code. It must fail, and fail for the reported reason: a failure on a missing import or a typo in the test is not red.
3. Keep its first failure line. It goes on the block: `Red: test/fee.test.ts failed: expected 1.05, got 1.04`.
4. Fix the code and see the same test pass.

When the test passes before the fix, it does not reach the defect: change the test, never the expectation.

When the request carries a red test from `picket:debugging` (its hand-off names the test path and its failure line), run that test first instead of step 1: it is the red, and no second test is written. The block's `Red:` and `Root cause:` lines repeat the diagnosis's lines once you have seen the same failure.

## A refactor: pin first

Write a characterization test before the first edit: one that pins today's observable behaviour, odd outputs included. Example: `formatName(null)` returns `"undefined undefined"` today, so the test asserts exactly that, and the refactor keeps it unless the plan says otherwise.

A type check and a lint run are not a pin. They prove the code still compiles, not that it still does the same thing. The block line is `Red: pinned: test/name.test.ts`.

## A symptom fix needs a cause

A retry, a null guard, a `.skip`, a raised timeout or a snapshot update makes the symptom go away without saying why it happened. Each one needs `Root cause: <X> because <Y>` on the block, for example `Root cause: totals were off because the rate was read in percent`. When the change adds none of these, write `Root cause: none`.

When you cannot name the cause, you have not found it yet: keep looking, or stop with the question.

## What a good test is

Prefer no new test over a bad one. A test that only asserts that a mock was called, or that the code runs without throwing, pins nothing and gets a reviewer finding.

The red test and the fix land in the same phase commit.

## Check

Tests and lint, one command, no permission prompt: `picket check` (add `--human` in the main session). It runs the detected test and lint commands, logs to `.picket/state/check-*.log`, prints the failing tail only and stops at the first red step. Fix and re-run until `CHECK OK`. Never shell-redirect test output yourself; that shape costs a permission prompt every time.

## Drive

Drive the changed flow through its real entry point when the change touches one (endpoint, CLI, worker, startup wiring). One command does the whole loop and costs no permission prompt:

```
picket drive --hit "GET /invoices?page=2" --human   # start on a free port, hit, stop, restore, log
picket drive --run "npm run cli -- list" --human    # a CLI: run and capture
```

Add one `--hit "POST /path <json>"` per request the change affects; `--start "<cmd>"` overrides the detected start script. Files the drive itself changes (a record the POST created) are restored so the tree stays yours.

A drive longer than one simple command goes in a script file under `.picket/state/scratch/` (for example `.picket/state/scratch/drive.mjs`) and runs as `picket drive --run "node <file>"`, never as inline `node -e` code. When node fails with exit 126 and `Permission denied`, the machine refused that command line: move the code into a file instead of debugging the launcher. Set variables with `--env NAME=VALUE`, one flag per variable, and test values only; never write `NAME=value picket ...`, which the permission check refuses and which would log the value.

Read the statuses and bodies it prints; loop drive, observe, fix until they match the request or the criteria. A green suite is not verification. A change with no runtime surface (a pure function, a test, docs) records `no drivable surface: <reason>` instead. Never describe a drive you did not run; `picket verify` and the ledger show the gap.
