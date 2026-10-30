# Ordering: open the work item

1. Fill the brief from the request. Ask only if the purpose is missing or the scope reads two ways: one message, each field's default, then stop; the reply opens it.
2. Run `picket open --lane order --title "<six-word title>" --purpose "<p>" --in-scope "<s>" --out-of-scope "<o>" --request - <<'PICKET_REQUEST_END'` with the request, verbatim, on the lines after it and `PICKET_REQUEST_END` alone on the last line; add the `--ticket` and `--story` flags when ticketing printed them. The kernel saves the request as `work/<id>/request.md`, which the cumulative review traces against.
3. Exit 2 naming a pinned reference (`analysis@<branch>:<path>`) means it matched nothing: print the places the message lists and ask. Remote-only branches are not searched.
4. Run `picket preflight <id> --human`. Its `warn` lines are saved as `work/<id>/preflight.txt` for the architect; `fail` lines stop the order here: print them and ask.
5. When `picket next <id>` says `resolve_sources`, the order starts at a gate: print `picket packet <id>` verbatim and end the turn. Apply each reply with `picket source pick <id> <ref> <label>`, then run `picket next <id>` again.
