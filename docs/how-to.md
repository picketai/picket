# How to install and use Picket

Picket turns Claude Code into a small, disciplined team. You describe a change in plain words; Picket picks how much process it needs, writes a plan when one is worth having, implements it phase by phase, verifies each phase by running it, and stops for your approval before anything lands in git history.

This guide is for a developer installing the alpha in their own project. It covers installing, the daily loop, configuration, updating, removal and troubleshooting.

## What you get

Picket has three parts that install together.

The **plugin** carries four agents (analyst, architect, developer, reviewer), the skills that drive them, the hooks that guard every tool call, and the response style. Everything it adds is named `picket:<name>`, for example `picket:ordering` or `picket:developer`. [The agents](agents.md) reference says what each agent does and when it runs, and [the skills](skills.md) reference does the same for each skill.

The **`picket` command** is the kernel. It decides everything that code can decide: which lane a request takes, what the next step is, whether a phase is verified, and how a verdict changes state. The agents call it; you can call it too.

**`picket init`** writes the few things a plugin cannot carry: a block in your `CLAUDE.md`, permission rules in `.claude/settings.json`, and the settings file `.picket/config.json`.

## Before you start

You need:

1. Claude Code, recent (the alpha is tested with 2.1.296), signed in.
2. Node.js 20 or later (`node -v`).
3. git, and a project that is a git repository. Picket commits approved work for you, so it needs one.
4. On Windows: Git for Windows. Claude Code runs its Bash tool through Git Bash, and Picket's command works from Git Bash and PowerShell.

Picket has no runtime dependencies; the package is plain Node.

## Install

Install the command once per machine:

```sh
npm install -g @picketai/picket@alpha
picket
```

`picket` on its own prints the list of its verbs, which shows the command is on your `PATH`. The alpha is published under the `alpha` tag, so the plain `npm install -g @picketai/picket` does not find it yet.

Then set up each project you want to use it in, from that project's root:

```sh
cd ~/code/bookshop
picket init
```

`init` finds the repository root on its own (pass `--root <path>` to choose another folder) and refuses to run in your home folder. It does six things:

1. Adds the Picket block to `CLAUDE.md`, or creates the file. Your own text stays; put project notes under `## Project facts`, which `init` never touches.
2. Creates `.picket/config.json` with `{ "version": 1 }`.
3. Adds `.picket/state/` to `.gitignore`. That folder holds logs and runtime state that never belong in git.
4. Adds permission rules to `.claude/settings.json`: `Bash(picket *)` and `PowerShell(picket *)` so the kernel runs without a prompt, and read access to the plugin cache. If your `permissions.deny` already blocks one of them, `init` leaves it out and says so.
5. Registers the marketplace `picketai` (the folder of the npm package) with project scope.
6. Installs the plugin `picket@picketai` with project scope.

Running `init` again is safe: it changes only what is missing. To write the files but skip the two `claude` commands, use `picket init --no-install`; it then prints the two commands to run by hand.

Commit what `init` wrote, so everyone who clones the project gets the same setup:

```sh
git add CLAUDE.md .gitignore .claude/settings.json .picket/config.json
git commit -m "chore: set up Picket"
```

A teammate who clones the project needs only the global install (`npm install -g @picketai/picket@alpha`) and one `picket init`.

### Check the install

Start Claude Code in the project and ask for the status:

```sh
claude
```

```
/picket:inspecting
```

It lists the work items (none yet) and the session's cost. If the command is unknown, the plugin is not enabled; see [Troubleshooting](#troubleshooting).

Optionally, choose Picket's response style with `/config`, under Output style: `picket:custom`. It keeps replies short, answer first, with no filler.

## The daily loop

You never pick a process by hand. Type the change you want, as you would to a colleague:

```
Add a page size option to GET /books, default 20, at most 100.
```

Claude runs `picket admit` on your words, and the kernel answers with one of four lanes.

| Lane | When the kernel picks it | Who works | Where it stops for you |
|---|---|---|---|
| fast | at most 3 files, nothing new to design, no security path or migration | the main session alone | once, before the commit |
| order | a bounded feature: up to 3 phases and 5 decisions | architect, developer, reviewer | after each phase, then once at the end |
| design | a security path, a schema or data migration, an irreversible step, a second repository, or more than an order holds | architect, developer, reviewer | after each phase; security phases always stop |
| research | a question that needs a report, not a change | analyst | after an outline, then after the deep pass |

A plain question ("what does `refreshToken` do?") takes no lane; Claude just answers it.

The kernel re-checks the lane against the files a change really touches. A request that looked small but grows past 3 files moves from fast to order on its own, and a change under a security path always moves to design.

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

### Status and cost

```
/picket:inspecting
```

shows every work item with its lane, phase and next step, and the session's spend, cache hit ratio and stops. From a terminal, `picket list` and `picket cost` show the same numbers.

## What lands in your repository

| Path | Tracked | What it holds |
|---|---|---|
| `work/<id>/` | yes | one folder per work item: `state.yaml`, the plan or report, phase markers, the verdicts |
| `.picket/config.json` | yes | project settings, below |
| `.picket/extensions/<name>/` | yes | your extensions, below |
| `.picket/state/` | no | logs, the cost ledger, scratch files |
| `CLAUDE.md` | yes | the Picket block plus your project facts |

