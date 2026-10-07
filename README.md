# AISpec

A software-development harness for Claude Code: four lanes, four agents, one kernel, and a benchmark that measures the harness itself.

Tether ships as a Claude Code plugin in `core/`. In this repository, start every session with `claude --plugin-dir core` (`npm run claude`).

Code decides what code can decide. Lane admission, the next action, phase verification, verdict routing and cost all come from `tether <verb>`; the model fills in what remains. State is the filesystem: one directory per work item under `work/<id>/`, read fresh on every call, never remembered.

## Lanes

| Lane | When | Who | Gates |
|---|---|---|---|
| fast (`tether:expediting`) | at most 3 files, no new surface, dependency, security path or migration | main session | tests, lint, drive, commit |
| order (`tether:ordering`) | a bounded feature, at most 3 phases and 5 local decisions | architect, developer, reviewer | one user gate per phase (run grants allowed), one cumulative review |
| design (`tether:designing`) | security path, migration, irreversible step, cross-repo contract, or more than an order holds | architect, developer, reviewer | decisions plus phase 1 first, concurrent cross-check, per-phase gates, checkpoint on long plans, cumulative review |
| research (`tether:researching`) | a question that needs a report | analyst | outline first, deep pass on request |

`tether admit --text "<request>"` picks the lane deterministically from the text and a repository probe, and re-checks it against the files actually touched.

## Layout

```
CLAUDE.md                  under 2 KB, loaded on every turn
core/.claude-plugin/       the plugin manifest: name tether, version, the skills list
core/rules/                work-items, security-paths, prose, comments: injected into the lead and every agent
core/agents/               tether:analyst, architect, developer, reviewer (shells, at most 120 lines)
core/skills/               lane skills, consulting, documenting, reviewing, ticketing, branching,
                           understanding, proofreading, summarizing, benchmarking, resuming, inspecting
core/output-styles/        tether:custom, the response rules
core/bin/tether            the kernel CLI on the Bash tool's PATH; core/bin/tether.mjs runs it; core/lib/ its modules
core/hooks/                eleven hooks registered in hooks.json: guards, schema lint, drive observer, stall monitor,
                           state and rule injection, verdict router, ledger
.claude/rules/             harness-authoring (repository-only, never installed)
.claude/bin/harness.mjs,   one-line forwarders into core/ until the forwarders retire
.claude/hooks/
.tether/config.json        project settings (tracked): security paths, sources, lane caps, commands;
                           the contract is core/lib/config.schema.json
.tether/state/             runtime state (ignored): ledger, drive log, guard log, check logs, branching.yaml
work/<id>/                 state.yaml, the lane artifact, phase markers, verdicts.jsonl
bench/                     golden task suite, fixture repo, runner, reporter (see bench/README.md)
test/                      kernel, hook and budget tests: npm test
```

## Benchmarks

`node bench/run.mjs --harness <trunk|rework> --tasks all --runs 5` runs the 14 golden tasks against a harness in fresh fixture repos with a scripted approver, grades by code, and `node bench/report.mjs <baseline> <candidate> --check` reports pass@1, pass^k, route agreement, cost and variance, time to first reviewable output, stops, prompts, re-reads and cache hit ratio, failing on a regression past two standard errors. Every run spends real API budget: dry-run first.

## Status

PLAN.md carries the plan, the research it rests on, the status table and the head-to-head against trunk (section 4.2, clean run of 2026-09-14); `bench/results/comparison-clean.md` is the full report. Headline: 14 of 14 tasks pass against trunk's 13, every task on its intended lane against 57%, cost per task $2.97 against $3.37 at equal wall time, first reviewable output 96 s against 130 s, 0.4 permission prompts per task against 3.1, cache 97% against 91%. The research lane is the one lane that costs more (outline gate).
