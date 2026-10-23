# Picket

Picket is a software-development workflow for Claude Code: four lanes, four agents, one kernel, and a benchmark that measures Picket itself. It is an alpha, published on npm under the `alpha` dist-tag (`npm install -g @picketai/picket@alpha`).

To install it in your own project and learn the daily loop, read [How to install and use Picket](docs/how-to.md). The reference pages in `docs/reference/` cover [the agents](docs/reference/agents.md), [the skills](docs/reference/skills.md), [the commands](docs/reference/cli.md), [the hooks](docs/reference/hooks.md) and [the mods](docs/reference/mods.md). What changed in each release is in the [changelog](CHANGELOG.md).

Picket's source is `src/`, and `npm run build` writes the Claude Code plugin it ships to `dist/`. In this repository, start every session with `npm run claude`: it builds, then runs `claude --plugin-dir dist` with this checkout's `dist/bin` first on `PATH`, so `picket` is the checkout's kernel, not the installed one.

Code decides what code can decide. Lane admission, the next action, phase verification, verdict routing and cost all come from `picket <verb>`; the model fills in what remains. State is the filesystem: one directory per work item under `work/<id>/`, read fresh on every call, never remembered.

## Lanes

- fast (`picket:expediting`): a small change made in the main session, with one stop before the commit.
- order (`picket:ordering`): a bounded feature, planned and built in phases, with a stop after each phase.
- design (`picket:designing`): a security path, a migration, an irreversible step or a larger change, with a design record first.
- research (`picket:researching`): a question answered with a report instead of a change.

`picket admit --text "<request>"` picks the lane deterministically from the text and a repository probe, and re-checks it against the files actually touched. The limits of each lane are in [the lanes table](docs/how-to.md#the-daily-loop).

## Layout

```
CLAUDE.md                  under 2 KB, loaded on every turn
src/                       the hand-written source of the picket plugin
  .claude-plugin/          the plugin manifest: name picket, version, the skills list
  agents/                  picket:analyst, architect, developer, reviewer
  bin/                     the picket command
  lib/                     the kernel: verbs, hooks and the code they share
  mods/                    picket-status, picket-markdown and picket-session
  output-styles/           picket:custom, the response rules
  rules/                   the rules injected into the lead and every agent
  skills/                  the lane skills and the command skills
  templates/               the CLAUDE.md block picket init writes
  themes/                  the PicketAI Claude Code theme
dist/                      written by npm run build and ignored by git: the same folders as src/ built, plus
                           hooks/ (one bundled file per hook) and mods/ (one plugin per mod)
scripts/                   the build, the watcher, the test runner and the reference page generator
docs/                      the how-to and the reference pages
test/                      tests of the built product and of the repository; unit tests sit beside src/ code
bench/                     golden task suite, fixture repo, runner, reporter (see bench/README.md)
.claude/                   this repository's own Claude Code settings and rules, never installed
.claude-plugin/            the root marketplace picketai: picket and the three mods from dist/
.github/                   CI and the release workflow
.picket/config.json        project settings: security paths, sources, lane caps, commands
artifacts/                 decision records and reports
work/<id>/                 state.yaml, the lane artifact, phase markers, verdicts.jsonl
```

## Benchmarks

`node bench/run.mjs --harness <plugin|trunk> --tasks all --runs 5` runs the 18 golden tasks against one Picket build in fresh fixture repos with a scripted approver, grades by code, and `node bench/report.mjs <baseline> <candidate> --check` reports pass@1, pass^k, route agreement, cost and variance, time to first reviewable output, stops, prompts, re-reads and cache hit ratio, failing on a regression past two standard errors. Every run spends real API budget: dry-run first.

## Compared with agent-skills and pstack

Two research reports compare Picket with two other collections of agent instructions for Claude Code: `work/20261017-compare-agent-skills-with-picket-skills/research.md` (agent-skills) and `work/20261017-compare-cursor-pstack-with-picket-skills/research.md` (pstack). The short version: agent-skills and pstack teach the model with prose and checklists it chooses to follow, while Picket enforces the same kind of rule in code where code can decide it.

| | agent-skills | pstack | Picket |
|---|---|---|---|
| Guards on the agent's own tool calls | three optional bash hooks | none | hooks that deny or bounce: destructive commands, kernel-owned files, new comments, silenced checks, malformed blocks |
| How much process a request gets | the model picks a skill | a router skill picks a playbook | `picket admit` picks the lane in code, from the text and the files touched |
| Stops for a human | by convention | by convention | one gate per phase, rendered by code; nothing lands in git without your approval |
| Proof a change works | checklists and an eval of the skills | red-first commit order, verification skills | a drive of the real entry point logged by a hook, and a red or pinning test named on the block |
| Measurement | a trigger and routing check of its skills | none reported | a cost and determinism bench with a regression check, plus labelled lane and skill-routing tests in `npm test` |

Both reports also name what the others do better, and several of those ideas are now in Picket: the untrusted-content rule, the guard against silenced checks, prove before change, the measured lane and routing checks, the design red flags and the repeated-mistake loop. Others are not, for example pstack's parallel design and review and agent-skills' wider domain guides; the reports list them.

Every Picket number in this README comes from a tracked file under `bench/results/`, here `bench/results/comparison-clean.md`: pass@1 of 100% against the previous harness's 93%, the intended lane on 100% of tasks against 57%, and 0.4 permission prompts per task against 3.1. No head-to-head bench run of agent-skills or pstack exists, so there are no numbers for them; the comparison above is from reading their sources.

## A note from the maintainer

I did not set out to build Picket. It grew out of my own day-to-day work as I started using cloud platforms and AI agents in my professional life. It was not built for any particular company; it is simply the tool I use myself.

I built it to give myself confidence in the work I do. LLMs are a great addition to a developer's toolbox, but they are not a silver bullet for engineering. Picket will keep changing as I learn more about LLMs and as the models themselves evolve.

Picket won't write your specs for you, and it won't turn a spec into finished work on its own. It helps you implement your specs. It keeps your work sane and structured, so you don't have to worry at every step that the agent will go rogue on you.

If you find Picket helpful, feel free to use it. I'm always glad to hear feedback and suggestions for improvement.

Good luck engineering.