Agents never commit. The developer stages a phase; your approval runs `picket route`, which commits the staged files together with the work item's state, so every phase is one commit with a message you saw in the packet.

## Configuration

All settings live in `.picket/config.json`. Every key is optional.

```json
{
  "version": 1,
  "security_paths": ["src/payments/", "infra/iam/"],
  "commands": { "test": "npm test", "lint": "npm run lint" },
  "lanes": { "fast": { "max_files": 3 }, "order": { "max_phases": 3, "max_decisions": 5 } },
  "sources": { "specs": { "env": "PICKET_SOURCE_SPECS" } },
  "extensions": ["house-style"]
}
```

`security_paths` adds to the built-in list (`src/auth/`, `src/crypto/`, `src/security/`, `Authentication/`, `Authorization/`). A change under any of them always takes the design lane, every such phase takes its own approval, and the reviewer loads the full security checklist.

`commands` overrides detection of your test, lint, build and run commands. Picket detects the usual ones (`npm test`, `dotnet test`, `pytest` and so on); set them here when it guesses wrong. A destructive command is dropped with a warning.

`lanes` changes the caps that decide when work moves to a heavier lane.

`sources` declares read-only repositories outside the project, such as a specification repo. Each names an environment variable that holds the folder on this machine, so the path stays out of git. Set the variable in the `env` block of `.claude/settings.local.json`:

```json
{ "env": { "PICKET_SOURCE_SPECS": "D:/code/bookshop-specs" } }
```

Agents read a source with `picket source find specs <name>` and `picket source grep specs <regex>`, and nothing ever writes to it.

`extensions` enables and orders your extensions.

### Extensions

An extension adds text and checks to Picket without changing its core: rules every agent reads, notes for one role, extra review checklist steps, and preflight checks. Create one with:

```sh
picket extension new house-style
```

This creates the manifest `.picket/extensions/<name>/extension.json`, here with `house-style` as the name, and enables the extension in the config. List your Markdown files in its `rules`, `agents`, `review_steps` or `preflight` keys. `picket extensions` shows what is loaded. An extension cannot change the verdicts, the gates, the guards or the budgets.

## Updating

```sh
npm update -g @picketai/picket
claude plugin marketplace update picketai
claude plugin update picket@picketai --scope project
```

Restart Claude Code to load the new version. Run `picket init` in each project afterwards: it is safe to repeat and adds any setting a new version needs.

## Removing Picket from a project

```sh
claude plugin uninstall picket@picketai --scope project
claude plugin marketplace remove picketai --scope project
```

Then delete the Picket block from `CLAUDE.md`, the `picket` permission rules from `.claude/settings.json`, and the `.picket/` folder if you no longer want its settings. Keep `work/` if you want the history of past work items. A copy of the plugin stays in `~/.claude/plugins/cache/picketai/`, marked orphaned, until Claude Code cleans it up.

To remove the command from your machine: `npm uninstall -g @picketai/picket`.

## Troubleshooting

**`/picket:inspecting` is an unknown command.** The plugin is not enabled for this project. Run `claude plugin list` and look for `picket@picketai`. If it is missing, run `picket init` again in the project root and restart Claude Code.

**`picket: command not found`.** The global npm folder is not on your `PATH`. `npm prefix -g` prints it; add its `bin` folder (on Windows, the folder itself) to `PATH` and open a new terminal.

**A hook denied a tool call.** That is a guard working, and the message says which one and why. The common ones:

| Message starts with | Why | What to do |
|---|---|---|
| `guard.bash: command contains a destructive sub-command` | the command deletes, resets, force-pushes or similar | run it yourself if you mean it: type `! <command>` in Claude Code |
| `guard.comments: ... adds 1 comment line(s)` | a new comment without your approval | approve it with `k <n>` at the next block, or let the code speak |
| `guard.scope: ... is kernel-owned` | a direct edit of a work item's state | nothing; state changes only through `picket` |
| `guard.scope: read ... before editing it` | the file changed since the agent last read it | nothing; the agent re-reads and retries |

**Many permission prompts.** Check that `.claude/settings.json` holds `Bash(picket *)`; run `picket init` again if it does not. Commands that run your code (`picket drive`, `picket check`) still ask under PowerShell on purpose.

**The wrong lane.** Say so in the request: add a line `lane: fast` (or `order`, `design`, `research`) and the kernel honours it. A change under a security path still takes the design lane.

**A work item is stuck.** `picket next <id> --human` prints the next step and who owns it. `/picket:resuming <id>` picks it up from there.

## Quick reference

| You type | What happens |
|---|---|
| a change request in plain words | the kernel picks a lane and the work starts |
| `c` / `x <why>` | commit or discard a fast-lane change |
| `a` / `r <n>` / `x <why>` | approve, run through phase n, or reject a phase |
| `k <n>` | keep proposed comment n |
| `/picket:resuming [<id>]` | continue an open work item |
| `/picket:inspecting` | status and cost |
| `/picket:reviewing <pull request URL>` | review a pull request on GitHub or Azure DevOps |
| `/picket:consulting` | think a strategic question through before any change |
| `/picket:ticketing` | draft or update Jira tickets |
| `picket next <id> --human` | the next step of a work item, from a terminal |
