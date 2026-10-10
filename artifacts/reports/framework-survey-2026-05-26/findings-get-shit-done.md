# get-shit-done — Findings

## What it is (2-3 sentences)

get-shit-done (GSD) is a Node.js CLI + SDK that orchestrates LLM agents through a strict pipeline of **phases → plans → tasks**, where each step produces a structured markdown artifact (PLAN.md, SUMMARY.md, VERIFICATION.md, STATE.md, ROADMAP.md) on disk. It enforces a *plan-then-execute-then-verify* loop with goal-backward verification, wave-based parallelism, and atomic per-task git commits — designed for a single human "visionary" + Claude as the implementer. The upstream repo at `gsd-build/get-shit-done` is now archived (continues as "GSD Redux"), but the snapshot we read is feature-complete and battle-tested.

## Architecture at a glance

- **`agents/gsd-*.md`** — 30+ named subagents (planner, executor, verifier, debugger, researcher variants, auditors). Each is a markdown file with YAML frontmatter (`name`, `description`, `tools`, `color`) and an XML-tagged body (`<role>`, `<execution_flow>`, `<step name=...>`, `<critical_rules>`, `<success_criteria>`).
- **`commands/gsd/*.md`** — User-facing slash commands (`/gsd:execute-phase`, `/gsd:plan-phase`, `/gsd:verify-work`…). Thin wrappers with `allowed-tools`, an `<objective>`, and `<execution_context>` `@file`-references pointing into `get-shit-done/workflows/`.
- **`get-shit-done/workflows/*.md`** — Long-form, machine-readable workflow scripts (e.g. `execute-phase.md` ~1800 lines), full of XML `<step>` blocks and shell-command snippets.
- **`get-shit-done/references/*.md`** — On-demand reference docs (`context-budget.md`, `executor-examples.md`, `planner-antipatterns.md`, `gates.md`). Loaded conditionally via `@~/.claude/get-shit-done/references/...`.
- **`get-shit-done/templates/*.md`** — Skeletons for the artifacts agents produce (`phase-prompt.md`, `summary.md`, `verification-report.md`, `state.md`).
- **`sdk/` + `get-shit-done/bin/`** — A Node SDK + CJS CLI (`gsd-sdk query ...`) exposing typed verbs like `gsd-sdk query init.plan-phase`, `gsd-sdk query verify.artifacts`, `gsd-sdk query state.advance-plan`. **Agents invoke these instead of reasoning over raw files.**
- **`CONTEXT.md`** — A machine-greppable predicate file (`CLASS.subkey=value` per line, e.g. `RULESET.TESTS.no-source-grep=...`, `PRED.k320.signal=...`). Agent prompts MUST cite predicate IDs verbatim instead of paraphrasing.
- **`hooks/`** — Runtime hooks (e.g. `gsd-graphify-update.sh`) that fire on git events.

## Techniques for LLM consistency

1. **Per-agent frontmatter contract.** Every agent file declares `name`, `description`, `tools`, and a fixed XML schema in the body (`<role>` → `<execution_flow>` → `<critical_rules>` → `<success_criteria>`). The `tools:` allowlist hard-restricts what the agent can do, e.g. `tools: Read, Write, Bash, Glob, Grep` for the planner.
2. **Numbered `<step name="...">` blocks** with explicit `priority="first"` markers. The executor's flow is `load_project_state` → `load_plan` → `record_start_time` → `determine_execution_pattern` → `execute_tasks`. Step names are stable string IDs other docs link to.
3. **Completion markers as a hard contract.** `agent-contracts.md` documents the exact regex-matchable strings each agent must emit (`## PLANNING COMPLETE`, `## PLAN COMPLETE`, `## CHECKPOINT REACHED`, `## VERIFICATION PASSED | ISSUES FOUND`). Orchestrator workflows regex-match these to detect completion. **Token drift = pipeline break.**
4. **Schema-enforced artifacts.** Plans and summaries have frontmatter validated by an SDK verb: `gsd-sdk query frontmatter.validate "$PLAN_PATH" --schema plan` returns `{valid, missing, present, schema}`. Same for `verify.plan-structure`. The agent cannot silently emit a malformed plan.
5. **Task anatomy: four required XML fields.** Every `<task>` MUST contain `<files>`, `<action>`, `<verify>`, `<done>`. The planner prompt explicitly lists "Good" vs "Bad" examples for each field:

   > **Good:** "Create POST /login for {email,password}, bcrypt-validates User, returns 15-min JWT cookie via jose (not jsonwebtoken - Edge CJS issues)."
   > **Bad:** "Add authentication", "Make login work"

