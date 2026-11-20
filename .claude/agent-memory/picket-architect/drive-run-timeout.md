---
name: drive-run-timeout
description: declared run checks time out at 20 s with no timeout key, run through a shell in the worktree with stdout+stderr joined; env check probes work by pointing CLAUDE_PROJECT_DIR at any folder
metadata:
  type: reference
---

Read 2026-11-18 (item 20261118-planted-defect-benchmark-measures-the-tester):

- `picket drive --run` uses `DEFAULT_TIMEOUT_MS = 20_000` (`src/lib/verbs/drive/index.mts`), and `RUN_KEYS` are only `covers`, `command`, `exit_code`, `contains`: no timeout key. A command that can take longer (`node bench/selfcheck.mjs`, a bench `--dry` that rebuilds the fixture template with `npm install`) stays an undeclared criterion with `drive: true`.
- The command runs through `runShell` (`shell: true`, cwd the worktree), and `contains` is checked on stdout followed by stderr, so a `REGRESSION` line on stderr counts. Env prefixes such as `CLAUDE_PROJECT_DIR="$PWD/x" cmd` work.
- A worktree's fix to `src/` is not in the PATH `picket` (main checkout's dist); declare `node dist/bin/picket.mjs ...` so the worktree build runs.
- `CLAUDE_PROJECT_DIR=<folder> picket env check` works on the Linux host (Podman engine, compose config only, no containers started), so env layouts can be probed in a scratchpad copy before a criterion rests on them.

Related: [[machine-node-and-test-runs]], [[compose-model-facts]].
