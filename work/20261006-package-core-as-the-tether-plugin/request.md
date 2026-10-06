Package: step 3 of the Tether packaging plan (https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km, roadmap). Make `core/` the Claude Code plugin that carries Tether, and run this repository on it.

1. `core/` is the plugin, with no build step: `.claude-plugin/plugin.json` (name `tether`, version, explicit skills list), agents, skills, `hooks/hooks.json` with the hooks, output styles, `bin/tether` and `bin/tether.mjs` (the CLI), and the kernel. `bench/`, `test/` and `spike/` never ship.
2. Rules reach the lead through SessionStart and every teammate through SubagentStart, from the plugin's `rules/` folder (SDR-00001 D-003, TF-002). `harness-authoring` stays in this repository.
3. Skills and agents are named `tether:<name>` in `CLAUDE.md`, contracts, skills and kernel messages (SDR-00001 D-002, TF-005).
4. A `.claude-plugin/marketplace.json` at the repository root lists the plugin at `./core`; a fresh project installs it with one command from a local path (no remote repository).
5. This repository runs on the plugin (`--plugin-dir core` or a project-scope install), keeping only its own `.claude/` use.
6. The `plugin` bench adapter runs the plugin; the hook budget test runs against `core/hooks` (TF-006).

Done when: the benchmark passes 14 of 14 tasks on the plugin adapter (TF-007), a fresh fixture project installs the plugin with one command, and `npm test` is green. Every benchmark run spends subscription quota: dry-run it, quote the cost, and wait for the owner's go.

Binding: `.claude/MEMORY.md` decisions, SDR-00001, and the Separate step's paths module and `.tether/` layout. Out of scope: `tether init`, `doctor`, `map`, `which` (step 4) and extensions (step 5). This session runs on the harness being moved: the design must keep the session's hooks, skills and kernel calls working at the end of every phase.