6. **Few-shot calibration files.** `references/few-shot-examples/verifier.md` is loaded by the verifier at "verification decision points" so the LLM anchors on canonical examples of when to mark VERIFIED vs FAILED vs UNCERTAIN.
7. **The "predicate dictionary" pattern.** `CONTEXT.md` enforces `META.RULE.brief-must-cite-doc=agent prompts MUST quote the canonical doc line being applied; paraphrasing from predicate memory drifts and produces violations` and `META.RULE.brief-no-paraphrase=writing "k040 — never leave changelog box unchecked" caused 5 of 8 agents to edit CHANGELOG.md in violation of CONTRIBUTING.md L110`. They literally observed paraphrase-drift across runs and forced verbatim quoting.

## Techniques for determinism

1. **Wave numbers pre-computed at plan time.** The planner assigns `wave: 1|2|3` to each plan's frontmatter using a deterministic algorithm (no deps → wave 1; depends only on wave 1 → wave 2; `files_modified` overlap forces a later wave). Execute-phase reads `wave` from frontmatter — no runtime dependency analysis, no LLM creativity in scheduling.
2. **Deterministic file naming, enforced verbatim.** From the planner agent:

   > **The filename MUST follow the exact pattern: `{padded_phase}-{NN}-PLAN.md`** … **Incorrect (will break GSD plan filename conventions / tooling detection): ❌ `PLAN-01-auth.md`, ❌ `01-PLAN-01.md`, ❌ `01-01-plan.md` (lowercase).**

3. **The four explicit deviation rules.** The executor doesn't decide what to do when reality diverges from the plan — it consults a fixed rule table:
   - Rule 1 — Auto-fix bugs (no user permission needed)
   - Rule 2 — Auto-add missing critical functionality
   - Rule 3 — Auto-fix blocking issues (with explicit exclusion for package manager installs — anti-slopsquatting guard)
   - Rule 4 — Ask about architectural changes (STOP and return checkpoint)

   Plus a "RULE PRIORITY" tiebreaker section.
4. **Goal-backward `must_haves` as the verification contract.** The planner emits a `must_haves: {truths, artifacts, key_links}` block in plan frontmatter. The verifier doesn't re-derive what to check — it consumes that exact structure and runs `gsd-sdk query verify.artifacts "$PLAN_PATH"` to get back `{all_passed, passed, total, artifacts:[...]}`. The decision tree in Step 9 is purely mechanical:

   > 1. IF any truth FAILED... → `status: gaps_found`
   > 2. IF Step 8 produced ANY human verification items → `status: human_needed`
   > 3. IF all truths VERIFIED ... AND no human verification items → `status: passed`

5. **State machine in `STATE.md` + SDK mutators.** Plan-advance, progress-recalc, decisions, metrics, blockers, session info — all written through typed verbs (`gsd-sdk query state.advance-plan`, `state.update-progress`, `state.add-decision`, `state.record-metric`). The agent never edits STATE.md by hand.
6. **Centralized predicate verbs replace ad-hoc regex.** Instead of inlining the MVP user-story regex into each agent, GSD exposes `gsd-sdk query user-story.validate --story "$PHASE_GOAL" --pick valid` and `gsd-sdk query task.is-behavior-adding "$TASK_FILE" --pick is_behavior_adding`. One source of truth, used in 4+ agent prompts.
7. **Hard-coded prohibitions ("destructive_git_prohibition" block).** The executor's prompt has an explicit list of forbidden commands (`git clean` any flags, `git reset --hard` outside startup, `git stash`, `git update-ref refs/heads/<protected>`). Each prohibition has a postmortem reason (`#2075`, `#2924`, `#3542`).
8. **No-heredoc-write rule.** Repeated across agents: `**ALWAYS use the Write tool to create files** — never use Bash(cat << 'EOF') or heredoc commands for file creation.` Kills a non-deterministic Bash quoting failure mode.
9. **Pre-commit assertions (worktree mode).** Before every commit the executor runs shell guards that exit 1 on cwd-drift, absolute-path-outside-worktree, protected-branch HEAD. Bug history is wired into the prompt (`#3097`, `#3099`, `#2924`).
10. **`<analysis_paralysis_guard>`** — If the agent makes 5+ consecutive Read/Grep/Glob calls without Edit/Write/Bash, it MUST stop and either act or report blocked. Hard-coded loop break.

