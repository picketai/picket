---
name: hook-output-in-transcript
description: Claude Code 2.1.328 copies PreToolUse hook stdout (updatedInput included) into the session transcript as a hook_success attachment even when the user refuses the ask; a refusal fires no Post event; updatedInput under ask runs the rewritten command
metadata:
  type: reference
---

Probe of 2026-11-19 (`bench/probe-ask.mjs`, cells `ask+update` and `ask+refuse`, record `bench/results/ask-probe.json`, item 20261119-database-guards-and-confirmed-sql-runs):

- A PreToolUse hook answering `ask` with `updatedInput` gets the rewritten command run after approval (headless prompt tool; interactive not yet checked).
- The hook's stdout, `updatedInput.command` included, lands in `~/.claude/projects/<slug>/<session>.jsonl` as a `hook_success` attachment, also when the user refuses. So no secret can travel through a hook's output unseen by agents.
- A refused ask fires neither PostToolUse nor PostToolUseFailure, so no hook learns of a refusal; the session's next PreToolUse is the first event after it.

**How to apply:** never design a one-time secret carried in hook output; bind single-use tickets to the session's next guarded command instead. Related: [[transcript-facts]], [[data-verb-drive-limits]].
