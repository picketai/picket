# Agent Design Rules for Consistent, Low-Variance, Accurate Results

Derived from **"Why Do Multi-Agent LLM Systems Fail?"** (Cemri et al., 2025, arXiv:2503.13657),
which introduces **MAST** — a taxonomy of 14 failure modes from 1600+ annotated traces
across 7 multi-agent frameworks.

## Meta-principle: structural over tactical

The paper's headline finding: prompt tweaks alone do not fix multi-agent failures.
Tactical fixes (better wording, "be careful" instructions) gave only marginal gains.
Reliability comes from *structural* changes — verification layers, defined protocols,
explicit state handling. Treat every rule below as architecture, not prompt polish.

> Note on "deterministic": LLM agents are stochastic — true determinism is impossible.
> The achievable goal is *low variance + high accuracy*. Most harmful non-determinism is
> under-specification, not model randomness. Tightening structure makes runs converge.

---

## Category 1 — System Design Failures

### Rule 1: Give each agent its full context explicitly *(FM-1.1 Insufficient context)*
Don't assume an agent inherits what an earlier agent saw. Pass the relevant artifact
into the prompt directly.

- BAD: "Implement the feature we discussed."
- GOOD: "Implement Phase 2 of `artifacts/plans/checkout-redesign.md`. Inputs:
  the ADR at `artifacts/adr/0007-payment-gateway.md` and the API schema in
  `src/api/checkout.ts`. Do not touch Phase 3 work."

### Rule 2: Pin roles hard, and keep them narrow *(FM-1.2 Disobey role spec)*
State what the agent must do *and* what it must not do. Overlapping mandates cause drift.

- BAD: "You are a helpful architect agent. Help with the codebase."
- GOOD: "You are the architect. You produce ADRs and implementation plans.
  You DO NOT write production code. You DO NOT approve your own plans.
  If a task needs code, hand it to the developer agent."

### Rule 3: Define explicit stopping conditions *(FM-1.3 Premature termination, FM-1.5 Unaware of stopping)*
Every agent needs a concrete "done" definition and a "not done until X" guard.

- BAD: "Review the code and let me know what you think."
- GOOD: "Review is complete ONLY when: (a) every checklist item has a verdict,
  (b) all CHANGES REQUIRED items cite a file:line, (c) you emit a final
  APPROVED or CHANGES REQUIRED line. Do not stop before all three exist."

### Rule 4: Make conversation history durable *(FM-1.4 Loss of history)*
Persist decisions in artifacts, not just chat. State that lives only in transient
messages gets lost across handoffs.

- BAD: Architect explains a trade-off in a chat message; developer never sees it.
- GOOD: Architect records the trade-off in `artifacts/adr/0009-cache-strategy.md`;
  the developer prompt references that file path. The decision survives the handoff.

---

## Category 2 — Inter-Agent Misalignment

### Rule 5: Make delegation contracts explicit *(FM-2.4 Ineffective delegation)*
A handoff must specify: task, inputs, expected output shape, acceptance criteria.

- BAD: "@developer go implement the auth changes."
- GOOD: "@developer Task: implement Phase 1 of `plans/auth-rewrite.md`.
  Inputs: ADR 0011, `src/auth/`. Output: modified files + a test run summary.
  Acceptance: all existing tests pass, new middleware has unit coverage.
  Stop after Phase 1 and wait for review."

### Rule 6: Require a single shared source of truth for goals *(FM-2.5 Misaligned objectives)*
All agents reference the same plan/charter. When each agent re-derives the objective,
goals drift apart.

- BAD: Consultant, architect, and developer each restate the goal in their own words.
- GOOD: The bounded-context charter at `artifacts/charters/billing.md` is the canonical
  goal statement; every agent prompt links to it and quotes from it rather than
  paraphrasing.

### Rule 7: Detect and break repetition loops *(FM-2.1 Step repetition)*
Track whether an agent is re-doing a step with no new result; cap iterations.

- BAD: Agent retries the same failing build command 8 times with no change.
- GOOD: "If a command fails twice with the same error, STOP. Report the error and
  your diagnosis instead of retrying. Max 3 attempts per distinct action."

### Rule 8: Standardize tool/interface protocols across agents *(FM-2.3 Conflicting tool use)*
Same tool names, same I/O conventions, so two agents don't take conflicting actions.

- BAD: One agent edits files with `Edit`, another shells out to `sed`, a third
  rewrites whole files — the same file mutated three incompatible ways.