## Techniques for efficiency

1. **One init call instead of N reads.** Every workflow opens with:

   ```bash
   INIT=$(gsd-sdk query init.execute-phase "${PHASE_ARG}")
   if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
   ```

   Returns a flat JSON bundle with `executor_model`, `commit_docs`, `phase_dir`, `plans`, `incomplete_plans`, etc. — replacing what would otherwise be 5–10 separate file reads. The `@file:` indirection means large bundles spill to disk and the agent only reads what it needs.
2. **`@~/.claude/get-shit-done/references/...` lazy loading.** Reference files (`executor-examples.md`, `planner-antipatterns.md`, `planner-gap-closure.md`, `planner-revision.md`, `planner-reviews.md`, `execute-mvp-tdd.md`) are loaded conditionally based on mode flags. The default-mode planner never reads gap-closure rules.
3. **Adaptive prompt enrichment by context window.** From `execute-phase.md`:

   > When `CONTEXT_WINDOW >= 500000` (1M-class models), subagent prompts include richer context …
   > When `CONTEXT_WINDOW < 200000` (sub-200K models), subagent prompts are thinned … This reduces executor static overhead by ~40%.

4. **Two-step history digest.** Instead of reading every prior phase's SUMMARY.md:

   ```bash
   gsd-sdk query history-digest          # cheap index
   # Score relevance, select 2-4 phases, then:
   cat .planning/phases/{selected}/*-SUMMARY.md
   ```

5. **Wave-parallel execution via git worktrees.** Same-wave plans with non-overlapping `files_modified` run in parallel isolated worktrees. Sequential within a wave only when file conflicts force it.
6. **`<step name="reachability_check">`** during planning checks every must-have artifact has a path to creation in the same plan set, killing "design-then-realize-it's-impossible" rework.
7. **Re-verification short-circuit.** The verifier checks for a previous VERIFICATION.md with a `gaps:` section. If present:

   > **Failed items:** Full 3-level verification (exists, substantive, wired)
   > **Passed items:** Quick regression check (existence + basic sanity only)

8. **Stop-on-sufficient-evidence rules in the planner:**

   > **No re-reads:** Never re-read a range already in context. For small files (≤ 2,000 lines), one Read call is enough.
   > **Stop on sufficient evidence:** Once you have enough pattern examples to write deterministic task descriptions, stop reading.

## Techniques for cost reduction

1. **Orchestrator-vs-subagent context split.** From `execute-phase.md`:

   > Context budget: ~15% orchestrator, 100% fresh per subagent.

   The orchestrator never reads `agents/*.md` (the runtime auto-loads them via `subagent_type`). Each subagent gets a fresh context window with only its slice of files.
2. **Per-task context budget rules.** The planner has a hard table: each plan = 2-3 tasks, each task = 10-30% of one agent's context. Quality-degradation curve (PEAK 0-30%, GOOD 30-50%, DEGRADING 50-70%, POOR 70%+) drives the "fresh window per plan" pattern.
3. **`@`-file references instead of inlined content.** Plans contain `@.planning/PROJECT.md`, `@.planning/ROADMAP.md`, `@.planning/STATE.md` — the runtime resolves these into the context only when needed. The plan file itself stays small.
4. **Frontmatter-only reads by default.** From `context-budget.md`:

   | Context Window | Subagent Output Reading | SUMMARY.md | VERIFICATION.md |
   |---|---|---|---|
   | < 500k | Frontmatter only | Frontmatter only | Frontmatter only |
   | >= 500k | Full body permitted | Full body permitted | Full body permitted |

