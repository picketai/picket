# Prove before change

Read this before the first edit of a fast-lane change and of every developer phase. It decides what the block's `Red:` and `Root cause:` lines say.

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

## A refactor: pin first

Write a characterization test before the first edit: one that pins today's observable behaviour, odd outputs included. Example: `formatName(null)` returns `"undefined undefined"` today, so the test asserts exactly that, and the refactor keeps it unless the plan says otherwise.

A type check and a lint run are not a pin. They prove the code still compiles, not that it still does the same thing. The block line is `Red: pinned: test/name.test.ts`.

## A symptom fix needs a cause

A retry, a null guard, a `.skip`, a raised timeout or a snapshot update makes the symptom go away without saying why it happened. Each one needs `Root cause: <X> because <Y>` on the block, for example `Root cause: totals were off because the rate was read in percent`. When the change adds none of these, write `Root cause: none`.

When you cannot name the cause, you have not found it yet: keep looking, or stop with the question.

## What a good test is

Prefer no new test over a bad one. A test that only asserts that a mock was called, or that the code runs without throwing, pins nothing and gets a reviewer finding.

The red test and the fix land in the same phase commit.
