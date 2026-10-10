# Cross-Framework Synthesis — What Makes Agent/Spec Frameworks Work

Distilled from individual analyses of: agent-os, bmad-method, claude-task-master, get-shit-done (GSD), mattpocock/skills, OpenSpec, sdd-pilot, spec-kit, shotgun, SuperClaude_Framework.

The 10 frameworks differ wildly in scope, language, and topology, yet **the same ~12 patterns keep recurring**. They are not coincidental — they are the load-bearing techniques that make an LLM behave the same way twice. This document organises them along the four axes the user cares about: **consistency, determinism, efficiency, cost**. A final section maps the highest-leverage moves onto AISpec.

---

## The core insight

Every successful framework here works the same way at the root:

> **Push variance out of the LLM and into code, schema, or filesystem state.**

Each technique is a specific instance of that move:

- A template pushes structural variance into a markdown skeleton.
- A schema pushes output variance into a Zod/Pydantic check.
- A CLI script pushes path/numbering variance into shell.
- A status file pushes "what state are we in?" variance into the filesystem.
- A typed ID system pushes cross-artifact reference variance into a closed vocabulary.
- Tool gating pushes "should I use this tool now?" variance into the install layer.

LLM creativity is treated as a liability everywhere it is not strictly needed. The frameworks that ship reliable behaviour are the ones that have ruthlessly carved variance out at every layer where they can.

---

## Pattern 1 — Fixed agent/skill section skeleton

**Who does it:** sdd-pilot (5-section: Role/Task/Inputs/Execution Rules/Output Format), SuperClaude (6-section: Triggers/Mindset/Focus/Actions/Outputs/Boundaries), GSD (XML `<role>`/`<execution_flow>`/`<critical_rules>`/`<success_criteria>`), bmad-method (persona+identity+communication_style+principles).

**Why it works:** Once structure is fixed, the LLM's only freedom is content. Two runs with the same input land in the same shape. Reviewers and downstream agents can parse the output mechanically.

**AISpec gap:** AISpec agents are similar in shape but the skeleton is not formally enforced. Lock it in: `<role_identity>` → `<operating_constraints>` → `<deliverables>` → `<decision_authority>` → `<instructions>` → `<rules>` → `<interaction_model>` → `<completion_criteria>` → `<output_format>`. Audit every agent file against this list and reject deviations.

---

## Pattern 2 — Description + "Use when" trigger language

**Who does it:** mattpocock/skills (`description: <capability>. Use when <triggers>.`), spec-kit (slash command per-prompt frontmatter), Claude-Code-native skill convention generally.

**Why it works:** The `description` is often the *only* thing in the system prompt at routing time. A skill that wins routing wins the work. Without an explicit trigger list the model guesses, with variance.

**AISpec gap:** Audit `documenting`, `understanding`, `verify`, `simplify`, `run`, `init`, `review`, `security-review` against the convention. Cap at 1024 chars. Add explicit trigger sentence to every one.

---

## Pattern 3 — Templates with explicit placeholders + strip step

**Who does it:** spec-kit (`[FEATURE NAME]`, `[NEEDS CLARIFICATION: ...]`, `<!-- ACTION REQUIRED -->`), sdd-pilot (`[REPLACE: ...]` markers with "strip placeholders" final step), OpenSpec (template per artifact owned by framework), bmad-method (per-skill `template.md`).

**Why it works:** LLMs fill slots reliably; they invent structure unreliably. A literal `[REPLACE: ...]` placeholder + a hard "before final write, strip all placeholders" step pushes the variance from "what sections should this have" to "what content fills the slot".

**AISpec gap:** `templates/report.md`, `templates/adr.md`, `templates/plan.md`, etc. already exist. Add `*(mandatory)*` markers to required sections and a final-step instruction: "Strip all HTML comments, `[REPLACE: ...]` markers, and unfilled placeholders before writing."

---

## Pattern 4 — Anti-example pairs co-located with rules

**Who does it:** sdd-pilot (Bad/Good fenced blocks adjacent to each rule), spec-kit (`WRONG: ... CORRECT: ...` pairs in `checklist.md` and `tasks.md`), agent-os (Good/Bad standard-file examples), shotgun (`<BAD_EXAMPLE>`/`<GOOD_EXAMPLE>` XML tags), bmad-method (TDD horizontal-slice ASCII diagram), SuperClaude (`❌ "Let's just try again" / ✅ "Got an error. Investigating ..."`).