5. **MCP tool-schema audit.** `context-budget.md` explicitly calls out that every enabled MCP server costs 20k+ tokens of schema per turn and tells users to audit `.claude/settings.json`:`enabledMcpjsonServers`/`disabledMcpjsonServers` before long phases. Most agent frameworks ignore this; GSD treats it as the biggest single cost lever.
6. **Model profiles per role.** The init bundle returns `planner_model`, `executor_model`, `verifier_model`, `checker_model` independently — cheap roles get sonnet/haiku, deep roles get opus.
7. **Role-scoped instructions.** Each agent file is ~200-1000 lines but only one is in the context per turn. The executor never sees the planner's prompt, the verifier never sees the executor's. No shared mega-prompt.
8. **"Plans are prompts, not docs that become prompts."** Direct quote from `gsd-planner.md`. Eliminates an extra LLM pass that would otherwise re-derive structure.

## Notable patterns worth stealing

1. **Predicate file (`CONTEXT.md`).** Single-line machine-readable facts/rules/postmortems, each tagged with a stable ID (`PRED.k320.cure=drop .changeset/<adj>-<noun>-<noun>.md fragment ONLY`). Agents quote IDs verbatim.
2. **Anti-pattern with citation.** Every prohibition carries the bug number that caused it (`#2075`, `#2924`, `#3097`, `#3542`, `#3678`). Future agents have "why" context, not just "what".
3. **Goal-backward `must_haves` carried via frontmatter from planner → executor → verifier.** Three different agents agree on the contract because it's a typed YAML data structure, not a prose handoff.
4. **Centralized validation verbs** (`frontmatter.validate`, `verify.plan-structure`, `task.is-behavior-adding`, `user-story.validate`). Schema lives in code, not in 12 different agent prompts.
5. **Wave + file-ownership parallelism.** Pre-compute the dependency graph at plan time, then mechanically batch into waves with file-overlap collisions auto-pushing to later waves.
6. **Confidence/disposition tokens with hard semantics.** `[VERIFIED] / [FAILED] / [UNCERTAIN]`, plus `mitigate / accept / transfer` in STRIDE threat tables, plus `[ASSUMED]/[SUS]/[SLOP]` for package legitimacy gating.
7. **Override pattern in verifier.** If a must-have FAILed but the deviation is acceptable, the human edits VERIFICATION.md frontmatter to add an `overrides:` entry. The verifier on next run re-reads and treats it as `PASSED (override)`. Auditable, version-controlled deviation acceptance.
8. **Stub detection grep patterns** (`return null`, `return []`, `=\{(\[\]|\{\}|null)\}`, `onClick={() => {}}`). A heuristic library, not a fresh LLM judgement each time.

## Caveats / things NOT to copy

1. **Massive scope.** 30+ agents, hundreds of references, two SDKs (CJS + TS), 15 runtimes (Claude/Cursor/Codex/Gemini/Copilot/Augment/Kilo/Hermes…). Most of this is plumbing for cross-runtime parity — irrelevant to a single-runtime project.
2. **Workflow files are huge.** `execute-phase.md` is ~1800 lines of XML+bash. They've added a `workflow-size-budget` lint to clamp it at 1800. This is "load-bearing prose" the LLM must follow — review/audit cost is high.
3. **Inline bash everywhere.** Most workflow steps are inline shell snippets the LLM reads and executes. Powerful, but fragile across Windows (PowerShell) — they patch this with `gsd-sdk query` verbs but legacy bash remains.
4. **CHANGELOG / CI gates leak into agent prompts.** `PRED.k320`, `RULESET.PR-SCOPE`, GitHub-flavored process belong in CONTRIBUTING.md, not agent prompts. They ended up there because agents kept violating them — bloats every turn.
5. **The repo is archived.** Upstream moved to `open-gsd/get-shit-done-redux`. The architecture is mature, but trade-offs they made (e.g. CJS + TS dual-package) may have been re-architected in the successor.
6. **No first-class "consultant"/strategic layer.** GSD is tactical: phase → plan → task. There is no strategic-design phase (bounded contexts, charters, SDRs) like AISpec's consultant agent provides. The planner's "goal-backward" methodology is purely outcome-based, not domain-driven.
7. **Few-shot examples for verifier are heavy.** They calibrate but add static-prompt cost. AISpec's `templates/assets/tokens.yaml` + decision-tree-in-rules approach is leaner.

