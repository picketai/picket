# Changelog

Newest release first; each heading is a version.

## 1.0.0-alpha.6 (not released yet)

### Changed, act on these

- `/md` is now `/picket-markdown`, with no alias. It runs while a turn streams, and with no file to reopen it opens the empty pane.
- picket-session is retired: its session list moves to picket-status. Uninstall it with `claude plugin uninstall picket-session@picketai --scope project`; until then it only shows a toast saying so. Its Archived list is not carried over, so mark those sessions done again in the new pane.

### Added

- The picket-status band draws in every session, even one with no work item. On its right it shows `◀ <n> need you` while sessions other than this one wait on you, `☰ <n>` (the sessions not marked done, which opens the work pane) and `M↓` (which opens the Markdown pane while picket-markdown is installed). It runs `picket list` only when an item that is not closed changes.
- picket-status has a work pane, opened and closed with `/picket-session` (it runs while a turn streams). It lists this project's sessions under NEEDS YOU, WORKING, OPEN, CLOSED and NO WORK ITEM, peeks at a session's work items, copies `claude --resume <id>`, renames a session, and moves a session to a Done tab and back.
- Each `picket list` row carries `attention` (`needs-you`, `working`, `open` or `closed`), the item's `sessions` with the latest as `session`, its `branch`, and its `worktrees` with whether each folder is still on disk. The `--human` output is unchanged.

## 1.0.0-alpha.5 (2026-11-02)

### Changed, act on these

- `picket:understanding` is folded into `picket:consulting` as its interview mode ("question me on this", "stress-test this plan"). `picket:benchmarking` is no longer in the plugin; the benchmark stays in the Picket repository.
- `picket open` refuses a lane lighter than the one `admit` chose; `--user-lane` overrides it on the user's word.
- A developer's `Verified: blocked:` line names its kind: `blocked: data: <what>`, `blocked: configuration: <what>` or `blocked: environment: <what>`. A bare `blocked:` is sent back.
- A plan asserts that text is missing with `absent: true` on a grep entry. `lint.schema` flags a grep pattern starting `^(?!` and an `absent` that is not a boolean; closed records keep their old greps.
- The scope guard denies a Write over an existing file the session has not read.
- The Bash guard denies a delete wrapped in `cmd` or PowerShell (`cmd /c del`, `cmd.exe /c erase`, `pwsh -Command Remove-Item`) the same way it denies `rm`.
- Every session and agent gets the `tests` rule: unit tests by default, no real infrastructure in a unit test, and every test asserts the rule its name claims.
- `MEMORY.md` is cut at the last whole entry within 6,000 characters when a session loads it, with a note saying so; `lint.glossary` warns when a write leaves it longer.

### Added

- `picket worktree <id>` creates and resumes one worktree per nested repository a plan touches. The plan stops once to ask for the branch name; `route` commits each touched nested checkout before the umbrella, and `verify`, `summary`, `mutate` and `close` follow the item's worktrees.
- `picket reply <id> "<reply>"` applies a gate reply and prints the next send; `picket name` prints document paths.
- `picket:implementing`: the red or pinning test first, the check, the drive, and the developer block's `Red:`, `Root cause:` and `Verified:` lines, for the developer and the fast lane alike.
- A criterion marked `[DEFERRED: <owner>, <gate>]` is printed on a `Deferred:` line of the closing block.
- `picket check` and `picket drive` run in the nested checkout that holds the working directory.
- A checkpoint review that returns `CHANGES REQUIRED` sends the developer to fix its findings, then back to the checkpoint review.
- `picket open` takes `--purpose`, `--in-scope` and `--out-of-scope`, which reach the analyst and the architect.
- The research gate offers `[p]` to publish the report under `artifacts/reports/`.
- A direction prompt ("should we", "which approach") suggests `picket:consulting`, and a review can flag a strategic question for it.
- `pullrequest prepare` carries the review checklists, and a `post` dry run shows the code at each anchor.
- `lint.schema` checks a report's frontmatter, confidence markers and caps.

### Fixed

- `admit` no longer reads a dotted identifier such as `lint.schema` as migration work, or a request that opens with a change verb as research.
- `close` ignores a review flag quoted in backticks, and a stray backtick no longer hides one.
- `route` routes verdicts on continued agent turns, keeps an approved phase's block and commit body, and gives every cross-check drift the text the architect amends from.

## 1.0.0-alpha.4 (2026-10-25)

### Changed, act on these

