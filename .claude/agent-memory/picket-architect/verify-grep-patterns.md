---
name: verify-grep-patterns
description: picket verify greps use JS RegExp with flag m, so a trailing $ fails on CRLF files; yaml-lite rejects a frontmatter line holding a stray CR
metadata:
  type: reference
---

`picket verify` tests each `greps` pattern as `new RegExp(pattern, "m")` (core/lib/verify.mjs). In JS, `$` under `m` matches only before `\n`, so `'^## picket:analyst$'` fails on a CRLF file. Anchor heading greps with `\b` (or `\s*$`) instead.

**Why:** developers on this Windows repo may write CRLF; a `$`-anchored grep would fail a correct phase.

**How to apply:** in order/design frontmatter, end heading patterns with `\b`. Edit frontmatter with the Edit tool, not sed in Git Bash: a sed `\r` in the replacement inserted a raw CR, and yaml-lite then threw `expected "key: value"` on that line. Related: [[claude-cli-plugin-facts]].
