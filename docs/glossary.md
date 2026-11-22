---
icon: lucide/book-a
---

# Glossary

The words Picket uses on every page, each in one or two sentences, with the page that says more.

| Term | Meaning |
|---|---|
| Agent | One of five teammates the lead starts for a narrow job: analyst, architect, developer, reviewer and tester. See [Agents](reference/agents.md). |
| Closing block | The summary Picket prints when a work item closes: the commits, the review verdict and what was tested. |
| Drive | A run of the changed code through its real entry point, such as an HTTP request or a command. Its result is the `verified` line of a gate packet. |
| Extension | A folder of your own rules, review steps and checks that Picket loads. It adds to Picket and never changes its core. See [Customization](customization.md#extensions). |
| Gate | A point where Picket stops and waits for your reply. Nothing is committed between two gates without it. See [Gates and replies](gates.md). |
| Gate packet | The short block you get at a gate: what was done, how it was checked, and your possible replies on the last line. |
| Guard | A hook that denies a tool call or sends a turn back, for example on a destructive command. See [Hooks](reference/hooks.md). |
| Hook | Code that Claude Code runs around a tool call or a turn. Picket's hooks guard the work and record every verdict. |
| Kernel | The `picket` command. It decides what code can decide: the lane, the next step, whether a phase is verified, and what a verdict changes. See [Commands](reference/cli.md). |
| Lane | The amount of process a request gets. There are four: fast, order, design and research. See [The four lanes](lanes/index.md). |
| Lead | The main Claude Code session, the one you type into. It runs the kernel and sends work to the agents. |
| Mod | A part of Picket that changes Claude Code's own interface: the status band, the work pane and the Markdown pane. See [Mods](reference/mods.md). |
| Phase | One step of a plan. It is implemented, checked and approved on its own, and becomes one commit. |
| Plan | What the architect writes before the work starts: an order in the order lane, a design record in the design lane. |
| Run through | The reply `r <n>` at a gate: approve this phase and let the developer continue through phase n without stopping. |
| Security path | A folder where every change takes the design lane, such as `src/auth/`. See [Customization](customization.md#settings). |
| Skill | A procedure the lead or an agent follows, one for each lane and each job. See [Skills](reference/skills.md). |
| Test environment | The stack the tester runs a finished item on, described by `.picket/env/compose.yaml`. See [Set up testing](set-up-testing.md). |
| Umbrella | One git repository that holds your product repositories as folders, each with its own history. See [Configure your project](configure-your-project.md). |
| Verdict | The exact word an agent ends with, such as `APPROVED` or `PHASE DONE`. The kernel reads it to decide the next step. |
| Work item | One request and everything written about it, kept in `work/<id>/`. |
| Worktree | A second checkout of a nested repository on the work item's branch, used in an umbrella. See [Worktrees in an umbrella](umbrella-worktrees.md). |
