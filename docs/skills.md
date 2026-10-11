# Picket skills

A skill is a set of instructions Claude loads when your words match its trigger phrases or when you type its `/picket:<name>` command. You rarely start the four lane skills yourself: Claude runs `picket admit` on every change request, and the lane it answers starts on its own. The other skills are commands you run when you want them, or checklists the agents load for their own work.

| Skill | Group | What it does | How you reach it |
|---|---|---|---|
| `picket:expediting` | lane | small change in the main session | `picket admit` answers fast |
| `picket:ordering` | lane | bounded feature, planned and built in phases | `picket admit` answers order |
| `picket:designing` | lane | risky or large change with a design record | `picket admit` answers design |
| `picket:researching` | lane | a report instead of a change | `picket admit` answers research |
| `picket:inspecting` | command | status and cost | `/picket:inspecting [<work-id>]` |
| `picket:resuming` | command | continue an open work item | `/picket:resuming [<work-id>]` |
| `picket:consulting` | command | think a strategic question through | `/picket:consulting` |
| `picket:understanding` | command | stress-test a plan by questions | `/picket:understanding <plan, design, or idea>` |
| `picket:proofreading` | command | proofread text for outside readers | `/picket:proofreading <path or pasted text>` |
| `picket:ticketing` | command | pull, draft or update Jira tickets | `/picket:ticketing ...` |
| `picket:summarizing` | command | fill the pull request template | `/picket:summarizing [branch or repo hint]` |
| `picket:branching` | command | worktrees across nested repositories | `/picket:branching <branch>` |
| `picket:documenting` | used by agents | templates for every structured document | agents, or `/picket:documenting <kind> <subject>` |
| `picket:reviewing` | used by agents | review checklist and pull request review | the reviewer, or `/picket:reviewing <pull request URL>` |
| `picket:benchmarking` | contributors | measure Picket itself | `/picket:benchmarking ...` in the Picket repository |

## picket:expediting

The fast lane makes a small, low-risk change end to end: at most three files, nothing new to design, no security path or migration.

**How you reach it.** Ask for the change in plain words; it starts when `picket admit` answers `fast`. Phrases such as "just fix", "quick change" or "don't spin up the pipeline" point here. To force it, add a line `lane: fast` to the request.

**Where it fits.** It runs in the main session with no agent, no plan and no phase gate, but keeps the test run, the run through the real entry point and the code quality bar. It stages the change and stops once with `[c] commit   [x] discard: <why>`. If the change turns out larger (a fourth file, a new dependency, a security path), it stops and hands the request and the diff to the lane `picket admit` names.

## picket:ordering

The order lane delivers a bounded feature, such as a new endpoint or module, in at most 3 phases and 5 decisions.

**How you reach it.** It starts when `picket admit` answers `order`, or on a forced `lane: order` line.

