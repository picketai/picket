---
kind: sdr
title: "Irreversible actions are confirmed at the point of use"
date: "2026-11-19"
audience: stakeholder
sources:
  - "artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md"
  - "work/20261118-mock-format-stub-server-data-catalog/reviews/cumulative.md"
  - "work/20261119-agents-cannot-forge-picket-state-by-bash/reviews/cumulative.md"
  - "work/20261119-agents-cannot-forge-picket-state-by-bash/order.md"
  - "work/20261119-database-guards-and-confirmed-sql-runs/design.md"
  - "bench/results/ask-probe.json"
confidence: medium
---

# SDR-00005: Irreversible actions are confirmed at the point of use

**Status:** Ratified
**Affected contexts:** Picket kernel, Picket guards (no charters yet)

## Context

Picket records the user's approvals as files: SQL approvals, comments, waivers, phase markers and verdicts. The cumulative review of the mock and data catalog item found that an agent could forge a SQL approval through Bash, and three review rounds on the fix each found a new shell spelling that got past `guard.bash`. The mistake class behind them, Se4 (guard bypass), is now named in nine reviews. Agents, the lead and the kernel all run as one operating system user, so no file, signature or key on disk can prove that the user said yes: whatever the kernel can write or check, a script an agent runs can write or satisfy too.

## Decision

The user's yes for an irreversible action lives in a live confirmation at the moment the action runs, never in a stored record. Picket sorts its records by what a forged one would cause, protects only the irreversible ones against a determined bypass, and relies on review for the rest. `guard.bash` stays as a second layer and is no longer the main defence, so it stops growing by one spelling at a time.

### D-001 Records are sorted by consequence

A forged SQL approval runs SQL the user never read on a real database: irreversible and outside the repository. A forged phase marker or verdict causes a local commit: reversible, visible in the history, and a push already needs the user's dialog. A forged comment or waiver lets a comment or a silenced check past a guard: reversible, visible in the diff and listed in the review summary. Only the first kind is worth holding against a determined bypass; D-005 says how far this decision gets.

### D-002 An irreversible action asks the user when it runs

`picket data run` goes through the permission dialog on every run, showing the entry, the file, its digest, the server and the database. It reuses the escalation route Picket already has, which asks only in permission modes where the dialog is proven and refuses when a saved allow rule could approve without a dialog. In a mode with no proven dialog, such as a bypass mode or the benchmark, the run is refused. Any later action with an effect outside the repository that cannot be undone follows the same rule.

### D-003 The action runs the bytes that were shown

The kernel runs a snapshot of the bytes whose digest the dialog showed, so a file changed between the check and the run cannot reach the database.

### D-004 The stored approval is a record, not an authority

`picket data approve` stays. Its row says what the user read and when, and it is shown in the dialog and at close. It no longer authorises a run on its own, so a forged row gains nothing.

### D-005 (r2) The threat this decision stops, and the one it does not

The confirmation is built to stop an agent that takes a shortcut or makes a mistake, and it does. It does not stop a hostile agent steered by text it read, such as a ticket or a web page. The dialog runs in a hook and the verb runs afterwards as a separate process, so the hook must leave the verb a confirmation row, and with one operating system user a script can forge that row and its snapshot. Such an agent can also read the connection string from its own environment and run the database client without Picket. Holding against that agent needs isolation by the operating system (TF-003) or a connection string kept out of the session.

### D-006 Signed records are rejected, and isolation by the operating system waits

Signing or hash-chaining rows is not adopted: the key would be readable by any script an agent runs, so it would look like protection without being it. Making record paths read-only for agents' shells through the host's sandbox is the stronger long-term answer and is explored after the database guards, because it moves every record write into hook processes and depends on a host feature not yet checked.

## Subdomain and investment implications

**Subdomain affected:** Guards and approvals, Core
**Investment shift:** Effort moves to confirmation at the point of use and to the database guards (SDR-00004 TF-007). Effort on new `guard.bash` spellings for reversible records decreases: a new spelling there is fixed when a review finds it and is no longer treated as blocking.

## Consequences

**Gains:**
- A run through Picket's own path always stops at a dialog on the bytes that run, a refused dialog leaves nothing usable, and a file swapped between the check and the run cannot reach the database.
- An agent that takes a shortcut is stopped: no spelling of the plain command reaches the verb, and a caller cannot supply its own confirmation.
- A small change that reuses the escalation route; nothing becomes a framework.
- Reviews stop spending rounds on shell spellings that guard reversible records.

**Costs:**
- One more stop for every SQL run, against the standing preference for as few stops as possible.
- No SQL run in a mode without a proven dialog, the benchmark included.
- Forged phase markers, verdicts, comments and waivers stay possible for a determined agent and are caught by review, not prevented.
- A determined agent can still reach the database, by forging a confirmation or by using the connection string in its environment (D-005).

**Risks:**
- **RISK-001** [major] A user who approves dialogs by habit confirms a digest without reading the file. Mitigation: the dialog names the server and the database beside the digest, and the close line prints each run.
- **RISK-002** [major] A forged phase marker commits work the user did not approve. Mitigation: commits stay local until a push, which needs the user's dialog, and the history shows each commit.
- **RISK-004** [major] The connection string is an environment variable that every agent's shell inherits, so a hostile agent needs no approval at all. Mitigation: TF-003; until then a project that cannot accept this keeps the variable out of the session and runs its SQL files by hand in another terminal.
- **RISK-003** [minor] The host's sandbox cannot make chosen paths read-only while hooks still write them, which would close the isolation route. Mitigation: TF-003 checks this before any design rests on it.

## Context-map impact

No change to the context map.

## Alternatives considered

### Alternative: isolation by the operating system now
Ruled out because: it is a large change that ties Picket to a host feature whose behaviour on Linux, WSL and Windows is not yet checked, while the one irreversible action can be protected today with what exists. It stays as TF-003.

### Alternative: signed or hash-chained records
Ruled out because: every party runs as one user, so the key is readable by the agent it is meant to stop, and the result would be false assurance.

### Alternative: keep extending guard.bash as the main defence
Ruled out because: nine reviews found a new spelling each time, and no reader of command text can see inside a script an agent writes and runs.

## Tactical follow-up

- **TF-001** [TACTICAL DESIGN NEEDED] `picket data run` asks through the proven dialog on every run, with the entry, file, digest, server and database, and refuses where no dialog is proven. Design it inside SDR-00004 TF-007, the database guards. Built in the work item `20261119-database-guards-and-confirmed-sql-runs`.
- **TF-002** [TACTICAL DESIGN NEEDED] The run uses a snapshot of the checked bytes (the open question OQ-002 of the order `20261119-agents-cannot-forge-picket-state-by-bash`). Same design item as TF-001, and built with it.
- **TF-003** [TACTICAL DESIGN NEEDED] A spike after TF-001 and TF-002: can the host's Bash sandbox make the kernel's record paths read-only for agents while hooks write them, on Linux, WSL and Windows.
- **TF-004** [TACTICAL DESIGN NEEDED] The review checklist row Se4 and the close follow-up line say which records are held to the determined-bypass bar (D-001), so a new spelling on a reversible record is graded below Critical.

## Revision log

- 2026-11-20: D-005 (r2), Gains, Costs, RISK-004: the first version said the confirmation holds against a hostile agent and closes the script and archive holes; the design item and its probe showed it stops shortcuts and mistakes only.
