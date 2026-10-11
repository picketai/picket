# Picket agents

The agents are teammates that the lead (the main Claude Code session) spawns for a work item. Each one has its own context and a narrow job, and the lead continues the same instance for later turns rather than starting a new one. You never call an agent directly: a lane skill spawns it, and you meet its work in the gate packets.

| Agent | What it does | How you reach it |
|---|---|---|
| `picket:analyst` | reads sources and writes a report | the research lane |
| `picket:architect` | writes the plan for a change | the order and design lanes |
| `picket:developer` | implements one phase at a time | the order and design lanes |
| `picket:reviewer` | checks plans, phases and pull requests | the order and design lanes, `/picket:reviewing <pull request URL>` |

The fast lane uses none of them: the main session makes the change itself.

## picket:analyst

The analyst reads code, documents, web pages, data or Jira tickets and writes a report that lets you understand the source without reading it.

**How you reach it.** Ask a question that needs a report, such as "how does checkout compute tax?" or "map the order lifecycle". The research lane (`picket:researching`) spawns the analyst and continues it for the deep pass and for follow-up reports on the same sources.

**Where it fits.** It works in two passes. The first is an outline: a short summary, the section headings and the list of sources it will read, so you can redirect it before the expensive part. The second fills every section. Every finding cites its location and is marked as observed, deduced or assumed. It writes only `work/<id>/research.md`, the project map `.claude/PROJECT-MAP.md` when asked, and standalone reports under `artifacts/reports/<slug>.md` when there is no work item. It never writes source code and never proposes a design; a finding that needs one is flagged for the architect. It can pull and search Jira tickets, but drafts every create, edit or comment for you to confirm first. It runs on the `sonnet` model and ends each pass with `REPORT WRITTEN`.

## picket:architect

The architect writes the plan for a change: numbered decisions with the reason for each and what each gives up, then phases with the exact files each touches and the checks that prove it done.

**How you reach it.** Ask for a change that the kernel admits to the order lane (`picket:ordering`) or the design lane (`picket:designing`). Either lane spawns the architect once per work item. When a phase stalls and you answer `d` (redesign), the same architect amends the plan.

**Where it fits.** It writes only `work/<id>/order.md` in the order lane or `work/<id>/design.md` in the design lane, never production code or tests. It reads the code it designs against instead of guessing, and records anything it cannot verify as an open question with a safe fallback. An amendment edits a decision in place and gives it a revision mark, such as `D-002 (r2)`; it never changes a phase you already approved. It runs on the `opus` model and ends with `ARTIFACT WRITTEN` for a new plan or `AMENDED` for a changed one.

## picket:developer

The developer implements one phase of the plan, runs your tests and linter, drives the changed code through its real entry point, and hands the phase to you staged but not committed.

**How you reach it.** The order and design lanes spawn the developer once per work item, at the first phase, and send every later phase to the same instance. Your reply to a gate packet decides what happens next: `a` commits and starts the next phase, `r <n>` runs through phase n, `x <why>` sends it back to fix the staged work.

**Where it fits.** It writes only the files in the phase's touch set, new files the phase names, and their tests. It never edits the plan or another phase's files, never writes a code comment without your approval, and never commits: your approval does. When a check cannot be met without changing a recorded decision, it stops rather than forcing it. The fast lane does not use the developer. It runs on the `opus` model and ends each phase with `PHASE DONE`, or `PHASE STALLED` with a short diagnosis.

## picket:reviewer

The reviewer is a read-only, adversarial checker: it tries to break the work and reports only findings it can point to with a file and line.

**How you reach it.** In the design lane, the lane spawns it to cross-check the plan against its own decisions while the developer starts phase 1. In the order and design lanes it reviews phases at checkpoints and, once every phase is approved, the whole change. You can also run it yourself on a pull request with `/picket:reviewing <pull request URL>`; it posts nothing to the pull request until you answer `p`, and posting works on Azure DevOps only.

**Where it fits.** It writes nothing at all; its findings live in its reply and the kernel records the verdict. It judges the change against the plan's checks and decisions, and does not penalise what the plan asked for. The final review of the whole change uses a fresh reviewer, on the `opus` model, that has not seen the earlier verdicts, so it reads your original request before the plan. Other reviews run on the `sonnet` model. A plan review ends with `ALIGNED` or `DRIFT DETECTED`; a phase, final or pull request review ends with `APPROVED` or `CHANGES REQUIRED`.