- GOOD: All agents use `Edit` for modifications and `Write` only for new files;
  artifact writes always go through the documenting skill's filename rules.

### Rule 9: Never reset context mid-task *(FM-2.2 Conversation reset)*
Resume agents with full history rather than spawning fresh ones.

- BAD: Developer hits a blocker; you spawn a brand-new developer agent that has
  no memory of Phases 1-2.
- GOOD: Resume the existing developer via `SendMessage` with the agent's name —
  it keeps the full phase history and prior decisions.

---

## Category 3 — Task Verification (highest-leverage fixes)

### Rule 10: Add a dedicated verifier — never let the producer self-certify *(FM-3.3 Inaccurate execution)*
A separate reviewer catching errors was the single most effective intervention
in the paper.

- BAD: Developer finishes a phase and declares "implementation verified, all good."
- GOOD: Developer output is routed to the reviewer agent, which runs an adversarial
  review and emits an independent APPROVED / CHANGES REQUIRED verdict before the
  phase can advance.

### Rule 11: Verify output *format*, not just content *(FM-3.1 Incorrect format)*
Check the output matches the schema the next agent expects before handing off.

- BAD: Architect produces a plan with no phase anchors; developer can't mark
  `**Status: Complete**` because `<!-- status:phase-N -->` markers are missing.
- GOOD: A format check confirms the plan has numbered phases, status anchors, and
  acceptance criteria before it is handed to the developer.

### Rule 12: Make verification checklist-driven, not vibe-based *(FM-3.3)*
Generic "review this" misses things; concern-specific checklists catch more.

- BAD: "Review the PR and flag anything that looks wrong."
- GOOD: Reviewer loads the framework- and concern-specific checklists from the
  `reviewing` skill (e.g. SQL injection, N+1 queries, missing error handling)
  and gives each item an explicit pass/fail with evidence.

### Rule 13: Force task restatement before execution *(FM-3.4 Ineffective understanding, FM-3.2 Incomplete delivery)*
Have the agent paraphrase requirements and success criteria first — cheap way to
catch misunderstanding early.

- BAD: Agent reads the task and immediately starts editing files.
- GOOD: "Before writing any code, restate: (1) what you understand the task to be,
  (2) the success criteria, (3) anything ambiguous. Wait for confirmation if
  anything is unclear."

### Rule 14: Decompose into independently verifiable subtasks *(FM-3.3, FM-3.4)*
Each subtask gets explicit success criteria and is checked on its own.

- BAD: "Build the whole reporting dashboard" as one opaque unit of work.
- GOOD: Plan splits into Phase 1 (data layer), Phase 2 (API), Phase 3 (UI), each
  with its own acceptance criteria and its own architect review gate.

---

## Quick audit checklist for an agent definition

- [ ] Does the prompt pass all needed context/artifacts explicitly? (R1)
- [ ] Are both the role and the anti-role (must-not-do) stated? (R2)
- [ ] Is there a concrete, testable "done" condition? (R3)
- [ ] Are decisions persisted to artifacts, not just chat? (R4)
- [ ] Do handoffs specify task + inputs + output shape + acceptance? (R5)
- [ ] Do all agents point to one canonical goal statement? (R6)
- [ ] Is there an iteration / retry cap? (R7)
- [ ] Are tool conventions standardized across agents? (R8)
- [ ] Are agents resumed rather than re-spawned? (R9)
- [ ] Is there an independent verifier (not the producer)? (R10)
- [ ] Is output format validated at each handoff? (R11)
- [ ] Is verification checklist-driven? (R12)
- [ ] Does the agent restate the task before acting? (R13)
- [ ] Is the work decomposed into verifiable subtasks? (R14)

---

## MAST taxonomy reference (the 14 failure modes)

**System Design**
- FM-1.1 Insufficient Context Provision
- FM-1.2 Disobey Role Specification
- FM-1.3 Premature Termination
- FM-1.4 Loss of Conversation History
- FM-1.5 Unaware of Stopping Conditions

**Inter-Agent Misalignment**
- FM-2.1 Step Repetition
- FM-2.2 Conversation Reset
- FM-2.3 Conflicting Tool Use
- FM-2.4 Ineffective Delegation
- FM-2.5 Misaligned Agent Objectives

**Task Verification**
- FM-3.1 Incorrect Output Format
- FM-3.2 Incomplete Information Delivery
- FM-3.3 Inaccurate Task Execution
- FM-3.4 Ineffective Task Understanding

Source: Cemri et al., "Why Do Multi-Agent LLM Systems Fail?", arXiv:2503.13657v2.
