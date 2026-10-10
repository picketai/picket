# claude-task-master — Findings

## What it is (2-3 sentences)

`claude-task-master` (aka Taskmaster) is an AI-driven task-management framework that decomposes a Product Requirements Document (PRD) into a graph of dependency-aware tasks, then walks an LLM through them deterministically via a CLI and MCP server. Its value proposition is "agentic development workflows": turn a `prd.md` into a `tasks.json`, expand tasks into subtasks, then drive Claude Code (or another LLM) through implementation, review, and completion using a fixed state machine and a strict prompt-template library.

## Architecture at a glance

Two layers, separated by a hard rule in `CLAUDE.md` ("ALL business logic must live in `@tm/core`"):

- **`packages/tm-core/`** — domain logic. Owns tasks, prompts, workflow state machine, AI-provider abstraction. Notable subdirs: `modules/prompts/` (prompt-template service), `modules/workflow/` (TDD state machine).
- **`apps/cli/`** and **`apps/mcp/`** — thin presentation layers. CLI exposes `task-master <verb>`; MCP exposes the same verbs as tools that Claude Code / Cursor can call directly.
- **`src/prompts/*.json`** — versioned, schema-validated prompt templates with Handlebars-style conditionals (the heart of LLM-consistency design).
- **`packages/claude-code-plugin/`** — 49 slash commands + 3 sub-agents (`task-orchestrator`, `task-executor`, `task-checker`) packaged as a Claude Code plugin.
- **`.taskmaster/`** — runtime state directory: `tasks/tasks.json`, `config.json`, `docs/prd.md`, `reports/task-complexity-report.json`.

The LLM is never asked to "do an abstract thing." It is always handed (a) a versioned prompt template, (b) a Zod-validated output schema, and (c) a specific state in the workflow that constrains what comes next.

## Techniques for LLM consistency

1. **Versioned prompt templates as data, not strings.** Every AI operation has a `.json` file in `src/prompts/`: `parse-prd.json`, `expand-task.json`, `analyze-complexity.json`, `update-subtask.json`, `update-task.json`, `add-task.json`, `research.json`. Each conforms to `src/prompts/schemas/prompt-template.schema.json`, which requires `id`, semver `version`, `description`, typed `parameters`, and `prompts.{variant}.{system,user}`. Result: prompts have unit tests, regressions are detectable, and `prompts/parse-prd.json#1.0.0` is reproducible across runs.

2. **Schema-locked output via Zod + structured generation.** `scripts/modules/task-manager/parse-prd/parse-prd-config.js`:
   ```js
   export const prdSingleTaskSchema = z.object({
     id: z.number(), title: z.string().min(1), description: z.string().min(1),
     details: z.string(), testStrategy: z.string(),
     priority: z.enum(TASK_PRIORITY_OPTIONS),
     dependencies: z.array(z.number()), status: z.string()
   });
   export const prdResponseSchema = z.object({
     tasks: z.array(prdSingleTaskSchema),
     metadata: z.union([z.object({...}), z.null()]).default(null)
   });
   ```
   The model is invoked through Vercel AI SDK's `generateObject`, which forces a JSON-shaped completion. Note the deliberate `z.union([obj, z.null()])` — the comment in source says: *"Models understand 'either return this object OR null' more reliably."* That's a hard-won determinism trick.

3. **Hard-coded checklists in the system prompt.** `expand-task.json` repeats the same field-by-field contract three times across its `default`, `research`, and `complexity-report` variants:
   > "IMPORTANT: Your response MUST be a JSON object with a 'subtasks' property... Each subtask must include ALL of the following fields: id (sequential integers starting EXACTLY from {{nextSubtaskId}})... title (5-200 characters)... description (minimum 10 characters)..."

   The redundancy is intentional — even with structured outputs, the system prompt re-asserts the schema in prose. Constraints expressed twice (schema + prose) survive better than constraints expressed once.

4. **Conditional prompt variants with explicit `condition` fields.** Rather than letting the LLM branch on context, the template selects a variant via a JavaScript expression: `"useResearch === true && !expansionPrompt"`. Variant selection is deterministic in code; the LLM only ever sees the final composed prompt.

5. **Capitalized determinism enforcers.** Templates use ALL-CAPS to lock high-risk parameters: `"id: MUST be sequential integers starting EXACTLY from {{nextSubtaskId}}. First subtask id={{nextSubtaskId}}, second id={{nextSubtaskId}}+1, etc. DO NOT use any other numbering pattern!"`. Crude but observably effective for off-by-one errors that schema validation cannot catch.

