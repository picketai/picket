# How to install and use Picket

Picket turns Claude Code into a small, disciplined team. You describe a change in plain words; Picket picks how much process it needs, writes a plan when one is worth having, implements it phase by phase, verifies each phase by running it, and stops for your approval before anything lands in git history.

This guide is for a developer installing the alpha in their own project. It covers installing, the daily loop, adopting Picket in an existing codebase, configuration, updating, removal and troubleshooting.

## What you get

Picket has three parts that install together.

The **plugin** carries four agents (analyst, architect, developer, reviewer), the skills that drive them, the hooks that guard every tool call, and the response style. Everything it adds is named `picket:<name>`, for example `picket:ordering` or `picket:developer`. [The agents](agents.md) reference says what each agent does and when it runs, and [the skills](skills.md) reference does the same for each skill.

The **`picket` command** is the kernel. It decides everything that code can decide: which lane a request takes, what the next step is, whether a phase is verified, and how a verdict changes state. The agents call it; you can call it too.

**`picket init`** writes the few things a plugin cannot carry: a block in your `CLAUDE.md`, permission rules and the status line in `.claude/settings.json`, and the settings file `.picket/config.json`.

`init` also installs two mods, small plugins from the same marketplace. **picket-status** shows the open work item and its agents above the prompt. **picket-markdown** opens a Markdown path you click in a reply in a read-only pane beside the transcript. A third mod, **picket-session**, shows this project's sessions and agents in a docked sidebar; it is opt-in:

```sh
claude plugin install picket-session@picketai --scope project
```

## Before you start

You need:

1. Claude Code, recent (the alpha is tested with 2.1.302), signed in.
2. Node.js 20 or later (`node -v`).
3. git, and a project that is a git repository. Picket commits approved work for you, so it needs one.
4. On Windows: Git for Windows. Claude Code runs its Bash tool through Git Bash, and Picket's command works from Git Bash and PowerShell.

Picket has no runtime dependencies; the package is plain Node.

## Install

Install the command once per machine:

```sh
npm install -g @picketai/picket@alpha
picket --version
```

`picket --version` prints the installed version, which shows the command is on your `PATH`; `picket --help` lists its verbs. The alpha is published under the `alpha` tag, so the plain `npm install -g @picketai/picket` does not find it yet.

Then set up each project you want to use it in, from that project's root:

```sh
cd ~/code/bookshop
picket init
```

`init` finds the repository root on its own (pass `--root <path>` to choose another folder) and refuses to run in your home folder. It does eight things:

1. Adds the Picket block to `CLAUDE.md`, or creates the file. Your own text stays; put project notes under `## Project facts`, which `init` never touches.
2. Creates `.picket/config.json` with `{ "version": 1 }`.
3. Adds `.picket/state/` to `.gitignore`. That folder holds logs and runtime state that never belong in git.
4. Updates `.claude/settings.json`. It allows `Bash(picket *)` and `PowerShell(picket *)` so the kernel runs without a prompt, and read access to the plugin cache; if your `permissions.deny` already blocks one of them, `init` leaves it out and says so. It adds the ask rules `PowerShell(picket drive *)` and `PowerShell(picket check *)`, because those two run your code. It sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `"1"`. It sets `statusLine` to `picket statusline`, unless your project, local or user settings already set a status line.
5. Registers the marketplace `picketai` (the folder of the npm package) with project scope.
6. Installs the plugin `picket@picketai` with project scope.
7. Installs the mod `picket-status@picketai` with project scope.
8. Installs the mod `picket-markdown@picketai` with project scope.

Running `init` again is safe: it changes only what is missing. To write the files but skip the four `claude` commands, use `picket init --no-install`; it then reports each of the four install steps as `skipped`. When an install command fails, `init` reports it as `failed` and prints the commands to run by hand.

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

## Adopting Picket in an existing codebase

An old codebase has gaps Picket cannot see on day one: modules nobody fully understands, a test suite with holes, and checks that were switched off long ago. Take these steps in this order; each one makes the next safer.

