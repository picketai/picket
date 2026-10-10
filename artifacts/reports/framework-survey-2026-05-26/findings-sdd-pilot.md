# sdd-pilot — Findings

## What it is (2-3 sentences)

SDD Pilot is a "spec-driven development" workflow layer that runs on top of multiple AI coding tools (Claude Code, Copilot, Gemini CLI, OpenCode, Codex, Windsurf, Antigravity). It forces every feature through a fixed, gated pipeline — Specify → Clarify → Plan → (Checklist) → Tasks → (Analyze) → Implement → QC — with each phase producing a named artifact in `specs/<feature-folder>/` and a strict marker-file gate (`.completed`, `.qc-passed`) controlling the next step. The same shared "skills" power every tool; thin per-tool wrappers exist only to translate delegation syntax.

## Architecture at a glance

Five-layer separation:

1. **Workspace control plane** — `project-instructions.md`, `.github/sddp-config.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`. Tool-neutral governance.
2. **Project context specs** — `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`, `specs/adrs/*`. One-time bootstrap.
3. **Feature workspaces** — `specs/00001-feature-name/` containing `spec.md`, `plan.md`, `tasks.md`, `qc-report.md`, `.completed`, `.qc-passed`, `autopilot-log.md`.
4. **Framework internals** — `.github/skills/<name>/SKILL.md` is the canonical workflow logic; `.claude/skills/`, `.agents/skills/`, `.opencode/agents/`, etc. are *thin wrappers* that load the shared skill.
5. **Runtime & distribution** — scripts for compression, drift detection, and Gemini extension build.

The Claude wrapper for `/sddp-specify` is only ~15 lines: a hard role-reset preamble, then "Load and follow the workflow in `.github/skills/specify-feature/SKILL.md`", then a delegation map (`Delegate: Spec Validator → sddp-spec-validator`). All actual logic lives once in `.github/skills/`.

## Techniques for LLM consistency

1. **Deterministic prompt skeleton for every agent.** Every sub-agent file (`.github/agents/*.md`) follows exactly five sections: `Role`, `Task`, `Inputs`, `Execution Rules`, `Output Format`. From `docs/reference.md`:
   > "Agent files follow the same instruction layout to reduce ambiguity: 1. Role 2. Task 3. Inputs 4. Execution Rules 5. Output Format"

2. **Role-reset preamble at the top of every wrapper.** The Claude `sddp-specify` wrapper opens with:
   > "You are starting a NEW specification workflow. Your sole purpose is to capture WHAT users need and WHY... Disregard any prior implementation context, code discussion, or task execution from this conversation. Do not write code..."

   Each agent also has a refusal script if asked to do another phase's work:
   > `"I'm the Product Manager agent — I capture requirements, not code. Use /sddp-implement for implementation." Then stop.`

3. **Hard-coded ID schemes.** Tasks `T###`, requirements `FR-###`/`TR-###`/`OR-###`/`RR-###`, success criteria `SC-###`, checklists `CHK###`, architecture decisions `AD-###`, stress-test findings `STF-###`, ADRs `ADR-NNNN`, bugs `[BUG:severity]`. These IDs are how phases cross-reference each other — effectively a typed schema across markdown files.

4. **Structural-contract grammars.** `artifact-conventions/SKILL.md` defines exact line grammars, e.g.:
   ```
   - [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?]
   ```
   These are parser inputs, not narrative — a downstream "Task Tracker" sub-agent parses them into structured data.

5. **Templates with literal placeholders.** `spec-template.md` ships with `[REPLACE: ...]` markers, frontmatter scaffolding, and section-mandatory annotations (`*(mandatory)*`, `*(mandatory for product specs only)*`). Final write step explicitly says: "Strip all HTML comments, `[REPLACE: ...]` markers, template placeholders."

6. **Validator sub-agents.** Every artifact has a validator (`_spec-validator`, `_policy-auditor`, `_test-evaluator`) that runs as a separate Task delegation — "All pass → Step 5. Failures: list, fix, re-validate (max 3 iterations)". The LLM doesn't validate its own output in-stream; a fresh context does.

## Techniques for determinism