**Why it works:** "Don't do X" is abstract. A labelled wrong example next to the right example is concrete pattern-matching the LLM can imitate. Co-location with the rule (not in a separate anti-patterns appendix) is critical — the contrast must be visible at the moment the rule fires.

**AISpec gap:** Anti-patterns currently sit in a separate `<anti_patterns>` block at the end of agents. Co-locate them with the rule they violate. For every template, add at least one labelled good/bad pair per ambiguous section.

---

## Pattern 5 — Typed cross-artifact ID vocabulary

**Who does it:** sdd-pilot (`T###`, `FR-###`, `TR-###`, `SC-###`, `ADR-NNNN`, `STF-###`, `[BUG:severity]` with severity table), spec-kit (`A1` ambiguity, `D1` duplication, stable across reruns), claude-task-master (tasks `1.1.2`, status enum, `nextSubtaskId` injected), OpenSpec (closed-vocabulary delta operations `ADDED/MODIFIED/REMOVED/RENAMED`).

**Why it works:** A typed ID system is a schema across markdown files. Agents quote IDs (`"per R-014"`) instead of paraphrasing prose, which kills cross-paraphrase drift (GSD documents that paraphrasing rules caused 5-of-8 agents to violate them). Renumbering becomes mechanical.

**AISpec gap:** Add `R-###` (analyst report findings), `D-###` (decisions in an ADR), `T-###` (plan tasks), `RISK-###`, `CHK###` (checklist items). Severity table for "changing an ID without approval → CRITICAL violation." Architect/developer/reviewer cite IDs in every cross-reference.

---

## Pattern 6 — Filesystem-as-state-machine (marker files + status YAML)

**Who does it:** OpenSpec (filesystem IS state; `BLOCKED/READY/DONE` derived purely from file existence), sdd-pilot (dotfile markers `.completed`, `.qc-passed`, `.implement-state`), bmad-method (`sprint-status.yaml` as ground truth, with explicit precondition check), claude-task-master (status enum `pending/in-progress/done/...`, `tasks.json` as canonical state), GSD (state mutated only through `gsd-sdk query state.*` verbs).

**Why it works:** Once "what state are we in" is a function of disk, not chat history, two runs in two clones produce identical decisions. The LLM cannot "think" the state is something else. Marker files are atomic, grep-able, survive branch switches and crashes.

**AISpec gap:** Today phase completion is encoded as `**Status: Complete**` after a `<!-- status:phase-N -->` anchor inside the plan file body. Add marker files: `artifacts/plans/<plan>.phase-N.done`, `.phase-N.reviewed`, `.amending`. Replace prose-grepping with file-stat. Atomic mutation; reviewer/architect/developer never race-rewrite the same line.

---

## Pattern 7 — Hard numeric thresholds instead of adjectives

**Who does it:** SuperClaude (`≥90%/70-89%/<70%` confidence, `>75%/>85%` context zones, `200/1000/2500` token budget, 5-hop max), shotgun (40-line export cap, web-search count thresholds), OpenSpec (`MAX_DELTAS_PER_CHANGE = 10`, `50KB` context cap), GSD (`5 consecutive reads → analysis paralysis halt`), spec-kit (≤5 questions, ≤3 clarifications, ≤50 findings), bmad (3-failures-then-halt).

**Why it works:** "Be concise" varies wildly between runs. "Output ≤40 lines or you added too much" doesn't. Numbers are checkable; adjectives aren't. Hard ceilings prevent runaway interrogation, runaway research, and runaway file reads.

**AISpec gap:** Already partially adopted (BFS cap at 60 reads in analyst). Extend system-wide: cap clarifying questions at 5/agent/turn; cap ADR length; cap consultant charter to N pages; cap reviewer findings to N + overflow summary; cap analyst report findings; cap MEMORY.md by bytes (formalise from "200 lines after truncation").

---

## Pattern 8 — Lazy/progressive disclosure (skill body > description; references one level deep)