**Where it fits.** The main session leads. The [architect](agents.md#picketarchitect) writes `work/<id>/order.md`, then the [developer](agents.md#picketdeveloper) implements one phase at a time. After each phase it stops with a gate packet: `[a] approve`, `[r] run through <n>`, or `[x] reject: <why>`. Approval commits the phase. When every phase is approved, a fresh [reviewer](agents.md#picketreviewer) reviews the whole change against your request, and `APPROVED` closes the work item. An order that outgrows its caps moves to the design lane.

## picket:designing

The design lane handles a change that touches a security path, a schema or data migration, an irreversible step, a second repository, or more than an order can hold.

**How you reach it.** It starts when `picket admit` answers `design`, when a change touches a security path, when the order lane reports that a plan outgrew its caps, or on a forced `lane: design` line.

**Where it fits.** The architect writes `work/<id>/design.md`, decisions first. The developer starts phase 1 while the reviewer checks the record against its own decisions. Every phase stops for your approval; a run grant never crosses a security-sensitive phase, and an irreversible step needs an extra confirmation `[i]`. Plans of 6 or more phases get a checkpoint review near the middle. If the reviewer finds drift, the architect amends the decision in place and the developer's work is re-checked, not thrown away. A fresh reviewer closes it with a review of the whole change.

## picket:researching

The research lane answers a question with a report instead of a change: "how does checkout compute tax?", "map the order lifecycle", "before we touch this I need to understand it".

**How you reach it.** It starts when `picket admit` answers `research`. A plain question with a one-paragraph answer needs no lane; Claude just answers it.

**Where it fits.** The main session leads and the [analyst](agents.md#picketanalyst) does the reading. It stops twice: after an outline (`[a] accept   [d] deeper pass   [x] reject: <why>`) and after the deep pass. The report lives in `work/<id>/research.md`. The analyst never proposes a design; a finding that needs one is flagged, and the closing line offers the order or design lane.

## picket:inspecting

Shows every work item with its lane, phase and next step, and what the session has cost.

**How you reach it.** `/picket:inspecting [<work-id>]`, or "status", "where are we", "what's open", "how much has this cost".

**Where it fits.** Read-only, in the main session. With no id it lists all items and the project's spend and cache hit ratio; with an id it shows that item's next step, spend and last three verdicts. From a terminal, `picket list` and `picket cost` show the same numbers.

## picket:resuming

Continues a work item from its state on disk, with no replay of the old conversation.

**How you reach it.** `/picket:resuming [<work-id>]`, or "resume", "continue <id>", "where were we".

**Where it fits.** With no id it lists the open items and resumes the only one if there is just one. It reads the item's state, asks the kernel for the next step, and either shows the gate packet you left or hands the step to new agents (the agents of the earlier session are gone). An interrupted fast-lane change shows its `git status` and asks whether to finish or abandon.

## picket:consulting

A thinking partner for strategic and domain design questions before any change: "should we", "build or buy", "where does this boundary go", "is this a separate context".

**How you reach it.** `/picket:consulting`, or one of those phrases.

**Where it fits.** It runs in the main session with no agent. It recommends one direction, weighs the real alternatives with what each gains and gives up, and names what cannot be undone. Settled terms and decisions go to `.claude/MEMORY.md`. When a direction is reached, say "ratify" and it writes a strategic decision record, a context charter or a context map. A tactical question ("how do I structure this module") is sent to the order or design lane instead.

## picket:understanding

A questioning session that tests a plan, design or idea against the project's existing words and code, one question at a time.

**How you reach it.** `/picket:understanding <plan, design, or idea>`, or "question me on this", "stress-test this plan", "interview me".

**Where it fits.** It runs in the main session with no agent. Each question comes with Claude's recommended answer, and claims are checked against the code. Every term or decision that settles is written to `.claude/MEMORY.md` at once, never code or specs. The consulting skill, the analyst and the architect also read it when they need the same questioning.

## picket:proofreading

Proofreads a document whose next reader is outside the team (a README, a release note, a customer email, a spec) and reports every defect before changing any text.

**How you reach it.** `/picket:proofreading <path or pasted text>`, or "proofread this", "check this before I send it", "is this clear?".

**Where it fits.** It runs in the main session. It first names the audience, purpose and surface, then makes five passes and returns a table of findings, each quoted and graded from L0 (a plain error) to L3 (a claim it cannot verify, which it asks about and never fixes). It ends with `READY TO SEND` or `NEEDS FIXES`. Nothing changes until you say "apply".

## picket:ticketing

Pulls, drafts, creates and updates Jira work items: user story, change request, bug, technical debt, spike and epic, each from a fixed template.

**How you reach it.** `/picket:ticketing [--pull|--create|--update] [--story|--change|--bug|--debt|--spike|--epic] <text or key>`, or "write a ticket", "log a bug", "pull JIRA-123". With no operation flag it drafts in the reply only.

**Where it fits.** It needs the Atlassian MCP server configured for the project. Pulls run on their own; every create, edit, transition or comment is shown to you for confirmation first. Missing facts appear as `REQUIRES INPUT` lines rather than being made up.

## picket:summarizing

Writes the pull request description for the branch into your repository's pull request template, at most 4000 characters, ready to paste.

**How you reach it.** `/picket:summarizing [branch or repo hint]`, or "write the PR description". Only you start it; Claude never runs it on its own, because you decide when a branch is done.

**Where it fits.** It reads the branch's commits and diff, the work item's plan and verdicts, and the conversation. It ticks only the checklist items the evidence supports and says plainly when tests failed or were skipped. In a multi-repository umbrella it writes one description per touched repository.

## picket:branching

Creates, lists and removes git worktrees (separate working folders on their own branch) across the nested repositories of a multi-repository umbrella.

**How you reach it.** `/picket:branching <branch>` to create or resume, `/picket:branching <branch> --into <branch|path> [--from <base>]` to branch inside an existing worktree, `/picket:branching --list [branch]`, and `/picket:branching --remove <branch>`. A branch name is required; it never invents one.

**Where it fits.** It keeps a list of the nested repositories in `.picket/state/branching.yaml` and puts each worktree under the repository's `.worktrees/` folder. Every command that changes a worktree, a submodule or deletes files is shown for confirmation first. The developer reads it at a work item's first phase when the project has nested repositories.

## picket:documenting

The template registry for every structured document Picket writes: orders, design records, reports, context charters, context maps, strategic decision records, glossary entries and REST API references.

**How you reach it.** It is preloaded on the analyst and the architect, so their plans and reports follow it without you asking. Standalone: `/picket:documenting <kind> <subject> [--export]`, or "write a charter", "document the API".

**Where it fits.** It decides the file name, the fixed sections and the audience of each document kind. `--export` also writes a Word file with the bundled styling. Standalone reports land under `artifacts/reports/<slug>.md`.

## picket:reviewing

The reviewer's checklist: what to load for a change of a given size, how to grade a finding, and when a verdict may say `APPROVED`. It also reviews pull requests.

**How you reach it.** Two ways. The [reviewer](agents.md#picketreviewer) loads it for every phase, plan and final review in the order and design lanes. You run it yourself with `/picket:reviewing <pull request URL>` for a pull request on GitHub or Azure DevOps, from your local clone.

**Where it fits.** A change under a security path always gets the full security checklist. In pull request mode it prints the findings and `[p] post to the PR   [d] done`; nothing is posted before `p`, and it asks once more before posting. Posting works on Azure DevOps only; on GitHub, use `gh pr review`. An Azure DevOps pull request needs a personal access token in the `AZDO_PAT` environment variable; without one the review covers the code only.

## picket:benchmarking

Runs the golden task suite against a Picket build and prints the metric table: pass rate, lane agreement, cost, time to first reviewable output, stops and cache hit ratio.

**How you reach it.** `/picket:benchmarking <run|baseline|check|report> [--tasks all|lane:<lane>|<id,...>] [--runs N]`, plus an option that picks the build (`plugin` or `trunk`), or "run the bench", "did this change regress".

**Where it fits.** It is for people changing Picket itself. It runs the code under `bench/`, which exists only in the Picket repository and is not part of the npm package. Every run spends real API budget (about 2 dollars per fast task, 10 to 15 per order task), so it does a dry run first and quotes the cost before spending.
