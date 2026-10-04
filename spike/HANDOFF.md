# Tether plugin spike: handoff

Written 2026-10-04 for the Claude Code session that runs the spike in this worktree, and for the owner. It carries everything that session needs; the conversation that produced it is not available to you.

## Start here

1. The owner fast-forwards this branch to trunk once, from a normal terminal, before the session starts (the bash guard blocks `git merge` for agents):

   ```
   git -C D:\workspace\github\AISpec\.worktrees\framework merge --ff-only trunk
   ```

   After it, `git log --oneline -1` here shows `307a4df docs(memory): Tether glossary and packaging decisions`, and `.claude/MEMORY.md` exists.

2. Treat `spike/request.md` as the request. Run `harness admit` on its first two paragraphs; it answers `research` (checked on 2026-10-04). Invoke the `researching` skill, and open the item with `--request spike/request.md` so the text is saved verbatim.

3. The analyst's outline must list the eleven checks (0 to 10) and the files it will create. That outline is the owner's gate before any run spends quota. The deep pass builds `spike/` and runs the checks.

## What is already decided

Read `.claude/MEMORY.md` for the full log. The parts that bind this spike:

- The product is **Tether**. Plugin and CLI are named `tether`. Say Tether in anything a user reads; "harness" is for internal talk only.
- `core/` will be the plugin folder later. The spike does not create `core/`; everything goes under `spike/`.
- Settings will live in `.tether/config.json`, state in `.tether/state/`, customizations in `.tether/extensions/<name>/` with an `extension.json` manifest.
- **Claude Code only.** Do not test other hosts.
- **No remote repository.** Check 10 uses a local-path marketplace.
- **No extra charges.** Runs use the owner's claude.ai subscription.

## Constraints

**Billing.** `ANTHROPIC_API_KEY` was unset on 2026-10-04 and no settings file defines an `apiKeyHelper`, so `claude -p` bills the subscription quota, not the API. Check both again before the first run and stop if either is set. Run serially; the subscription has rate limits (the last benchmark run met 13 rate-limit events). Pass `--max-budget-usd 1` on every run as a runaway guard.

**Models.** Run the lead with `--model haiku` for checks 0 to 7 to spare quota. Give the probe agent `model: sonnet`, so check 1 can tell the lead's model from the agent's. Check 8 uses the default model, because it is graded against an earlier run that did.

**Scope.** Load the plugin with `--plugin-dir` for checks 0 to 9. For check 10, run every `claude plugin` command with `--scope project` and with the working directory inside a fixture copy, so nothing reaches the owner's own Claude Code configuration. Afterwards, uninstall the plugin and remove the marketplace with the same scope.

**Boundaries.** Never touch trunk, the main checkout at `D:\workspace\github\AISpec`, or `D:\workspace\development`. Never push. New files go under `spike/`; the only edits outside it are listed in `spike/request.md`.

**House rules.** No comments in code, spike code included (`.claude/rules/comments.md`). The report follows `.claude/rules/prose.md`.

## Setup already done

- `npm ci` ran in this worktree (2 packages).
- `.claude/settings.local.json` was copied from the main checkout. Git ignores it. It carries the `analysis` source variable and the owner's permissions.
- `.claude/MEMORY.md` reaches this branch with the fast-forward in step 1.

## The runner

`spike/run.mjs` runs one check at a time:

1. Build the fixture template once with `buildTemplate({ fixtureDir: "bench/fixture", cacheDir: "bench/.cache" })` from `bench/lib/fixture.mjs`.
2. Make a fresh copy per check with `materializeRun({ template, runDir: "spike/.runs/<check>" })`, then add the check's files: `.tether/config.json`, the extension folder, a project skill.
3. Mark the copy trusted with `trustWorkspace(repo)` from `bench/lib/trust.mjs`, and untrust it after.
4. Write an approver config the same way `bench/run.mjs:114-119` does, so permission prompts are answered and logged instead of blocking.
5. Call `runClaude` from `bench/lib/claude.mjs`. It needs two added options: `pluginDir` (pushes `--plugin-dir <path>`) and `model` (pushes `--model <name>`). Both go next to the existing flags at `bench/lib/claude.mjs:31`.
6. Save the events to `spike/out/<check>.jsonl`.

