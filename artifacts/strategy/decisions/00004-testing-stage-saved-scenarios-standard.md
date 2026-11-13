---
kind: sdr
title: "Testing stage, saved scenarios and the standard test environment"
date: "2026-11-13"
audience: stakeholder
sources:
  - "artifacts/strategy/drafts/testing-and-test-environment.md"
  - "artifacts/reports/qa-colleague-workflow-testing-skill.md"
  - "artifacts/reports/qa-colleague-project-unread-rest.md"
  - "artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md"
  - "artifacts/strategy/decisions/00003-mods-fold-picket-plugin.md"
confidence: medium
---

# SDR-00004: Testing stage, saved scenarios and the standard test environment

**Status:** Ratified
**Affected contexts:** Picket core: kernel, agents, skills (no charter yet)

## Context

In Picket the developer writes the code, the tests that judge it and the drive that verifies it, so it grades its own work, and nothing checks a change against a running system of several services. The product owner asked for a check after implementation and review that the change does what the request asked and breaks nothing that exists, on systems whose services find each other through configuration and whose data is often shared and long-lived. A study of a QA colleague's project showed which parts of a QA engineer's practice serve that minimal check and which belong to a QA department. The detail behind each decision below is in `artifacts/strategy/drafts/testing-and-test-environment.md`.

## Decision

Picket gains a testing stage built on three things it owns: an enforced standard for a project's test environment, a small format for saved scenarios that the kernel records and replays without a model, and a fifth agent, the tester, that checks a finished item as a black box against the request. Picket owns the formats and uses engines underneath (Compose, Node's `fetch`, later Playwright); it does not adopt another test tool's format, because ease of change is the main driver for this area. It is built in four steps, of which the first three need no new agent.

### D-001 The scope is a minimal verification

The stage answers two questions only: does the implementation do what the initial request asked, and does it break anything that already exists. Exploratory testing, performance, security catalogues and manual testing stay with a project's QA team.

### D-002 Declared checks are verified and then kept

The architect declares, for a phase with a runtime surface, a request with its expected status and content and the criterion it covers. The kernel runs it at the phase gate, the user rules on a mismatch there, and a path prefix difference may ride inside a run grant while any other mismatch stops it. An approved check is kept as a saved scenario. A deliberate change of tested behaviour is named in the plan by the architect and confirmed by the user.

### D-003 One enforced test environment on Compose

Every project builds its test environment the same way: `.picket/env/` at the umbrella root, on the Compose Specification, run by Docker or Podman with Linux containers, on Windows through WSL2. Services carry a role: `app` (built from source), `dependency`, `mock`, `shared` (long-lived, not started by the stack), `data` and an optional `seed`. A service the item changes is built from its worktree and the others from the root checkout; a service outside the umbrella is a dependency. The item's code is built and started for the test; testing against a deployed environment, Windows containers and Kubernetes are out of the first version.

### D-004 The setup decides with the user and creates a work item

`picket env init` serves the first install and every update. It checks the machine first, scans for services, Dockerfiles and address-like configuration entries, decides each one with the user, and creates a work item whose request lists every step. It writes no environment files itself, so the environment arrives through the normal lanes and gates. Addresses are set by environment variable by default, or through a replaced configuration file where a service cannot take variables.

### D-005 Picket owns the scenario and mock formats

A scenario is a card in words over recorded steps, with a closed list of step words and no conditions, loops or includes. The kernel writes it from what really ran and replays it once before keeping it, so a saved scenario is always something that ran and passed. Mocks use Picket's own small definition format and a stub server Picket provides. Each engine sits behind an adapter with a line budget, and a format change is handled by recording again, never by a migration script.

### D-006 Test data is shared and long-lived by default

A scenario is written as if the data is old, shared and changed by others: it creates or finds its own data, checks only what it owns, and writes only to records it created. A data catalog names how each kind of data is obtained. Where no endpoint can produce data, the kernel runs a SQL file the user approved, through the database's own client, with a connection string the developer enters by hand; further guards against the wrong database are a follow-up.

### D-007 Scenarios run inside Picket sessions only

Replay needs no model, but it runs only inside a session, because the CLI lives in the plugin (SDR-00001, SDR-00003). The kernel stores the last known result of each scenario with its commits, which serves as the baseline for an item and for the fast lane, where the affected scenarios are replayed with no tester. A pipeline option is reconsidered only if the count of breaks found late is high.

### D-008 A fifth agent, the tester

The tester runs after the cumulative review on order and design items that declare a check. It is a black box toward the change: it may not read the files the item changed, and it works from a brief the kernel compiles. It adds no verdict token and reuses `APPROVED`, `CHANGES REQUIRED` and `DRIFT DETECTED`. It tests a matrix of case kinds for each criterion, sized by one check for each risk with a cap by item size, and does no exploratory testing. Picket's line becomes "four lanes, five agents, one kernel".

### D-009 Results are data and code derives the verdict

