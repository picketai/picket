---
name: implementing
description: >
  How a change is made and proven: name the kind of change, write the red or pinning test
  before the first edit, run the checks, drive the changed flow through its real entry point,
  and report it in the developer block whose Red, Root cause, Tests, Lint and Verified lines
  this skill decides. Use when a developer implements a phase of an order or a design record,
  when the fast lane makes its change in the main session, or when a lane fixes a bug that
  carries a red test from a diagnosis. Loaded by the developer agent and the expediting skill;
  never invoked by the user.
user-invocable: false
---

# Implementing

Prove before change, check, drive, then report. These steps decide what the block's `Red:`, `Root cause:`, `Tests:`, `Lint:` and `Verified:` lines say, in a developer phase and in the fast lane alike.

## Steps

1. Name the kind of change before any edit. A bug: the code does something wrong that a user or a test can observe. A refactor: the code changes shape and its observable behaviour must not. Anything else (a feature, docs, config) takes `Red: n/a: <reason>`, for example `Red: n/a: new endpoint, no prior behaviour`.
2. A bug gets its red test first.
   - Write the smallest unit test that fails for the reported reason. It names the behaviour (`rounds a 0.5 fee up`), not the ticket.
   - Run it through `picket check` before touching the code. It must fail for the reported reason; a failure on a missing import or a typo in the test is not red.
   - Keep its first failure line for the block: `Red: test/fee.test.ts failed: expected 1.05, got 1.04`. Fix the code and see the same test pass.
   - A test that passes before the fix does not reach the defect: change the test, never the expectation.
   - When the request carries a red test from `picket:debugging` (its hand-off names the test path and its failure line), run that test first instead: it is the red, no second test is written, and the block's `Red:` and `Root cause:` lines repeat the diagnosis once you have seen the same failure.
   - The red test and the fix land in the same commit.
3. A refactor gets a pinning test first: a characterization test of today's observable behaviour, odd outputs included. Example: `formatName(null)` returns `"undefined undefined"` today, so the test asserts exactly that, and the refactor keeps it unless the plan says otherwise. A type check and a lint run are not a pin; they prove the code compiles, not that it does the same thing. The block line is `Red: pinned: test/name.test.ts`.
4. A symptom fix names its cause. A retry, a null guard, a `.skip`, a raised timeout or a snapshot update makes a symptom go away without saying why it happened; each one needs `Root cause: <X> because <Y>`, for example `Root cause: totals were off because the rate was read in percent`. A change that adds none of these writes `Root cause: none`. When you cannot name the cause, you have not found it yet: keep looking, or stop with the question.
5. Run `picket check` (add `--human` in the main session) until it prints `CHECK OK`. It runs the detected test and lint commands, logs to `.picket/state/check-*.log`, prints the failing tail only and stops at the first red step. Never shell-redirect test output yourself; that shape costs a permission prompt every time.
6. Drive the changed flow through its real entry point when the change touches one (endpoint, CLI, worker, startup wiring), and loop drive, observe, fix until the statuses and bodies match the request or the criteria. A green suite is not verification. A change with no runtime surface (a pure function, a test, docs) records `no drivable surface: <reason>` on `Verified:` instead.

## Rules

Tests follow the `tests` rule: unit tests by default, another kind only when the plan or the request names it, no real infrastructure in a unit test, and every test asserts the rule its name claims.

One `picket drive` command does the whole drive loop and costs no permission prompt:

```
picket drive --hit "GET /invoices?page=2" --human   # start on a free port, hit, stop, restore, log
picket drive --run "npm run cli -- list" --human    # a CLI: run and capture
```

Add one `--hit "POST /path <json>"` per request the change affects; `--start "<cmd>"` overrides the detected start script. Files the drive itself changes (a record the POST created) are restored so the tree stays yours.

A drive longer than one simple command goes in a script file under `.picket/state/scratch/` (for example `.picket/state/scratch/drive.mjs`) and runs as `picket drive --run "node <file>"`, never as inline `node -e` code. When node fails with exit 126 and `Permission denied`, the machine refused that command line: move the code into a file instead of debugging the launcher. Set variables with `--env NAME=VALUE`, one flag per variable, and test values only; never write `NAME=value picket ...`, which the permission check refuses and which would log the value.

## Output

A developer phase ends with this block, staged and uncommitted:

```
## Phase <n> of <id>: <phase title>

<one sentence under 90 characters: the claim, not the explanation; what the system now does that it did not before>

Files: <every path you staged, comma-separated>
Tests: passed | failed: <what> | no suite detected
Lint: passed | failed: <what> | none detected
Verified: <command> → <observed result> | no drivable surface: <reason> | blocked: <what>
Red: <test> failed: <first failure line> | pinned: <test> | n/a: <reason>
Root cause: <X> because <Y> | none
Decisions: <ambiguity resolved and the reading chosen; one clause each, separated by semicolons, under 90 characters each> | none
Comments: <path>:<line> "<text>"; <path>:<line> "<text>" | none
Waivers: <path>:<line> "<text>" because <why>; <path> deleted because <why> | none
Commit: <type>(<scope>): <what>   (the message you propose; staged, committed on approval)

PHASE DONE
```

The last line is exactly `PHASE DONE` or `PHASE STALLED`. A commit body goes as indented lines under `Commit:`.

The fast lane prints the same lines under the heading `## Expedited: <id>`, with `(staged; your answer commits it)` after the commit message, and ends with its options line instead of a verdict: `[c] commit   [x] discard: <why>`, plus `[k] keep comment <n>` when `Comments:` lists numbered proposals.
