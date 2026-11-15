---
name: guard-bash-probe-paths
description: guard.bash denies a Bash heredoc probe whose text names a src code file (even an import), calling it a shell write to code; write the probe with Write and run it by path
metadata:
  type: reference
---

A `cat > scratch/probe.mjs <<'EOF' ... import ... from "/…/src/lib/verbs/init/init.mjs" ... EOF` Bash call was denied by guard.bash: "src/lib/verbs/init/init.mjs is code; a shell write skips guard.comments". The guard reads any code path in the command text as a write target (2026-11-11).

**How to apply:** write one-off probes into the scratchpad with the Write tool, then run `node <scratch>/probe.mjs` alone. Linux Node 26 imports `init.mjs` and its `.mts` imports directly. Related: [[bash-heredoc-backslashes]], [[machine-node-and-test-runs]].
