# Ordering, step 1: open the work item and get the order written

1. A request that names a Jira key (`SHOP-123`): follow `../shared/procedures/jira-intake.md` before `picket open`.
2. Open the item (skip when a `--id` from an escalating lane already exists), then run preflight:

   ```
   picket open --lane order --title "<six-word title>" --text "<the request, verbatim>"
   picket preflight <id> --human
   ```

   The kernel saves the request as `work/<id>/request.md`, which the cumulative review traces against, and preflight's `warn` lines as `work/<id>/preflight.txt`. A request with quotes or newlines goes on stdin through a quoted heredoc with `--request -` instead.
3. Preflight `fail` lines stop you here; print them and ask.
4. When `picket next <id>` says `resolve_sources`, this is the opening gate: print `picket packet <id>` verbatim and stop. Apply each reply with `picket source pick <id> <ref> <label>`, then continue.
5. Send what `picket next <id>` prints: it names the architect instance, the tool and the message, `preflight:` and `sources:` included when those files exist.
6. Wait for `ARTIFACT WRITTEN`. The hook records it; `picket next <id>` now says `implement_phase`. Continue to `../shared/procedures/phase-loop.md` in the same turn.
7. If the architect answers `exceeds order caps`, run `picket set <id> status=abandoned` and start `picket:designing` with the same request.
