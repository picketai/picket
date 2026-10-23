---
name: statusline-contract
description: Claude Code status line facts verified from the docs page on 2026-10-17 (prompt_cache is documented, resets_at is epoch seconds, Windows shell, blank on nonzero exit) plus the guard verb-set fact a new CLI verb needs
metadata:
  type: reference
---

From https://code.claude.com/docs/en/statusline.md, fetched 2026-10-17 (Claude Code 2.1.302 installed):

- `prompt_cache` IS documented (2.1.251+): `warm`, `caching_observed`, `ttl` ("5m"/"1h"), `expires_at` (epoch s), `hit_ratio` and more. A lead note called it undocumented; check the page before trusting such a note.
- `rate_limits.*.resets_at` is Unix epoch seconds, not ISO. `context_window.total_input_tokens` is tokens now in the window (input + cache), not a session total.
- Windows runs the command through Git Bash when installed, else PowerShell; use forward slashes in paths.
- Nonzero exit or no output blanks the line; an in-flight run is cancelled by a new trigger; notifications share the row outside fullscreen; the row has undocumented built-in spacing.
- Project settings outrank user settings, so a project `statusLine` hides a personal one.

Repo fact: the guard reads verb classes from `VERB_NAMES` in `src/lib/verbs.mts` through `kernelClass` and `isLeadOnly` in `src/lib/hooks/guard/bash/kernel.mts`; a new verb's `readOnly` flag decides whether the guard allows it, and the verb-class test in `src/lib/hooks/guard/bash/kernel.test.mts` names today's read verbs explicitly.

Related: [[transcript-facts]], [[claude-cli-plugin-facts]]