1. **Map the code before you change it.** Ask a question about the module you will touch first ("how does invoicing compute totals? no code changes"); it takes the research lane and leaves a report under `work/<id>/`. Then run `/picket:understanding <your plan>` to test the plan against the project's own words, so that "invoice", "order" and "bill" mean one thing each.
2. **Record the bar you have today in `quality`.** Measure what the project holds now and write that down, not what you wish it held. Example: the coverage report says 72% of lines and lint prints 14 warnings, so `.picket/config.json` gets `"quality": { "coverage_min": 70, "max_warnings": 14 }`. From then on, an edit that writes `lines: 60` in `vitest.config.ts` or `--max-warnings 20` in `package.json` is denied.
3. **Pin behaviour before any refactor.** The developer writes a characterization test first: one that asserts what the code does today, odd outputs included, and passes before the refactor starts. The procedure is in `core/skills/expediting/steps/20-prove.md`, and the block's `Red:` line names the test.
4. **Approve a silenced check, never let one in quietly.** When a suppression, a skipped test or a weaker threshold is the right call (a flaky test that blocks a release), the developer proposes it on the block's `Waivers:` line with why, and you reply `w <n>`. The review lists every one, waived or not, so the debt stays visible.
5. **Raise the bar over time.** When coverage reaches 78%, set `coverage_min` to 75; when the warnings drop to 6, set `max_warnings` to 6. The same goes for the minimum shares in Picket's own measurement tests. Each raise is one small edit to the config, and Picket denies any later edit that falls back under it.

The anti-pattern is ratcheting nothing: recording the bar once and never raising it, or leaving `quality` empty, so a project that got better can quietly get worse again.

## Configuration

All settings live in `.picket/config.json`. Every key is optional.

```json
{
  "version": 1,
  "security_paths": ["src/payments/", "infra/iam/"],
  "commands": { "test": "npm test", "lint": "npm run lint" },
  "lanes": { "fast": { "max_files": 3 }, "order": { "max_phases": 3, "max_decisions": 5 } },
  "sources": { "specs": { "env": "PICKET_SOURCE_SPECS" } },
  "extensions": ["house-style"],
  "quality": { "coverage_min": 85, "max_warnings": 0 }
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

`quality` records the bar your checks must hold: `coverage_min` (0 to 100) and `max_warnings` (0 or more). A hook denies any edit that makes a known threshold weaker, either than its value before the edit or than this bar. Example: with `coverage_min: 85`, writing `lines: 80` in `vitest.config.ts` is denied, and so is changing `--max-warnings 0` to `--max-warnings 5` in `package.json`. The same hook denies a new suppression (`eslint-disable`, `@ts-ignore`, `noqa`) and a new skipped or focused test. When you accept one, reply `w <n>` to the proposal on the block's `Waivers:` line.

### Extensions

An extension adds text and checks to Picket without changing its core: rules every agent reads, notes for one role, extra review checklist steps, and preflight checks. Create one with:

```sh
picket extension new house-style
```

This creates the manifest `.picket/extensions/<name>/extension.json`, here with `house-style` as the name, and enables the extension in the config. List your Markdown files in its `rules`, `agents`, `review_steps` or `preflight` keys. `picket extensions` shows what is loaded. An extension cannot change the verdicts, the gates, the guards or the budgets.

## Terminal styling

`picket setup-terminal` gives Claude Code and your terminal the PicketAI look. It installs four things: the PicketAI Claude Code theme, the JetBrainsMono Nerd Font Mono font (a pinned release, checked against its SHA-256), a PicketAI colour scheme and font in your terminal (Windows Terminal, Terminal.app, GNOME Terminal, Ptyxis or Konsole; other terminals get the colours to set by hand), and Picket's status line in `~/.claude/settings.json`.

```sh
picket setup-terminal
```

Flags:

- `--dry-run` prints the plan and writes nothing.
- `--theme-only`, `--font-only`, `--terminal-only` and `--statusline-only` pick one part; combine them to pick several.
- `--yes` answers yes to every question.
- `--revert` undoes everything setup did.
- `--json` prints the report as JSON.

Setup shows its plan and asks before it writes anything, and it asks again before it replaces something of yours, such as your own status line or your terminal's default profile. It reads answers only in a real terminal. Through Claude Code's `!` prefix it prints the plan and stops, so run it in a terminal window or pass `--yes`.

Every change is recorded in `~/.picketai/styling-manifest.json`, and every file setup edits is first copied under `~/.picketai/backups/`. `picket setup-terminal --revert` restores a file Picket edited when you have not touched it since. When you have, it takes out only Picket's keys, so your later edits stay. A font that was installed before setup is never removed.

Contributors who change setup or uninstall run the manual checklist in `docs/setup-terminal-checklist.md` on each platform.

## Notifications

Picket shows an OS notification when Claude Code asks for your permission and when it has waited for your input: a toast on Windows, a notification through `osascript` on macOS, and `notify-send` on Linux. The permission notification comes at once. The idle one comes after Claude Code's idle wait, which is 60 seconds by default.

To make the idle wait 30 seconds, close every Claude Code session first, because a running session rewrites the file, then add this key at the top level of `~/.claude.json`:

```json
{ "messageIdleNotifThresholdMs": 30000 }
```

The key is not in Claude Code's documented settings, so a later version may ignore it. `picket init` never writes it, because it is your own preference and not the project's.

To turn Picket's notification off, for example when you already have your own Notification hook or your terminal notifies on its own, set `PICKET_NOTIFY=off` in the `env` block of `.claude/settings.local.json`:

```json
{ "env": { "PICKET_NOTIFY": "off" } }
```

## Updating

```sh
npm update -g @picketai/picket
claude plugin marketplace update picketai
claude plugin update picket@picketai --scope project
claude plugin update picket-status@picketai --scope project
claude plugin update picket-markdown@picketai --scope project
```

If you installed picket-session, also run `claude plugin update picket-session@picketai --scope project`.

Restart Claude Code to load the new version. Run `picket init` in each project afterwards: it is safe to repeat and adds any setting a new version needs.

## Removing Picket from a project

If you ran `picket setup-terminal`, run `picket uninstall` first. It lists the styling items, asks which to remove (and asks about the font on its own), and keeps everything when you answer nothing.

```sh
picket uninstall
claude plugin uninstall picket-markdown@picketai --scope project
claude plugin uninstall picket-status@picketai --scope project
claude plugin uninstall picket@picketai --scope project
claude plugin marketplace remove picketai --scope project
```

If you installed picket-session, run `claude plugin uninstall picket-session@picketai --scope project` before removing the marketplace.

Then delete the Picket block from `CLAUDE.md`; from `.claude/settings.json` the `picket` permission and ask rules, the `statusLine` entry when it runs `picket statusline`, and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` from `env` unless you use agent teams yourself; and the `.picket/` folder if you no longer want its settings. Keep `work/` if you want the history of past work items. A copy of the plugin stays in `~/.claude/plugins/cache/picketai/`, marked orphaned, until Claude Code cleans it up.

