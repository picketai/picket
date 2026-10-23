---
name: session-identity-facts
description: Where the Claude session id is visible (CLAUDE_CODE_SESSION_ID in Bash env, $.session.id() in mods, session_id in hook events); subagent shells see the parent's id; git commit --only takes working tree content
metadata:
  type: reference
---

Seen 2026-10-18 on Claude Code 2.1.302: Bash commands get `CLAUDE_CODE_SESSION_ID` in their environment, and a subagent's shell shows the parent session's id (it matched the scratchpad folder id). Mods read the same id with `$.session.id()` (the session mod's register module matches it against `<id>.jsonl` transcript names). Hook events carry it as `session_id`. Work items carried no session before order 20261018-phase-commits-and-status-stay-per-session.

For scoped commits: `git commit --only -- <paths>` commits working tree content, not index content; a temporary `GIT_INDEX_FILE` built from HEAD keeps index content and still runs hooks.

**How to apply:** prefer the explicit `--session` flag from a mod over relying on the env reaching a mod-spawned process (unverified). Related: [[statusline-contract]], [[state-folder-facts]].
