Separate: step 2 of the Tether packaging plan (https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km, roadmap). Split what Tether ships from what a project owns, so step 3 can move the core into `core/` as a plugin.

1. One paths module: every path the kernel and the hooks read or write comes from it.
2. Runtime state moves to `.tether/state/` (ignored by git): today's ledger, drive log, guard log and branching manifest, written by nine files into three folders.
3. Settings move to `.tether/config.json` (tracked), with a schema: lanes, commands, security paths, and whatever `.claude/harness.json` holds today.
4. Hooks become thin shells over kernel verbs.
5. `harness-authoring` becomes a repository-only rule that does not ship.
6. SDR-00001 TF-003: no hook or kernel code writes beside itself (`guard.bash.mjs:52` writes its log next to the hook today); a test fails on any write path built from a module's own location.

Done when: no `.claude` path literal is left in the kernel or the hooks, `npm test` is green, and the benchmark result equals the baseline. The benchmark run spends subscription quota: dry-run it first, quote the expected cost, and wait for the owner's go before it runs.

Binding: `.claude/MEMORY.md` decisions and SDR-00001 (`artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md`). Out of scope: creating `core/`, the plugin manifest, the `tether:` rename, rule injection and `tether init` (step 3 and 4). Existing projects that use today's `.claude/` state paths need a migration path or a clear break; that is a decision.