The first `system` event of a run lists the loaded tools, agents, skills and plugins. That listing is the evidence for check 0 and part of check 6.

## Markers

Each probe text contains a unique line such as `Tether marker S-3`. The prompt asks the session (or the probe agent) to quote every line in its context that starts with `Tether marker`. Present or absent, in the reply and in the transcript, is the evidence.

| Marker | Where it lives | Check |
|---|---|---|
| S-3 | printed by the SessionStart hook | 3 |
| E-4 | `.tether/extensions/spike-ext/agents/probe.md` in the fixture copy | 4 |
| P-5 | `skills/work-items/SKILL.md` in the plugin | 5 |
| K-6 plugin | `skills/ordering/SKILL.md` in the plugin | 1, 6 |
| K-6 project | `.claude/skills/ordering/SKILL.md` in the fixture copy | 6 |

## The minimal plugin: `spike/tether/`

```
.claude-plugin/plugin.json      { "name": "tether", "version": "0.0.1-spike" }
agents/probe.md                 tools: Read, Grep · model: sonnet · memory: project · skills: ordering · effort: low · color: cyan
skills/ordering/SKILL.md        user-invocable: true · marker K-6 plugin
skills/work-items/SKILL.md      paths: work/** · user-invocable: false · marker P-5
skills/where/SKILL.md           body: "The Tether root is ${CLAUDE_PLUGIN_ROOT}."
hooks/hooks.json                SessionStart, SubagentStart, PreToolUse (Write|Edit), Stop, SubagentStop; exec form with args
hooks/session.mjs               prints marker S-3
hooks/subagent.mjs              reads .tether/config.json and each listed extension.json; prints that extension's text for the starting agent type
hooks/guard.mjs                 denies a write to work/*/state.yaml with the message "tether spike guard"
hooks/stop.mjs                  appends the event to .tether/state/hook-log.jsonl, runs `tether find-verdict` on the last line
bin/tether, bin/tether.mjs      a thin wrapper over a copy of today's kernel (.claude/bin/harness.mjs and .claude/lib/)
```

Fixture additions for check 4:

```
.tether/config.json                                 { "version": 1, "extensions": ["spike-ext"] }
.tether/extensions/spike-ext/extension.json         { "schema": 1, "name": "spike-ext", "version": "0.0.1",
                                                      "requires": { "tether": ">=0.0.1-spike" },
                                                      "provides": { "agents": { "probe": "agents/probe.md" } } }
.tether/extensions/spike-ext/agents/probe.md        marker E-4
```

## The checks

Run them in this order: 0, 6, 3, 2, 1, 4, 5, 7, 9, 8, 10.

**0. The plugin loads.** Prompt "Reply OK". Pass: the first `system` event lists the plugin, an agent named like `tether:probe`, and skills named like `tether:ordering`.

**6. Names and shadowing.** Use the names from check 0. Then three runs with both K-6 markers present: `/ordering`, `/tether:ordering`, and "use the ordering skill". Record which marker each one quotes. No fail condition: the result sets how CLAUDE.md and the contracts name skills and agents in step 3.

**3. Session context.** Ask the lead to quote marker lines. Then have it spawn the probe and ask the probe the same. Pass: the lead quotes S-3. The probe's answer decides the rule path. If the probe cannot see S-3, rules every teammate must read (today `prose` and `comments`) have to go through the SubagentStart path tested in check 4.

**2. Hooks.** Ask the lead to write `x` to `work/demo/state.yaml`. Then have it spawn the probe with an instruction to end its reply with `PHASE DONE` alone on the last line. Pass: the write is denied with "tether spike guard", and `.tether/state/hook-log.jsonl` holds a Stop entry and a SubagentStop entry whose verdict is `PHASE DONE`.

**1. Agent frontmatter.** Have the lead spawn the probe and ask it to run `echo hi` through Bash, save a one-line memory note, name its model, and quote marker lines. Pass: Bash is refused or missing; the agent's events show a Sonnet model while the lead is Haiku; a memory folder appears under `.claude/agent-memory/` (record its exact name); K-6 plugin is quoted, which proves the `skills` preload.

**4. Extension injection.** Spawn the probe; ask it, then the lead, to quote marker lines. Pass: the probe quotes E-4 and the lead does not; the SubagentStart input names the agent type, so the hook picked the right file.

