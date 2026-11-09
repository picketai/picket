---
name: verdict-hook-drive
description: How to drive the verdict hook and picket next on a scratch copy of a work item; picket reply is lead-only so a developer drive appends reply rows itself
metadata:
  type: reference
---

The verdict hook runs standalone: pipe `{"hook_event_name":"SubagentStop","session_id":...,"cwd":<scratch>,"agent_type":"picket:reviewer","last_assistant_message":<block>}` into `node dist/hooks/route.verdict.mjs` with `CLAUDE_PROJECT_DIR=<scratch>`. No transcript is needed when the block has a `## Review: <id> · <scope>` heading (tested 2026-11-09 on base 0bd9df7).

A scratch replay of a closed item works: copy its record, `phases/*.done` and `*.approved` (leave out `*.reviewed`, which makes the item closable), `state.yaml` with `status: open`, and the first N rows of `verdicts.jsonl`, then `CLAUDE_PROJECT_DIR=<scratch> picket next <id>`. guard.bash denies `rm` even in the scratchpad, so build the copy with mkdir and cp.

`picket reply`, `comment`, `waive` and `uninstall` are `leadOnly` in `src/lib/verbs.mts`, so a developer drive that needs a gate answer appends the reply row to the scratch `replies.jsonl` instead. `picket route` is not lead-only.

**How to apply:** use this for `drive:` criteria on kernel routing changes. Related: [[machine-node-and-test-runs]], [[next-and-mod-couplings]].
