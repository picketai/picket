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
- 2.1.319 `validate --strict` allows one `modules` entry per plugin ("a second entry is refused"), and inside it an unmatched event such as `session.start` may be registered only once ("registered twice without a matcher"); folding several mods into one plugin needs one composing module (found 2026-11-08, item 20261107-plugin-only-install phase 4).
- `claude plugin test <dir>` runs `*.test.ts(x)` importing `claude-code/testing`; Node cannot run them. It needs no generated `<plugin>/.claude-plugin/types/` or `tsconfig.json`.
- `validate --strict` fails a manifest with no `author` (warning promoted to error).
- The release CI runner has no Claude Code CLI, so the mods step of `npm test` (`scripts/test.mjs`) skips when `claude` is not on PATH.
- `claude plugin test` can refuse with "hooks modules are turned off in this process: the rollout switch was saved off" (seen 2026-10-10 from a subagent shell, even on the status mod folder that passed earlier that day). `validate --strict` still works. Never write a criterion that needs `plugin test` without an open question naming this fallback.
- Found 2026-10-23 by the item 07a developer (Claude Code 2.1.308): `validate --strict` rejects any import in a mod's types file (now the one merged `src/mods/types/index.d.ts`) ("the contract must be self-contained") and requires that file itself to declare the mod's `PluginState` keys; declaring them in the hooks entry fails too. Shared types reach a mod contract only as a copy held in line by a repo test (item 07a D-004 r2).

Seen in `claude --help` on 2.1.301 (2026-10-16): `--permission-mode` choices are acceptEdits, auto, bypassPermissions, manual, dontAsk, plan; `--permission-prompts host|none` routes `-p` prompts to `--permission-prompt-tool`; `--setting-sources user,project,local` limits which settings load. The probe (`bench/results/ask-probe.json`, 2026-10-17) found from its headless cells: every hook input carries `permission_mode` (manual shows as "default"); a failed Bash fires only PostToolUseFailure. Its interactive answers ("`!` skips PreToolUse", "auto ask is silent") are INVALID: on this Windows host the model ran the sentinel through the PowerShell tool and the probe hook matched `Bash` only, so no hook ran (work item 20261017-guard-and-probe-cover-powershell-commands). On Windows, any hook or matcher premise must cover `Bash|PowerShell`, and evidence should come from a hook log line naming `tool_name`, never from the user's word alone. A headless "prompt tool called" result still never proves the user sees a dialog.

Seen in the 2.1.303 binary (2026-10-19): the Notification hook input is `{ hook_event_name: "Notification", message, title?, notification_type }`, and the matcher is tested against `notification_type` (idle_prompt, permission_prompt, elicitation_dialog, agent_needs_input, auth_success and more). The idle wait is the undocumented `~/.claude.json` key `messageIdleNotifThresholdMs` (default 60000), not a settings.json key.

Probed 2026-10-25 on 2.1.310 (F-1 order, a scratch copy of the built plugin): `validate --strict` walks the plugin's agents folder recursively and fails on a Markdown file with no frontmatter in a subfolder (agents/shared/entry.md: "No frontmatter block found"), while `plugin details` still lists Agents (4) and does not load it. Adding an `agents` array of the four files to plugin.json made `plugin details` list Agents (0) and validate still scanned the subfolder. So shared agent text cannot sit under the built agents folder without breaking strict validation; it needs another dist location, build-time inlining, or hook injection.

Unverified as of 2026-10-30: whether a skill's dynamic injection (a `!` before a backticked command) expands when indented inside a list item. Item 20261029-remaining-skills-in-bundle-2-shape D-003 kept the lines at column 0 in the purpose paragraph instead; a probe would settle it.

Design-record trap: the lint.schema PostToolUse hook runs after every edit of design.md and flags frontmatter phases with no `## Phase N` heading. When adding phases in a second save, write the body headings first (or in the same Edit), then the frontmatter entries. It also flags any literal `<!--` in an order or design body as "template comment left", even inside backticks (seen 2026-10-30), so name a template's comment in words ("the comment that starts `location:`").

Related: [[transcript-facts]]

Read from the 2.1.314 binary (2026-10-30, `grep -a` on claude.exe, item 20261030-consulting-the-brief-and-the-prompt-hook): the `UserPromptSubmit` input carries `prompt` and an optional `source` (user, sdk, system, loop_wakeup, schedule_wakeup, poll_event); the output takes `hookSpecificOutput.hookEventName: "UserPromptSubmit"` with optional `additionalContext`, `sessionTitle`, and `suppressOriginalPrompt` on a block. Grepping the binary is a zero-quota way to settle a hook contract.

Read from the 2.1.319 binary on the Linux host (2026-11-08, item 20261107-plugin-only-install): plugin bin folders are put on PATH only for the Bash and PowerShell tool shells ("Shell: leaving plugin bin/ dirs off PATH", `powerShellPluginBinPaths`), so a statusLine command or a mod's `$.process.run` cannot count on them (the mod case is unverified). Hooks get `CLAUDE_PLUGIN_DATA`, the folder plugins/data/<id> under the config dir, with `@` turned to `-` (`picket-inline` seen for `--plugin-dir`). The marketplace schema takes a top-level `renames` record of name to name or null. An npm plugin source takes `package`, `version` ("Specific version or version range") and `registry`. A hooks.json `modules` path resolves from the folder of hooks.json (the built mods list index.tsx beside it) and is refused when it leaves the plugin directory. claude plugin validate --strict on the built core plugin folder passed (one icon warning).