**Who does it:** mattpocock/skills ("description is the only thing your agent sees", `SKILL.md < 100 lines`, "references one level deep" rule), bmad-method (one step-file at a time, "NEVER load multiple step files simultaneously"), GSD (`@file:` indirection, mode-gated reference loading), spec-kit ("Load Artifacts (Progressive Disclosure)" with section-level reads), agent-os (index-first lookup, lazy body reads), claude-task-master (`ContextGatherer` opt-in flags), shotgun (`preload_files` parameter, markdown TOC instead of full body).

**Why it works:** Static system-prompt tokens are paid on every turn. Lazily-fetched content is paid only when the work actually fires. Capping reference depth prevents recursive-load attacks. The framework that loads least wins on cost.

**AISpec gap:** AISpec's `documenting` skill already loads templates lazily — good. Extend: every long skill body should split into `steps/step-NN.md` with explicit next-step hand-offs. Anti-patterns, examples, edge-case rules should live in `references/*.md` loaded only when the relevant flag fires. Cap reference depth at one hop.

---

## Pattern 9 — Index files (cheap retrieval layer before expensive body reads)

**Who does it:** agent-os (`standards/index.yml` with one-line descriptions, ranked alphabetically), bmad-method (`bmad-help` CSV manifest per skill), GSD (`gsd-sdk query history-digest` then targeted SUMMARY reads), spec-kit (`AVAILABLE_DOCS` array from `check-prerequisites.sh`).

**Why it works:** Match against a small index (cheap), then read the one or two relevant bodies (expensive only when needed). Replaces full-directory globs. Same cost-saving move as a database index vs a table scan.

**AISpec gap:** No index files today. Add `artifacts/adr/index.yml` (slug + decision + status per ADR), `artifacts/plans/index.yml`, `artifacts/reports/index.yml`, `.claude/skills/index.csv`. Every consumer agent reads index first, fetches body only on match. Architect maintains ADR/plan indexes; analyst maintains report index; meta-skill maintains skill index.

---

## Pattern 10 — Tool gating per phase/mode (state machine via tool availability)

**Who does it:** claude-task-master (`TASK_MASTER_TOOLS=core|standard|all` — LLM physically cannot call a tool that isn't loaded), shotgun (Planning mode physically removes `delegate_to_*` tools), SuperClaude (phase-based MCP loading: discovery loads sequential+context7; design loads sequential+magic; etc.), sdd-pilot (per-skill `allowed-tools:` whitelist), bmad-method (`tools:` allowlist per agent).

**Why it works:** Prompt-level "don't use Bash here" is a request the LLM may ignore. Removing Bash from the tool list is a constraint the LLM cannot violate. Determinism through availability, not through pleading.

**AISpec gap:** Today every agent has access to similar tool sets. Tighten: analyst gets Read/Grep/Glob/WebFetch only (no Bash, no Edit/Write to repo files outside `artifacts/reports/`). Consultant similar. Reviewer is read-only — `**NEVER use Write/Edit**` (claude-task-master `task-checker` pattern). Developer in a "Planning" mode gets no Edit/Write until the plan is approved.

---

## Pattern 11 — Verb-per-target instead of one verb with an argument

**Who does it:** claude-task-master (`to-pending`, `to-in-progress`, `to-done`, `to-review`, `to-deferred`, `to-cancelled` — six commands instead of one `set-status --status=<x>`), spec-kit (per-phase slash commands `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`).

**Why it works:** The LLM picks a verb, not an argument. Argument-selection has variance ("should this go to `review` or `deferred`?"); verb-selection from a closed set is a routing decision the trigger language can determine. Easier to read in logs.

**AISpec gap:** Possibly over-engineered for AISpec's smaller surface. But for status-mutating actions (mark phase complete, request architect review, escalate to user) consider distinct verbs/tokens rather than one `update --status=<x>` style.

---

## Pattern 12 — Prompt caching (cache-friendly ordering, named cache windows)

**Who does it:** shotgun (`anthropic_cache_tool_definitions="1h"`, `anthropic_cache_instructions="1h"`, distinct settings for router vs sub-agent), OpenSpec (sorted JSON lists for byte-identical outputs across runs), GSD (orchestrator-vs-subagent context split: "~15% orchestrator, 100% fresh per subagent").

**Why it works:** Anthropic's prompt cache rewards byte-identical prefixes. Putting static content first (system prompt, tool definitions, common skills) and dynamic content last (per-turn state, user query) maximises cache hits. Distinct cache lifetimes for long-lived (router, 1h) vs short-lived (subagent, 5m) prompts.

**AISpec gap:** AISpec already loads skills front-of-prompt — that's the right shape for caching. Make it explicit: a documented "cache-friendly ordering" rule in every agent file. Per-turn dynamic state (active plan, current phase, MEMORY.md TOC) should be appended *after* skills/instructions, never interleaved.

---

## Cross-cutting techniques worth singling out

### A. The constitution / project-context file

**spec-kit** has `.specify/memory/constitution.md` (semver-versioned, with Sync Impact Report on change). **OpenSpec** has `openspec/config.yaml`'s `context:` block (50KB cap, injected into every artifact's instruction). **bmad-method** has `persistent_facts` arrays. **mattpocock** has `CONTEXT.md` (glossary-only).

