---
name: hook-stdout-in-transcript
description: Claude Code 2.1.328 copies a PreToolUse hook's stdout, updatedInput included, into the session transcript even when the ask is refused
metadata:
  type: project
---

Claude Code 2.1.328 writes every hook's stdout into the session transcript (`~/.claude/projects/<slug>/<session>.jsonl`) as a `hook_success` attachment. A PreToolUse `ask` with `updatedInput` therefore leaves the rewritten command on disk even when the dialog is refused. Found by `node bench/probe-ask.mjs` on 2026-11-19 (ask+refuse cell, nonce_found non-empty).

**Why:** a secret placed only in a hook's `updatedInput` (D-004 of work item 20261119-database-guards-and-confirmed-sql-runs) is readable by the agent through its transcript.

**How to apply:** never treat hook output as a channel the agent cannot read; re-run the probe on a newer host before relying on the opposite. See [[mods-validate-fails-2-1-323]].
