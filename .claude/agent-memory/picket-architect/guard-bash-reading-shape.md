---
name: guard-bash-reading-shape
description: What guard.bash's parsed Reading exposes (heredoc bodies without their delimiter quoting, hidden execution, redirect and background flags) and where an agent-specific allowlist hooks in
metadata:
  type: reference
---

Read 2026-11-17 while designing work/20261117-the-tester-checks-finished-items (phase 4):

- `Reading` in `src/lib/hooks/guard/bash/rules.mts` carries `segments`, `redirectTargets`, `heredocs` (body texts only), and the flags `hiddenExecution`, `sawWriteRedirect`, `sawBackground`. Whether a heredoc delimiter was quoted is not exposed, so a rule against expansion inside an unquoted heredoc has to inspect the body text (`$(`, `${`, backticks).
- `judgeCommand` returns the dialect's own judgement when the command does not parse into segments, before `judgeSegments` runs; an agent-specific refusal that must also cover unparsable commands goes in `judgeCommand`.
- The agent name reaches the guard as `ctx.escalation.agent` (`bareAgentName(agent_type)`); `bareAgentName` only strips the `<tag>-` instance prefix for roles in `INSTANCE_NAME` (`src/lib/shared/agent-name.mts`), so a new role must be added there before any guard can recognise its instances.
- `kernelVerbStart` skips leading assignments, so "no assignment prefix" means checking the start index is 1.

**How to apply:** read this before designing a per-agent Bash rule. Related: [[guard-write-paths]], [[guard-bash-probe-paths]].
