# Researching: the outline turn

1. Fill the brief from the question. Ask only if the purpose is missing or the scope reads two ways: one message, each field's default, then stop; the reply opens it.
2. Run `picket open --lane research --title "<six-word title>" --purpose "<p>" --in-scope "<s>" --out-of-scope "<o>" --request - <<'PICKET_REQUEST_END'` with the user's question, verbatim, on the lines after it and `PICKET_REQUEST_END` alone on the last line. A refusal naming `--user-lane` means admit reads the text as a change: ask the user, and add the flag only on their word.
3. Send what `picket next <id>` prints: the analyst instance, the tool and the message with `pass: outline`. Then end the turn.
4. The analyst's `REPORT WRITTEN` brings the outline gate: print `picket packet <id>` as `## Output` shows and end the turn.
