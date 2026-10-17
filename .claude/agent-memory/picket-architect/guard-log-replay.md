---
name: guard-log-replay
description: How to measure a guard.bash design against a real guard.log without touching the project, and the trace-cap caveat
metadata:
  type: reference
---

To size a `guard.bash` change, copy `core/lib` into the scratchpad, gate each prototype change behind an env var (P1, P2...), and replay the rows of the project's guard log (the `STATE_FILES.guardLog` file in its state folder) through `guardBash({ tool_input: { command }, cwd }, { root: <scratch root> })`. Pass a scratch `root`: the guard appends a trace row to the guard log under that root, so the real project's log would otherwise grow. An unmodified copy should reproduce the logged decisions; a deny that turns into a fallthrough is usually a source-path deny missing its `PICKET_SOURCE_*` env.

Rows are traced at 300 characters (`TRACED_COMMAND_CHARS`), so in the 2026-10 log 765 of 1627 rows were truncated and only the rest replay faithfully; cite figures for complete rows only.

**How to apply:** prototype in scratch, never in `core/`, and put the measured before/after counts in the design record. Related: [[bash-heredoc-backslashes]].