**5. Path-scoped skill.** Two runs. In the first, edit `README.md` and then ask for marker lines. In the second, edit `work/demo/notes.md` and ask again. Pass: P-5 is absent after the first edit and present after the second.

**7. The CLI on Windows.** Ask the lead to invoke the `where` skill and report the root it prints. Then run `tether next demo` through the Bash tool, and `node "<that root>/bin/tether.mjs" next demo` through the PowerShell tool. Pass: the root is an absolute path, and both commands return the same JSON.

**9. Hook cold start.** For each hook, run it 20 times with a small sample event on stdin, from `spike/tether-full/hooks` (built in check 8) and from `.claude/hooks`. Pass: the median is under 200 ms and within 20 ms of today's.

**8. The whole harness as a plugin.** `spike/build-full.mjs` builds `spike/tether-full/`:

- copy `.claude/agents`, `skills`, `hooks`, `lib`, `bin`, `scripts` and `output-styles`;
- generate `hooks/hooks.json` from the hooks in `.claude/settings.json`, replacing `${CLAUDE_PROJECT_DIR}/.claude/hooks/` with `${CLAUDE_PLUGIN_ROOT}/hooks/`;
- in every copied Markdown file, replace `node .claude/bin/harness.mjs` with `node "${CLAUDE_PLUGIN_ROOT}/bin/harness.mjs"`.

The hooks import `../lib/`, which still resolves in the copy. Add `bench/adapters/plugin.mjs`. Its `install` copies only what a plugin cannot carry: `CLAUDE.md`, `.claude/rules/`, `.claude/harness.json`, `work/`, and `.claude/settings.json` without its `hooks` and `outputStyle` keys. It also tells the runner to pass `--plugin-dir spike/tether-full`. Then run `node bench/run.mjs --harness plugin --tasks <one fast task id> --runs 1`. Take the task id from `bench/results/rework-2026-10-02.json`, which holds the copy-in grade from 2026-10-02. Pass: the same grade on the same task.

**10. Local marketplace.**

1. Make `spike/marketplace/` a local git repository. It holds `.claude-plugin/marketplace.json`, listing a plugin named `tether` with `"source": "./tether"`, and a copy of `spike/tether/`.
2. Inside a fixture copy, run `claude plugin marketplace add <absolute path to spike/marketplace> --scope project`, then `claude plugin install tether@<marketplace name> --scope project`.
3. Bump the plugin's `version` and commit. Run `claude plugin marketplace update <marketplace name>`, then `claude plugin update tether@<marketplace name>`.

Pass: the new version is the one installed. Clean up afterwards with the same scope.

## Stop rule

If check 0 fails, stop. If check 1, 2 or 3 fails and the docs offer no workaround, stop as well, record the evidence, and write the finding "Claude side installs by copying files". Either way, the rest of the plan stays the same: kernel, CLI, `init`, extensions and `.tether/`.

## What the spike hands back

- The findings in the work item's research report: one entry per check, with its answer and the path of its event log.
- Four decisions: plugin or installer; the naming rule (check 6); the teammate rule path (checks 3 and 4); hook timings (check 9).
- `bench/adapters/plugin.mjs` and the two `runClaude` options, kept for step 3.
- Everything else under `spike/` stays until the alpha and is deleted before the alpha merges to trunk.

## Known facts, verified 2026-10-02 in the Claude Code docs

- Plugins ship skills, agents, commands, hooks (`hooks/hooks.json`, every event), output styles, MCP servers and a `bin/` folder on the Bash tool's PATH.
- SessionStart and UserPromptSubmit hooks inject up to 10,000 characters through stdout or `additionalContext`.
- `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PROJECT_DIR}` are substituted in hook commands and anywhere in skill, command and agent Markdown.
- `claude -p` honours `--plugin-dir`.
- Path-scoped rules, a plugin's `CLAUDE.md`, permissions and most settings keys cannot ship in a plugin. A plugin's `settings.json` honours only `agent` and `subagentStatusLine`.
- Not documented, and therefore tested here: which agent frontmatter fields survive, bare-name resolution and shadowing, plugin hook order against project hooks, Windows behaviour of `bin/`, and pinning a version from a project's settings.