These are all the same idea: **a single named, versioned, capped file that gets injected into every agent's prompt for project-wide invariants**. Saves repeating "we use Postgres, Node 20, Windows-friendly paths" across every agent file.

**AISpec move:** Promote `.claude/MEMORY.md` to a clearer dual role — glossary + decisions log — and add a sibling `.claude/constants.md` (or merge cleanly) for project-wide constants. Cap by bytes, semver-version, "Sync Impact Report" comment on every change listing which ADRs/plans/agents need re-check.

### B. The cross-artifact analyzer / second-pass reviewer

**spec-kit** has `/speckit.analyze` (read-only, fixed-column markdown table, severity column). **bmad-method** has the parallel three-reviewer pattern (Blind Hunter / Edge Case Hunter / Acceptance Auditor). **sdd-pilot** has the adversarial-scanner sub-agent with ranked `STF-###` findings.

The shared idea: **a read-only review pass between artifacts that catches drift before it ships.** Drift here means terminology mismatches between ADR and plan, requirements without tasks, ADR decisions contradicted in the plan, etc.

**AISpec move:** Add a `/cross-check` skill or a cross-artifact pass in the reviewer's pre-implementation step. Fixed-column output: `| ID | Category | Severity | Location | Summary | Recommendation |`. Run before the developer starts a phase, not after.

### C. Pre-execution confidence check (cheap pre-flight)

**SuperClaude**'s `confidence-check` skill is the cleanest example: 5 weighted checks → 0.0–1.0 score → three branches (proceed / ask / stop). 100-200 tokens of overhead prevents 5,000-50,000-token wrong-direction execution.

**AISpec move:** Add a `confidence-check` skill, scoped to AISpec's pipeline. 5 checks: (a) does the ADR/plan exist?, (b) has the reviewer signed off on the previous phase?, (c) are MEMORY.md terms current?, (d) is the request scoped within the agent's `<decision_authority>`?, (e) are all input artifacts in their expected paths? Auto-load via the `skills:` frontmatter on architect, developer, reviewer.

### D. Goal-backward must_haves carried as YAML frontmatter

**GSD**'s `must_haves: {truths, artifacts, key_links}` is carried from planner → executor → verifier as plan-file frontmatter. The verifier doesn't re-derive what to check; it consumes the structured contract.

**AISpec move:** Add `must_haves` (or `acceptance_criteria`) as a structured YAML field in every plan file. The architect writes it; the developer reads it as the implementation contract; the reviewer mechanically checks each entry against the diff. Mechanical verification replaces narrative judgement.

### E. LLM-as-judge with explicit rubrics for periodic eval

**shotgun** runs `claude-opus-4-6` at T=0.2 with structured `AllDimensionsScoreOutput`, per-dimension Likert rubrics, single-call multi-dimension scoring. **bmad-method**'s adversarial second-pass checklist is the same idea via prose. **shotgun** also has Pydantic-modelled test cases (`evals/datasets/router_agent/*.py`) with `disallowed_tools`/`min_clarifying_questions` deterministic checks alongside the LLM judge.

