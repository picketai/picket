---
kind: report
title: Tether plugin spike, eleven packaging checks
date: 2026-10-04
audience: developer
sources:
  - work/20261004-tether-plugin-spike-eleven-packaging-checks/request.md
  - spike/HANDOFF.md
  - .claude/MEMORY.md
  - .claude/settings.json
  - .claude/lib/admit.mjs
  - .claude/lib/work.mjs
  - .claude/bin/harness.mjs
  - bench/lib/claude.mjs
  - bench/run.mjs
  - bench/lib/trust.mjs
  - bench/lib/fixture.mjs
  - bench/adapters/rework.mjs
  - bench/results/rework-2026-10-02.json
  - spike/out/*.jsonl (every event log named in the findings)
  - ~/.claude/plugins/known_marketplaces.json and installed_plugins.json (check 10 side effects)
  - https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km (not fetchable, HTTP 403)
confidence: medium
---
# Report: Tether plugin spike, eleven packaging checks

## Summary

A Claude Code plugin can carry Tether's agents, skills, hooks and kernel CLI: ten of the eleven checks passed, and check 8 ran the whole current harness as a plugin and got the same grade as the copy-in run on the same task (R-020) [VERIFIED]. The one check that failed as written is 5: a skill with `paths` did not load its text after a matching edit, so path-scoped skills cannot carry rules (R-017) [VERIFIED]. Three facts shape the design: plugin skills are always namespaced (`tether:ordering`) and a project skill of the bare name wins a bare invocation (R-012); a spawned subagent does not see the SessionStart text, but does see SubagentStart text (R-013, R-016); and a hook folder that writes beside itself writes into the plugin folder (R-007, R-020) [VERIFIED]. The stop rule was not triggered (checks 0, 1, 2, 3 passed). The four decisions below are flagged for the architect [ARCHITECT REVIEW NEEDED].

## Context

Asked: answer eleven checks with pass or fail, what was observed, and the event log path; give evidence for four decisions. Scope: `spike/` plus the three allowed edits outside it. Runs were serial, haiku lead for checks 0 to 7, `--plugin-dir` for checks 0 to 9, `--max-budget-usd 1` on every run except check 8 (`--budget-usd 3`, owner's redirect), `--harness-root .` for check 8. Claude Code 2.1.282. The preflight (ANTHROPIC_API_KEY unset, no apiKeyHelper in the three settings files) was repeated before the first run and before check 8 and was clean both times [VERIFIED]. Every stream reported one `rate_limit_event` with status `allowed`; no run was throttled. Total spend: about $1.3 across the 20 haiku runs and $1.48 for check 8.

Method note: `harness admit` on the request's first two paragraphs answered `order` (all signals false; the RESEARCH pattern at `.claude/lib/admit.mjs:18` matches none of their words), not `research` as the handoff says. The lead opened the item as research because the request names itself a research work item [VERIFIED].

The background artifact returned HTTP 403; the plan was read only through `.claude/MEMORY.md`.

Where wording changed: checks 3, 4 and 5 were first run as the handoff words them (marker lines that "start with" `Tether marker`) and the logs were kept as `*-startswith.jsonl`. The model quoted only one marker per reply, and quoted an injected line with a prefix, so the prompts were reworded ("contains", "list all", ask the lead before spawning). Earlier logs are kept: `3-startswith`, `3-contains`, `3-first`, `4-startswith`, `4-contains`, `4-first`, `5-*-startswith`, `5-*-contains`. The pass or fail below rests on the last wording and agrees with the earlier runs where they were comparable.

## Structure

Files created under `spike/`: `run.mjs` (runner for checks 0 to 7, 9 and 10), `build-full.mjs` and `tether-full/` (check 8 and 9), `tether/` (minimal plugin: `.claude-plugin/plugin.json`, `agents/probe.md`, three skills, five hooks, `bin/tether` and `bin/tether.mjs`, and a `kernel/` copy of `.claude/bin/harness.mjs`, `.claude/lib` and `.claude/hooks/lib`, `vendor`), `marketplace/` (local git repo, two commits), `out/` (logs). Disposable: `spike/.runs/`, `bench/.runs/`. Edits outside `spike/`: `bench/lib/claude.mjs` (two `if` lines after `--max-turns`), `bench/run.mjs` (two properties in the `runClaude` call), and the new `bench/adapters/plugin.mjs`. Nothing was committed or pushed.

## Findings

- **R-001** [VERIFIED] Every handoff check except 9 and 10 ran through `runClaude` with one fresh fixture copy per run; 9 produced timings and 10 produced command output. `spike/run.mjs`.
- **R-002** [VERIFIED] Copy-in baseline for check 8: `fast-01-pagination`, run 1 of `bench/results/rework-2026-10-02.json`: pass true, own suite 22/22, hidden 3/3, five grep and untouched checks true, $1.27, 87 s, model `claude-opus-5-5[1m]`.
- **R-003** [VERIFIED] That baseline used the main checkout's harness at commit `5061e36` (dirty), not this worktree. `bench/results/rework-2026-10-02.json` manifest.
- **R-004** [VERIFIED] The handoff ran check 9 before check 8 yet needs `spike/tether-full/` built in check 8. Resolved per the owner's redirect: `build-full.mjs` ran (no model call) just before check 9.
- **R-005** [VERIFIED] The $1 cap was below the baseline cost. Resolved: check 8 ran with `--budget-usd 3` and cost $1.48.
- **R-006** [VERIFIED] `defaultHarnessRoot("plugin")` resolves to the main checkout (`bench/run.mjs:54-60`). Resolved: check 8 passed `--harness-root .`; the record shows `harness plugin@307a4df`.
- **R-007** [VERIFIED] `guard.bash.mjs` writes its log beside itself (`.claude/hooks/guard.bash.mjs:52`). In the plugin copy it wrote 20 lines to `spike/tether-full/ledger/guard-bash.log`, inside the plugin folder, which an update replaces.
- **R-008** [VERIFIED] Current `.claude/settings.json` has no SubagentStart hook and uses `${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>` in exec form for every hook. `.claude/settings.json:44-72`. `build-full.mjs` rewrites these to `${CLAUDE_PLUGIN_ROOT}/hooks/<name>` (13 occurrences in `spike/tether-full/hooks/hooks.json`).
- **R-009** [VERIFIED] The settings file also carries `env`, `statusLine`, `permissions`, `outputStyle` and `disableClaudeAiConnectors`; the adapter strips only `hooks` and `outputStyle`. `bench/adapters/plugin.mjs`.
- **R-010** [VERIFIED] `trustWorkspace` edits `~/.claude.json` for the length of each run and `untrustWorkspace` removes the entry. Existing bench behaviour. `bench/lib/trust.mjs`.
- **R-011** [VERIFIED] **Check 0: PASS.** The first `system` init event lists plugin `tether` (`tether@inline`, version `0.0.1-spike`), agent `tether:probe`, skills `tether:ordering` and `tether:where`. The path-scoped `tether:work-items` is not in the init list (see R-017). The subagent tool is named `Task` in the init tools list and `Agent` in tool_use blocks. Log: `spike/out/0.jsonl`.
- **R-012** [VERIFIED] **Check 6: result recorded (no fail condition).** With a project skill `ordering` present, the init list holds both `ordering` and `tether:ordering`. `/ordering` quoted K-6 project (`spike/out/6-slash.jsonl`); `/tether:ordering` quoted K-6 plugin (`6-qualified.jsonl`); "use the ordering skill" quoted K-6 project (`6-prose.jsonl`). Plugin skills are always prefixed; a bare name reaches the project skill. In check 8 no project skill of that name existed, and the lead called `tether:expediting` itself (`spike/out/8.jsonl`).
- **R-013** [VERIFIED] **Check 3: PASS for the lead; the probe does not see S-3.** The SessionStart hook output arrives as a `hook_response` event and the lead quotes "SessionStart:startup hook success: Tether marker S-3". The probe, asked the same, lists only K-6 plugin (from its preloaded skill). Consistent across four runs. Log: `spike/out/3.jsonl` (also `3-first`, `3-contains`, `3-startswith`).
- **R-014** [VERIFIED] **Check 2: PASS.** The write to `work/demo/state.yaml` returned "PreToolUse:Write hook error: tether spike guard" (first attempt was stopped by the Read-first rule, the second by the hook). `.tether/state/hook-log.jsonl` holds SubagentStart, SubagentStop (agent `tether:probe`, verdict `PHASE DONE`, effort `{"level":"low"}`) and Stop entries. All five events ran with `${CLAUDE_PLUGIN_ROOT}` in exec-form args. Logs: `spike/out/2.jsonl`, `spike/out/2-hook-log.jsonl`.
- **R-015** [VERIFIED] **Check 1: PASS.** The probe ran as `claude-sonnet-5` while the lead was `claude-haiku-4-5`; it reported having only Read, Grep, Write, Edit (no Bash; Write and Edit come with `memory`) and no Bash call appears in its events; it wrote `.claude/agent-memory/tether-probe/probe_note.md`; it quoted K-6 plugin, so `skills: ordering` preloaded the plugin skill; `effort: low` seen in R-014. Logs: `spike/out/1.jsonl`, `spike/out/1-agent-memory.txt`.
- **R-016** [VERIFIED] **Check 4: PASS.** Before spawning, the lead lists S-3 only; the probe lists K-6 plugin and E-4. Repeat run agrees. The SubagentStart input names `agent_type: tether:probe` (with the plugin prefix, which the hook strips to pick `probe`). The stream carries no hook event for SubagentStart; the hook log and the probe's quote are the evidence. Single-line questions returned one marker only (`4-first.jsonl`, `4-contains.jsonl`). Logs: `spike/out/4.jsonl`, `4-repeat.jsonl`, `4-hook-log.jsonl`.
- **R-017** [VERIFIED] **Check 5: FAIL as written.** In both runs the model could call the Skill tool `tether:work-items` and got the P-5 text, including after editing only `README.md`; without that explicit call P-5 never appeared in either run, including after the `work/demo/notes.md` edit. So `paths` neither hid the skill nor injected its text. Logs: `spike/out/5-readme.jsonl`, `5-work.jsonl` (earlier wordings: `5-*-startswith.jsonl`, `5-*-contains.jsonl`).
- **R-018** [VERIFIED] **Check 7: PASS.** The `where` skill gave an absolute root (`D:/workspace/github/AISpec/.worktrees/framework/spike/tether`). `tether next demo` in the Bash tool and `node ".../bin/tether.mjs" next demo` in the PowerShell tool returned the same JSON (`{"id":"demo","lane":"fast","status":"open",...,"action":"close"}`). Bare `tether` resolved because plugin `bin/` is on the Bash tool's PATH. Log: `spike/out/7.jsonl`.
- **R-019** [VERIFIED] **Check 9: PASS.** Ten hooks, 20 cold runs each, medians 46 to 66 ms, plugin copy within -5.4 to +1.6 ms of `.claude/hooks`; a bare `node -e 0` costs 36.1 ms. The sample events are small and some hooks may exit early on them. Log: `spike/out/9.jsonl`.
- **R-020** [VERIFIED] **Check 8: PASS.** `fast-01-pagination` with `--harness plugin`: pass true, terminal completed, own 22/22, hidden 3/3, same five grep and untouched checks true as R-002; $1.48, 75 s, model `claude-opus-5-5` (baseline `claude-opus-5-5[1m]`), one `approval` gate answered `c`. All 15 skills and four agents loaded namespaced (`tether:analyst` and so on); the lead invoked `tether:expediting`. The project `.claude/ledger/ledger.jsonl` got a `stop` entry, so plugin hooks fired. Hook events other than SessionStart are not in the stream. Logs: `spike/out/8.jsonl`, `8-result.json`, `8-ledger.jsonl`.
- **R-021** [VERIFIED] **Check 10: PASS.** `marketplace add --scope project`, `install --scope project`, a version bump committed to the local marketplace, `marketplace update`, `plugin update --scope project`: the installed version went from 0.0.1-spike to 0.0.2-spike (`claude plugin list`). Cleanup with `--scope project` ran. Log: `spike/out/10.jsonl` (`10-install.jsonl` is the install half).
- **R-022** [VERIFIED] Project scope still leaves user-level traces. `known_marketplaces.json` and `installed_plugins.json` under `~/.claude/plugins` held `tether-spike`; the plugin was cached under `~/.claude/plugins/cache/tether-spike/`. After cleanup both registries no longer list it, but the folder `~/.claude/plugins/cache/tether-spike` and `~/.claude/plugins/data/tether-inline` (from `--plugin-dir`) remain. The fixture's `.claude/settings.json` held only `extraKnownMarketplaces` and `enabledPlugins`.
- **R-023** [VERIFIED] A guard blocked one step: a Bash command that chained `rm` (to delete two duplicate logs) was denied by `guard.bash`: "command contains a destructive sub-command". It was not routed around. The duplicates `spike/out/3-run2148.jsonl` and `spike/out/4-run30735.jsonl` remain (copies of `3.jsonl` and `4.jsonl`), as do `spike/.runs/` and `bench/.runs/`.
- **R-024** [VERIFIED] The stop rule did not trigger: checks 0, 1, 2 and 3 passed. The "Claude side installs by copying files" finding is not recorded.

## Dependencies and relationships

The spike depends on the `claude` CLI login (subscription), `~/.claude.json` trust entries, the approver MCP server in `bench/lib/approver-mcp.mjs`, and the bench fixture. Plugin installs under `~/.claude/plugins` are shared with the owner's own Claude Code (R-022).

## Risks and unknowns

- [UNKNOWN] Whether a path-scoped skill loads in an interactive session. Only `claude -p` was run; the docs claim was not reproduced (R-017) [ARCHITECT REVIEW NEEDED].
- [UNKNOWN] Whether `${CLAUDE_PLUGIN_ROOT}` changes on a version update (cache path includes the version, R-022), so any state a hook keeps beside itself (R-007) is lost on update.
- [UNKNOWN] Plugin hook order against project hooks was not tested; check 8 had no project hooks by construction.
- [UNKNOWN] Pinning a plugin version from a project's settings was not tested.
- [UNKNOWN] The check 8 grade came from one run of one task on one day against a baseline from another harness commit (R-003); the model id also differs by the `[1m]` suffix.
- [ASSUMPTION] Haiku quoting is noisy (one marker per reply unless told to list all); each pass rests on the final wording and on log events (hook responses, task notifications), not on the model's summary alone.
- [ASSUMPTION] Check 1: absence of Bash rests on the probe's own report and the lack of any Bash call in its events; the stream does not list a subagent's tools.
- [ASSUMPTION] Coverage: hooks other than the ones timed were not read in full; `.claude/skills/*` and `.claude/agents/*` frontmatter was copied, not reviewed.

## Recommendations

The four decisions, with the evidence for each, none proposed [ARCHITECT REVIEW NEEDED]:

1. **Plugin or installer for the Claude side.** Evidence for a plugin: R-011, R-014, R-015, R-018, R-020, R-021. Limits that remain outside any plugin: rules, `CLAUDE.md`, permissions, `settings.json` keys (handoff known facts), and the user-level traces of R-022.
2. **Naming rule for skills and agents.** Evidence: R-012. Plugin skills and agents are `tether:<name>`; a bare name reaches a project skill of that name; in check 8 the lead chose the prefixed name unprompted while `CLAUDE.md` names lanes bare.
3. **How rules reach teammates.** Evidence: R-013 (subagent does not see SessionStart text), R-016 (SubagentStart injection reaches only the named agent type), R-017 (`paths` skills do not inject text). Agent `skills:` preload does reach the agent (R-015).
4. **Measured hook timings.** Evidence: R-019: plugin medians 46.5 to 60.5 ms, deltas -5.4 to +1.6 ms, bare node 36.1 ms.

## Glossary

- **Tether**: the product as users see it; `tether` is the plugin and CLI name (`.claude/MEMORY.md`).
- **Check 8 grade**: the `pass` field and per-check list in a bench record, for example own suite 22/22 and hidden tests 3/3.
