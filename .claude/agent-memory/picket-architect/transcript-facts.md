---
name: transcript-facts
description: Verified shapes of Claude Code transcripts that hook designs rest on (continuation messages, where subagent transcripts live)
metadata:
  type: reference
---

Subagent transcripts live under `~/.claude/projects/<mangled-cwd>/<session-id>/subagents/agent-<id>.jsonl`; the framework worktree's folder is `d--workspace-github-AISpec--worktrees-framework`.

A SendMessage continuation to a live subagent appears in that agent's transcript as a `type: "user"` entry with text content that starts `The coordinator sent a message while you were working:` and then carries the lead's lines (`work:`, `scope:`, `phase:`) verbatim. Verified 2026-10-06.

Hook timing baselines: spike check 9 (56 ms for inject.state) ran in an empty bench fixture, not in the framework repo; compare cold starts against bare `node -e 0` in the same run and in the same cwd.