1. **Strict phase gating with marker files.** From `AGENTS.md`:
   > `spec.md` must exist before Clarify or Plan. `plan.md` must exist before Tasks. `tasks.md` must exist before Implement. `.completed` must exist before QC. `.qc-passed` before release-ready.

   Markers are dotfiles, not LLM-generated content — they exist or they don't.

2. **Deterministic feature workspace naming.** Branch `00001-user-auth` → `specs/00001-user-auth/`. If branch doesn't match `^\d{5}-`, prompt; in autopilot, accept `<next_id>-<slug>`. Resolution rules are exhaustive (matching branch / non-matching branch / no repo / detached HEAD).

3. **Whitelisted transitions.** Checkbox state machine: `- [ ] → - [X]` only. *Never* `- [X] → - [ ]` (would require explicit user approval). *Never* delete a checkbox line. Spelled out as a contract in `artifact-conventions/SKILL.md`.

4. **"Auto-clarity" exit from compression.** `compact-communication/SKILL.md` lists exactly when terse mode is dropped: "security warnings, destructive or irreversible actions, ordered multi-step instructions, user questions showing confusion, policy/compliance nuance." Compression is deterministic *and* its boundaries are deterministic.

5. **Autopilot decision log.** Every automatic choice is written to `autopilot-log.md` as a table row with a fixed event-type enum (`phase_start`, `phase_complete`, `gate_check`, `decision`, `halt`, `epic_update`). Columns fixed; relative artifact links required. Replay-quality state.

6. **Sufficiency checks via keyword counts.** Autopilot gate verifies the Product Document covers ≥3 of 5 categories by *keyword match*: `goal/vision/purpose/problem/objective/mission` → product vision; `user/customer/persona/actor` → audience. No LLM judgement — a deterministic check.

7. **Drift detection in CI.** `scripts/drift-report.mjs` enforces wrapper-propagation: every tool's wrapper for every command must exist, point at the right canonical skill, not diverge. Statuses are an enum (`in-sync`, `missing`, `stale-reference`, `normalized-drift`, `generated-mismatch`, `unsupported-extra`). The framework polices itself.

8. **Halt-condition enumeration.** Autopilot stops only on a closed list of 8 conditions. No "creative" failure modes.

9. **Severity tables.** Convention violations carry a fixed severity (`CRITICAL` / `HIGH` / `MEDIUM`) per a lookup table — not LLM-determined.

## Techniques for efficiency

1. **Lazy artifact loading inside skills.** From `implement-tasks/SKILL.md`:
   > "**Load now**: plan.md, spec.md, research.md (if exists). **Lazy-load**: data-model.md, contracts/ — defer until task references them."

2. **Context budget per phase.** Same skill:
   > "After each phase completes, release full file contents read for that phase's tasks. Keep only key findings summary. Re-read only plan.md/spec.md sections relevant to next phase's work items. **Mandatory per-phase checkpoint**."

3. **PriorExports compact summary.** Across phases the implementer keeps only "a compact interface summary (symbol → file → signature) for all `→ exports:` annotated tasks from completed phases." Hand-crafted forward-only context shaping — much smaller than re-reading whole files.

4. **State persistence for resume.** `.implement-state` is written per phase. On resume, skip-to-correct-phase without re-deriving. Already-`[X]` tasks are skipped automatically.

5. **Bounded cross-feature scan.** `2.9 Cross-Feature Overlap Detection` reads "ONLY the first 40 lines of `spec.md` (frontmatter + Problem Statement + first work item title), and the `## Key Entities` heading line if present. Do NOT read full requirement lists." Then top-K=3 are drilled down. Textbook BFS-with-budget pattern.

6. **Parallel-ready task annotations.** Tasks carry `[P]` parallel flags, `after:T###` dependency edges, `← T###:Symbol` import edges, `→ exports: Symbol` export edges. Dependency graph is explicit, not inferred.

7. **Reuse-before-refresh on research.** "If `FEATURE_DIR/research.md` exists → read, assess coverage; reuse when matching; refresh only on material scope change." Re-derivation is the explicit fallback, not the default.

8. **Skill auto-selection in autopilot.** When `$ARGUMENTS` is empty, autopilot reads `specs/project-plan.md`, finds the first unchecked epic, and uses it. No back-and-forth.