Each result is passed, failed, blocked, not run or not covered, and none is rounded up to a pass. A failure is classified as product, test or environment before it stands. The verdict cannot be `APPROVED` while a criterion has no passed check of its own. A silent story gives a question phrased as a choice, with a default only when a fact supports it. The kernel generates the report from recorded results.

### D-010 The user approves what changes

Nothing is replaced by an agent without the user's approval, and a replaced scenario is deprecated and linked, never rewritten. Fixes made after testing are approved by the user before they are committed, as in the development cycle. A fix that needs product code outside the touch set is a plan amendment. A passing scenario that turns red trips a circuit breaker: a diagnosis runs first, then one stop. A scenario a person changed by hand is that person's choice; the kernel replays it and gives notice.

### D-011 What was not proven is said plainly

A pass through a mock is flagged on the result, on the flow and on the item's closing line, which names the real services no test reached. A defect outside the item's criteria does not block the item: it stays visible as a known defect, and when it stops failing the reason is stated.

### D-012 The tester is measured before it is trusted

A planted-defect benchmark in Picket's own repository judges the tester and every change to the testing skill: known mistakes, trap tasks and silent stories, graded by code. The setting `testing` ships as `design` until the benchmark has measured cost and catch rate.

### D-013 Build order

Declared checks first, then the environment standard, then saved scenarios and replay, then the tester with its benchmark. Each step is useful before the next starts.

## Subdomain and investment implications

**Subdomain affected:** Verification of delivered changes, Core
**Investment shift:** effort increases in the kernel (the `picket env` verbs, replay, the adapters, verify, the report), in one new agent and skill, and in the benchmark fixture; it decreases in prose rules about driving a change, which code now checks, and it stays out of anything a QA department does.

## Consequences

**Gains:**
- A change is checked against a running system by a role that did not write it, with evidence on every result.
- A project gets a regression suite that grows with every item and costs no model to replay.
- Every project's test environment has the same shape, so the kernel can start, check and remove it.
- A report says what was not proven: mocked services, blocked cases, known defects.

**Costs:**
- A project must build and maintain its environment once, and a service that cannot run in a Linux container is only mocked or shared.
- The floor changes: a fifth agent, and saved scenarios, mock definitions and the declared check shape become public contracts.
- Each tested item costs one more agent session, plus a review and a retest for each fix round.
- Picket maintains replay code, adapters and a stub server of its own.

**Risks:**
- **RISK-001** [major] The first version protects a shared database only by the developer's care with the connection string. Mitigation: the guards of TF-005, and the packet prints the database a run used.
- **RISK-002** [major] The product owner's own system may hold services that cannot run in Linux containers, which leaves the tester with mocks. Mitigation: check the real services before TF-002 starts.
- **RISK-003** [minor] The scenario format grows into a test framework. Mitigation: a closed word list and line budgets enforced as tests.
- **RISK-004** [minor] The tester raises false alarms or misses defects. Mitigation: the planted-defect benchmark of D-012.

## Context-map impact

No context map exists yet. No change.

## Alternatives considered

### Alternative: a tester that writes tests before the developer implements, per phase
Ruled out because: the product owner wants one check after implementation and review, starting from the request, not a gate in every phase.

### Alternative: adopt the project's own test tools or an existing runner
Ruled out because: nothing would be standard across projects, and the stage would depend on formats Picket cannot change.

### Alternative: a tester that reads the implementation
Ruled out because: it would test the cases the code handles, which is the weakness of a developer testing its own work.

### Alternative: a fresh seeded database for every run
Ruled out because: many real systems, legacy ones above all, cannot be seeded for each change, so the standard would fit few projects.

### Alternative: run saved scenarios in a pipeline
Ruled out because: it needs a second way for Picket to reach a machine, which SDR-00003 removed.

## Tactical follow-up

- **TF-001** [TACTICAL DESIGN NEEDED] Declared checks: status and content in `picket verify`, the mismatch rules, the grouped correction.
- **TF-002** [TACTICAL DESIGN NEEDED] The environment standard: the `picket env` verbs, the check rules, the setup that creates a work item, the lifecycle, the fixture system.
- **TF-003** [TACTICAL DESIGN NEEDED] Saved scenarios and replay: the format, the adapters, kept checks, stored results, the fast-lane replay, replacements named in the plan, the safety rules.
- **TF-004** [TACTICAL DESIGN NEEDED] The tester: the agent and skill, the brief, recording through the kernel, the generated report, verdict routing, fix rounds, the circuit breaker, and the floor text for five agents.
- **TF-005** [TACTICAL DESIGN NEEDED] The planted-defect benchmark: tasks, answer keys, the grader.
- **TF-006** [TACTICAL DESIGN NEEDED] The mock format and stub server, and the data catalog with approved SQL files.
- **TF-007** [TACTICAL DESIGN NEEDED] The database guards deferred from the first version.
- **TF-008** [TACTICAL DESIGN NEEDED] Known defects with their watching, and the counted learning at close.
- **TF-009** [TACTICAL DESIGN NEEDED] The browser adapter.
