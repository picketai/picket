# Designing: open the work item

1. Run `picket open --lane design --title "<six-word title>" --request - <<'PICKET_REQUEST_END'` with the request, verbatim, on the lines after it and `PICKET_REQUEST_END` alone on the last line; add the `--ticket` and `--story` flags when ticketing printed them. An item escalated from ordering passes the same request again. The request lands in `work/<id>/request.md` for the cumulative review to trace.
2. Exit 2 naming a pinned reference (`analysis@<branch>:<path>`): nothing matched it. Print the places the message lists and ask; remote-only branches are not searched.
3. Run `picket preflight <id> --human`. Its `warn` lines go to `work/<id>/preflight.txt`, which the architect's message names; a `fail` line stops the design: print the lines and ask.
4. A `resolve_sources` from `picket next <id>` is the opening gate: print `picket packet <id>` verbatim and end the turn, then apply each reply with `picket source pick <id> <ref> <label>` and run `picket next <id>` again.
