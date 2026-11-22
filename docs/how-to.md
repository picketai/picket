---
icon: lucide/book-open
---

# How to use Picket

Picket turns Claude Code into a small, disciplined team. You describe a change in plain words; Picket picks how much process it needs, writes a plan when one is worth having, implements it phase by phase, verifies each phase by running it, and stops for your approval before anything lands in git history.

This guide is for a developer who has set Picket up in a project, as [Get started](index.md) shows. It covers the daily loop, adopting Picket in an existing codebase and troubleshooting.

## What you get

Picket is one Claude Code plugin, `picket@picketai`, published as the npm package `@picketai/picket`. Nothing is installed globally.

The **plugin** carries five agents (analyst, architect, developer, reviewer, tester), the skills that drive them, the hooks that guard every tool call, and the response style. Everything it adds is named `picket:<name>`, for example `picket:ordering` or `picket:developer`. [The agents](reference/agents.md) reference says what each agent does and when it runs, and [the skills](reference/skills.md) reference does the same for each skill.

The **`picket` command** is the kernel, and it ships inside the plugin. It decides everything that code can decide: which lane a request takes, what the next step is, whether a phase is verified, and how a verdict changes state. The agents call it, and so can you, from the Bash or PowerShell tool of a session where the plugin is enabled. Outside a session, run a verb through npx, for example `npx @picketai/picket@alpha list`.

The plugin also carries two mods. The **status** mod shows the open work item and its agents above the prompt, and its work pane (`/picket-session`) lists this project's sessions. The **Markdown** mod opens a Markdown path you click in a reply in a read-only pane beside the transcript (`/picket-markdown`).

**`picket init`** writes the few things a plugin cannot carry: a block in your `CLAUDE.md`, permission rules and the marketplace entry in `.claude/settings.json`, and the settings file `.picket/config.json`.

## The daily loop

You never pick a process by hand. Type the change you want, as you would to a colleague:

```
Add a page size option to GET /books, default 20, at most 100.
```

Claude runs `picket admit` on your words, and the kernel answers with one of four lanes.

| Lane | When the kernel picks it | Who works | Where it stops for you |
|---|---|---|---|
| fast | a few files (`lanes.fast.max_files`, 3 by default), nothing new to design, no security path or migration | the main session alone | once, before the commit |
| order | a bounded feature: up to `lanes.order.max_phases` phases and `lanes.order.max_decisions` decisions (3 and 5 by default) | architect, developer, reviewer | after each phase, then once at the end |
| design | a security path, a schema or data migration, an irreversible step, a second repository, or more than an order holds: up to `lanes.design.max_phases` phases and `lanes.design.max_decisions` decisions (10 and 8 by default) | architect, developer, reviewer | after each phase; security phases always stop |
| research | a question that needs a report, not a change | analyst | after an outline, then after the deep pass |

A plain question ("what does `refreshToken` do?") takes no lane; Claude just answers it.

The kernel re-checks the lane against the files a change really touches. A request that looked small but grows past `lanes.fast.max_files` files (3 by default) moves from fast to order on its own, and a change under a security path always moves to design.

### Fast lane

Claude makes the change in the main session, runs your tests and linter, drives the changed code through its real entry point, stages the result and shows one block:

```
## Expedited: 20261010-page-size-option

GET /books accepts page_size from 1 to 100, default 20.

Files: src/routes/books.ts, test/books.test.ts
Tests: passed
Lint: passed
Verified: picket drive --hit "GET /books?page_size=5" → 200, 5 items
Comments: none
Commit: feat(books): page_size query option   (staged; your answer commits it)

[c] commit   [x] discard: <why>
```

Reply `c` and it commits. Reply `x` with a reason and the change stays staged for you to decide.

### Order and design lanes

The architect writes a plan into `work/<id>/order.md` (order lane) or `work/<id>/design.md` (design lane): numbered decisions with the reason for each, then phases, each with the files it touches and the checks that prove it done. In the design lane a reviewer checks the plan against its own decisions while the developer starts phase 1.

After each phase the developer stops, and you get a gate packet:

```
▶ phase 1/2 done · 20261010-csv-export
  GET /orders/export returns the filtered orders as CSV.

  tests     passed (212/212)
  lint      none detected
  verified  picket drive --hit "GET /orders/export?status=paid" → 200, text/csv, 14 rows
  files     src/routes/orders.ts, src/csv.ts, +2 more
  decisions · quoted every field, since titles contain commas
  commit    feat(orders): CSV export of filtered orders

[a] approve   [r] run through 2   [x] reject: <why>
```

Your replies:

| Reply | Effect |
|---|---|
| `a` | commits the phase and starts the next one |
| `r 3` | approves and lets the developer continue through phase 3 without stopping, except at a phase marked security-sensitive, which always stops |
| `x the export must stream, not buffer` | nothing is committed; the developer fixes the staged work and shows a new packet |
| a question | Claude answers and shows the options again |

When every phase is approved, a fresh reviewer that has not seen the plan reviews the whole change against your original request. `APPROVED` closes the work item; `CHANGES REQUIRED` sends findings back to the developer.

Sometimes the developer cannot meet a check without changing a decision. It stops with `PHASE STALLED` and says why, and you choose:

```
[c] continue with a fresh developer · [d] redesign · [x] abandon
```

`d` sends the problem to the architect, who amends the plan in place (the decision keeps its number and gets a revision mark such as `D-002 (r2)`), and the developer carries on with the work it already has.

#### Worktrees in an umbrella

When the project holds nested repositories (folders under `src/` with their own `.git`) and the plan touches one, Claude stops once before the developer starts, at `create_worktrees`:

```
▶ worktrees before phase 1 · 20261030-orders-pricing
  the plan touches src/Orders; name the branch for their worktrees before phase 1

  src/Orders from main @1a2b3c4d -> src/Orders/.worktrees/RMS-12

[y] create RMS-12   reply: <name> [from <ref>]   [n] use the main checkouts
```

| Reply | Effect |
|---|---|
| `y` | names the branch after the ticket key; offered only when the item came from a ticket |
| `feature/x from develop` | names the branch `feature/x`, started from `develop` in each touched repository; `from` is optional |
| `n` | no worktrees; the developer works in each repository's main checkout |

The developer then runs `picket worktree <id>` at every phase, which creates or resumes one worktree per touched repository and hydrates only uninitialised submodules. Plans keep naming `src/Orders/pricing.cs`; `picket verify`, the review summary and the approval map those paths into the worktree, and an approval commits the phase in each worktree before the umbrella. A project whose settings allow only `Bash(git add *)` adds an allow rule for `git -C * add *`, since the developer stages inside each worktree. `/picket:branching --remove <branch>` tears the worktrees down when you are done.

### Research lane

Ask a question that needs a report ("how does checkout compute tax?", "map the order lifecycle"). The analyst first returns an outline: a summary, the section headings and the sources it will read. Redirect it if it is off; otherwise say go, and it writes the full report to `work/<id>/research.md`.

### Comments in code

Picket writes no new comments in code: names, types, small functions and tests carry the meaning. When a comment is the only way to say why a value is what it is, Claude proposes it on the block's `Comments:` line with its path, line and text, and writes it only if you reply `k <n>` (keep comment n). A hook denies any other new comment.

### Leaving and coming back

Everything about a work item lives in `work/<id>/`, so nothing is lost when you close Claude Code. In a new session:

```
/picket:resuming
```

With no id it lists the open work items, and resumes the only one if there is just one. With an id (`/picket:resuming 20261010-csv-export`) it reads the item's state and continues exactly where it stopped, with new agents.

### Status and tokens

```
/picket:inspecting
```

shows every work item with its lane, phase and next step, and the tokens spent, cache hit ratio and stops. `picket list` and `picket cost` show the same numbers; `picket cost` reports tokens per agent, per work item and per phase, not dollars. When a work item closes, its closing block carries an `Audit:` line (lane, phases, tokens per agent, bounces and blocks), also saved as `work/<id>/audit.txt`.

## Adopting Picket in an existing codebase

An old codebase has gaps Picket cannot see on day one: modules nobody fully understands, a test suite with holes, and checks that were switched off long ago. Take these steps in this order; each one makes the next safer.

1. **Map the code before you change it.** Ask a question about the module you will touch first ("how does invoicing compute totals? no code changes"); it takes the research lane and leaves a report under `work/<id>/`. Then run `/picket:consulting interview me on <your plan>` to test the plan against the project's own words, so that "invoice", "order" and "bill" mean one thing each.
2. **Record the bar you have today in `quality`.** Measure what the project holds now and write that down, not what you wish it held. Example: the coverage report says 72% of lines and lint prints 14 warnings, so `.picket/config.json` gets `"quality": { "coverage_min": 70, "max_warnings": 14 }`. From then on, an edit that writes `lines: 60` in `vitest.config.ts` or `--max-warnings 20` in `package.json` is denied.
3. **Pin behaviour before any refactor.** The developer writes a characterization test first: one that asserts what the code does today, odd outputs included, and passes before the refactor starts. The procedure is in the `picket:implementing` skill, and the block's `Red:` line names the test.
4. **Approve a silenced check, never let one in quietly.** When a suppression, a skipped test or a weaker threshold is the right call (a flaky test that blocks a release), the developer proposes it on the block's `Waivers:` line with why, and you reply `w <n>`. The review lists every one, waived or not, so the debt stays visible.
5. **Raise the bar over time.** When coverage reaches 78%, set `coverage_min` to 75; when the warnings drop to 6, set `max_warnings` to 6. The same goes for the minimum shares in Picket's own measurement tests. Each raise is one small edit to the config, and Picket denies any later edit that falls back under it.

