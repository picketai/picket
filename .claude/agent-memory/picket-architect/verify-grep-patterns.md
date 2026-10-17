---
name: verify-grep-patterns
description: picket verify greps use JS RegExp with flag m, so a trailing $ fails on CRLF files; absence needs a negative lookahead with flags i; yaml-lite rejects a frontmatter line holding a stray CR; lint.schema rejects doubled backslashes in a pattern
metadata:
  type: reference
---

`picket verify` tests each `greps` pattern as `new RegExp(pattern, "m")` (core/lib/verify.mjs). In JS, `$` under `m` matches only before `\n`, so `'^## picket:analyst$'` fails on a CRLF file. Anchor heading greps with `\b` (or `\s*$`) instead.

**Why:** developers on this Windows repo may write CRLF; a `$`-anchored grep would fail a correct phase.

Greps check presence only, but a grep entry takes an optional `flags` key (default `m`). To assert absence, use a negative lookahead without `m`: `pattern: '^(?![\s\S]*vlad\.apetre)'` with `flags: i` (tested 2026-10-11). Also, work/*/request.md and work/*/phases/ are kernel-owned (guard.scope denies writes), so a "grep returns nothing" criterion has to exclude them by pathspec.

`lint.schema` rejects any grep pattern holding a doubled backslash after YAML parsing, so a criterion that looks for a JS string with an escaped backslash (`"src\\auth"`) cannot be grepped. Grep for a sibling input without one instead (2026-10-11). For a regex literal in source such as `left\.jsonl`, `'left.{1,2}jsonl'` matches it without a backslash (2026-10-16).

**How to apply:** in order/design frontmatter, end heading patterns with `\b`. Edit frontmatter with the Edit tool, not sed in Git Bash: a sed `\r` in the replacement inserted a raw CR, and yaml-lite then threw `expected "key: value"` on that line. Related: [[claude-cli-plugin-facts]].
