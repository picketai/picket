# spec-kit — Findings

## What it is (2-3 sentences)

GitHub's `spec-kit` is an open-source toolkit for Spec-Driven Development (SDD): a workflow where natural-language specifications, not code, are the source of truth. It ships a `specify` Python CLI that bootstraps a project with a fixed directory layout (`.specify/`, `specs/`), pluggable shell scripts, prompt templates, and a registry of integrations that install the same workflow into 30+ different AI coding agents (Claude Code, Copilot, Gemini, Codex, Cursor, Goose, etc.). The user-facing surface is a chain of slash commands — `/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement` — each backed by a long, deterministic prompt template and a shell script that prepares state on disk.

## Architecture at a glance

Three things are happening at three different layers:

1. **CLI / install-time (Python).** `specify init` writes prompt files into the host agent's command directory (`.claude/commands/`, `.gemini/commands/`, `.github/prompts/`, etc.). Each AI agent gets a subclass under `src/specify_cli/integrations/` declaring `key`, `config`, `registrar_config`, `context_file`. A registry (`INTEGRATION_REGISTRY`) is the single source of truth — adding an agent is one class + one import + one `_register()` call. Output format is selected per-agent: `MarkdownIntegration`, `TomlIntegration`, `YamlIntegration`, `SkillsIntegration`.

2. **Workflow / runtime (shell + prompts).** Inside the user's project, each slash command is a markdown prompt file with YAML frontmatter that points at a bash *and* PowerShell script: `scripts: { sh: scripts/bash/setup-plan.sh --json, ps: scripts/powershell/setup-plan.ps1 -Json }`. The script computes deterministic paths, emits JSON, the LLM parses the JSON, and the prompt body tells the LLM the exact sequence of file reads/writes to perform.