## Techniques for cost reduction

1. **Compact communication contract.** A 45-line shared skill (`compact-communication/SKILL.md`) describes runtime output: "Lead with outcome. Prefer short sentences, fragments, flat bullets. Report only changed state, counts, blockers, next action. Do not restate workflow steps unless status changed."

2. **Phase-boundary reports ≤ 5 bullets.** From `project-instructions.md` IV: "Phase-boundary reports: ≤ 5 bullet points."

3. **Path-references over inlining.** Wrappers say *"Load and follow the workflow in `.github/skills/specify-feature/SKILL.md`"* rather than inlining it. Sub-agent calls pass `PlanPath`, `DataModelPath`, `ContractsPath` strings — the sub-agent reads them, the parent doesn't pay for it.

4. **Output token caps on derived artifacts.** `plan.md` ≤ 10KB, `research.md` ≤ 4KB (consolidate if >3KB), user stories ≤ 200 words, ~50–100 words per research topic, max 2 sources per topic. Explicit byte budgets.

5. **Role-scoped tool whitelists.** Each Claude skill frontmatter sets `allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch` — no Bash for spec-only phases, so the LLM cannot waste tokens on terminal probing it doesn't need.

6. **Sub-agent role-files have NO workflow logic.** `_developer.md` is ~80 lines, one task: implement a single task ID. Re-invoked per task. Each invocation has a small fresh context.

7. **Safe markdown compression utility.** `scripts/compress-markdown.mjs` strips narrative bloat from allowlisted files (`README.md`, `docs/**/*.md`, `research.md`, `analysis-report.md`, `manual-test.md`) while preserving headings, code blocks, IDs, tables, checkboxes exactly. Blocks parser-sensitive files entirely. Reduces token cost of artifacts the LLM repeatedly re-reads.

8. **Sub-skill chaining via path, not embed.** "Read `.github/skills/compact-communication/SKILL.md`" at step 0 of every skill — a one-time ~1KB cost that replaces re-stating compact rules in every skill.

## Notable patterns worth stealing

- **Five-section agent prompt skeleton.** Universal Role / Task / Inputs / Execution Rules / Output Format.
- **Marker-file gates.** Dotfile artifacts (`.completed`, `.qc-passed`, `.implement-state`) prove phase progression without LLM re-reading content.
- **Typed cross-artifact ID system** with a severity table for violations.
- **Annotated task grammar with dependency edges and export signatures.** `[after:T###]`, `[← T###:Symbol]`, `[→ exports: Symbol]` — turns markdown task list into a build graph.
- **Per-phase context budget reset with PriorExports** — drop full file content; keep `symbol → file → signature` only.
- **Bounded scan + top-K drill-down** for cross-feature lookups.
- **Adversarial-scanner sub-agent.** Cross-requirement contradiction detection as a discrete delegation; emits ranked `STF-###` findings.
- **Autopilot log as typed event stream.** Fixed event-type enum, table format, every automatic decision with rationale + artifact link.
- **Drift-report tooling.** Validates the framework's own wrapper-propagation contract in CI.
- **`disable-model-invocation: true`** on Claude skill frontmatter — slash-command only, never auto-fired by the model. Avoids accidental re-entry.
- **Sufficiency-by-keyword for upstream documents** — deterministic "does this PRD cover ≥3/5 categories?" replaces LLM judgement.

## Caveats / things NOT to copy

- **Wrapper duplication overhead.** 6+ tools × ~16 commands × wrapper file ≈ 96 thin wrappers. Drift tooling exists *because* the duplication is unavoidable. If you're targeting one tool (Claude Code), don't pay that tax.
- **Bureaucracy ceiling.** A feature passes ~8 phases, ~4 sub-agents per phase, with mandatory templates. Excellent for compliance-heavy work; punishing for one-shot tweaks.
- **Specs as parser-sensitive contracts.** ID grammars + structural sections + checkbox-as-state means LLMs *must* obey rules instead of just writing well. Many "DO NOT change ID" rules; tooling must enforce.
- **Branch-name-driven workspace resolution.** Couples directory layout to git branching strategy. Squash-and-rebase teams who reuse branches will find this awkward.
- **Verbose phase keyword inference.** `phase: title contains "Setup"` is brittle vs structured frontmatter.
- **No persistent agent memory.** Each phase reloads context from artifacts. Your `MEMORY.md` system is strictly more capable for cross-session insight.
- **Mixed parser-sensitive vs narrative files in one dir.** `tasks.md` (contract) lives next to `research.md` (narrative). The compression utility's blocklist exists precisely to prevent humans/LLMs from breaking the contract.

