# OpenSpec — Findings

## What it is (2-3 sentences)

OpenSpec is a TypeScript/Node CLI (`@fission-ai/openspec`) that adds a thin **spec-driven workflow layer** between a human and any AI coding assistant. It decomposes a "change" into a small set of artifacts — `proposal.md`, `specs/<capability>/spec.md`, `design.md`, `tasks.md` — produced one at a time, validated mechanically, then archived. Instructions are not hand-written for each agent; instead, a CLI engine reads a **YAML schema + Markdown templates**, computes a dependency graph, detects state from the filesystem, and emits a JSON instruction packet that the AI consumes per artifact.

## Architecture at a glance

The heart is `src/core/artifact-graph/` — five files (`graph.ts`, `state.ts`, `instruction-loader.ts`, `outputs.ts`, `resolver.ts`) that together implement a tiny dependency engine. Around it:

- **Schema** (`schemas/spec-driven/schema.yaml`) — declares artifacts, their `requires`, and a per-artifact `instruction` string.
- **Templates** (`schemas/spec-driven/templates/*.md`) — the literal Markdown skeleton each artifact must follow.
- **Project config** (`openspec/config.yaml`) — supplies a `context:` block and per-artifact `rules:` injected at instruction-generation time.
- **Skill/command files** generated from `src/core/templates/workflows/*.ts` — these are the static slash-command bodies installed into `.claude/skills/`, `.cursor/`, etc. They contain hard-coded numbered procedures that always end up calling the CLI.
- **Validator** (`src/core/validation/validator.ts`) — Zod-based; parses the produced Markdown and rejects it if required structural elements are missing.

The runtime loop is always the same: AI calls `openspec status --change X --json` → picks first `ready` artifact → calls `openspec instructions <id> --change X --json` → writes one file matching `template` to `resolvedOutputPath` → re-checks status.

## Techniques for LLM consistency

1. **One template per artifact, owned by the framework, not the prompt.** The literal `.md` skeleton — e.g., `proposal.md`:
   ```
   ## Why
   <!-- Explain the motivation... -->
   ## What Changes
   ## Capabilities
   ### New Capabilities
   ### Modified Capabilities
   ## Impact
   ```
   The AI is told "use `template` as the structure for your output file." Heading order and HTML-comment hints are pre-baked, so two runs in different sessions produce the same shape.

2. **Hard syntactic rules with explicit failure modes.** The `specs` artifact instruction in `schema.yaml` literally says:
   > `**CRITICAL**: Scenarios MUST use exactly 4 hashtags (####). Using 3 hashtags or bullets will fail silently.`
   Framing the rule as protecting the AI from invisible failure rather than a stylistic preference makes it stick.

3. **Three-way input layering (`context`, `rules`, `template`) with explicit roles.** Every `openspec instructions` JSON packet returns four separate fields: `context` ("constraints for YOU, not content for the file"), `rules` (artifact-specific), `template` (the actual output shape), `instruction` (per-artifact guidance). The propose skill (`src/core/templates/workflows/propose.ts`) repeats:
   > `Do NOT copy <context>, <rules>, <project_context> blocks into the artifact. These guide what you write, but should never appear in the output.`
   Pre-empting the "AI dumps the system prompt into the file" failure mode.

4. **Zod-enforced output grammar.** `RequirementSchema` (in `src/core/schemas/base.schema.ts`) refuses any requirement that does not contain `SHALL` or `MUST`, and refuses any requirement with zero scenarios:
   ```ts
   .refine((text) => text.includes('SHALL') || text.includes('MUST'),
     VALIDATION_MESSAGES.REQUIREMENT_NO_SHALL)
   ```
   The AI's output must round-trip through a parser; the framework is willing to reject and re-prompt.

