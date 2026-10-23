---
name: bash-heredoc-backslashes
description: In this repo's Bash tool, a doubled backslash inside a quoted heredoc fed to node can collapse to one; use the Edit tool for literal replacements
metadata:
  type: feedback
---

On 2026-10-11 a `node - <<'EOF'` script with the JS string `"vlad\\.apetre"` ran as if it were `vlad.apetre`. That rewrote every literal match in a design record instead of only the regex text. Single backslashes such as `String.raw` `\s` came through intact; only the doubled ones collapsed.

**Why:** a scripted bulk replace silently replaced the wrong strings, and the record had to be fixed by hand with Edit.

On 2026-10-14 a `cat >> file <<'EOF'` append whose body held markdown backticks and `$(...)` failed with "unexpected EOF while looking for matching `''" and wrote nothing; the same text went in cleanly with Edit.

On 2026-10-23 the Write and Edit tools decoded a JSON-style escape (backslash, u, 2014) typed in their content into the real em dash, so grep patterns meant to hold the escape text held the character (item 08a design record). A Node one-liner that builds the backslash with `String.fromCharCode(92)` put the escape text back.

**How to apply:** append or replace record prose with the Edit tool, never a heredoc. Never type a backslash-u escape into Write or Edit content; grep the file for the character afterwards and convert it by script. Make literal text replacements in records with the Edit tool (`replace_all` when needed), not with a Node or sed heredoc. If a script is unavoidable, build backslashes with `String.fromCharCode(92)` and print the replacement list before writing. Related: [[verify-grep-patterns]].
