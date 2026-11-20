---
name: data-verb-drive-limits
description: picket data verbs are lead-only, so no developer drive check can call them; drive data guards through env check on a fixture project or a hook payload file piped into dist/hooks/guard.bash.mjs
metadata:
  type: reference
---

Seen 2026-11-19 (item 20261119-database-guards-and-confirmed-sql-runs): `data` is a lead-only verb group (`src/lib/verbs.mts`), and guard.bash reads `picket drive --run` payloads, including `node dist/bin/picket.mjs data ...` (`kernelVerbStart` accepts the node launcher), so a declared check that runs a data verb is denied to the developer. What can be declared instead:

- `CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/<fixture>" node dist/bin/picket.mjs env check` (needs the container engine for compose config; exits 2 on error findings).
- `node dist/hooks/guard.bash.mjs < test/fixtures/guard/<payload>.json`: a payload file keeps verb text out of the command line; with no `cwd` field the hook uses its own cwd. A denied escalation still appends a ledger row in the drive's root.

On base b987c5a8, the lead's `picket data run`, marked or not, got no guard decision, and `Bash(picket *)` (installed by init) then let it run. CLAUDE_CODE_SESSION_ID in a subagent's Bash equalled the parent session id on Claude Code 2.1.328, as [[session-identity-facts]] says for 2.1.302.

**How to apply:** lead-only verb phases get unit tests and a [DEFERRED] live criterion, not a drive. Related: [[drive-run-timeout]], [[guard-bash-probe-paths]].
