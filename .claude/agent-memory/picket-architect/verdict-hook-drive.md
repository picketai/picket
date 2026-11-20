---
name: verdict-hook-drive
description: How to drive the verdict hook and picket next on a scratch copy of a work item; picket reply is lead-only so a developer drive appends reply rows itself
metadata:
  type: reference
---

The verdict hook runs standalone: pipe `{"hook_event_name":"SubagentStop","session_id":...,"cwd":<scratch>,"agent_type":"picket:reviewer","last_assistant_message":<block>}` into `node dist/hooks/route.verdict.mjs` with `CLAUDE_PROJECT_DIR=<scratch>`. No transcript is needed when the block has a `## Review: <id> · <scope>` heading (tested 2026-11-09 on base 0bd9df7).

A scratch replay of a closed item works: copy its record, `phases/*.done` and `*.approved` (leave out `*.reviewed`, which makes the item closable), `state.yaml` with `status: open`, and the first N rows of `verdicts.jsonl`, then `CLAUDE_PROJECT_DIR=<scratch> picket next <id>`. guard.bash denies `rm` even in the scratchpad, and (checked 2026-11-20) denies `cp` of a `work/<id>/phases/*` marker even into the scratchpad, so write markers, rows and state with Write. A reply row lands after the verdict row its own route wrote (approve_phase `r` row 0.5 s after the `approved` row), so 'newest reply' rules exclude that row. Exceptions (2026-11-14): a design item of 6 or more phases needs the midpoint phase's `N.reviewed` copied once its checkpoint passed, or next stops at `review_checkpoint`; anything that compares sessions (live SendMessage, the run-grant hand-off) needs `CLAUDE_CODE_SESSION_ID` set to the rows' `session`.

`snapshot.artifact.body` excludes the frontmatter, so the `record` digest on amend and AMENDED rows never sees a frontmatter-only edit.

`picket reply`, `comment`, `waive` and `uninstall` are `leadOnly` in `src/lib/verbs.mts`, so a developer drive that needs a gate answer appends the reply row to the scratch `replies.jsonl` instead. `picket route` is not lead-only.

lint.schema runs the same way: pipe `{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":<rel>},"cwd":<root>}` into `node dist/hooks/lint.schema.mjs`; silent output means clean. A record appended through a Bash heredoc never triggers the hook, so lint it this way after a second save done in Bash (2026-11-13).

**How to apply:** use this for `drive:` criteria on kernel routing changes. Related: [[machine-node-and-test-runs]], [[next-and-mod-couplings]].