6. **Three named agents, one job each.** The Claude Code plugin defines `task-orchestrator` (planning/parallelism, `model: opus`), `task-executor` (implementation, `model: sonnet`), `task-checker` (QA gate, `model: sonnet`). Roles are narrow enough that the LLM doesn't drift into the wrong job.

7. **Output format dictated by template.** `task-checker.md` ends with a YAML block the agent must fill in: `verification_report.task_id`, `status: PASS | FAIL | PARTIAL`, `score: 1-10`, `requirements_met:`, `issues_found:`, `verdict:`. The downstream code can parse it mechanically.

## Techniques for determinism

1. **Explicit state machine for TDD workflow.** `packages/tm-core/src/modules/workflow/types.ts`:
   ```ts
   export type WorkflowPhase = 'PREFLIGHT' | 'BRANCH_SETUP' | 'SUBTASK_LOOP' | 'FINALIZE' | 'COMPLETE';
   export type TDDPhase = 'RED' | 'GREEN' | 'COMMIT';
   ```
   `WorkflowOrchestrator.defineTransitions()` declares the allowed edges as a const array; an invalid transition throws `Error('Invalid transition: ${event.type} from ${this.currentPhase}')`. The LLM cannot "skip ahead" — phase progression is gated by typed events (`RED_PHASE_COMPLETE` requires `testResults`, etc.).

2. **One verb per command, no overloads.** The slash-command set is broken into ultra-narrow verbs: `to-pending`, `to-in-progress`, `to-done`, `to-review`, `to-deferred`, `to-cancelled` — six commands instead of one `set-status --status=<x>`. The LLM picks a verb, not an argument.

3. **MCP tool tiers as deterministic context-window control.** `TASK_MASTER_TOOLS=core` exposes only 7 tools; `standard` exposes 15; `all` exposes 36. The LLM physically cannot call a tool it doesn't see. Both reduces context tokens and removes "should I have used `expand-all` here?" — if the tool isn't loaded, the decision is made for the LLM.

4. **Deterministic IDs.** Tasks are `1`, `2`, `3`; subtasks `1.1`, `1.2`; sub-subtasks `1.1.1`. New subtask IDs are passed in as `nextSubtaskId={{n}}` so the LLM never picks IDs itself. Same for the next-task pointer — it's computed by walking the dependency graph in code, then handed to the LLM.

5. **Fixed file layout.** `tasks.json`, `config.json`, `docs/prd.md`, `tasks/task-1.md`. Generated task files are derived from `tasks.json` mechanically — the LLM doesn't choose paths.

6. **"Never manually edit `tasks.json`."** Stated explicitly in `CLAUDE.md`. All mutations go through `task-master <verb>` so the data file remains schema-valid and the dependency graph stays consistent.

7. **Status as a finite enum.** `pending | in-progress | done | deferred | cancelled | blocked | review`. The `task-checker` writes `PASS | FAIL | PARTIAL`. No free-text states.

## Techniques for efficiency

1. **Tiered tool loading.** `core` (7 tools, ~5K tokens) for daily work, `standard` (15, ~10K), `all` (36, ~21K). The framework recognized that loading all 36 tools "to be safe" was the dominant waste.

2. **`ContextGatherer` with token budgeting.** `scripts/modules/utils/contextGatherer.js` uses `gpt-tokens` to count tokens before assembly and `fuse.js` for fuzzy semantic search over tasks. Context is opt-in via flags (`tasks`, `files`, `customContext`, `includeProjectTree`, `semanticQuery`, `maxSemanticResults`, `dependencyTasks`) — each operation pulls only what it needs.

3. **Codebase-analysis gated by capability.** `hasCodebaseAnalysis` is a runtime flag — true only when the executing model is Claude Code or Gemini CLI (which have native Glob/Grep/Read). The expensive "explore the repo first" instructions are conditionally injected only when the LLM can actually do that work.

4. **Pre-computed complexity report.** `analyze_project_complexity` runs once, writes `task-complexity-report.json` (per-task `expansionPrompt`, `reasoning`, `complexityScore`, `recommendedSubtasks`). Subsequent `expand-task` calls inject that pre-computed `expansionPrompt` rather than re-deriving expansion strategy each time.

