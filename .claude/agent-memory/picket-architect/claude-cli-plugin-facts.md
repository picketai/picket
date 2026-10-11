---
name: claude-cli-plugin-facts
description: Zero-quota Claude Code CLI checks for plugins (validate, details with --plugin-dir, plugin test for mods) and install limits, verified on 2.1.282 and 2.1.296; plus a lint.schema ordering trap when saving design records
metadata:
  type: reference
---

Verified 2026-10-06 on Claude Code 2.1.282:

- `claude plugin validate <dir>` checks a plugin or marketplace manifest offline, no model call. Good as a drive criterion.
- `claude --plugin-dir <dir> plugin details <name>` prints the component inventory (skills, agents, hook events) and token cost with no quota. `plugin details` alone only sees installed plugins and rejects `--plugin-dir` after the subcommand; the flag must come before `plugin`.
- `claude plugin install` resolves only marketplaces already known (`plugin@marketplace`); a fresh project needs `marketplace add <path>` first, so a literal one-command local install does not exist.
- `${CLAUDE_PLUGIN_ROOT}` is substituted inside a plugin SKILL.md body (spike/out/7.jsonl).

Verified 2026-10-10 on Claude Code 2.1.296 (function-hooks mods, early access):

- One `<plugin>/hooks/hooks.json` may hold both `"modules": [...]` and command `"hooks"`; `validate --strict` accepts it.
- `claude plugin test <dir>` runs `*.test.ts(x)` importing `claude-code/testing`; Node cannot run them. It needs no generated `<plugin>/.claude-plugin/types/` or `tsconfig.json`.
- `validate --strict` fails a manifest with no `author` (warning promoted to error).
- The release CI runner has no Claude Code CLI, so mod tests stay outside `npm test`.
- `claude plugin test` can refuse with "hooks modules are turned off in this process: the rollout switch was saved off" (seen 2026-10-10 from a subagent shell, even on `status/` that passed earlier that day). `validate --strict` still works. Never write a criterion that needs `plugin test` without an open question naming this fallback.

Design-record trap: the lint.schema PostToolUse hook runs after every edit of design.md and flags frontmatter phases with no `## Phase N` heading. When adding phases in a second save, write the body headings first (or in the same Edit), then the frontmatter entries.

Related: [[transcript-facts]]