## Concrete recommendations for AISpec

Mapped against your existing roles (analyst, consultant, architect, developer, reviewer), `artifacts/{reports,strategy,adr,plans}/`, and `.claude/MEMORY.md`:

1. **Adopt the predicate format for `.claude/MEMORY.md` decisions.** Today MEMORY.md is glossary + decision log. Add a `## Rules` section using GSD's `RULESET.X.Y=...` shape, including incident citations (PR/issue IDs). Then mandate (in agent system prompts) that agents quote the rule ID verbatim instead of paraphrasing — this kills the "5-of-8 agents drifted" failure mode GSD documents.

2. **Introduce SDK-style verbs for cross-agent contracts.** A small Node CLI (`aispec query filename "<subject>" --type adr`, `aispec query plan-status <plan-id>`, `aispec query report-list`) would replace `scripts/filename.mjs` plus future per-step bash. Centralizes the schema — one place to fix `aispec query frontmatter.validate --schema adr`. You already have `scripts/filename.mjs` — that's the seed.

3. **Add `must_haves: {truths, artifacts, key_links}` to architect plans.** Today the architect produces plans; the developer executes; the reviewer reviews. Add a frontmatter contract carried plan → developer → reviewer with goal-backward criteria. Reviewer then mechanically checks each `truth` against the diff rather than re-judging from scratch. This is the single biggest determinism win in GSD.

4. **Pre-compute wave/dependency graph in the architect's plan.** Add `wave: N`, `depends_on: []`, `files_modified: []` to plan frontmatter. The developer reads waves directly, no runtime dependency analysis. Even single-developer projects benefit from explicit dependency declarations as documentation.

5. **Pull GSD's "deviation rules" pattern into the developer agent.** Codify Rules 1-4 (auto-fix bugs / auto-add critical missing / auto-fix blocking / STOP for architectural change) as four numbered, priority-ordered rules. Currently AISpec relies on the developer agent's prose judgement.

6. **Lazy reference loading.** AISpec already does this well (`documenting` skill loads templates on demand). Extend the pattern: each agent's anti-pattern list, examples, and edge-case rules live in separate `references/*.md` loaded only when the relevant flag/mode is detected. Reduces every-turn static cost.

7. **Make completion markers a hard contract.** Today the analyst emits an `<output_format>` block, but the architect/consultant/developer/reviewer don't have stable regex-matchable completion markers documented in one place. Add an `agent-contracts.md` analog listing all markers (`ARCHITECT REVIEW NEEDED:`, `ANALYSIS COMPLETE`, `PLAN APPROVED`, `PHASE APPROVED`, `ARCHITECT AMENDMENT NEEDED: ...`). One source of truth instead of grep-hunting across agent files.

8. **Adopt `[VERIFIED]/[INFERRED]/[ASSUMED]` everywhere, not just analyst reports.** AISpec already uses these in analyst output. Carry them into ADRs ("[VERIFIED] tested in benchmark X" vs "[ASSUMED] Postgres scales here"), plans, and reviewer findings — same token, same semantics, three-token vocabulary.

9. **Add an `analysis_paralysis_guard` to every agent.** "5+ consecutive Read/Grep/Glob without Edit/Write → stop and either act or report blocked." Simple, prevents the "agent loops reading files" failure that wastes tokens.

10. **Skip GSD's strategic-layer gap.** GSD has no consultant/strategic agent — AISpec's consultant + charter/SDR/context-map artifacts are an advantage. Keep that. Do NOT collapse strategic into tactical the way GSD did.

11. **Audit MCP schema cost.** GSD calls this out explicitly: every enabled MCP server costs 20k+ tokens/turn regardless of use. Add a pre-task checklist in CLAUDE.md ("disable browser/playwright/OS-tools when not needed") — single biggest cost lever you don't own.

12. **Don't copy the predicate-bloat anti-pattern.** GSD's CONTEXT.md is 600+ lines because they kept adding incident rules to the always-loaded prompt. Cap it: rules that fire on specific paths or commands belong in lint scripts, not the LLM prompt. Keep `.claude/MEMORY.md` lean.