5. **Pre-named delta operations.** Modifications to specs go through four fixed verbs — `ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `RENAMED Requirements` — each with explicit "you must include X/Y" rules (e.g., REMOVED must include `**Reason**` and `**Migration**`). The LLM picks a verb from a closed set instead of inventing one.

## Techniques for determinism

1. **Filesystem IS state.** `detectCompleted()` in `state.ts` is brutally simple — an artifact is "done" iff its output file exists. No tracker, no journal, no DB:
   ```ts
   for (const artifact of graph.getAllArtifacts()) {
     if (isArtifactComplete(artifact.generates, changeDir)) {
       completed.add(artifact.id);
     }
   }
   ```
   Two runs in two clones of the same repo yield identical state. The AI cannot "think" the state is something else.

2. **Topological build order via Kahn's algorithm with explicit deterministic tiebreaker.** In `graph.ts::getBuildOrder()`:
   ```ts
   const queue = [...this.artifacts.keys()]
     .filter(id => inDegree.get(id) === 0)
     .sort();
   // ...
   queue.push(...newlyReady.sort());
   ```
   Sorting at every step means equivalent DAGs produce the same sequence of `ready` artifacts forever.

3. **State machine = three states, period.** `BLOCKED → READY → DONE`. No `IN_PROGRESS`, no `NEEDS_REVIEW`. The AI cannot synthesize an extra state.

4. **CLI-driven "one artifact per turn".** `/opsx:propose` and `/opsx:continue` loop: `status` → pick first `ready` → `instructions` → write file → `status` again. Each artifact is a closed transaction. No "draft everything then stitch" creativity.

5. **Deterministic filename derivation.** Change directories use a kebab-case change name (`add-dark-mode`). Archive folders use `YYYY-MM-DD-<change-name>` (computed at archive time). Spec paths use `specs/<capability>/spec.md` with the **exact capability name listed in the proposal's Capabilities section** — that section is explicitly named the contract:
   > `The Capabilities section is critical. It creates the contract between proposal and specs phases.`

6. **Per-artifact "instruction" string is part of the schema, not the agent prompt.** The schema controls the procedure. Swapping `spec-driven` for `research-first` swaps the entire workflow without changing the agent or skill files.

7. **AskUserQuestion is mandated for ambiguity.** The propose skill says "Do NOT proceed without understanding what the user wants to build" and routes via `AskUserQuestion tool` — when the LLM would normally hallucinate, it is hard-coded to ask. Variance is moved from the LLM to the human.

## Techniques for efficiency

1. **Pull, don't push.** No artifact is embedded in the agent's system prompt. The skill file is small; the AI calls `openspec instructions <id> --json` only for the artifact it is about to write. Other artifacts' templates never enter context.

2. **Schema-driven `unlocks` field.** Each `instructions` call returns `unlocks: ["tasks"]` — the AI doesn't recompute the DAG, doesn't read the schema, doesn't re-derive what's next. The engine does it once and ships a tiny JSON.

3. **`contextFiles` mapping in `apply` instructions.** During implementation, `openspec instructions apply --json` returns `contextFiles: { proposal: ["..."], specs: ["..."], ... }` — pre-resolved concrete paths. The AI reads only what's listed:
   > `Read every file path listed under contextFiles from the apply instructions output.`
   No exploratory `ls` or `find`.

4. **Validator runs only at validate/archive boundary.** Zod parsing isn't on every keystroke — it runs on `openspec validate` or `openspec archive`. Cheap during editing, strict at the gate.

5. **Session-level deduped warnings.** `instruction-loader.ts` keeps a module-scope `shownWarnings: Set<string>` so config-rule warnings print once per process, not per artifact.

6. **Glob output detection.** `generates: "specs/**/*.md"` is the artifact contract — the engine matches existing files against the glob in `outputs.ts`, so multi-file artifacts (multiple capability specs) cost no extra prompting.

## Techniques for cost reduction

1. **Skill files reference the CLI, they don't inline data.** A skill file is a short procedure ("call `openspec status`, then call `openspec instructions <id>`, then write the file"). The expensive content — templates, rules, dependency lists — lives on disk and is fetched per use. The agent's resident context stays small.

2. **`context`/`rules` are project-scoped, not change-scoped.** `openspec/config.yaml` is read once per `generateInstructions` call and injected only into JSON returned to the AI. Never copied into every artifact, never duplicated across artifacts.

3. **Per-artifact rules in `config.yaml.rules`.** Project-specific guidance is keyed by artifact ID:
   ```yaml
   rules:
     specs:
       - Include scenarios for Windows path handling when dealing with file paths
     tasks:
       - Add Windows CI verification as a task when changes involve file paths
   ```
   The `tasks` rules never reach the prompt for `specs` — role-scoped tokens.

4. **50KB cap on `context`** in project config. Explicit ceiling, validated at load time. Prevents context from ballooning silently.

5. **Hard `MAX_DELTAS_PER_CHANGE = 10`** in `validation/constants.ts`. A change with more than 10 deltas is flagged: "Consider splitting changes with more than 10 deltas." Bounds the size of any single workflow run.

6. **Cache-friendly ordering: stable JSON, sorted lists, sorted `unlocks`.** Every list returned from the engine is `.sort()`-ed — friendly to KV/prefix caching because identical inputs produce byte-identical outputs across runs.

7. **`openspec status` and `openspec instructions` are separate calls.** Lightweight status polling (just filesystem stat) is cheap; the heavier instruction packet is only fetched for the one artifact actually being written.

## Notable patterns worth stealing

1. **"Filesystem as state machine."** Replace any in-memory or YAML-frontmatter status tracking with "does the file exist?" This survives crashes, rebases, branch switches, and human edits with no reconciliation logic.

2. **Schema → template → instruction triplet.** Three orthogonal levers (structure, output shape, prose guidance) keyed by artifact ID, all editable without touching code or rebuilding. AISpec's `templates/` already mirrors this, but the per-artifact `instruction` field is missing — currently this prose lives inline in each agent's `<instructions>`, which makes it harder to evolve a single artifact's guidance without re-deploying the whole agent.

3. **`unlocks` field in instruction packets.** After producing artifact X, tell the AI exactly which IDs are now possible. Removes any "what's next?" reasoning — the engine knows.

4. **Closed-vocabulary delta operations.** `ADDED / MODIFIED / REMOVED / RENAMED` as `##` headings with hard rules per heading. Pre-emptively prevents free-form "here's how I changed it."

