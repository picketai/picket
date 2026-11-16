---
name: guard-write-paths
description: Where a new protected folder needs a guard change - guard.scope for Edit/Write; shell writes to non-code files already fall through to the user's prompt; verify stays guard-safe only while it runs no project code
metadata:
  type: reference
---

Protecting a folder from agent edits (checked 2026-11-15 while designing saved scenarios):

- Edit and Write go through `denialReason` in `src/lib/hooks/guard/scope/index.mts`; it runs for every agent and the lead. Add the prefix there, with a closure test `index.variants.test.mts` (C-020).
- Bash: a write redirect that is not a log sink returns `fallThrough("write-redirect")` in `src/lib/hooks/guard/bash/judge.mts`, and `sed` without print-only is `unknown` (`rules.mts`), so shell writes to a non-code file already reach the user's permission prompt. Only code-file writes are denied outright. Pin it with a "gets no allow" test rather than changing guard.bash.
- `picket verify` is guard-safe through `verifyRunsNoProjectCode` in `src/lib/hooks/guard/bash/kernel.mts`. Anything that builds images or starts a stack inside verify would leave that class; read stored results instead.

Related: [[guard-bash-probe-paths]], [[verify-grep-patterns]].
