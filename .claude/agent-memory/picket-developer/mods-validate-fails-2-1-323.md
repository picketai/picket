---
name: mods-validate-fails-2-1-323
description: when npm test's mods step fails on host hook types, it names them; the mods matched Claude Code 2.1.325 on 2026-11-14
metadata:
  type: project
---

Since 2026-11-14 the mods match the hook API types of Claude Code 2.1.325, and the `mods` step of `npm test` passes. When a later Claude Code moves its types again, the step prints `mods: the mods do not match the hook API types of Claude Code <version>: <n> type errors` with one `<path>:<line>:<column> <TScode>` line per error. That is drift in the installed host, not the phase.

**Why:** a phase otherwise spends a turn proving the base fails the same way.
**How to apply:** on that header, build the base in scratch (see [[base-red-via-archive]]) and compare the count; if equal, report Tests as failed pre-existing. The full messages come from `claude plugin validate --strict --json dist` (each entry of `contents[i].warnings` whose `message` starts with `error TS`).