5. **Parallel subtask execution.** The orchestrator agent's whole job is to find independent subtasks and fan out `task-executor` instances. The "Decision Framework" in `task-orchestrator.md` makes the parallelization rules explicit: parallelize iff no interdependencies AND sufficient context AND clear success criteria.

6. **Resume-from-state, not from history.** `WorkflowOrchestrator` persists `WorkflowState` (phase + context) and supports `resume()` — the LLM doesn't re-read prior turns to know where it is.

## Techniques for cost reduction

1. **Model-per-role assignment.** Orchestrator: `opus` (strategic). Executor: `sonnet` (high volume). Checker: `sonnet` (high volume). Expensive reasoning only happens where it matters.

2. **Three configurable model roles — `main`, `research`, `fallback`.** `task-master models --setup` lets users swap providers per role. Research can route to Perplexity (cheap, web-grounded), main to Claude, fallback to GPT-4o-mini for a cost ceiling on retries.

3. **Default to `core` tools (~5K tokens) over `all` (~21K tokens)** — README explicitly recommends this for "large projects."

4. **No PRD inlining beyond first parse.** The PRD is parsed once into `tasks.json`. Downstream operations reference task IDs, not PRD content. The LLM never re-reads the PRD on each task.

5. **File references over content embedding.** Root `CLAUDE.md` uses `@./.taskmaster/CLAUDE.md` to pull task-master context — Claude Code resolves the file inclusion lazily. Compare against putting all that content directly in the parent `CLAUDE.md`.

6. **Compact prompt-template format.** `parse-prd.json` is ~60 lines; the system prompt is ~40 lines of prose. No "you are a helpful assistant…" preamble, no markdown decoration, no example bloat — just the contract.

## Notable patterns worth stealing

1. **Prompt-as-data files with `version`, `parameters`, `prompts.{variant}`, JSON-schema-validated.** This single move turns "prompt engineering" into version-controllable, testable code.
2. **`condition: <JS expression>` for variant selection.** Determines branch in code, not in the LLM.
3. **Triple-redundant constraint expression** — Zod schema + system-prompt prose + ALL-CAPS reminder in the user prompt. Each layer catches different failure modes.
4. **Six `to-<status>` commands instead of one `set-status` with an argument.** Verb-per-target removes argument-selection variance.
5. **Tiered tool loading via env var.** Users (or agents themselves) declare a load tier; the framework computes which tools to expose.
6. **State machine with typed events that carry payloads.** `RED_PHASE_COMPLETE` *requires* `testResults`. Phase transitions cannot fire without evidence.
7. **Pre-compute strategy, hand to LLM.** Complexity analysis emits `expansionPrompt` per task. Later, `expand-task` injects that prompt rather than re-asking the LLM "how should I expand this?"
8. **The `task-checker` pattern.** A read-only QA agent with `**NEVER use Write/Edit** - you only verify, not fix`, fixed YAML output shape. Structurally separated from the implementer.

## Caveats / things NOT to copy

1. **Over-numerous slash commands (49).** Many — `smart-workflow.md`, `auto-implement-tasks.md`, `next-task.md` — are pure prose with no concrete contract. They read like marketing copy ("Zero friction from decision to implementation"). They give the LLM vague directives like "Track command sequences. Note time preferences. Remember common workflows. Adapt to your style." This is the opposite of determinism. Keep the ~15 that map 1:1 to a CLI verb; drop the "intelligent" wrappers.

2. **The `task-orchestrator` "deploy executors" loop is conceptually nice but brittle in practice.** Without a real scheduler outside the LLM, "parallelism" reduces to "the LLM tries to spawn subagents from inside a single context." Real fan-out belongs in the CLI/MCP layer, not in agent prompts.

3. **Hand-written redundancy in prompt variants.** `expand-task.json` repeats the same 8-field contract three times. Fragile — a schema bump means editing three places. If adopting this style, generate the contract block from the Zod schema rather than maintaining it by hand.

4. **`smart-workflow.md` claims it "learns from your patterns."** It does not — it is a static markdown file. Don't write capability claims into agent prompts the agent cannot honor.

5. **The legacy `scripts/modules/` JS code lives in parallel with the newer `packages/tm-core/` TS code.** Two implementations of parse-prd exist — one streaming, one not. Pick one architecture and stick to it.

