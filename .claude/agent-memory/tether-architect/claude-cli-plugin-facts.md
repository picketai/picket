---
name: claude-cli-plugin-facts
description: Zero-quota Claude Code CLI checks for plugins (validate, details with --plugin-dir) and install limits, verified on 2.1.282; plus a lint.schema ordering trap when saving design records
metadata:
  type: reference
---

Verified 2026-10-06 on Claude Code 2.1.282:

- `claude plugin validate <dir>` checks a plugin or marketplace manifest offline, no model call. Good as a drive criterion.
- `claude --plugin-dir <dir> plugin details <name>` prints the component inventory (skills, agents, hook events) and token cost with no quota. `plugin details` alone only sees installed plugins and rejects `--plugin-dir` after the subcommand; the flag must come before `plugin`.
- `claude plugin install` resolves only marketplaces already known (`plugin@marketplace`); a fresh project needs `marketplace add <path>` first, so a literal one-command local install does not exist.
- `${CLAUDE_PLUGIN_ROOT}` is substituted inside a plugin SKILL.md body (spike/out/7.jsonl).

Design-record trap: the lint.schema PostToolUse hook runs after every edit of design.md and flags frontmatter phases with no `## Phase N` heading. When adding phases in a second save, write the body headings first (or in the same Edit), then the frontmatter entries.

Related: [[transcript-facts]]
