---
name: expediting
description: >
  The fast lane: implement a small, low-risk change end to end in the main session, with no
  artifact, no spawn and no phase gate, while keeping the test run, the runtime drive and the
  craft bar. Use when `tether admit` answers `fast`, or when the user says "just fix",
  "quick change", "small fix", "rename", "add a guard", "change the default", "don't spin up
  the pipeline", or "expedite this". Refuses, naming the lane to use instead, the moment the
  observed touch set or a discovered decision breaks the fast-lane conditions.
user-invocable: true
---

# Expediting

Paths cited here and in this skill's step files, such as `expediting/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Admission is computed, not felt. The lane skill you are reading runs in the main session; no agent is spawned.

Lane check for this request:

```!
tether admit --request - --human <<'TETHER_REQUEST_END'
$ARGUMENTS
TETHER_REQUEST_END
```

If the line above does not say `lane: fast`, stop here and run the named lane skill instead (`tether:ordering`, `tether:designing`, `tether:researching`). Do not argue with it in prose; a forced lane is written into the request as `lane: fast`.

## Step 1: open the work item, read the touch set

One tool batch: `tether new --lane fast --title "<six-word title>"`, plus a Read of every file the request names, plus a Grep for the symbol or route it names when no file is given. The id the first command prints is `<id>` for the rest of this lane.

Name the touch set before editing: the files you will change, at most three. Ask the user only when the request is ambiguous in a way that changes which file you edit: one question, your recommended default, then stop. Never guess between two readings that touch different code.

## Step 2: make the change

Edit only the touch set. Read a file before you edit it; the read-before-edit hook blocks the alternative. In the same tool batch as your first Edit, re-check admission with the real list: `tether admit --text "<request>" --touched <a>,<b> --human`. Any answer but `lane: fast` means stop editing, `tether set <id> status=abandoned`, and start the named lane skill with the request and the diff you have.

The craft bar, in full: names carry meaning; functions are small and do one thing; flow is obvious (early returns over nesting, pure transforms over mutation); idiomatic to the stack; no new comments (the `comments` rule), a needed why goes on the `Comments:` line for the user; no commented-out code, no "just in case" parameters, no one-caller abstractions. No plan exists here, so every reading of the request is yours: when two readings touch the same code, pick the one the existing tests imply and say so in a `Decisions:` line.

Add or adjust unit tests for the behaviour you changed; the module's existing test file first, a new file when none exists.

## Step 3: check, drive, commit, close

Read `steps/30-check.md` once the change compiles.

## Escalation

Re-run `tether admit --text "<request>" --touched <comma-separated paths you have edited or must edit>` whenever the touch set grows or a decision appears (a new dependency, a changed contract, a second module, a security path, a migration). When it answers a heavier lane, stop editing, keep the diff, and hand the lane skill it names both the request and the diff. The gate breaking is the gate working.

## Output

The fast lane prints one block, staged and uncommitted, and stops for a one-word answer. No routing suggestions, no offers.

```
## Expedited: <id>

<one sentence under 90 characters: what now works that did not>

Files: <path>, <path>
Tests: passed | failed: <what> | no suite detected
Lint: passed | failed: <what> | none detected
Verified: <command> → <observed result> | no drivable surface: <reason>
Comments: <path>:<line> "<text>" | none
Commit: <type>(<scope>): <what>   (staged; your answer commits it)

[c] commit   [x] discard: <why>
```

When `Comments:` lists proposals, number them and end the options line with `[k] keep comment <n>`.