The anti-pattern is ratcheting nothing: recording the bar once and never raising it, or leaving `quality` empty, so a project that got better can quietly get worse again.

## Troubleshooting

**`/picket:inspecting` is an unknown command.** The plugin is not enabled for this project. Run `/plugin` (or `claude plugin list`) and look for `picket@picketai`. If it is missing, run `npx @picketai/picket@alpha init` again in the project root and restart Claude Code.

**`picket: command not found` in a session.** The `picket` command comes with the plugin, on the `PATH` of Claude Code's Bash and PowerShell tools only. Check with `/plugin` that `picket@picketai` is enabled for the project, then restart the session, because a plugin installed during a session reaches the tools only after a restart. In your own terminal there is no `picket`: run a verb as `npx @picketai/picket@alpha <verb>`.

**A different `picket` runs.** A global copy from an earlier install comes first on your `PATH`, so a session runs that old version instead of the plugin's. `init` warns about it. Remove it with `npm uninstall -g @picketai/picket` and restart Claude Code.

**A hook denied a tool call.** That is a guard working, and the message says which one and why. The common ones:

| Message starts with | Why | What to do |
|---|---|---|
| `guard.bash: command contains a destructive sub-command` | a Bash or PowerShell command deletes, resets, force-pushes or similar | in the default, acceptEdits and auto modes the agent reruns it as `PICKET_ESCALATE="<why>" <command>` and you decide in the dialog; cleanup after the work is recorded with `picket leave` and listed when the item closes; or run it yourself: type `! <command>` in Claude Code |
| `guard.comments: ... adds 1 comment line(s)` | a new comment without your approval | approve it with `k <n>` at the next block, or let the code speak |
| `guard.bash: ... is code; a shell write skips guard.comments and guard.silenced` | a shell edit in place (`sed -i`, `perl -i`, an inline script) of a code or test file, from anyone; or an agent's redirect, `tee` or PowerShell `Set-Content` writing one | nothing; the file is written with the Edit or Write tool, where the comment and silenced-check guards run. A code generator you asked an agent for can run as `PICKET_ESCALATE="<why>" <command>` |
| `guard.silenced: ... adds 1 silenced check(s)` | a new suppression, skipped or focused test, or weaker threshold without your waiver | let the agent fix the cause, or accept it with `w <n>` at the next block |
| `guard.scope: ... is kernel-owned` | a direct edit of a work item's state | nothing; state changes only through `picket` |
| `guard.scope: read ... before editing it` | the file changed since the agent last read it | nothing; the agent re-reads and retries |

**Many permission prompts.** Check that `.claude/settings.json` holds `Bash(picket *)`; run `npx @picketai/picket@alpha init` again if it does not. Commands that run your code (`picket drive`, `picket check`) still ask under PowerShell on purpose.

**The wrong lane.** Say so in the request: add a line `lane: fast` (or `order`, `design`, `research`) and the kernel honours it. A change under a security path still takes the design lane.

**A work item is stuck.** `picket next <id> --human` prints the next step and who owns it. `/picket:resuming <id>` picks it up from there.

## Quick reference

| You type | What happens |
|---|---|
| a change request in plain words | the kernel picks a lane and the work starts |
| `c` / `x <why>` | commit or discard a fast-lane change |
| `a` / `r <n>` / `x <why>` | approve, run through phase n, or reject a phase |
| `k <n>` | keep proposed comment n |
| `w <n>` | waive proposed silenced check n |
| `/picket:resuming [<id>]` | continue an open work item |
| `/picket:inspecting` | status and tokens |
| `/picket:reviewing <pull request URL>` | review a pull request on GitHub or Azure DevOps |
| `/picket:consulting` | think a strategic question through before any change |
| `/picket:ticketing` | draft or update Jira tickets |
| `/picket:explaining` | walk one scenario or concept through worked data |
| `/picket:debugging` | find a bug's root cause and leave one failing test for the fix |
| `picket next <id> --human` | the next step of a work item, from a terminal |
| `picket list` | every work item with its lane, status and next step |
| `picket cost` | the tokens spent, per agent, work item and phase |
| `picket style apply` | give Claude Code and your terminal the PicketAI look |
| `picket style remove` | remove the styling items you choose |
| `picket uninstall` | remove Picket from the project |

Every other verb is in the [command reference](reference/cli.md).