6. **`auto-implement-tasks.md` is a list of bullet points telling the LLM "be smart."** No state machine, no schema, no gates. This is exactly the anti-pattern your `developer` agent should avoid.

## Concrete recommendations for AISpec

Mapping these techniques against your `analyst → consultant → architect → developer → reviewer` pipeline plus `skills:`, `artifacts/`, and `.claude/MEMORY.md`:

1. **Add a `src/prompts/`-equivalent of versioned prompt templates as JSON, schema-validated.** Your agents currently embed prose templates inside `.claude/agent-memory/<agent>/MEMORY.md` and skill files. Extract the "produce ADR", "produce charter", "produce report" instructions into versioned templates at (say) `.claude/skills/documenting/prompts/{report,adr,plan,charter,sdr}.json` with `parameters` and `prompts.default.{system,user}`. The `documenting` skill already has `templates/*.md` for output shape — pair them with a prompt template for input shape.

2. **Schema-lock the analyst report output.** Today the analyst's report is markdown-only with `[VERIFIED]/[INFERRED]/[ASSUMED]` markers in prose. Define a Zod (or JSON-schema) shape for `Finding { id, title, claim, evidence_locations[], confidence: 'VERIFIED'|'INFERRED'|'ASSUMED' }` and have the analyst emit it alongside the markdown. The reviewer/architect can then mechanically count findings, validate confidence distribution, and refuse a report that's structurally invalid — like Taskmaster refuses a malformed `tasks.json`.

3. **Adopt verb-per-target tokens for status/handoff signaling.** Your output-format block currently emits `Architect review needed: yes — see ARCHITECT REVIEW NEEDED line above. | no.` Replace with a deterministic single token: `HANDOFF: architect | consultant | none`. Same for the dual-approval gate — `VERDICT: APPROVED | REJECTED | AMEND_ADR`. Removes free-text ambiguity in the team-lead's parsing.

4. **Apply the state machine to the implementation review loop.** You already have phase gating (`<!-- status:phase-N -->`, `**Status: Complete**`, `ARCHITECT AMENDMENT NEEDED`). Codify it: `PhaseState = PLANNED | IN_PROGRESS | AWAITING_REVIEW | AWAITING_USER | COMPLETE | AMENDING` with explicit legal transitions in one place. Today the rules are spread across `CLAUDE.md` prose; one source of truth would catch contradictions.

5. **Tier your skill / agent loading.** Taskmaster's `TASK_MASTER_TOOLS=core|standard|all` is exactly the lever your prior latency audit found was over-budget. Define `AISPEC_AGENT_TIER=core|standard|all`: in `core`, the developer's `<instructions>` skip the per-batch `git status`, the reviewer skips the ADR-alignment side check, etc. One env var the user sets.

6. **Steal the `expansionPrompt` pre-compute trick for plan phases.** When the architect writes a plan with N phases, each phase currently states acceptance criteria in free prose. Add a `phase.developer_prompt` field — the architect pre-computes the exact instruction string the developer should see when it starts that phase. The developer agent then injects that field verbatim. No re-derivation per phase.

7. **Add a `task-checker` analogue: a `validator` skill.** Your `reviewer` agent does this in spirit, but adopt task-checker's explicit constraints: read-only tool allowlist (`**NEVER use Write/Edit**`), fixed YAML output shape, three-level verdict (`PASS | PARTIAL | FAIL`). Right now `reviewer` can in principle do anything; constraining makes its output parseable.

8. **Use `condition` expressions for in-skill branching.** Your `documenting` skill has audience-detection rules in prose ("Contains 'stakeholder' → stakeholder"). Encode those as `condition` strings on prompt variants — the same pattern Taskmaster uses for `useResearch === true && !expansionPrompt`. Pure-code branch selection, deterministic.

9. **Don't copy the slash-command sprawl.** Keep your skills focused. The `smart-workflow`/`auto-implement-tasks` style of "be intelligent here" markdown is exactly what your `<anti_patterns>` blocks already warn against — Taskmaster validates that warning.

10. **Memory file shape: convert `MEMORY.md` indexes into a prompt-parameter set.** When loading agent memory, your agents currently inhale the whole `MEMORY.md` index plus referenced files. A more structured memory file with explicit `parameters` (e.g. `user_role: senior-engineer`, `default_audience: developer`, `preferred_artifact_depth: deep`) the agent reads as a structured object and injects into its own prompt template parameters would cut re-parsing prose every turn.
