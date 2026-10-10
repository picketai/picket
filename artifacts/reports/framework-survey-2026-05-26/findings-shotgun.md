# shotgun — Findings

## What it is (2-3 sentences)

Shotgun is a Python TUI/CLI ("spec-driven development" tool) that drives a five-stage LLM pipeline — Research → Specify → Plan → Tasks → Export — to produce a `.shotgun/` folder of markdown specs (`research.md`, `specification.md`, `plan.md`, `tasks.md`, `CLAUDE.md`/`Agents.md`) that downstream coding agents (Claude Code, Cursor, Codex) actually execute. Internally it's a Router agent plus five named sub-agents built on `pydantic_ai`, with Jinja2-templated system prompts, a Kuzu code-graph index, and a deterministic+LLM-judge eval harness in `evals/`.

## Architecture at a glance

```
src/shotgun/
  agents/
    router/          # Orchestrator — only agent the user talks to
    research.py      # Sub-agent factories — each is a thin wrapper over create_base_agent()
    specify.py       #   with a different prompt template + tool set
    plan.py
    tasks.py
    export.py
    common.py        # build_agent_system_prompt(), system-status injection, cache settings
    models.py        # AgentResponse — structured output for EVERY agent
    config/models.py # ANTHROPIC_ROUTER_CACHE_SETTINGS, ANTHROPIC_SUB_AGENT_CACHE_SETTINGS
  prompts/
    loader.py        # Jinja2 PromptLoader (singleton)
    agents/
      router.j2      # Per-agent system-prompt templates (one per sub-agent)
      research.j2 / specify.j2 / plan.j2 / tasks.j2 / export.j2
      partials/      # Shared snippets: common_agent_system_prompt, interactive_mode,
                     #   router_delegation_mode, codebase_understanding, content_formatting
      state/
        system_state.j2                       # Per-turn dynamic state injection
        codebase/codebase_graphs_available.j2
    history/         # Conversation summarisation/compaction prompts
evals/
  datasets/router_agent/*.py    # Test cases as Pydantic models (not YAML)
  evaluators/deterministic/     # Rule-based pass/fail checks
  judges/                       # LLM-as-judge (Claude Opus, T=0.2)
  suites/router_suites.py
  models.py                     # ShotgunTestCase, ExpectedAgentOutput, RouterJudgeResult
  runner.py
```

Every artifact (`research.md`, `specification.md`, ...) has a **single owner agent** with exclusive write access. The Router is read-only and orchestrates via `delegate_to_<agent>` tools that internally write the files.

## Techniques for LLM consistency

1. **Structured output, never free text.** Every agent returns `AgentResponse` (a Pydantic model) with fields `response: str`, `clarifying_questions: list[str] | None`, `file_requests: list[str] | None`, `choices: list[ResponseChoice] | None`. The TUI parses these fields directly — there is no "parse the LLM's prose to find questions". This eliminates a whole class of brittleness. See `src\shotgun\agents\models.py` (`AgentResponse` at line 114).

2. **Single owner per artifact.** Each `.j2` prompt declares "this is the ONLY file you can write to" (e.g. plan.j2: `Your file is plan.md - this is the ONLY file you can write to`). The Router's delegation rule reinforces: `delegate_to_specification ONLY for changes to the specification.md file...`. Multi-file requests must be split across multiple delegations.

3. **Document boundary rules in shared partial.** `common_agent_system_prompt.j2` defines `<DOCUMENT_BOUNDARIES>` listing what goes in each `.md` and prohibits implementation plans in `specification.md`. Every sub-agent includes this partial, so all agents share the same boundary vocabulary.

4. **Negative examples in prompts.** Nearly every rule has `<BAD_EXAMPLE>` and `<GOOD_EXAMPLE>` tags. The router prompt's "CRITICAL_RULE" for vague vs clear requests is reinforced with three BAD and three GOOD examples — a few-shot pattern to imitate, not just an abstract rule.

5. **Hard checklists with priority markers.** Tags like `priority="CRITICAL"` and `priority="HIGHEST"`, plus `<STOP_AND_CHECK>` blocks and `<PRE_RESPONSE_CHECKLIST>`. From `router.j2`:
   ```
   <STOP_AND_CHECK priority="CRITICAL">
   BEFORE responding, scan the user's message for file paths.
   IF USER MENTIONS A FILE PATH WITH THESE EXTENSIONS:
   -> Set file_requests in your response. IMMEDIATELY. No exceptions.
   ```

6. **LLM-as-judge with explicit rubrics.** `evals/judges/router_quality_judge.py` runs `claude-opus-4-6` at `temperature=0.2` with structured `AllDimensionsScoreOutput` and per-dimension 1-5 Likert rubrics. Each rubric has explicit text for what 1/3/5 look like.

