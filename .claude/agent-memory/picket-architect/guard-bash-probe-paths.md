---
name: guard-bash-probe-paths
description: guard.bash denies a Bash heredoc probe whose text names a src code file (even an import), calling it a shell write to code; write the probe with Write and run it by path
metadata:
  type: reference
---

A `cat > scratch/probe.mjs <<'EOF' ... import ... from "/…/src/lib/verbs/init/init.mjs" ... EOF` Bash call was denied by guard.bash: "src/lib/verbs/init/init.mjs is code; a shell write skips guard.comments". The guard reads any code path in the command text as a write target (2026-11-11).

To size a guard's open spellings without a build, a Write-created scratch `.mts` can import `src/lib/hooks/guard/bash/index.mts` (or the comments, silenced, block hooks) and call `guardBash(event, ctx)` with a hand-built ctx `{ root, cwd, now, env, home, session, platform, name }` over a mkdtemp project holding `.picket/config.json`; `guardBlock` takes `last_assistant_message` and needs no transcript (2026-11-16). `picket`'s `parseArgs` has no `--flag=value` form: `--run=x` becomes key `run=x` and eats the next word, so an `=` spelling of a picket flag is not one the CLI accepts.

**How to apply:** write one-off probes into the scratchpad with the Write tool, then run `node <scratch>/probe.mjs` alone. Linux Node 26 imports `init.mjs` and its `.mts` imports directly. Related: [[bash-heredoc-backslashes]], [[machine-node-and-test-runs]].

Seen 2026-11-19 (item 20261119-agents-cannot-forge-picket-state-by-bash): guard.scope's "read it before writing" also covers the scratchpad, so a second Write to an existing scratch file is denied; give each probe file a new name. A probe command naming `src/x.ts` as a Bash argument is itself denied as a code write, so pass the commands to a probe in a JSON file. `guardOutput` from `test/support/hook.mts` (root, tool, agent, mode) is the quickest probe; null means fall-through, not allow. A declared run check can drive the built hook: `node -e '...JSON.stringify({hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"..."},cwd:process.cwd(),agent_type:"abcd-developer"})...' | node dist/hooks/guard.bash.mjs`, written in a YAML single-quoted scalar with doubled quotes, which yaml-lite parses.
