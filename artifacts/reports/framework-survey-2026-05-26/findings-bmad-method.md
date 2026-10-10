# bmad-method — Findings

## What it is (2-3 sentences)

bmad-method ("Build More Architect Dreams") is an open-source agile-style framework for AI-driven software development. It ships a roster of named persona agents (Mary the analyst, John the PM, Winston the architect, Amelia the dev, Sally the UX designer, Paige the tech writer) plus a catalogue of "skills" (BMad's word for workflows) that walk the LLM through the full lifecycle: brainstorm → brief → PRD → architecture → epics → sprint → story → dev → code review → retrospective. Its central idea: **story files** are the canonical hand-off unit, and a separate "context engine" skill builds an exhaustive, self-contained context document for every story so the dev agent never has to re-derive anything.

## Architecture at a glance

- **Module + skill registry.** Modules (e.g. `bmm` = the main method, `cis`, `tea`, `gds`) are declared in `bmad-modules.yaml`. Inside each module, skills live in numbered phase directories — for bmm: `1-analysis/`, `2-plan-workflows/`, `3-solutioning/`, `4-implementation/`. Each skill is a directory containing `SKILL.md` (the prompt), `customize.toml` (per-skill overrides), and optional `steps/`, `templates/`, `checklist.md`, `data/`.
- **Two layers per agent/skill: `SKILL.md` is hardcoded behaviour, `customize.toml` is the override surface.** `SKILL.md` ships with the package and is overwritten on every update ("DO NOT EDIT — overwritten on every update"). `customize.toml` defines persona fields (name, icon, principles, persistent_facts, menu) and is resolved at activation through a four-layer merge (base → team → user) via `resolve_customization.py`.
- **Phases are gated by status fields in a `sprint-status.yaml` file.** Stories progress: `backlog → ready-for-dev → in-progress → review → done`. Each skill reads the file, finds the first story matching a target status, mutates the status atomically, and writes back. This is the central state machine.
- **Step-file ("micro-file") architecture.** Larger workflows (code-review, create-architecture) split logic into `steps/step-01-*.md`, `step-02-*.md`, etc. The parent `SKILL.md` says "Read fully and follow `./steps/step-01-init.md`" — and each step file ends with `## NEXT: Read fully and follow ./step-02-…md`. Only one step file is loaded at a time.
- **Project state lives in three plain-text/markdown files at known paths.** `_bmad/<module>/config.yaml` (config), `{planning_artifacts}/epics.md` (epic+story BDD specs), `{implementation_artifacts}/sprint-status.yaml` (status state machine), and `{implementation_artifacts}/<story-key>.md` (one file per story).

## Techniques for LLM consistency

1. **Persona files with fixed name/title.** The dev agent is "Amelia". The name and title are non-configurable, hardcoded in frontmatter; only icon, persistent_facts, principles, and menu can be overridden. This anchors the persona regardless of LLM.

2. **`persistent_facts` array — sticky context loaded once per session.** Every agent and workflow's `customize.toml` has it. Entries are either literal sentences or `file:` references (globs supported):
   ```toml
   persistent_facts = ["file:{project-root}/**/project-context.md"]
   ```
   BMad's answer to "always remember my coding standards" without re-prompting every turn.

3. **Explicit role + communication style strings.** Each agent's `customize.toml` carries four fields concatenated into the system prompt:
   ```toml
   role        = "Implement approved stories with test-first discipline ..."
   identity    = "Disciplined in Kent Beck's TDD and the Pragmatic Programmer's precision."
   communication_style = "Ultra-succinct. Speaks in file paths and AC IDs — every statement citable. No fluff, all precision."
   principles  = ["No task complete without passing tests.", "Red, green, refactor — in that order.", "Tasks executed in the sequence written."]
   ```
   Every session starts with the same persona contract.

4. **Hard-coded checklists.** `bmad-create-story/checklist.md` is a 350-line second-pass validator that re-runs story creation from a fresh context, scoring against the same rubric. The framing is competitive ("Outperform and Fix the Original Create-Story LLM") — a deliberate adversarial trick.

5. **Templates with placeholders.** `bmad-create-story/template.md` is the literal markdown skeleton with fixed section names. The dev agent's `SKILL.md` then says: *"Only modify the story file in these areas: Tasks/Subtasks checkboxes, Dev Agent Record (Debug Log, Completion Notes), File List, Change Log, and Status"* — a write-scope contract enforced by prose.

6. **XML-tagged inline workflows.** The dev-story workflow uses `<workflow>`, `<step n="5" goal="...">`, `<action>`, `<check if="...">`, `<critical>`, `<goto step="9">` tags inside markdown. These tags are *not* parsed by code — they're a visual structure to make the LLM read sequentially and respect control flow.

## Techniques for determinism

1. **Status state machine.** Stories can only move through fixed states. Skills assert the *expected previous state* before transitioning: *"Verify current status is 'in-progress' (expected previous state)"*. A mismatched precondition emits a warning, not a silent rewrite.

2. **Atomic "find first matching story" loops.** Every status-changing skill begins with: load full sprint-status.yaml, read top-to-bottom, find the FIRST story matching a status, store `{{story_key}}`. The line `<critical>MUST read COMPLETE sprint-status.yaml file from start to end to preserve order</critical>` forbids skipping ahead.

3. **Deterministic filenames.** Story files are keyed `{epic_num}-{story_num}-{story_title}.md` (e.g. `1-2-user-authentication.md`). The skill parses the filename to recover metadata. No name negotiation, no LLM choice.

4. **HALT conditions are explicit, prose-coded.** Every step lists exit conditions inline:
   ```xml
   <action if="3 consecutive implementation failures occur">HALT and request guidance</action>
   <action if="story file inaccessible">HALT: "Cannot develop story without access to story file"</action>
   ```

5. **Hard "no" rules at the top of every workflow.** Dev-story opens with five `<critical>` lines: *"Execute ALL steps in exact order; do NOT skip steps"*, *"Absolutely DO NOT stop because of 'milestones', 'significant progress', or 'session boundaries'"*. Anti-laziness prompts as architecture.

6. **Step-file gating: one step at a time.**
   > **NEVER** load multiple step files simultaneously
   > **ALWAYS** read entire step file before execution
   > **NEVER** skip steps or optimize the sequence

   BMad's main token-rationing AND determinism mechanism — the LLM literally cannot see the next step until it has finished the current one.

7. **A/P/C menus as decision gates.** After each major decision in `bmad-create-architecture`, the LLM must present `[A]dvanced Elicitation / [P]arty Mode / [C]ontinue` and **must not load the next step until C is chosen**: *"💾 ONLY save when user chooses C. 🚫 FORBIDDEN to load next step until C is selected."*

8. **`stepsCompleted` frontmatter on built artifacts.** Architecture documents track completion as YAML frontmatter (`stepsCompleted: [1, 2, 3, 4]`). The next step refuses to run if predecessors aren't listed.

## Techniques for efficiency

1. **Just-in-time step loading.** `SKILL.md` is small (~50-100 lines of persona + activation), then loads exactly one numbered step file (~50-150 lines) at a time.

2. **`discover-inputs.md` protocol with three load strategies:**
   - `FULL_LOAD` — every file in a sharded directory.
   - `SELECTIVE_LOAD` — one specific shard using a template variable like `{{epic_num}}`.
   - `INDEX_GUIDED` — load only `index.md`, then *choose* which sibling docs to pull. *"DO NOT BE LAZY -- use best judgment to load documents that might have relevant information, even if there is only a 5% chance of relevance. When in doubt, LOAD IT."*

3. **Sharded docs (`bmad-shard-doc` skill).** Large markdown docs are physically split into `architecture/index.md` + one file per `## ` section using `@kayvan/markdown-tree-parser`. The original is deleted — "Keeping both the original and sharded versions defeats the purpose of sharding."

4. **Sprint-status as a tiny pointer file.** Rather than re-scan `implementation_artifacts/`, every status-driven workflow reads one small YAML file to find what to do next.

5. **Parallel sub-agents for code review.** `bmad-code-review` launches three reviewers in parallel — Blind Hunter (diff only, no context), Edge Case Hunter (diff + project read), Acceptance Auditor (diff + spec). Findings deduplicated and merged. The Blind Hunter receiving **no project context** is a deliberate cost/quality trade — a fresh-eyes pass that's cheap and catches things context-laden reviewers rationalize away.

6. **Graceful degradation.** *"If any subagent fails, times out, or returns empty results, append the layer name to `{failed_layers}` (comma-separated) and proceed with findings from the remaining layers."*

7. **Per-story context engine.** `bmad-create-story` pre-loads epic, architecture, previous story, UX, recent commits, web research **once**, condenses into a single story file. Dev-story then explicitly forbids: *"NEVER implement anything not mapped to a specific task/subtask in the story file"* — the story is the entire context.

## Techniques for cost reduction

1. **Hierarchical config resolution via Python script.** `resolve_customization.py` is called once at activation to merge four TOML/YAML layers and emit one compact resolved blob. The LLM never reads raw config files.

2. **`bmad-help` as routing layer with a CSV manifest.** A single CSV row per skill (`module,skill,display-name,menu-code,description,phase,preceded-by,followed-by,required,output-location,outputs`) is enough to route "what should I do next?" without loading any actual skill file.

3. **Different LLM tiers for different tasks.** `bmad-party-mode` accepts `--model`. The prompt: *"choose the model that fits the round: use a faster model (like haiku) for brief or reactive responses, and the default model for deep or complex topics."*

4. **The `--solo` escape hatch.** Party mode optionally drops the subagent fan-out and roleplays all agents in one response. Cheaper when independence isn't critical.

5. **Reusing prior story's intel.** *"If story_num > 1, load previous story file."* The dev agent doesn't repeat onboarding for every story.

6. **Prompt-files fallback for missing subagent support.** Step 2 of code review: *"If subagents are not available, generate prompt files in `{implementation_artifacts}` — one per reviewer role — and HALT. Ask the user to run each in a separate session (ideally a different LLM) and paste back findings."* Moves cost onto a different (often cheaper) LLM.

7. **Strict "modify only these sections" contract.** Dev-story can only write to a fixed list, preventing the LLM from rewriting the whole file (massive output-token saving).

## Notable patterns worth stealing

1. **The story-file as the implementation contract.** One `1-2-user-authentication.md` file contains: ACs, Tasks/Subtasks checkboxes, Dev Notes (architecture extracts, previous-story learnings, library versions, file structure rules), Dev Agent Record (where dev *writes back* its actions), File List, Change Log, Status. **One file = one unit of work, fully self-contained.** Your AISpec plans are similar but split across plan + ADR.

2. **`<step n="5" goal="...">` XML tags inside markdown prompts.** Cheap, human-parseable, gives the LLM a strong visual cue.

3. **The adversarial second-pass checklist.** `bmad-create-story/checklist.md` re-runs the workflow in a fresh context to find what the first pass missed, then *integrates suggestions silently* (*"make them look natural, as if they were always there. DO NOT reference the review process"*). Cheap LLM-on-LLM QA.

4. **Three-layer parallel adversarial review.** Blind Hunter (no context) + Edge Case Hunter (context) + Acceptance Auditor (spec). Merge by deduplication, classify into `decision_needed / patch / defer / dismiss`.

5. **Persistent-facts pattern.** `file:{project-root}/**/project-context.md` globs auto-loaded at every activation. Per-agent and project-scoped. Note: overlaps with your `.claude/MEMORY.md` — bmad treats it as immutable context, not an evolving log.

6. **Customization layers (base → team → user) with explicit merge semantics.** *"Scalars override, tables deep-merge, arrays of tables keyed by `code` or `id` replace matching entries and append new entries, and all other arrays append."* One script, predictable, testable.

7. **Status as ground truth.** A single small YAML file is the source of truth for "what next?". Replaces a lot of "ask the LLM what's happening" cost.

8. **Persona names + icons.** Mary, John, Winston, Sally, Amelia, Paige — humans (and LLMs) anchor on names better than role labels. Icons (📊 🏗️ 💻) prefix every message.

## Caveats / things NOT to copy

1. **Verbosity bloat.** Many SKILL.md files are 400-500 lines and repeat activation boilerplate ("Step 1: Resolve the Workflow Block" + fallback instructions) in every skill. Heavy duplication. Your `skills:` frontmatter auto-load + shared `documenting` skill is leaner.

2. **Emoji-heavy prompts.** `🛑 🔥 🎯 🚨 ✅ ❌ 💪 🚀` everywhere. Token tax, and clashes with your existing no-emoji rule.

3. **Competitive/dramatic framing.** *"Outperform and Fix the Original Create-Story LLM"*, *"COMPETITION to create the ULTIMATE story context"*, *"DISASTER"*, *"make it IMPOSSIBLE"*. Effective in moderation, but risks LLMs going too aggressive.

4. **Python script dependency.** `resolve_customization.py`, `resolve_config.py` need Python 3.10+. Your npm-based framework with `filename.mjs` (JS) avoids cross-runtime overhead.

5. **Status update can desync.** Several skills warn: *"Story file updated, but sprint-status.yaml may be out of sync."* Distributed state without a transaction = bugs. Mostly deterministic but not transactional.

6. **"Reinvention Prevention" prompts in the checklist** lean on the LLM to detect duplicate functionality — fails on large codebases. Better to ground in tool calls (grep) than prose.

7. **A/P/C menus interrupt flow.** Forces the user back into the loop at every step. Great for discovery, fatiguing for repeat tasks.

8. **No real schema validation.** Templates are markdown skeletons with `{{placeholders}}`. Nothing validates that the LLM fills them correctly — the validator is another LLM pass. Schema-enforced output would be more deterministic.

## Concrete recommendations for AISpec

Against your existing setup (analyst, consultant, architect, developer, reviewer + skills + `artifacts/` + `.claude/MEMORY.md`):

1. **Adopt a per-phase "implementation contract" file.** Today an architect plan + ADR pair carry the design; the developer reads both. Consider folding into one canonical "story" file per phase with explicit write-scope ("dev may only modify these sections"). Push your `<!-- status:phase-N -->` anchor further — give each phase its own file.

2. **Add a status-tracking sidecar.** `artifacts/plans/<plan>/status.yaml` listing each phase + state (`pending / in-progress / approved-user / approved-reviewer / complete`) would replace the current "scan plan file for `**Status: Complete**`" pattern. Faster to parse, atomic to mutate. Your dual-approval gate writes here.

3. **Steal the step-file pattern for long skills.** If any of your skills approach 200+ lines, split into `steps/step-NN-*.md` with explicit "Read fully and follow ./step-02.md" hand-offs. Cuts loaded tokens per invocation.

4. **Add a `persistent_facts` field to your agent frontmatter.** Today you load `MEMORY.md` and skills via `skills:`. A typed `persistent_facts: [file:CLAUDE.md, file:.claude/agent-memory/{agent}/MEMORY.md]` would make the contract explicit and standardize how every agent picks up sticky context.

5. **Adversarial second-pass for the analyst.** When analyst writes a report to `artifacts/reports/`, a follow-up "second-analyst" pass in a fresh context could re-do the analysis against a competitive checklist and emit a diff of missed findings. Catches gaps cheaply.

6. **Three-layer reviewer.** Today your reviewer is one pass with one verdict. Split into: Blind Hunter (diff only, no project, no ADR), ADR-Compliance Auditor (diff + governing ADR), Edge Case Hunter (diff + project read). Merge findings into your existing dual-approval format. Running the no-context reviewer first is particularly clever — it surfaces issues the context-aware reviewers rationalize away.

7. **Your filename derivation is already better than bmad's** (your `filename.mjs` is more disciplined than bmad's prose-based naming). Keep it. Consider extending: for plans/ADRs, a sequence-prefixed-and-suffixed scheme could encode dependencies in names.

8. **A/P/C-style explicit gates between architect/developer/reviewer.** You already do dual-approval. Consider tighter "next phase forbidden until BOTH approvals received" check enforced by the developer agent itself reading `status.yaml`, rather than the team lead routing — fewer round-trips.

9. **`bmad-help` CSV manifest equivalent.** A single `.claude/skills/_index.csv` row per skill listing `name,description,preceded-by,followed-by,phase` would make "what should I do next?" answerable without loading any skill files.

10. **Skip the emoji and dramatic framing.** Your repo already forbids emoji and prefers measured prose — keep that. The *structural* ideas (XML-tagged steps, status state machines, persistent_facts, step-file splitting, parallel reviewers, story-as-contract) are independent of rhetorical style and translate cleanly.
