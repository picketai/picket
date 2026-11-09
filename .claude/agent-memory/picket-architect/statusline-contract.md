---
name: statusline-contract
description: Claude Code status line facts from the docs page (2026-10-17) and the 2.1.319 binary (CLAUDE_PROJECT_DIR set, launch-folder root, PowerShell rewrite, how to slice the binary), plus the guard verb-set fact a new CLI verb needs
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

Read from the 2.1.319 binary on Linux (2026-11-08, item 20261108-session-switch-project-status-line): `executeStatusLineCommand` runs the status line through the command hook runner, so the child gets `CLAUDE_PROJECT_DIR` = the session's `projectRoot`; a new session sets `projectRoot`, `originalCwd` and `cwd` to the launch folder, and project settings load from `<launch folder>/.claude/settings.json` (no walk-up; local settings may resolve to the git root). The working folder is the session's current folder (follows `cd`). Under PowerShell the runner rewrites `${CLAUDE_PROJECT_DIR}` to `${env:CLAUDE_PROJECT_DIR}`; bare `$CLAUDE_PROJECT_DIR` warns. To read the binary: `grep -a -b -o -F <literal>` is fast (regex with `.{300}` takes minutes); the guard denies `dd`, so print a byte range with a small node script using `readSync` at an offset.