## Concrete recommendations for AISpec

Your framework already has: agents (analyst, consultant, architect, developer, reviewer), skills, ADRs/plans under `artifacts/`, MEMORY.md, flag-token routing, dual-approval gates. Recommendations are additive:

1. **Adopt the five-section sub-agent prompt skeleton** — `Role / Task / Inputs / Execution Rules / Output Format` formalized in every agent file. You're 80% there; mandate it.

2. **Add a typed cross-artifact ID system.** You have `[VERIFIED]/[INFERRED]/[ASSUMED]` and review-flag tokens. Extend with:
   - `R-###` for analyst report findings (so architect can cite "Per R-014, ...")
   - `D-###` for ADR decisions inside an ADR file (you have `00002-auth-middleware` as the *file* ID; add stable in-file decision IDs)
   - `T-###` for plan tasks
   - `RISK-###` for risks

   Then add a severity table: "Changing an ID without approval → CRITICAL violation."

3. **Add marker-file phase gates.** `artifacts/plans/<plan>.completed` written by developer; `artifacts/plans/<plan>.reviewed` written by reviewer. Replaces status-hunting through chat for the dual-approval gate.

4. **Per-phase context-budget rule in the developer agent.** "After each phase, drop full file content. Keep symbol → file → signature for cross-phase imports. Re-read plan/ADR only as needed." Your `documenting` skill handles formats but not memory shedding.

5. **Add a `compact-communication` shared skill.** You have `<output_format>` blocks; the gap is *runtime* messaging during multi-step work. Steal the auto-clarity exception list (security/destructive/ordered steps/confused user).

6. **Codify explicit halt-conditions per agent.** Your agents have implicit halt conditions ("ask one clarifying question and stop"). Make a closed list per agent: `HALT_REASONS = [ambiguous_scope, unreadable_source, applicable_question_unanswered, ...]`. Reduces creative failure modes.

7. **Add a drift script.** A Node script that scans `.claude/agents/*.md` and verifies (a) each agent's `<output_format>` block is present, (b) each `skills:` frontmatter entry points to an existing `.claude/skills/<name>/SKILL.md`, (c) flag tokens emitted by one agent are claimed by another. Mirrors `drift-report.mjs`. Run in CI or pre-commit.

8. **Steal the bounded cross-artifact scan.** When the analyst is asked about a directory with many reports, consider an `artifacts/reports/INDEX.md` listing each report's title + key entities + finding-ID range so the analyst can find related prior work without reading every report.

9. **Adopt `disable-model-invocation: true` semantics** on Claude skills you only want slash-command-triggered (your `understanding` skill is a candidate — avoid accidental re-entry mid-conversation).

10. **Adversarial scanner pattern for analyst.** Add a sub-skill the analyst can invoke to find cross-finding contradictions in its own report draft before finalizing. Returns ranked findings; analyst integrates or downgrades. Cheaper than waiting for architect to find them.

11. **Templates with explicit `*(mandatory)*` markers and a strip-placeholders step.** Your `templates/report.md` should annotate required vs optional sections; the analyst should strip placeholder text at write time.

12. **Decision-log table for any auto-run.** If you build a multi-phase auto-run (analyst → architect → developer in one turn), copy the autopilot-log schema: timestamp, phase, event-enum, detail, outcome, rationale, artifact links. Single source of truth.

The biggest wins are **#1 (skeleton)**, **#2 (typed IDs)**, **#5 (compact runtime communication)**, and **#7 (drift script)** — low-cost, high-consistency. The full pipeline orchestration in sdd-pilot is heavier than your current model needs — your agent-tag routing through a team lead is more flexible — but the artifact-contract discipline is worth stealing wholesale.
