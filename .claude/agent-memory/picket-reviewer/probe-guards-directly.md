---
name: probe-guards-directly
description: For guard.bash reviews in this repo, import guardBash with node -e and probe wrapper/alias bypasses as agent and as lead
metadata:
  type: feedback
---

When a change touches `src/lib/hooks/guard/bash/index.mts`, run its decisions directly: `node --input-type=module -e` importing `guardBash` from that module's build under `dist/` and a context from `test/hooks/hook-context.mjs`, with `agent_type: "picket:developer"` and with no agent. Probe the wrapped forms (`bash -c`, `eval`, `pwsh -c`), the aliases (`sc`, `ac`, `>|`) and the false positives (`.picket/` paths). This writes no files.

**Why:** on 2026-10-18 (20261018-fix-follow-ups-from-the-two-items) the tests covered only the listed forms. The probes found a Major bypass, a wrapped heredoc into a test file, which the lead fixed.

**How to apply:** do this on every guard review; compare with base by piping `git show <base>:<path>` into node with the relative imports rewritten. Related: [[review-summary-drops-claude-paths]].