5. **Skill/command files as thin clients to a CLI.** The slash command does **not** contain the workflow logic — it contains the procedure for invoking the CLI that contains the workflow logic. The expensive material stays out of context until needed.

6. **Three-tier prompt input with named non-overlapping roles** (`context`, `rules`, `template`) plus an explicit "do not echo these into the file" guardrail. Clean separation of "constraints on the agent" vs. "shape of the output."

7. **Cross-cutting `context:` block in project config.** A single 50KB-capped string ("Tech stack: TypeScript… Cross-platform requirements: This tool runs on macOS, Linux, AND Windows…") is injected into every artifact's prompt for that project. Functions like a soft contract for the whole project — analogous to AISpec's `.claude/MEMORY.md` but actually delivered into the LLM at generation time rather than relying on the agent to remember to read it.

8. **Zod schemas with custom `refine()` rules** for narrative content (SHALL/MUST keywords, required scenarios). Lets a Markdown document be validated structurally as if it were a typed object.

9. **Tiny constants file (`validation/constants.ts`) listing every numeric/string limit** in one place — `MIN_WHY_SECTION_LENGTH`, `MAX_DELTAS_PER_CHANGE`, all message strings. Easy to tune — no scattered magic numbers.

## Caveats / things NOT to copy

1. **The "fluid, no phase gates" stance is for solo-AI work, not multi-agent teams.** OpenSpec deliberately avoids gates so the human can iterate freely. AISpec uses a multi-agent pipeline (analyst → consultant → architect → developer → reviewer) where dual-approval *is* the quality mechanism. Don't gut the gate model.

2. **Filesystem-as-state requires careful naming.** OpenSpec gets away with it because change directories are flat (`proposal.md`, `tasks.md`). AISpec already has nested artifact directories (`artifacts/adr/`, `artifacts/plans/`) with numeric prefixes and titles — a pure "file exists?" check is noisier here.

3. **The "instructions are stringified TypeScript in `src/core/templates/workflows/*.ts`" anti-pattern.** Those files duplicate the same prose for skills and commands. Avoid duplicating prose across `.claude/skills/<x>/SKILL.md` and agent system prompts; keep one source of truth.

4. **`MAX_DELTAS_PER_CHANGE = 10` is a soft limit, not a feature.** Don't inherit arbitrary caps without a clear failure mode they protect against.

5. **No per-finding/per-decision confidence markers.** OpenSpec's specs are pure SHALL/MUST without graded confidence. AISpec's analyst already does `[VERIFIED]`/`[INFERRED]`/`[ASSUMED]` — keep that; OpenSpec doesn't have a comparable mechanism.