## Techniques for determinism

1. **Two-mode state machine (Planning vs Drafting).** The Router prompt has separate `{% if router_mode == 'planning' %}` and `{% if router_mode == 'drafting' %}` blocks. Planning mode *physically removes* delegation tools (`You do not have: delegate_to_research, delegate_to_specification...`) — determinism by tool gating, not by prompting.

2. **Mutually exclusive actions per turn.** Strongest example:
   ```
   ASKING CLARIFYING QUESTIONS AND CALLING create_plan ARE MUTUALLY EXCLUSIVE.
   YOU CANNOT DO BOTH IN THE SAME TURN. PICK ONE.
   ```
   Followed by BAD_EXAMPLE "CRITICAL VIOLATION — doing both at once". Forced one-action-per-turn discipline.

3. **Fixed pipeline order.** `<PIPELINE_ORDER>` enumerates 1. Research, 2. Specify, 3. Plan, 4. Tasks, 5. Export with a BAD_EXAMPLE for skipping research.

4. **Banned vocabulary.** Plan agent: `If you use ANY time references (Week, Day, Month, Hour, Quarter, Year), your plan is INVALID and will be rejected.` Followed by `## FINAL VALIDATION BEFORE WRITING` with a checklist. The rule is restated at the top, middle, and bottom — pure redundancy by design.

5. **Mandatory schema fields per stage.** Plan agent: `Every stage MUST have a "Depends on:" field`. Tasks agent: `All tasks MUST use checkbox format`. Output isn't just markdown — it's a strict schema rendered as markdown so downstream agents can parse it.

6. **Fixed output template for export.** Export prompt contains the template verbatim and says "Write this EXACTLY. Replace `[bracketed placeholders]` with the actual values. Do not add anything else." Plus "The output must be UNDER 40 LINES." Determinism by template + hard length cap.

7. **In-memory plan, not file-based.** `ExecutionPlan` is stored in `RouterDeps` and re-injected into every turn via `system_state.j2`. Plan state cannot drift between LLM and file because there is no file — only one source of truth held in code.

8. **Hidden vs shown step fields.** `ExecutionStep` (in `src/shotgun/agents/router/models.py`) has `title` ("SHOWN to user") and `objective` ("HIDDEN from user, for sub-agent"). Two channels for two audiences from one schema.

9. **Deterministic evaluators alongside LLM judge.** `evals/evaluators/deterministic/router_evaluators.py` has rule-based HARD failures (`DisallowedToolUsageEvaluator`, `ExecutionFailureEvaluator`) that don't need an LLM at all.

## Techniques for efficiency

1. **`preload_files` on delegations.** Router's delegation tool accepts a `preload_files` parameter that injects existing `.shotgun/` content into the sub-agent's first prompt: *"Use preload_files to give the sub-agent instant access to existing .shotgun/ artifact files, saving round-trips that would otherwise be spent on read_file calls. ... Specification agent: preload_files=['research.md']"* The sub-agent skips an entire read tool call.

2. **System-state injection every turn.** `add_system_status_message()` (in `agents/common.py`) builds a single `system_state.j2` block per turn with: existing files, markdown TOC of the agent's own file, current datetime, execution plan, web-search count, pending-approval state. Appended as `SystemStatusPrompt`. Fresh context without re-uploading static instructions.

3. **Markdown TOC instead of full file.** `extract_markdown_toc(deps.agent_mode)` returns just the table of contents of the agent's own `.md` file — reminds the agent what already exists without spending tokens to re-read it.

4. **Targeted markdown tools over full rewrites.** Each writer agent gets `replace_markdown_section`, `insert_markdown_section`, `remove_markdown_section`. The prompt explicitly says: `FAILURE: Rewriting the entire file when user asked to update one section.`

5. **Codebase graph (Kuzu) instead of grep.** From `codebase_understanding.j2`: `IMPORTANT: Graph queries are cheap, file reads are expensive. Always prefer graph queries.` Tree-sitter builds a graph; the agent queries it via `query_graph` (natural language) and `retrieve_code` (qualified name).

6. **Web-search budget enforcement.** `system_state.j2` injects per-turn warnings:
   ```
   {% if web_search_count >= web_search_stop_threshold %}
   STOP: You have done {{ web_search_count }} searches. This is EXCESSIVE.
   ```
   Threshold checked deterministically; LLM is told to stop by the system prompt itself.

7. **Conversation compaction.** `prompts/history/chunk_summarization.j2` summarises old conversation chunks while preserving file paths, function names, decisions verbatim.

8. **`for_sub_agent=True` flag.** `create_research_agent(for_sub_agent=False)` argument lets the system pick a cheaper model when running as a sub-agent vs standalone.

