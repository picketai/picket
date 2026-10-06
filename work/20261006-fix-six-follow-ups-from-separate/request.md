Fix the six follow-ups from 20261005-separate-core-paths-state-and-config.

1. Legacy ledger bypass (cumulative review, Minor): `.claude/lib/hooks/guard.scope.mjs:27` no longer denies writes under the legacy state folder `.claude/ledger/`, and `harness migrate` (auto-allowed by `.claude/settings.json:16`) appends any `.jsonl` it finds there into live state (`.claude/lib/migrate.mjs:27`). A model Write to `.claude/ledger/drive-log.jsonl` followed by `harness migrate` becomes drive evidence that `.claude/lib/verify.mjs:77` accepts. Close it.
2. Checkpoint verdict lands on the wrong phase: when the lead continues the cross-check reviewer for a mid-plan checkpoint (`scope: checkpoint`, `phase: 4`), the route hook takes the phase from the agent's first spawn message, which named none, so the verdict was recorded against the current phase (5) and wrote `phases/5.reviewed`; the lead had to route it by hand with `--phase 4`.
3. `dirtyPaths` in `.claude/lib/git.mjs` loses the first character of the first porcelain line because `git()` trims its output (preflight printed `claude/bin/harness.mjs`, earlier warnings printed `ork/...` and `ench/...`).
4. `.claude/skills/branching/templates/manifest.example.yaml:1` names `.claude/branching/manifest.yaml`; the manifest now lives at `.tether/state/branching.yaml`.
5. Formatting: `.claude/lib/preflight.mjs:17` (`const out ={`) and `test/kernel/packet.test.mjs:101` (`const withComments =(value)`) lost a space.
6. `inject.state` cold start went from a 56 ms median (spike check 9) to about 81 ms after the hooks became shells (median of 9 spawns, `{}` on stdin, bare `node -e 0` at 39 ms). Bring it back within 20 ms of 56 ms, or record why not.

Done when `npm test` is green and each item has a test or a measured result. No comments in code; a stale comment is deleted, never reworded.