**AISpec move:** Add a tiny eval harness (Node, optional weekly run) with one case per agent. Each case has a deterministic check (`expected_flag_tokens`, `disallowed_paths`) + a freeform rubric scored by Opus at T=0.2. Detects regressions in agent behaviour when skills/agents are edited.

---

## What NOT to copy (consensus anti-patterns across the 10 frameworks)

1. **Slash-command sprawl.** claude-task-master (49 commands, many vague prose like "Track command sequences. Note time preferences"), SuperClaude (30 commands, duplicates of agents and modes). Pick one surface per behaviour.
2. **Wrapper duplication across tool families.** sdd-pilot ships ~96 thin wrappers (6 tools × 16 commands). If you're single-target (Claude Code), don't pay that tax.
3. **All-caps shouting + emoji.** bmad-method, shotgun, SuperClaude all rely on `🚨 CRITICAL!! NEVER!! ALWAYS!!`. Token bloat, brittle when exceptions arise.
4. **Marketing prose in operational files.** SuperClaude commands open with sales copy. Wastes tokens on every load.
5. **Mega-prompt files.** shotgun's `router.j2` is ~800 lines. bmad-method SKILL.md files are 400-500 lines. One bad edit breaks behaviour silently. Prefer step-files / partials.
6. **Theatrical fake function calls.** SuperClaude's `think_about_task_adherence()` reads like an MCP method but is prose only. If you write it, mean it.
7. **Auto-generated empty templates.** SuperClaude's mistake-template files end up with `## Root Cause → Not analyzed`. Don't auto-create files you can't auto-fill — they pollute the knowledge base.
8. **MCP-heavy infrastructure for headline efficiency numbers.** SuperClaude's "98% token reduction" needs Docker + 8 MCP servers + an MCP gateway. Core patterns survive without them.
9. **Glossary + decision log conflated** (or *de*-conflated badly). mattpocock keeps `CONTEXT.md` glossary-only; bmad doesn't have one; AISpec mixes them. Pick a model and stick to it.
10. **Branch-name-driven feature directories.** sdd-pilot, spec-kit both derive `specs/NNN-<slug>/` from git branches. Squash-rebase teams who reuse branches break this.
11. **No structural validation on writer outputs.** shotgun, bmad, sdd-pilot all use prompt-only rules ("Every stage MUST have a 'Depends on:' field") with no parser rejecting bad output. Add Zod / regex validators where structure matters.
12. **Branch-on-LLM-judgement when code can do it.** spec-kit hardcodes 13 language patterns in `implement.md`'s ignore-file detection — should be a script. Push every check that *can* be in code, into code.

---

## Prioritised recommendations for AISpec

Ordered by leverage (high impact, low effort first). All of these are additive — none require gutting existing structure.

### Tier 1 — High leverage, low cost (do these first)

1. **Tighten skill `description:` fields to `<capability>. Use when <triggers>.`** ([Pattern 2], from mattpocock). Audit every `.claude/skills/*/SKILL.md`. <1024 chars each. 1 hour.
2. **Co-locate anti-examples with the rules they illustrate** ([Pattern 4]). Move content out of trailing `<anti_patterns>` blocks into wrong/right pairs adjacent to each rule. 2-4 hours.
3. **Add hard numeric thresholds** ([Pattern 7]) to: clarifying questions per turn (≤5), reviewer findings (≤50 + overflow), ADR length cap, MEMORY.md byte cap. 1 hour.
4. **Add a `confidence-check` skill** ([Cross-cutting C], from SuperClaude). 5 weighted checks scoped to AISpec's pipeline. Auto-load on architect/developer/reviewer. 2-3 hours, biggest cost saver on wrong-direction phases.
5. **Add index files for ADRs, plans, reports, skills** ([Pattern 9]). `index.yml` with one-line description per entry. Architect/analyst maintains. Downstream agents read index first. 2-3 hours plus one-time backfill.

### Tier 2 — Medium leverage, moderate effort