To remove the command from your machine: `npm uninstall -g @picketai/picket`.

## Troubleshooting

**`/picket:inspecting` is an unknown command.** The plugin is not enabled for this project. Run `claude plugin list` and look for `picket@picketai`. If it is missing, run `picket init` again in the project root and restart Claude Code.

**`picket: command not found`.** The global npm folder is not on your `PATH`. `npm prefix -g` prints it; add its `bin` folder (on Windows, the folder itself) to `PATH` and open a new terminal.

**A hook denied a tool call.** That is a guard working, and the message says which one and why. The common ones:

| Message starts with | Why | What to do |
|---|---|---|
| `guard.bash: command contains a destructive sub-command` | a Bash or PowerShell command deletes, resets, force-pushes or similar | in the default, acceptEdits and auto modes the agent reruns it as `PICKET_ESCALATE="<why>" <command>` and you decide in the dialog; cleanup after the work is recorded with `picket leave` and listed when the item closes; or run it yourself: type `! <command>` in Claude Code |
| `guard.comments: ... adds 1 comment line(s)` | a new comment without your approval | approve it with `k <n>` at the next block, or let the code speak |
| `guard.bash: ... is code; a shell write skips guard.comments and guard.silenced` | an agent's redirect, `tee`, `sed -i` or PowerShell `Set-Content` writing a code or test file | nothing; the agent writes it with the Edit or Write tool, where the comment and silenced-check guards run. A code generator you asked an agent for can run as `PICKET_ESCALATE="<why>" <command>` |
| `guard.silenced: ... adds 1 silenced check(s)` | a new suppression, skipped or focused test, or weaker threshold without your waiver | let the agent fix the cause, or accept it with `w <n>` at the next block |
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
| `w <n>` | waive proposed silenced check n |
| `/picket:resuming [<id>]` | continue an open work item |
| `/picket:inspecting` | status and cost |
| `/picket:reviewing <pull request URL>` | review a pull request on GitHub or Azure DevOps |
| `/picket:consulting` | think a strategic question through before any change |
| `/picket:ticketing` | draft or update Jira tickets |
| `/picket:explaining` | walk one scenario or concept through worked data |
| `/picket:debugging` | find a bug's root cause and leave one failing test for the fix |
| `picket setup-terminal` | give Claude Code and your terminal the PicketAI look |
| `picket uninstall` | remove the styling items you choose |
| `picket next <id> --human` | the next step of a work item, from a terminal |
