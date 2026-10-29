# Researching, step 1: the outline turn

1. Open the item with the question saved as its request:

   ```
   picket open --lane research --title "<six-word title>" --text "<the user's question, verbatim>"
   ```

   A question with quotes or newlines goes on stdin through a quoted heredoc with `--request -` instead.
2. Send what `picket next <id>` prints: it names the analyst instance, the tool and the message with `pass: outline`.
3. Wait for `REPORT WRITTEN`, render the packet from `SKILL.md`, stop.