6. **Lock agent prompt skeleton formally** ([Pattern 1]). Every agent file uses the same nine sections in the same order. Add a CI/lint script to refuse drift. 3-4 hours.
7. **Add marker files for phase state** ([Pattern 6]). `artifacts/plans/<plan>.phase-N.done` and `.reviewed`. Update developer + reviewer to write them; team lead reads them. 3-5 hours.
8. **Adopt typed cross-artifact IDs** ([Pattern 5]). `R-###`/`D-###`/`T-###`/`RISK-###`/`CHK###` with severity table. 4-6 hours plus convention adoption.
9. **Tool gating per agent** ([Pattern 10]). Reviewer read-only (no Edit/Write). Analyst no Bash. Developer's Planning mode no Edit/Write. 2-3 hours.
10. **Cross-artifact `/cross-check` pass before implementation** ([Cross-cutting B]). Read-only review, fixed-column output. 1 day.

### Tier 3 — High leverage, larger investment

11. **Project constitution / context file** ([Cross-cutting A]). Promote MEMORY.md to glossary+decisions only; add `.claude/constants.md` for invariants. Sync Impact Report mechanism on change. 1-2 days plus content migration.
12. **`must_haves` frontmatter contract in plans** ([Cross-cutting D]). Architect emits structured YAML; reviewer mechanically validates. 1 day.
13. **Versioned prompt-template JSON files** (from claude-task-master). `.claude/skills/documenting/prompts/{report,adr,plan,charter,sdr}.json` with `version`, `parameters`, `prompts.default.{system,user}`, schema-validated. 1-2 days.
14. **Per-agent prompt caching settings** ([Pattern 12], from shotgun). Document cache-friendly ordering rule. 2-3 hours.
15. **Tiny eval harness** ([Cross-cutting E], from shotgun). One Pydantic-style test case per agent + an LLM judge weekly. 2-3 days.

### Tier 4 — Selective experiments

16. **Parallel three-layer reviewer** (Blind Hunter / Edge Case Hunter / ADR-Compliance Auditor), from bmad-method. The Blind Hunter with no project context is the killer move — surfaces issues context-laden reviewers rationalise away. 1-2 days.
17. **PDCA-style phase decomposition inside plan files** (from SuperClaude). `## Plan / ## Do / ## Check / ## Act` per phase, with three writers. Trial on a single plan first.
18. **`prototype` skill** (from mattpocock). Adds a "throwaway from day one" mode for design exploration. 2-3 hours.
19. **Token-counting script + per-agent budget tracking** (from shotgun's `scripts/count_tokens.py`). 2-3 hours.

---

## Quick-reference cheat sheet

If you remember nothing else from this analysis, remember these moves — they appear in 5+ of the 10 frameworks:

| Move | Why | Frameworks that do it |
|---|---|---|
| Fixed agent section skeleton | Consistency | sdd-pilot, SuperClaude, GSD, bmad, shotgun |
| Templates with placeholder + strip step | Consistency | spec-kit, sdd-pilot, OpenSpec, bmad |
| Anti-example pairs co-located with rules | Consistency | spec-kit, sdd-pilot, shotgun, agent-os, bmad |
| Typed cross-artifact IDs | Determinism | sdd-pilot, spec-kit, claude-task-master, OpenSpec |
| Marker files / status YAML as state machine | Determinism | OpenSpec, sdd-pilot, bmad, claude-task-master, GSD |
| Hard numeric thresholds (not adjectives) | Determinism | SuperClaude, shotgun, OpenSpec, GSD, spec-kit, bmad |
| Lazy/progressive disclosure of references | Efficiency | mattpocock, bmad, GSD, spec-kit, agent-os, claude-task-master, shotgun |
| Index files / cheap-retrieval layer | Efficiency | agent-os, bmad, GSD, spec-kit |
| Tool gating per phase/mode | Efficiency | claude-task-master, shotgun, SuperClaude, sdd-pilot, bmad |
| Prompt caching with cache-friendly ordering | Cost | shotgun, OpenSpec, GSD |
| Pre-execution confidence check | Cost | SuperClaude |
| Constitution / project-context file | Cross-cutting | spec-kit, OpenSpec, bmad, mattpocock |

The biggest single takeaway: **AISpec is already past 6 of these 10 frameworks on multi-agent architecture and review gating**. Where it lags is in the small, machine-checkable disciplines around artifact contracts — typed IDs, marker files, index files, hard numeric caps, schema-validated outputs, prompt caching. Those are the highest-leverage upgrades to invest in next.
