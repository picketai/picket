Tether plugin spike: a research work item whose throwaway code lives only under `spike/`.

Question: can a Claude Code plugin carry Tether (today's harness: agents, skills, hooks and the kernel CLI), or must the Claude side install by copying files into each project? Answer the eleven checks below (numbered 0 to 10) with evidence: for each, a pass or fail, what was observed, and the path of the event log that shows it.

Checks:

0. The plugin loads in a headless run, and its agent and skills are listed.
1. Plugin agents keep `tools`, `model`, `memory`, `skills` and `effort` frontmatter.
2. Plugin hooks fire on PreToolUse, Stop and SubagentStop with `${CLAUDE_PLUGIN_ROOT}` in exec-form arguments.
3. SessionStart hook output reaches the lead, and whether it reaches spawned teammates.
4. A SubagentStart hook injects extension text per agent type, read from `.tether/config.json` and `.tether/extensions/<name>/extension.json`.
5. A skill with `paths` loads only when a matching file is touched.
6. How bare skill and agent names resolve, and which wins against a project skill of the same name.
7. The kernel CLI runs on Windows from the Bash tool as `tether` and from PowerShell as `node "<plugin root>/bin/tether.mjs"`.
8. The whole current harness, mechanically copied into a plugin, passes one benchmark fast task with the same grade as the copy-in adapter.
9. Hooks stay under the 200 ms cold budget when run from the plugin folder.
10. A local-path marketplace installs the plugin at project scope and delivers a version bump with one update command.

Constraints:

- Claude Code only.
- Subscription only, no extra charges: `ANTHROPIC_API_KEY` must stay unset (it was unset on 2026-10-04); every run uses the claude.ai login.
- No remote repository: check 10 uses a local-path marketplace.
- Never install a plugin at user scope. Never touch `trunk`, `D:\workspace\github\AISpec` outside this worktree, or `D:\workspace\development`. Never push.
- New files go under `spike/`. The only edits outside it: two options (`pluginDir`, `model`) in `bench/lib/claude.mjs`, a `bench/adapters/plugin.mjs` adapter, and the smallest change in `bench/run.mjs` that lets an adapter pass those options.

Output: the findings report in the work item, plus four decisions: plugin or installer for the Claude side; the naming rule for skills and agents; how rules reach teammates; the measured hook timings.

Background: the packaging plan at https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km and the decision log in `.claude/MEMORY.md`. The full procedure is in `spike/HANDOFF.md`.