## Techniques for cost reduction

1. **Provider-side prompt caching.** Two settings objects in `agents/config/models.py`:
   ```python
   ANTHROPIC_ROUTER_CACHE_SETTINGS = AnthropicModelSettings(
       anthropic_cache_tool_definitions="1h",
       anthropic_cache_instructions="1h",
       anthropic_cache_messages="1h",
   )
   ANTHROPIC_SUB_AGENT_CACHE_SETTINGS = AnthropicModelSettings(
       anthropic_cache_tool_definitions="1h",
       anthropic_cache_instructions="1h",
       anthropic_cache_messages="5m",
   )
   ```
   The Router (long-lived) caches messages for 1h; sub-agents (short-lived, more variable) cache for 5m.

2. **Cache-friendly prompt ordering.** Static-first: `common_agent_system_prompt.j2` partial is included near the top of every agent prompt. Per-turn dynamic content (`system_state.j2`) is appended as a separate message. The prefix that matters for caching stays identical across turns.

3. **"Start minimal" instruction in every sub-agent.** Every writer agent's prompt has a near-identical block:
   > **DO NOT write a comprehensive spec on the first pass.** Instead: Write the bare minimum. Ask clarifying questions.

4. **"Write less" repeated as doctrine.** Router prompt: `When in doubt, write less. Shorter documents are better documents.` Plus `Avoid AI slop: No generic boilerplate sections. No "comprehensive" anything.` Token spend is a value, not a side effect.

5. **40-line cap on export.** `The output must be UNDER 40 LINES. If it's longer, you added too much.` Hard upper bound on the most-read file.

6. **`scripts/count_tokens.py`** — tiktoken-based, per-file and per-folder. Token spend is a measurable, regressible quantity.

7. **Reference files instead of inlining.** Spec prompt: `Reference contract files: "See contracts/auth_types.ts for AuthUser and AuthToken types."` The spec is prose; types live in separate files; downstream agents fetch on demand.

8. **One delegation per file type.** Forces small, focused sub-agent invocations rather than one huge "do everything" call that re-loads all context.

## Notable patterns worth stealing

1. **Pydantic-modelled test cases.** `evals/datasets/router_agent/clarifying_questions_cases.py` defines test cases as Python `ShotgunTestCase` instances with `expected_response` rubrics in plain English and structured `disallowed_tools`/`min_clarifying_questions` deterministic checks. Strict typing + freeform rubric in one object.

2. **HARD vs SOFT failure severity.** `EvaluatorSeverity` enum + per-evaluator `severity` attribute. Some failures abort the suite; others reduce score. Prevents "one cosmetic failure tanks the whole eval".

3. **Single LLM call evaluates all dimensions.** `_create_combined_judge_agent()` (in `evals/judges/router_quality_judge.py`) returns one agent with `output_type=AllDimensionsScoreOutput` — all four dimensions (delegation_rationale, context_handling, clarity, relevance) scored in a single call with weighted aggregation. Cuts judge cost by 4x vs per-dimension calls.

4. **Jinja partials over copy-paste.** Every sub-agent's `.j2` ends with `{% include 'agents/partials/common_agent_system_prompt.j2' %}` + `{% include 'agents/partials/interactive_mode.j2' %}` + `{% include 'agents/partials/router_delegation_mode.j2' %}`. Shared rules live in one place; agents specialise via the head of the file.

5. **`router_delegation_mode.j2` switches behaviour by context flag.** When a sub-agent is invoked by Router, this partial activates with `{% if sub_agent_context and sub_agent_context.is_router_delegated %}` — telling it to skip pleasantries, work synchronously, return concise final results. Same code, different mode by single flag.

6. **`pending_approval` flag as in-memory state.** `RouterDeps` directly drives the prompt: `{% if pending_approval %}<PLAN_RULES>You MUST call final_result now... Do NOT attempt to delegate ...{% endif %}`. Code-side state machine, prompt-side reinforcement.

7. **Few-shot in-line, not separate examples folder.** Examples are inside the prompts where they apply. `<GOOD_EXAMPLE name="Vague request - ask questions first">` immediately follows the rule it illustrates.

8. **The conversation history JSON is parseable.** `~/.shotgun-sh/conversation.json` has documented schema with `jq` patterns for searching. Conversations are data, not opaque blobs.

## Caveats / things NOT to copy

1. **Massive single-file prompts.** `router.j2` is ~800 lines. One bad edit can change behaviour silently. AISpec's split-skill model is probably better.

2. **Prompt-level redundancy.** The "no time references" rule is repeated 5+ times in `plan.j2`. Effective for current LLMs, but a code smell suggesting the model is unreliable on this — not a pattern to embrace, just to know when you have to.

