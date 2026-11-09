---
name: replay-stop-through-guard-block
description: How to replay a real teammate stop through dist/hooks/guard.block.mjs from a saved subagent transcript, to check a Stop-hook drive criterion yourself
metadata:
  type: reference
---

Subagent transcripts live at `~/.claude/projects/-mnt-work-development-github-picket/<session>/subagents/agent-a<tag>-<role>-<hash>.jsonl`. `head -N` one into the scratchpad, build the payload with `node -e` (last assistant text block as `last_assistant_message`, `agent_type` as the instance name such as `bfoi-reviewer`, `transcript_path` and `agent_transcript_path` both the copy, `stop_hook_active: false`) and pipe it into `CLAUDE_PROJECT_DIR=<scratch> node dist/hooks/guard.block.mjs`. A bounce prints one `{"decision":"block",...}` line, exit 0; a pass prints nothing.

Related: [[dist-on-disk-can-be-stale]], [[probe-guards-from-node-e]]
