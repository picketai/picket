---
name: transcript-facts
description: Verified shapes of Claude Code transcripts that hook designs rest on (continuation messages, bounce feedback entries, where subagent transcripts live)
metadata:
  type: reference
---

Subagent transcripts live under `~/.claude/projects/<mangled-cwd>/<session-id>/subagents/agent-<id>.jsonl`; the framework worktree's folder is `d--workspace-github-AISpec--worktrees-framework`.

A SendMessage continuation to a live subagent appears in that agent's transcript as a `type: "user"` entry with text content that starts `The coordinator sent a message while you were working:` and then carries the lead's lines (`work:`, `scope:`, `phase:`) verbatim. Verified 2026-10-06.

A Stop or SubagentStop bounce writes a `type: "user"` entry with text `Stop hook feedback:\n<reason>` plus a `hook_blocking_error` attachment; the re-emitted block is a separate, later assistant entry. That user entry is not a tool result, so `currentTurnAssistantEntries` and `turnSpan` in `src/lib/shared/transcript/turn.mts` treat it as a turn boundary. On 2026-11-03 route.verdict on the continued stop saved the bounced block, with its verdict row 120 ms after the corrected entry's timestamp; a stale transcript tail is suspected, not proven (work/20261103-commit-message-review-follow-up-fixes OQ-001).

A `SubagentStop` hook's `additionalContext` continues the subagent for another response (seen 2026-11-03: under a run grant the developer went from phase 2 to phase 3 with no lead message). The context is not a `type: "user"` entry, so the continued turn's text still holds the earlier blocks; the lead's SendMessage to a busy agent is queued and delivered after its turn ends. Design relying on this: work/20261105-kernel-blocks-run-sends-review-diffs D-002, OQ-001.

Hook timing baselines: spike check 9 (56 ms for inject.state) ran in an empty bench fixture, not in the framework repo; compare cold starts against bare `node -e 0` in the same run and in the same cwd.