3. **Artifacts (filesystem).** Each "feature" lives in `specs/NNN-short-name/` with a strict shape: `spec.md`, `plan.md`, `tasks.md`, plus optional `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `checklists/*.md`. A persisted `.specify/feature.json` records the resolved feature directory so downstream commands don't have to re-derive it from branch names. A top-level `.specify/memory/constitution.md` holds immutable project principles. A 4-layer template stack — `overrides/` > `presets/` > `extensions/` > core — resolves at runtime via `resolve_template()` in `common.sh`.

## Techniques for LLM consistency

1. **Fixed slash-command vocabulary.** The whole workflow is gated behind seven named commands. Every command has a single prompt file. There is no "what should I do next?" ambiguity — the agent knows the command and the prompt knows the steps.

2. **Long, numbered execution outlines inside each prompt.** Every command prompt has an `## Outline` or `## Execution Steps` section that is literally a numbered list of 7–10 steps. Example from `specify.md`:
   ```
   1. Generate a concise short name (2-4 words) for the feature: …
   2. Branch creation (optional, via hook): …
   3. Create the spec feature directory: …
   4. Load templates/spec-template.md to understand required sections.
   5. Follow this execution flow: …
   6. Write the specification to SPEC_FILE …
   7. Specification Quality Validation: …
   8. Report completion …
   ```
   Each step has a verb, a target file, and often an explicit ERROR condition. The LLM is not asked to decide on order or scope.

3. **Templates with literal placeholders.** `spec-template.md`, `plan-template.md`, `tasks-template.md` contain placeholder tokens like `[FEATURE NAME]`, `[###-feature-name]`, `[NEEDS CLARIFICATION: ...]`, plus HTML comments that say `<!-- ACTION REQUIRED: ... -->`. The LLM's job is to fill in placeholders, not invent structure.

4. **Hard-coded checklists baked into the prompts.** `specify.md` does not just say "validate quality" — it emits the full Spec Quality Checklist verbatim into the spec directory (`checklists/requirements.md`) with items like "No [NEEDS CLARIFICATION] markers remain", "Requirements are testable and unambiguous". Then it loops up to 3 times re-validating against this exact list.

5. **A "constitution" of immutable rules.** `.specify/memory/constitution.md` (from `constitution-template.md`) holds 5–9 numbered articles the LLM must consult before planning. `analyze.md` says: *"The project constitution is non-negotiable within this analysis scope. Constitution conflicts are automatically CRITICAL."* This pins behaviour across both runs and different model families.

6. **Explicit "what NOT to do" anti-examples.** `checklist.md` carries a 40-line section with `WRONG` examples next to `CORRECT` examples ("Verify the button clicks correctly" vs "Is 'prominent display' quantified with specific sizing/positioning?"). Far more effective than abstract rules — the LLM has a concrete pattern to copy.

7. **Schema-shaped output formats.** `tasks.md` enforces `- [ ] TaskID [P?] [Story?] Description with file path`. The prompt lists six examples of correct/wrong rows. `analyze.md` requires a markdown table with fixed columns: `| ID | Category | Severity | Location(s) | Summary | Recommendation |`. The LLM must produce these literal shapes.

8. **`[NEEDS CLARIFICATION: ...]` markers as a typed escape hatch.** Instead of letting the LLM silently guess, the templates require it to emit a literal marker token. Downstream commands (`analyze`, `clarify`) grep for this token. The marker is capped: *"LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers total"*. This converts model uncertainty into observable, machine-detectable state.

## Techniques for determinism

1. **Deterministic file naming, never asked of the LLM.** The shell script `create-new-feature.sh` computes `NNN-short-slug` by: scanning `specs/`, scanning local git branches, scanning remote refs via `ls-remote`, taking `max()`, adding one, formatting with `printf "%03d"` (with `10#$N` to force base-10 — preventing octal misreads of `010`). The LLM never picks the number.

2. **State persisted to JSON, not held in chat.** `.specify/feature.json` stores `{"feature_directory": "specs/003-user-auth"}`. Every downstream command reads this rather than re-deriving from the conversation. The prompt explicitly says: *"This allows downstream commands … to locate the feature directory without relying on git branch name conventions."*

3. **Scripts emit JSON the prompt parses.** `setup-plan.sh --json` outputs `{"FEATURE_SPEC":"…", "IMPL_PLAN":"…", "SPECS_DIR":"…", "BRANCH":"…"}`. The prompt then says "parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH". The LLM never derives paths.

4. **Phase gates with explicit pass/fail.** Plans run "Pre-Implementation Gates" (Simplicity, Anti-Abstraction, Integration-First). The implementation plan template forces violations to be documented in a `Complexity Tracking` table with three columns: `| Violation | Why Needed | Simpler Alternative Rejected Because |`. The LLM cannot silently over-engineer — every deviation is logged.

5. **STRICTLY READ-ONLY operating constraints.** `analyze.md` says verbatim: *"STRICTLY READ-ONLY: Do not modify any files. Output a structured analysis report."* Then *"NEVER modify files"*, *"NEVER hallucinate missing sections"*. Capitalised invariants pinned to a section called `## Operating Constraints`.

6. **Pre-implementation checklist gate.** `implement.md` step 2 walks every file in `checklists/`, counts `- [ ]` vs `- [X]`, builds a pass/fail table, and **stops the agent** if anything is incomplete: *"STOP and ask: 'Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)'"*. The LLM cannot bypass the gate.

7. **Sequential question loop with hard caps.** `clarify.md` enforces *"Present EXACTLY ONE question at a time"* and *"Maximum of 5 total questions"*. `specify.md` caps clarifications at 3. These numeric caps prevent runaway interrogation.

8. **A 4-layer template-resolution algorithm in `common.sh`.** `resolve_template()` walks `overrides/ > presets/ (sorted by .registry priority) > extensions/ > core/` and returns the first hit. Same input → same template, every time. The PyYAML-based composition strategies (`replace`, `prepend`, `append`, `wrap` with `{CORE_TEMPLATE}` placeholder) are deterministic merges, not LLM merges.

9. **Stable finding IDs.** `analyze.md`: *"Rerunning without changes should produce consistent IDs and counts"* — IDs are prefixed by category initial (`A1` for ambiguity, `D1` for duplication) so two runs produce comparable output.

## Techniques for efficiency

1. **Progressive disclosure / scoped reads.** `analyze.md` step 2 is literally titled "Load Artifacts (Progressive Disclosure)" and lists which *sections* of each file to load — not the whole file. From `spec.md` it loads only Overview, FRs, Success Criteria, User Stories, Edge Cases. The prompt explicitly says: *"Load only the minimal necessary context from each artifact"*.

2. **Optional-doc detection.** `check-prerequisites.sh` builds an `AVAILABLE_DOCS` array that includes only files that actually exist on disk: `[[ -f "$RESEARCH" ]] && docs+=("research.md")`. The downstream prompt then reads only what's present: *"Not all projects have all documents. Generate tasks based on what's available."*

3. **Hooks skip silently when absent.** Every command checks `.specify/extensions.yml`, and if it doesn't exist: *"skip silently"*. No wasted token on hook scaffolding for the common case.

4. **`[P]` parallel markers in tasks.** The task format `[ ] T012 [P] [US1] Create User model` flags non-conflicting tasks. The implement prompt uses these directly: *"Tasks affecting the same files must run sequentially. Parallel tasks [P] can run together."* No re-derivation of dependency graph at runtime.

5. **MVP scoping.** The tasks template ends with `## Implementation Strategy` containing `### MVP First (User Story 1 Only)` — User Story 1 is always P1 and always the MVP. The agent can stop after Phase 3 and have something shippable, without reading further.

6. **File paths in every task.** `- [ ] T012 [P] [US1] Create User model in src/models/user.py`. The model never has to search for where to put a file — the path is in the instruction. Wrong-example: `WRONG: - [ ] T001 [US1] Create model (missing file path)`.

7. **One script invocation, multiple flags.** `check-prerequisites.sh` consolidates four prior scripts into one with `--json`, `--require-tasks`, `--include-tasks`, `--paths-only`. Same script powers `clarify`, `analyze`, `implement`, `tasks`.

## Techniques for cost reduction

1. **Prompt files are the only context.** Each command is one markdown file the agent loads on demand via slash command. The agent does *not* hold all seven prompts in context simultaneously — only the active one.

2. **State on disk, not in context window.** Branch numbers, feature directory, available docs all live on disk and are re-read by a script per invocation. The LLM doesn't need to remember anything between commands.

3. **References, not inlined content.** `plan.md` references `spec.md` (*"Input: Feature specification from /specs/[###-feature-name]/spec.md"*), it does not inline it. `implement.md` reads `tasks.md` once and walks tasks one at a time.

4. **Finding cap in analyze.** `analyze.md`: *"Limit to 50 findings total; aggregate remainder in overflow summary."* and *"Token-efficient output: Limit findings table to 50 rows"*. Bounded output size.

5. **Question caps everywhere.** `clarify.md` ≤5 questions, `specify.md` ≤3 clarifications, `checklist.md` ≤3 initial + 2 follow-up. Bounded interactive cost.

6. **Constitution loaded only when needed.** `plan.md` loads `/memory/constitution.md` only at planning time. Other commands skip it unless the analysis explicitly invokes constitution alignment.

7. **Per-agent format match.** Markdown agents get `$ARGUMENTS`, TOML agents get `{{args}}`, Goose YAML gets a `prompt: |` block. By matching each agent's native format, the LLM doesn't have to interpret extra structure.

## Notable patterns worth stealing

1. **Script + prompt as a single command.** Frontmatter `scripts: { sh: …, ps: … }` plus `Run {SCRIPT} and parse JSON for …`. The mechanical work (path computation, file existence checks, JSON output) is in code; the judgment work (writing the spec) is in the LLM. Clean separation.

2. **Anti-example pairs as guard rails.** The wrong/right pairs in `checklist.md` and `tasks.md` are dramatically more effective than abstract rules. AISpec already does some of this (`anti_patterns` blocks in agents) — spec-kit shows it scales to template documents too.

3. **Constitution as a single, named, immutable file.** `.specify/memory/constitution.md`. Version-controlled, semver'd, linked from every command. Compare to AISpec's `.claude/MEMORY.md` (glossary) — spec-kit's constitution is closer to a project-wide ADR-zero.

4. **Sync Impact Report.** When the constitution changes, the command prepends an HTML comment listing version change, modified principles, added/removed sections, templates needing updates (updated / pending). Built-in change-propagation log.

5. **Filename derivation via shell, not LLM.** AISpec already uses `scripts/filename.mjs` for the same purpose — spec-kit confirms this is the right pattern and extends it to branch creation and feature numbering across local + remote refs.

6. **Persisted feature-directory pointer (`.specify/feature.json`).** Avoids re-deriving from branch names. AISpec could use this pattern for plan/ADR tracking across phases.

7. **Cross-artifact consistency analyzer.** `/speckit.analyze` runs after tasks and before implement, validating that requirements, plan, and tasks are coherent. It's read-only and emits a structured table with severity. AISpec's reviewer is per-phase; a cross-artifact analyze pass before implementation is a missing slot.

8. **`[P]` markers as inline metadata.** Encoding parallelizability directly in the task line is cheap and parseable.

## Caveats / things NOT to copy

1. **Hook boilerplate is verbose.** Every single command file has an identical ~30-line "Pre-Execution Checks" and "Post-Execution Checks" block for extension hooks. This is duplicated across `specify.md`, `plan.md`, `tasks.md`, `implement.md`, `analyze.md`, `clarify.md`, `constitution.md`, `checklist.md`. Same content, eight files. A skill-like shared block would be much cheaper.

2. **Templates have over-engineered placeholder dialects.** `__SPECKIT_COMMAND_PLAN__`, `__CONTEXT_FILE__`, `{SCRIPT}`, `$ARGUMENTS`, `{{args}}`, `{{parameters}}`, `__AGENT__` — six placeholder conventions because of cross-agent compatibility. AISpec's single-agent (Claude Code) target avoids this.

3. **The 9-article "constitution" leans prescriptive.** Articles like *"Maximum 3 projects for initial implementation"* and *"Library-First Principle"* are opinions baked as immutable rules. They produce consistency but at the cost of fitting every project into the spec-kit mould. Copy the *mechanism* (named immutable principles file) but not the *content*.

4. **Sample tasks inside template files.** `tasks-template.md` contains 80 lines of T001–T028 sample tasks with a giant `<!-- IMPORTANT: SAMPLE TASKS ... DO NOT keep these -->` warning. This is brittle: LLMs do sometimes leak samples through. Better to put samples in a separate `examples/` file, the way AISpec's documenting skill does.

5. **TDD is hardwired into the workflow.** Article III, the plan template, and the tasks template all assume TDD. For analysis or non-code work, this scaffolding is dead weight. AISpec's per-agent role separation handles this better.

6. **Branch-numbering across remotes does an `ls-remote` per run.** `check_existing_branches` fetches remote refs to compute the next number. Network cost, slow on big repos. The fallback to local-only is fine, but the default is heavy.

7. **Massive `implement.md` ignore-file detection.** Step 4 of `implement.md` hardcodes 13 language patterns (Node, Python, Java, Go, Rust, Kotlin, C++, C, Swift, R, Universal, …). This belongs in a script, not a prompt — every implement run pays the token cost.

8. **"Checklists" overloaded.** Spec-kit uses "checklist" for both quality-gate validation (`requirements.md`) and pre-implement gates (`implement.md` step 2). These are different things — keep them named distinctly.

## Concrete recommendations for AISpec

Framed against AISpec's setup: analyst/consultant/architect/developer/reviewer agents, skills auto-loaded via frontmatter, artifacts under `artifacts/{reports,strategy,adr,plans}/`, project glossary at `.claude/MEMORY.md`.

1. **Add a top-level project constitution file.** Create `.claude/constitution.md` (or rename `MEMORY.md`'s decision log into one). Pin invariants every agent must respect: language conventions, banned patterns, mandatory review gates. Reference it explicitly from each agent's `<rules>` block. Version it semver-style. Steal the **Sync Impact Report** idea: when it changes, the architect emits a comment listing which ADRs and plans need re-check.

2. **Add a `/cross-check` command analogous to `/speckit.analyze`.** Today AISpec's reviewer is per-phase. Add a pre-implement step that, given a plan + its ADR + relevant analysis report, emits a *read-only* table of inconsistencies (terminology drift, requirements without tasks, ADR decisions contradicted in the plan). Use the same fixed-column table format: `| ID | Category | Severity | Location | Summary | Recommendation |`. This catches drift before code is written. Owned by reviewer or a new "analyze" mode.

3. **Persist task/plan pointers in a small JSON file.** A `.claude/active.json` like `{"plan": "artifacts/plans/auth-refactor.md", "adr": "artifacts/adr/00002-auth-middleware.md", "phase": 2}` lets every agent skip re-derivation. Today the team lead reconstructs this from conversation context — disk is cheaper.

4. **Move common boilerplate out of agent prompts into shared skills.** Spec-kit's mistake is duplicating 30 lines of hook-handling across 8 prompts. AISpec already has the `skills:` frontmatter mechanism — make sure things like "memory-write conventions", "filename derivation", "review-flag emission" live in skills and are referenced, not inlined. The `documenting` skill already does this for templates — extend the pattern.

5. **Adopt `[P]` parallel markers in plans.** AISpec's implementation plans currently sequence tasks. Adding a `[P]` marker per task — *"different files, no dependencies"* — lets the developer agent legitimately batch tool calls. Add a check in the developer's `<rules>`: "Tasks without `[P]` are sequential. Tasks with `[P]` in the same phase may be batched."

6. **Codify the `[NEEDS CLARIFICATION: ...]` marker for analyst and consultant.** AISpec already uses `[UNKNOWN]` in analyst reports. Standardise the format across agents — `[UNKNOWN: specific question]` so the team lead can grep, route, and the user can answer them in one batch. Cap at 3 per artifact (spec-kit's number) to force prioritisation.

7. **Add per-template anti-example pairs to AISpec templates.** The wrong/right examples in `tasks.md` are dramatically more effective than abstract rules. AISpec's `templates/report.md`, `templates/adr.md`, `templates/plan.md` could each gain a small wrong/right block per ambiguous section.

8. **Wrap up filename + numbering for ADRs the spec-kit way.** AISpec's `scripts/filename.mjs` already does kebab-case + numeric prefix. Steal `printf "%03d"` and the `10#$N` octal-guard pattern; add a check across local + remote git refs only if a flag is passed (don't default to network).

9. **Hard-cap interactive questioning.** The `understanding` skill is essentially `/speckit.clarify`. Adopt the exact same caps: max 5 questions, one at a time, each answerable in ≤5 words or 2–5 MCQ options, with a recommended answer included. This is the most polished part of spec-kit's UX.

10. **Do NOT adopt:** the 9-article constitution content (too prescriptive), the TDD-everywhere assumption (kills the analyst flow), the multi-agent placeholder dialect (AISpec only targets Claude Code), or hook scaffolding (no plugin ecosystem to feed). And keep sample content in separate `examples/` files, never embedded in the live template — spec-kit's `tasks-template.md` sample-leakage warning is a smell.
