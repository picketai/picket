---
icon: lucide/bot
---

# Picket agents

The agents are teammates that the lead (the main Claude Code session) spawns for a work item. Each one has its own context and a narrow job, and the lead continues the same instance for later turns rather than starting a new one. You never call an agent directly: a lane skill spawns it, and you meet its work in the gate packets.

| Agent | What it does | How you reach it |
|---|---|---|
| `picket:analyst` | reads sources and writes a report | the research lane |
| `picket:architect` | writes the plan for a change | the order and design lanes |
| `picket:developer` | implements one phase at a time | the order and design lanes |
| `picket:reviewer` | checks plans, phases and pull requests | the order and design lanes, `/picket:reviewing <pull request URL>` |
| `picket:tester` | checks a finished item from the outside, against its request | the order and design lanes, after the final review |

The fast lane uses none of them: the main session makes the change itself.

## picket:analyst

The analyst reads code, documents, web pages, data or Jira tickets and writes a report that lets you understand the source without reading it.

- **Lane:** research
- **Model:** `sonnet`
- **Writes:** the report `work/<id>/research.md`, and the project map `.claude/PROJECT-MAP.md` when asked
- **Ends each pass with:** `REPORT WRITTEN`

**How you reach it.** Ask a question that needs a report, such as "how does checkout compute tax?" or "map the order lifecycle". The research lane (`picket:researching`) spawns the analyst and continues it for the deep pass and for follow-up reports on the same sources.

**How it works.** It works in two passes. The first is an outline: a short summary, the section headings and the list of sources it will read, so you can redirect it before the expensive part. The second fills every section. Every finding cites its location and is marked as observed, deduced or assumed.

**What it never does.** It writes only inside its work item, and it writes no standalone reports: a report reaches `artifacts/reports/` only when you answer `[p]` at the research gate, and the kernel makes that copy. It never writes source code and never proposes a design; a finding that needs one is flagged for the architect. It can pull and search Jira tickets, but drafts every create, edit or comment for you to confirm first.

## picket:architect

The architect writes the plan for a change: numbered decisions with the reason for each and what each gives up, then phases with the exact files each touches and the checks that prove it done.

- **Lanes:** order and design
- **Model:** `opus`
- **Writes:** the plan, `work/<id>/order.md` in the order lane or `work/<id>/design.md` in the design lane
- **Ends with:** `ARTIFACT WRITTEN` for a new plan, `AMENDED` for a changed one

**How you reach it.** Ask for a change that the kernel admits to the order lane (`picket:ordering`) or the design lane (`picket:designing`). Either lane spawns the architect once per work item. When a phase stalls and you answer `d` (redesign), the same architect amends the plan.

**How it works.** It reads the code it designs against instead of guessing, and records anything it cannot verify as an open question with a safe fallback. An amendment edits a decision in place and gives it a revision mark, such as `D-002 (r2)`.

**What it never does.** It never writes production code or tests, and an amendment never changes a phase you already approved.

## picket:developer

The developer implements one phase of the plan, runs your tests and linter, drives the changed code through its real entry point, and hands the phase to you staged but not committed.

- **Lanes:** order and design; the fast lane does not use the developer
- **Model:** `opus`
- **Writes:** the files in the phase's touch set, new files the phase names, and their tests
- **Ends each phase with:** `PHASE DONE`, or `PHASE STALLED` with a short diagnosis

**How you reach it.** The order and design lanes spawn the developer once per work item, at the first phase, and send every later phase to the same instance. Your reply to a gate packet decides what happens next: `a` commits and starts the next phase, `r <n>` runs through phase n, `x <why>` sends it back to fix the staged work.

**How it works.** When a check cannot be met without changing a recorded decision, it stops rather than forcing it.

**What it never does.** It never edits the plan or another phase's files, never writes a code comment without your approval, and never commits: your approval does.

## picket:reviewer

The reviewer is a read-only, adversarial checker: it tries to break the work and reports only findings it can point to with a file and line.

- **Lanes:** order and design, and pull request reviews
- **Model:** `opus` for the final review of the whole change, `sonnet` for the other reviews
- **Writes:** nothing; its findings live in its reply and the kernel records the verdict
- **Ends with:** `ALIGNED` or `DRIFT DETECTED` for a plan review; `APPROVED` or `CHANGES REQUIRED` for a checkpoint, final or pull request review

**How you reach it.** In the design lane, the lane spawns it to cross-check the plan against its own decisions while the developer starts phase 1. In the design lane, a plan of 6 or more phases also gets a checkpoint review before the phase after the midpoint. In the order and design lanes, once every phase is approved, a fresh reviewer reviews the whole change. You can also run it yourself on a pull request with `/picket:reviewing <pull request URL>`; it posts nothing to the pull request until you answer `p`, and posting works on Azure DevOps only.

**How it works.** It judges the change against the plan's checks and decisions, and does not penalise what the plan asked for. The final review of the whole change uses a fresh reviewer that has not seen the earlier verdicts, so it reads your original request before the plan.

## picket:tester

The tester checks a finished item the way its users will meet it: on a running copy of the system, against what you asked for, without reading the change.

- **Lanes:** order and design, after the final review
- **Model:** `sonnet`
- **Writes:** one case per risk; the kernel writes the report `work/<id>/test.md`
- **Ends each round with:** `APPROVED`, `CHANGES REQUIRED` or `DRIFT DETECTED`, the token the kernel derived

**How you reach it.** The kernel sends it once the final review of an order or design item passes, when the project's `testing` setting covers the lane (`design` by default; `all` or `off`), the plan declares at least one HTTP check, and the project has a test environment in `.picket/env/compose.yaml`. The same tester retests after each fix round.

**How it works.** It runs each case on the item's stack, replays the saved scenarios, and classifies every failure as a product, test or environment problem with the answer it saw. It asks you at most three questions, each a choice. The kernel, not the tester, counts the results and derives the verdict.

**What it never does.** It is a black box: hooks deny it any read of the item's own files, and its shell runs only the test verbs (`picket test case`, `picket test report` and their kin), `picket env start`, `picket env replay`, `picket env status` and `picket state`.
