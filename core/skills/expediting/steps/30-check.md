# Expediting, step 3: check, drive, commit, close

Tests and lint, one command, no permission prompt:

```
tether check --human
```

It runs the detected test and lint commands, logs to `.tether/state/check-*.log`, prints the failing tail only and stops at the first red step. Fix and re-run until `CHECK OK`. Never shell-redirect test output yourself.

Drive the changed flow through its real entry point when the change touches one. One command does the whole loop and costs no permission prompt:

```
tether drive --hit "GET /invoices?page=2" --human   # start on a free port, hit, stop, restore, log
tether drive --run "npm run cli -- list" --human    # a CLI: run and capture
```

A drive longer than one simple command goes in a script file under the OS temp folder (for example `$TEMP/tether-drive.mjs`) and runs as `tether drive --run "node <file>"`, never as inline `node -e` code. When node fails with exit 126 and `Permission denied`, the machine refused that command line: move the code into a file instead of debugging the launcher.

Add one `--hit "POST /path <json>"` per request the change affects; `--start "<cmd>"` overrides the detected start script. Files the drive itself changes (a record the POST created) are restored so the tree stays yours. Read the statuses and bodies it prints; fix and re-run until they match the request. A green suite is not verification. A change with no runtime surface (a pure function, a test, docs) records `no drivable surface: <reason>` instead. Never describe a drive you did not run; the ledger shows the gap.

Fix what the checks find, then stage the touch set, and only stage it:

```
git add -A -- <touched paths> work/<id>
```

Emit the `## Expedited` block from `SKILL.md`, with the commit message you propose on its `Commit:` line and the options line last, and stop. Nothing is committed yet: the user looks at the block and answers.

| Reply | Do |
|---|---|
| `c`, `commit`, `ok`, `yes` | `tether close <id> --message "<the proposed message>"`, which commits the staged change and the closing state together; print `committed <sha>` and stop |
| `x <why>`, `discard`, `reject: <why>` | leave the index as it is, print one line saying the change is staged and uncommitted, `tether set <id> status=abandoned`, stop; the user decides what to do with the working tree |
| `k <n>`, `keep <n>` | `tether comment <id> --path <p> --text "<t>"` with proposal n's path and text, write exactly that comment at its line, re-stage, re-print the block |
| a question | answer it, re-print the options line |

A `c` reply with comment proposals pending drops them: no comment is the default.

No next-step suggestions, no offers, no routing chatter: the fast lane ends when the change is in or the user has said no.