6. **The OPSX "do anything anytime" philosophy explicitly rejects phase gates.** OpenSpec's authors say this is intentional for individual developers using one AI. For an agent ecosystem where the developer must wait for the reviewer, keep your gates — OpenSpec's freedom would let the developer race ahead of review.

## Concrete recommendations for AISpec

1. **Add a per-artifact `instruction:` field to the documenting skill registry.** Today `.claude/skills/documenting/SKILL.md` has a registry mapping artifact type → template file. Add a third column: the prose instruction (currently scattered across each agent's `<instructions>`). The analyst's `<instructions>` would shrink — instead of inlining what an analysis report contains, it would say "consult documenting → get instruction for `report` → follow it." Saves tokens in every agent system prompt and lets you tune one document type without redeploying the agent.

2. **Adopt a single project-level `context:` block analogous to `openspec/config.yaml`.** Put cross-cutting facts (Windows-friendly paths, Node version, "agent threads reset cwd," etc.) in ONE place that all agents inject. Right now this leaks into multiple agent system prompts (`CLAUDE.md`, per-agent memory). One canonical, capped (e.g., 10KB) block prepended at agent start would be more maintainable. Critically, keep `.claude/MEMORY.md` as the decision log/glossary (its current role) — the new block is for project-wide constants. Do not conflate them.

3. **Formalize the instruction packet shape.** Even without an external binary, define the JSON-style packet: `{ template, context, rules, instruction, dependencies, unlocks }`. The architect already has implicit deps (ADR before plan). Making `unlocks` explicit would let agents stop reasoning about "what's next" — they'd echo back the engine's answer.

4. **Closed-vocabulary delta operations for ADR amendments.** When the reviewer emits `ARCHITECT AMENDMENT NEEDED`, force the architect's amendment into one of: `ADDED Decision / MODIFIED Decision / SUPERSEDED Decision / WITHDRAWN Decision`. Mirrors OpenSpec's `ADDED/MODIFIED/REMOVED/RENAMED Requirements`. Makes ADR diffs grep-able and lets you build an "ADR history" view without parsing free-form prose.

5. **Zod-validate the analyst's report markdown.** Today the report template has sections but nothing forces them. A schema-validated structure (Confidence line present, exactly one marker per finding, Risks-and-Unknowns non-empty) would catch the anti-patterns listed in the analyst's own `<anti_patterns>` section mechanically — at zero per-call LLM cost.

6. **Stable JSON for every team-lead `SendMessage`.** OpenSpec sorts every output list (`graph.ts` sorts both `newlyReady` and the ready queue). AISpec's flag tokens (`ARCHITECT REVIEW NEEDED:`) and dual-approval messages already mostly follow this — formalize it so identical situations produce identical messages and benefit from KV cache.

7. **Replace per-agent system-prompt prose duplication with a `.claude/skills/<skill>/instructions/` directory loaded on demand.** OpenSpec's skill files are short procedures that call a CLI to fetch heavy content. AISpec's agent system prompts are long because they inline the rules. Lift the rule bodies into per-skill files and have the agent read them via the existing `skills:` frontmatter mechanism (already partially done with `documenting`/`understanding`). Goal: shrink every agent's resident system prompt by 30–50%.

8. **Adopt `filesystem-as-state` for plan phase completion.** The developer currently inserts `**Status: Complete**` after a `<!-- status:phase-N -->` anchor. Consider also tracking phase state via the existence of a small marker file (e.g., `artifacts/plans/<plan>.phase-N.done`) — survives bad merges and is grep-able by the reviewer without re-reading the plan body.

9. **Surface "what unlocks next?" to the team lead.** When the analyst finishes, the team lead has to know that an analyst report unlocks the architect or consultant. If each agent's `<output_format>` ended with an explicit `unlocks:` line (mirroring OpenSpec's `unlocks` field), routing logic in CLAUDE.md becomes simpler — the team lead just dispatches whatever the agent says is unlocked.

10. **Cap context blocks explicitly.** OpenSpec hard-caps `context:` at 50KB. AISpec's `.claude/MEMORY.md` says "200 lines after which truncated" — formalize that to a byte cap with a friendly error rather than silent truncation.