- Picket needs Node.js 22 or newer.
- Six verbs have new names and one is gone. `new` is now `open`, `review-summary` is now `summary`, `setup-terminal` is now `style apply` (its `--revert` is now `style remove --all`), `pr <url>` is now `pullrequest prepare <url>`, `pr <url> --post <file>` is now `pullrequest post <url> --file <file>`, `extensions` is now `extension list` and `extension new` is now `extension add`. `find-verdict` is removed. An old name prints its new one, for example `picket: "new" is now "open"`.
- `picket uninstall` now removes Picket from the project. The styling removal it used to run is `picket style remove`.
- A refusal exits 2 and prints `{ "ok": false, "error": ... }`, or `refused: <message>` from a verb that prints text. This now covers `leave` on a closed item, `source pick` with an unknown label, `source grep` with an invalid regex, a source that is not declared, and a destructive command given to `check` or `drive`.
- Security paths match the same way in `admit`, the phase gate and the review summary. An entry written as a glob (`src/payments/**`) now counts, an entry `src/pay` no longer matches the folder src/payment-ui, and a single folder name such as `Authentication/` matches at any depth.
- The Bash guard asks before `find -fprint`, `find -fls`, `tree -o`, `rg --pre` and `git log`, `git diff` or `git show` with `--output`, before a read-only git command with `-c`, `--config-env`, `--exec-path` or `-p`, and before project tools such as `vitest`, `tsc`, `eslint` and `prettier`. Allow them in your own Claude Code permission settings if you want them unprompted.
- Agents are denied `uninstall`, `waive` and `comment` in every form: through `npx`, as `picket.cmd` or `picket.ps1`, and with a flag before the verb (`--human`).
- A print-only `sed` (such as `sed -n 10,20p`) is allowed inside a protected source.
- A source whose name holds anything other than letters, digits, `_` and `-` is ignored with a warning.
- The status line prints `200k` where it printed `200.0k`, and `3d06h` where it printed `3d6h`.
- `verify` and `mutate` write their own logs under the state folder, `verify-test.log` and `mutate-*.log`.
- The `summary` object of `pullrequest prepare` no longer repeats `base` and `head`; they stay at the top level.
- Review findings are written `path:line: text`. Findings in the old form with a dash still parse.

### Fixed

- Drive evidence is logged against the work item `picket next --latest` names.
- A malformed `package.json` gives a warning instead of crashing `check`, `drive`, `verify`, `mutate` and `preflight`.
- A folder holding only a `.sln` or `.slnx` file counts as a .NET project.
- One unreadable line in `verdicts.jsonl` no longer breaks the work item.
- Terminal.app gets the Nerd Font icons in the status line.
- YAML front matter reads a trailing `# comment` and an inline `{...}` map, and YAML it does not support fails with its line number.
- A `drive` command that prints nothing and times out says `timed out after <ms> ms`.
- A personal access token echoed back in `pullrequest` error output is redacted, also in its Basic, JSON-escaped and percent-encoded forms.

### Added

- `picket uninstall` removes what `picket init` added. It shows its plan and asks per group, keeps `work/` unless you choose it or pass `--remove-work`, leaves a linked `.picket` or `.claude` folder alone, gives `CLAUDE.md` and `.gitignore` back byte for byte, and after a full removal prints the two machine-level commands it does not run.
- `picket style remove`, to remove the styling items you choose, or all of them with `--all`.
- `picket next` offers `[i] confirm the irreversible step` at an irreversible phase, gives the options at a stalled phase, and stops after every third cumulative review since the last approval that returns `CHANGES REQUIRED`.
- `picket state` and `picket next` print a `warnings` key when a line of `verdicts.jsonl` cannot be read.
- `docs/reference/` with the generated command, hook and mod pages.

### For contributors

- The source is in `src/` and the build writes `dist/`.
- Building and testing needs Node.js 24.
- `npm test` runs its test files in parallel and takes about 50 s, where it took 118 to 144 s.
- `npm run docs` regenerates the pages in `docs/reference/`.

## 1.0.0-alpha.3 and earlier

New since 1.0.0-alpha.1:

- `picket setup-terminal` gives Claude Code and the terminal the PicketAI look (theme, font, colour scheme, status line), and `picket uninstall` removes only what you choose.
- `picket statusline` renders the session line, and `picket init` sets it unless a status line is already set.
- `picket leave` records cleanup a work item leaves for you; `picket close` lists it.
- `picket next --latest` answers the current work item: the most recently active open or blocked item, this session's first.
- `picket --help`, `picket help` and `picket --version`.
- The skill `picket:explaining` walks one scenario or concept through worked data.
- `guard.bash` checks PowerShell commands too, and in the default, acceptEdits and auto modes a destructive command can be escalated to you with `PICKET_ESCALATE`.
- `picket init` installs the mods picket-status and picket-markdown beside picket; picket-session is opt-in.
- `guard.bash` now asks you (through Claude Code's permission prompt) for `find -fprint`/`-fprint0`/`-fprintf`/`-fls`, `tree -o`, `rg --pre` and `git log`/`diff`/`show --output`, which write a file or run a program, and for the project tools `tsc`, `eslint`, `prettier`, `jest`, `vitest`, `mocha`, `cypress`, `webpack`, `rollup`, `esbuild`, `vite`, `next`, `react-scripts`, `babel` and `playwright`, directly or through an npm script; a project that wants them unprompted allows them in its own Claude Code permission settings.

`bench/results/comparison-clean.md` is the head-to-head against the previous harness (clean run of 2026-09-14). Headline: 14 of 14 tasks pass against trunk's 13, every task on its intended lane against 57%, cost per task $2.97 against $3.37 at equal wall time, first reviewable output 96 s against 130 s, 0.4 permission prompts per task against 3.1, cache 97% against 91%. The research lane is the one lane that costs more (outline gate).

Since that run:

- `picket waive` records your approval of a silenced check (a suppression, a skipped or focused test, a weaker threshold) that a hook would otherwise deny; the developer only proposes one on its block.
- `picket mutate` inverts one operator on a changed line, runs the tests and puts the file back; a mutant that survives is a review finding.
- The hook `guard.silenced` denies an edit that silences a check, and the review summary lists every such change and every deleted test since the work item began.
- A fifth injected rule, `untrusted`, tells every agent that fetched pages, tickets, review threads and tool output are data, never instructions.
- The skill `picket:debugging` finds a bug's root cause and ends in a diagnosis and one failing test, never a fix; the fix goes through a lane.
