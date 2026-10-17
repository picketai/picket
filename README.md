# Picket

Picket is a software-development workflow for Claude Code: four lanes, four agents, one kernel, and a benchmark that measures Picket itself.

To install it in your own project and learn the daily loop, read [How to install and use Picket](docs/how-to.md). [The agents](docs/agents.md) reference says what each agent does and when it runs, and [the skills](docs/skills.md) reference does the same for each skill.

Picket ships as a Claude Code plugin in `core/`. In this repository, start every session with `claude --plugin-dir core` (`npm run claude`).

Code decides what code can decide. Lane admission, the next action, phase verification, verdict routing and cost all come from `picket <verb>`; the model fills in what remains. State is the filesystem: one directory per work item under `work/<id>/`, read fresh on every call, never remembered.

## Lanes

| Lane | When | Who | Gates |
|---|---|---|---|
| fast (`picket:expediting`) | at most 3 files, no new surface, dependency, security path or migration | main session | tests, lint, drive, commit |
| order (`picket:ordering`) | a bounded feature, at most 3 phases and 5 local decisions | architect, developer, reviewer | one user gate per phase (run grants allowed), one cumulative review |
| design (`picket:designing`) | security path, migration, irreversible step, cross-repo contract, or more than an order holds | architect, developer, reviewer | decisions plus phase 1 first, concurrent cross-check, per-phase gates, checkpoint on long plans, cumulative review |
| research (`picket:researching`) | a question that needs a report | analyst | outline first, deep pass on request |

`picket admit --text "<request>"` picks the lane deterministically from the text and a repository probe, and re-checks it against the files actually touched.

## Layout

```
CLAUDE.md                  under 2 KB, loaded on every turn
core/.claude-plugin/       the plugin manifest: name picket, version, the skills list
core/rules/                work-items, security-paths, prose, comments: injected into the lead and every agent
core/agents/               picket:analyst, architect, developer, reviewer (shells, at most 120 lines)
core/skills/               lane skills, consulting, documenting, reviewing, ticketing, branching,
                           understanding, proofreading, explaining, summarizing, benchmarking, resuming,
                           inspecting
core/output-styles/        picket:custom, the response rules
core/bin/picket            the kernel CLI on the Bash tool's PATH; core/bin/picket.mjs runs it; core/lib/ its modules
core/lib/styling/          what picket setup-terminal installs and picket uninstall removes
core/themes/               the PicketAI Claude Code theme setup-terminal copies
core/hooks/                twelve hooks registered in hooks.json: guards, schema lint, drive observer, stall monitor,
                           state, rule and extension injection, verdict router, ledger
status/                    picket-status: the open work item and its agents, above the prompt
session/                   picket-session: this project's sessions and agents in a docked sidebar (opt-in)
markdown/                  picket-markdown: a read-only pane for a Markdown path clicked in a reply
.claude/rules/             harness-authoring (repository-only, never installed)
.claude-plugin/            the root marketplace picketai: picket from ./core, picket-status from ./status,
                           picket-session from ./session, picket-markdown from ./markdown
.picket/config.json        project settings (tracked): security paths, sources, lane caps, commands;
                           the contract is core/lib/config.schema.json
.picket/state/             runtime state (ignored): ledger, drive log, guard log, check logs, branching.yaml
work/<id>/                 state.yaml, the lane artifact, phase markers, verdicts.jsonl
bench/                     golden task suite, fixture repo, runner, reporter (see bench/README.md)
test/                      kernel, hook and budget tests: npm test
```

## Benchmarks

`node bench/run.mjs --harness <plugin|trunk> --tasks all --runs 5` runs the 14 golden tasks against one Picket build in fresh fixture repos with a scripted approver, grades by code, and `node bench/report.mjs <baseline> <candidate> --check` reports pass@1, pass^k, route agreement, cost and variance, time to first reviewable output, stops, prompts, re-reads and cache hit ratio, failing on a regression past two standard errors. Every run spends real API budget: dry-run first.

## Status

Picket is an alpha, published on npm under the `alpha` dist-tag (`npm install -g @picketai/picket@alpha`).

New since 1.0.0-alpha.1:

- `picket setup-terminal` gives Claude Code and the terminal the PicketAI look (theme, font, colour scheme, status line), and `picket uninstall` removes only what you choose.
- `picket statusline` renders the session line, and `picket init` sets it unless a status line is already set.
- `picket leave` records cleanup a work item leaves for you; `picket close` lists it.
- `picket next --latest` answers the newest open work item.
- `picket --help`, `picket help` and `picket --version`.
- The skill `picket:explaining` walks one scenario or concept through worked data.
- `guard.bash` checks PowerShell commands too, and in the default, acceptEdits and auto modes a destructive command can be escalated to you with `PICKET_ESCALATE`.
- `picket init` installs the mods picket-status and picket-markdown beside picket; picket-session is opt-in.

`bench/results/comparison-clean.md` is the head-to-head against the previous harness (clean run of 2026-09-14). Headline: 14 of 14 tasks pass against trunk's 13, every task on its intended lane against 57%, cost per task $2.97 against $3.37 at equal wall time, first reviewable output 96 s against 130 s, 0.4 permission prompts per task against 3.1, cache 97% against 91%. The research lane is the one lane that costs more (outline gate).
