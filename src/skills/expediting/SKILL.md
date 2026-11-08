---
name: expediting
description: >
  The fast lane: implement a small, low-risk change end to end in the main session, with no
  artifact, no spawn and no phase gate, while keeping the test run, the runtime drive and the
  craft bar. Refuses, naming the lane to use instead, the moment the observed touch set or a
  discovered decision breaks the fast-lane conditions.
when_to_use: >
  Use when `picket admit` answers `fast`, or when the user says "just fix", "quick change",
  "small fix", "rename", "add a guard", "change the default", "don't spin up the pipeline", or
  "expedite this".
---

# Expediting

You make the change yourself in the main session; no agent is spawned and admission is computed, not felt. The lane ends with one staged block and the user's one-word answer.

## Steps

1. In one tool batch: a Read of every file the request names, and a Grep for the symbol or route it names when no file is given. Name the touch set from that code: the files you will change, at most three. Ask only when the request is ambiguous in a way that changes which file you edit: one question, your recommended default, then stop.
2. In the Bash tool, run `picket admit --request - --touched <a>,<b> --human` with the request in a quoted heredoc and the touch set as the list. On any answer but `lane: fast`, open nothing and invoke the one skill it names.
3. `picket open --lane fast --title "<six-word title>" --request - <<'PICKET_REQUEST_END'` with the request, verbatim, on the lines after it and `PICKET_REQUEST_END` alone on the last line. The id it prints is `<id>` for the rest of this lane. A refusal naming `--user-lane` means admit puts the request in a heavier lane: run the lane skill it names, or ask the user and add the flag only on their word.
4. Load `picket:implementing` before the first edit: a bug gets a red test first, a refactor a pinning test first, and it decides the block's `Red:` and `Root cause:` lines. Read a file before you edit it, and edit only the touch set.
5. Add or adjust unit tests for the behaviour you changed, then run the check and the drive of `picket:implementing` until `picket check --human` is green and the drive matches the request.
6. Stage the touch set and nothing else: `git add -A -- <touched paths> work/<id>`.
7. Print the `## Expedited: <id>` block of `picket:implementing`'s fast-lane form, with the commit message you propose on `Commit:` and the options line last, and stop. Nothing is committed yet.
8. Apply the user's reply by the table in `## Rules`.

## Rules

The craft bar, in full: names carry meaning; functions are small and do one thing; flow is obvious (early returns over nesting, pure transforms over mutation); idiomatic to the stack; no new comments (the `comments` rule), a needed why goes on the `Comments:` line for the user; no commented-out code, no "just in case" parameters, no one-caller abstractions. No plan exists here, so every reading of the request is yours: when two readings touch the same code, pick the one the existing tests imply and say so in a `Decisions:` line.

Re-run `picket admit --text "<request>" --touched <comma-separated paths you have edited or must edit>` whenever the touch set grows or a decision appears (a new dependency, a changed contract, a second module, a security path, a migration). When it answers a heavier lane, stop editing, keep the diff, run `picket set <id> status=abandoned`, and hand the lane skill it names both the request and the diff. The gate breaking is the gate working.

| Reply | Do |
|---|---|
| `c`, `commit`, `ok`, `yes` | `picket close <id> --message "<the proposed message>" --touched <the paths you staged, comma-separated> --human`, which commits those paths and the closing state together and leaves any other staged path staged; print its output verbatim and stop |
| `x <why>`, `discard`, `reject: <why>` | leave the index as it is, print one line saying the change is staged and uncommitted, `picket set <id> status=abandoned`, stop; the user decides what to do with the working tree |
| `k <n>`, `keep <n>` | `picket comment <id> --path <p> --text "<t>"` with proposal n's path and text, write exactly that comment at its line, re-stage, re-print the block |
| `w <n>`, `waive <n>` | `picket waive <id> --path <p> --text "<t>"` with proposal n's path and text from the block's `Waivers:` line, or `picket waive <id> --path <p> --deleted` for a `<path> deleted` proposal; make the edit it waives, re-stage, re-print the block |
| a question | answer it, re-print the options line |

A `c` reply with comment or waiver proposals pending drops them: no comment and no silenced check is the default.

## Output

The fast lane prints one block, staged and uncommitted, and stops for a one-word answer. No routing suggestions, no offers.

The block is the fast-lane form of the template in `picket:implementing`: its lines under `## Expedited: <id>`, ending with the options line.

When `Comments:` lists proposals, number them and end the options line with `[k] keep comment <n>`; when `Waivers:` does, number them and end it with `[w] waive <n>`.