3. **All-caps shouting and emoji warning signs.** Works empirically but ages poorly and bloats tokens.

4. **Imperative absolutism ("ALWAYS", "NEVER", "MUST").** Effective but brittle — when you genuinely need an exception, the prompt is now lying to the model. AISpec's confidence-marker approach is more nuanced.

5. **Eval suite is router-only.** Only Router has dataset/judge coverage. The five sub-agents (research/specify/plan/tasks/export) have no behavioural evals — significant gap.

6. **Hard-coded model names.** `claude-opus-4-6` baked into the judge config. Will rot quickly.

7. **No structured schema validation on writer outputs.** Spec/plan/tasks agents write markdown — `Every stage MUST have a "Depends on:" field` is prompt-only. No post-write parser rejects non-conforming files.

8. **`.shotgun/` files are not versioned.** Agents overwrite freely. Each agent prompt urges "use targeted markdown tools" but a stray `write_file` still nukes the file.

## Concrete recommendations for AISpec

Mapping these techniques onto your existing setup (analyst, consultant, architect, developer, reviewer + skills + `artifacts/` + `MEMORY.md`):

1. **Add a `judge` agent for periodic eval.** Mirror `router_quality_judge.py`: a `consultant`-loaded judge that scores ADRs, plans, and reports against fixed rubrics (clarity, relevance, alignment with prior decisions). Run on a sample weekly. Use `temperature=0.2`, structured output, multi-dimension single-call pattern.

2. **Move per-stage rubrics into your skill files.** Shotgun's success comes from rubric text *inside* the prompt. Your `documenting` skill registers templates but doesn't define "what 5/5 looks like for a finding". Add a `quality_rubrics.md` per skill that future judges can consume.

3. **Adopt structured response output across all agents.** Your agents return prose via `<output_format>` blocks. Move to a strict markdown schema the team-lead validates. Specifically: parse the `Architect review needed:` and `Strategic review needed:` lines automatically — never on prose-pattern matching.

4. **Add `preload_files` semantics to your hand-offs.** Today the team lead `SendMessage`s a path. Pre-injecting the artifact's full content (or its TOC) into the next agent's first message would eliminate the inevitable "Read this file" tool call. Adopt the `<EXISTING_FILES>` + `<TABLE_OF_CONTENTS>` injection pattern from `system_state.j2`.

5. **Borrow the system-state injection pattern.** Build a per-turn `agent_state.md` per agent injecting: open artifacts, current branch, pending reviews, the `.claude/MEMORY.md` TOC. Replaces "agent re-derives state by reading files" round-trips.

6. **Define banned vocabulary per artifact type.** Plan agent forbids time references; report agent could forbid implementation directives ("you should implement X by..."); ADR agent could forbid hedge words. Encode in the template + reinforce in instructions. Cheap determinism win.

7. **Two-mode state machine for developer agent.** Mirror Planning vs Drafting: a `Planning` mode where the developer can only propose a plan (no Edit/Write tools available) and an `Executing` mode where Edit/Write unlock after architect approval. You already have phase gates — make tool availability follow the gate, not just the prompt.

8. **Add prompt caching settings.** If hitting Claude, opt agents into `anthropic_cache_tool_definitions="1h"` + `anthropic_cache_instructions="1h"`. Your skill loader emits a large static prefix per agent — perfect prefix-caching shape. Likely 30-50% cost win on long sessions.

9. **Add token counting as a regular check.** Shotgun has `scripts/count_tokens.py`. AISpec's skills are growing; a per-agent token budget (visible in `.claude/agent-memory/<agent>/MEMORY.md`) would catch bloat early. Your `tmp/skill-optimisation-suggestions.md` hints you're already thinking this way.

10. **Negative examples in every agent prompt.** Many of your agents have `<anti_patterns>`. Shotgun co-locates BAD/GOOD pairs *adjacent to the rule they illustrate*. Audit your agents — anti-patterns are listed once at the end; co-locate them with the rule they violate.

11. **For each named agent, write at least one Pydantic-style eval case.** Even just one per agent (e.g. "analyst given a 200-line file produces a report with all confidence markers populated"). This is what's missing from Shotgun's setup and you can leapfrog them.

12. **One owner per artifact directory is already your model — keep it strict.** Shotgun violates this far less rigorously than AISpec. The `artifacts/reports/` (analyst) / `artifacts/adr/` (architect) split mirrors `research.md` / `specification.md` ownership. Don't loosen it.

13. **Adopt the "hidden vs shown" field pattern.** Shotgun's `ExecutionStep` has `title` (for user) and `objective` (for sub-agent) on the same schema. Your plan files could similarly have a phase-level summary (shown in UI) and an embedded sub-agent objective (shown only to developer).
