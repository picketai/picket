# SuperClaude_Framework — Findings

## What it is (2-3 sentences)

SuperClaude is a meta-configuration framework for Claude Code, distributed as the Python package `superclaude` (v4.3.0). It installs **30 slash commands** (`~/.claude/commands/sc/*.md`), **20 specialist agents** (`~/.claude/agents/*.md`), **7 behavioral "modes"** (instruction-injection files), **1 installable Skill** (`confidence-check`), and configures **8 MCP servers** — turning a stock Claude Code install into an opinionated, PDCA-driven development platform. The whole framework is essentially a curated bundle of Markdown files with YAML frontmatter, plus a few Python helpers and a pytest plugin; behaviour comes from the prompts, not from code.

## Architecture at a glance

```
src/superclaude/
├── agents/              20 .md files     (e.g. pm-agent, system-architect, security-engineer)
├── commands/            30 .md files     (e.g. /sc:implement, /sc:brainstorm, /sc:research)
├── modes/                7 MODE_*.md     (Brainstorming, Token_Efficiency, Task_Management, ...)
├── skills/              1 skill           (confidence-check; has SKILL.md + confidence.ts)
├── hooks/               hooks.json       (only SessionStart hook registered)
├── pm_agent/            confidence.py, self_check.py, reflexion.py, token_budget.py
├── execution/           parallel.py, reflection.py, self_correction.py
└── pytest_plugin.py     auto-loaded, exposes 5 fixtures + 9 markers
```

Three orthogonal extension surfaces it uses on Claude Code:

1. **Slash commands** — Markdown files with a frontmatter contract (`name`, `description`, `category`, `complexity`, `mcp-servers`, `personas`). They are *not* executable; they are "context triggers" — typing `/sc:implement` loads the file as a prompt that re-shapes Claude's behaviour for that turn.
2. **Agents** — Markdown persona files with `Triggers`, `Behavioral Mindset`, `Focus Areas`, `Key Actions`, `Outputs`, `Boundaries (Will / Will Not)`. Invoked by name (`@security-engineer`) or auto-activated by keyword.
3. **Modes** — Always-loadable behavioural overlays (`MODE_Token_Efficiency.md` etc.) stacked on top of whatever command/agent is active.

Persistence is offloaded to the **Serena MCP** (a long-running memory service) — every PM Agent action calls `write_memory("key", value)` / `read_memory("key")`. Memory keys follow a hierarchical schema (`learning/patterns/[name]`, `evaluation/auth/check`, etc.).

The PDCA cycle is the spine of the whole system: every non-trivial task runs Plan → Do → Check → Act, and the outputs of each phase are written to a normalised directory `docs/pdca/[feature]/{plan,do,check,act}.md`.

## Techniques for LLM consistency

**1. Frontmatter contract on every file.** Every command and agent starts with the same YAML keys. Example from `implement.md`:

```yaml
---
name: implement
description: "Feature and code implementation with intelligent persona activation..."
category: workflow
complexity: standard
mcp-servers: [context7, sequential, magic, playwright]
personas: [architect, frontend, backend, security, qa-specialist]
---
```

**2. Identical section skeleton across all 20 agents.** Every agent uses the same headings, in the same order: `## Triggers` → `## Behavioral Mindset` → `## Focus Areas` → `## Key Actions` → `## Outputs` → `## Boundaries (Will / Will Not)`. This is the single most copyable consistency lever — when the structure is fixed, output flows into it.

**3. "Will / Will Not" explicit boundaries.** Every agent ends with a hard list:

```
**Will:**
- Identify security vulnerabilities using systematic analysis...
**Will Not:**
- Compromise security for convenience or implement insecure solutions for speed
```

**4. Hardcoded numeric thresholds, not adjectives.** `≥90% confidence to proceed`, `70-89% present alternatives`, `<70% STOP`. `Maximum hop depth: 5 levels`. `Context >75% → Yellow Zone`. `>3 steps → activate Task Management`. Numbers reduce variance versus vague adjectives.

**5. Output-shape templates with fixed columns.** The PM Agent's `check.md` template is a literal markdown table:

```
| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Test Coverage | 80% | 87% | ✅ Exceeded |
```

The LLM has nowhere to deviate.

**6. The Four Questions + 7 Red Flags.** A hardcoded checklist at every "implementation complete" claim:

```
The Four Questions:
1. Are all tests passing? (show output)
2. Are all requirements met? (list items)
3. No assumptions without verification? (show docs)
4. Is there evidence? (test results, code changes, validation)
```

Combined with explicit red flags ("'Tests pass' without output", "'Probably works' language"), it makes success-claims comparable across runs.

**7. Symbol vocabulary in Token-Efficiency mode.** Fixed table maps concepts to symbols (`→`, `⇒`, `∴`, `∵`, `✅`, `🛡️`). When the vocabulary is enumerated, the same idea encodes to the same string.

## Techniques for determinism

**1. PDCA as a state machine.** Plan → Do → Check → Act is enforced by *directory structure*, not by prose. Every feature has `docs/pdca/[feature-name]/{plan,do,check,act}.md`. Each file has a template. Skipping `check.md` is visible from the filesystem.

**2. Phase-based MCP loading** is a gated state machine for tool access:

```
Discovery Phase:    Load [sequential, context7]   → Unload after requirements
Design Phase:       Load [sequential, magic]      → Unload after design approval
Implementation:     Load [context7, magic, morphllm]
Testing:            Load [playwright, sequential]
```

The model can't reach for a tool that isn't loaded — determinism through tool gating.

**3. "STOP AFTER" boundaries on commands.** Both `/sc:brainstorm` and `/sc:research` end with a hard section:

```
**STOP AFTER REQUIREMENTS DISCOVERY**
This command produces a REQUIREMENTS SPECIFICATION ONLY.
Explicitly Will NOT:
- Create architecture diagrams or system designs (use /sc:design)
- Generate implementation code (use /sc:implement)
**Next Step**: After brainstorm completes, use /sc:design...
```

Each command has a tightly scoped exit. The next command is named.

**4. Self-Correcting Execution rule — "MUST BE DIFFERENT".**

```
4. Solution Design (MUST BE DIFFERENT):
   - Previous Approach A failed → Design Approach B
   - NOT: Approach A failed → Retry Approach A
```

Plus enumerated anti-patterns (`❌ "Let's just try again"`) and correct patterns (`✅ "Got an error. Investigating via official documentation"`).

**5. Standardised memory key schema.** Memory keys are namespaced like Kubernetes: `category/subcategory/identifier`. `learning/patterns/supabase-auth`, `evaluation/auth/check`. Cross-session lookups are predictable.

**6. Confidence scoring is a literal weighted sum.** The `confidence-check` skill defines:

```
Total = Check1 (25%) + Check2 (25%) + Check3 (20%) + Check4 (15%) + Check5 (15%)
If Total >= 0.90:  ✅ Proceed
If Total >= 0.70:  ⚠️  Present alternatives
If Total < 0.70:   ❌ STOP
```

5 weighted checks, three branches. There's a `confidence.ts` reference implementation.

## Techniques for efficiency

**1. Pre-execution confidence check (the cheap-pre-check pattern).** Spend 100-200 tokens validating "do I understand this task" before spending 5,000-50,000 tokens implementing. Claimed ROI 25-250x. The single most reusable efficiency pattern in the codebase.

**2. Phase-based MCP loading (zero-token baseline).**

> *"Start: No MCP tools loaded (gateway URL only). Load on-demand per execution phase. Unload after phase completion."*

MCP tool definitions cost context tokens. Lazy-loading per phase reclaims that budget. The framework claims **98% token reduction** via the AIRIS gateway pattern.

**3. Wave → Checkpoint → Wave parallelism.**

```
Wave 1: [Read file1, Read file2, Read file3] (parallel)
   ↓ Checkpoint: Analyze all files together
Wave 2: [Edit file1, Edit file2, Edit file3] (parallel)
```

Claimed 3.5x speedup. Prompts repeatedly tell the model "Always batch similar searches", "Never sequential without reason".

**4. Adaptive depth on `/sc:research`.** Four depth levels with explicit budgets:

```
| Depth | Sources | Hops | Time |
| Quick      | 5-10  | 1 | ~2min |
| Exhaustive | 40+   | 5 | ~10min |
```

The user picks the budget; the model doesn't decide to over-investigate.

**5. Effort allocation by percentage.** `/sc:research`: "1. Understand (5-10%) 2. Plan (10-15%) 3. TodoWrite (5%) 4. Execute (50-60%) 5. Validate (10-15%)". Budgets the *shape* of the work before the model knows what the work is.

**6. Tool-selection matrix.** Orchestration mode hardcodes the winner per task type:

```
| UI components       | Magic MCP       | (alt) Manual coding   |
| Pattern edits       | Morphllm MCP    | (alt) Individual edits |
| Symbol operations   | Serena MCP      | (alt) Manual search    |
```

**7. Session persistence via Serena memory.** `read_memory("pm_context")` at session start instantly restores prior context — the model doesn't re-read 30 files.

## Techniques for cost reduction

**1. Token-Efficiency mode (compression).** Symbol communication + abbreviations claim **30-50% reduction while preserving ≥95% information**:

> *Standard:* "The authentication system has a security vulnerability in the user validation function"
> *Compressed:* `auth.js:45 → 🛡️ sec risk in user val()`

Triggered automatically at context >75%.

**2. Tiered token budgets by task complexity.**

```
Simple (typo fix):   200 tokens
Medium (bug fix):    1,000 tokens
Complex (feature):   2,500 tokens
```

Implemented as a `token_budget` pytest fixture; a hard ceiling per task type.

**3. Resource-zone behaviour.**

```
🟢 Green (0-75%):  Full capabilities, normal verbosity
🟡 Yellow (75-85%): Reduce verbosity, defer non-critical operations
🔴 Red (85%+):     Essential operations only, minimal output, fail fast
```

The model self-throttles based on context utilisation.

**4. Reference-by-path instead of inlining.** Memory holds the *key* (`learning/patterns/supabase-auth`), the file holds the *content* (`docs/patterns/supabase-auth-integration.md`). Saves tokens on every cross-session restore.

**5. "Trial-and-error → formal" promotion.** Raw notes live in `docs/temp/` (cheap, ephemeral, deleted after 7 days). Only validated patterns are *promoted* to `docs/patterns/`. Keeps the long-term knowledge base small and signal-rich.

**6. Monthly pruning enforced by the PM Agent.** Active rule: docs >6 months unused → delete; duplicates → merge; verbose → trim.

**7. Strategic MCP retention.** *"Cache: Strategic tool retention for sequential phases"* — when consecutive phases need the same tool, don't unload then reload.

## Notable patterns worth stealing

**A. The PDCA directory state machine.** `docs/pdca/[feature]/{plan,do,check,act}.md`. Four files per feature, each with a fixed template. Forces a complete cycle and makes incomplete cycles visible. Maps directly to AISpec's `artifacts/plans/` + `artifacts/reports/` flow.

**B. The Confidence-Check skill.** Standalone, 100 lines, weighted-sum scoring with three explicit thresholds. Self-contained — could be lifted into AISpec as-is. The 5 checks (duplicates / arch compliance / official docs / OSS reference / root cause) cover exactly the "wrong-direction" failure mode.

**C. The Will/Will Not boundary section.** Every agent ends with explicit positive and negative scopes. AISpec already does this via "Out of scope" in `<decision_authority>`, but SuperClaude formalises it into a fixed section every agent has.

**D. Namespaced memory keys.** `learning/patterns/[name]`, `evaluation/[feature]/check`, `session/checkpoint`. AISpec's `MEMORY.md` is flat — adopting hierarchical keys would let the index scale.

**E. The "STOP AFTER" exit clause on commands.** Every workflow command says exactly what it produces and what command runs next. Eliminates scope creep. Maps directly to AISpec's hand-off-via-flag pattern.

**F. Phase-based MCP loading.** Same principle applies to *skill loading* — only auto-load a skill at the phase that needs it.

**G. Memory key naming pattern: `[category]/[subcategory]/[identifier]`.** Explicitly cited as inspired by Kubernetes namespaces, Git refs, Prometheus metrics.

**H. Numeric thresholds everywhere instead of adjectives.** `≥90%`, `>75%`, `5 hops`, `200/1000/2500 tokens`. The Confidence-Check skill is the cleanest example.

**I. The Four Questions / 7 Red Flags pattern (SelfCheckProtocol).** A hard checklist applied at every "done" claim. AISpec's reviewer already does this, but the framing — *named* questions and *named* anti-patterns — is more concrete.

**J. Effort-budget percentages inside a single workflow.** `/sc:research` allocates 5-10% / 10-15% / 5% / 50-60% / 10-15% to its five phases. Prevents spending 90% of tokens on phase 1.

## Caveats / things NOT to copy

**1. The framework is overgrown.** 30 slash commands + 20 agents + 7 modes + 8 MCP servers + a Python package + a pytest plugin + a planned TypeScript v5.0 rewrite. Massive duplication: `pm.md` (command), `pm-agent.md` (agent), `MODE_Task_Management.md` (mode), and `docs/agents/pm-agent-guide.md` all describe overlapping behaviour. AISpec should pick *one* surface per behaviour.

**2. Marketing-grade prose in operational files.** Many command files contain sales-y phrases like *"Seamless Orchestration"*, *"Zero-Token Efficiency"*, *"Smarter Agent System"*. These cost tokens at every load and reduce signal-to-noise.

**3. Theatrical "thinking" verbs that aren't real.** PM Agent calls `think_about_task_adherence()`, `think_about_collected_information()`, `think_about_whether_you_are_done()` — these read as Serena MCP method calls but most are prompt patterns that *claim* to invoke reflection. They are not enforced. If you copy this, be honest that it's a prompt, not a function.

**4. PDCA template files end up empty.** `docs/mistakes/test_database_connection-2026-03-22.md` contains:

> `## 🔍 Root Cause` → `Not analyzed`
> `## 🤔 Why Missed` → `Not analyzed`
> `## 🛡️ Prevention Checklist` → `Not documented`

When the framework auto-generates a template but doesn't fill it, it produces noise that pollutes the knowledge base. AISpec should require non-empty fields or not generate the file.

**5. Heavy MCP dependency.** Many efficiency claims ("98% token reduction") depend on installing airis-mcp-gateway, Serena, Tavily, Context7 — not free, require Docker, not universally available. Core patterns survive without MCPs, but the advertised numbers don't.

**6. Frontmatter `personas: [architect, frontend, backend, security, qa-specialist]` is informational only.** It looks like a routing directive but it's just prose to the model. The actual routing happens via @-mentions and natural-language triggers.

**7. The "20 agents" are uneven in quality.** `pm-agent.md` is 692 lines and richly detailed; `system-architect.md` is 49 lines and could be a paragraph. AISpec's roles should pick a target length per agent type.

**8. Monthly maintenance is asserted, not scheduled.** PM Agent says it does monthly pruning, but nothing actually triggers monthly. It's aspirational.

**9. Mixed languages in operational files.** `next_actions.md` is half English, half Japanese. Copying patterns across language boundaries silently degrades.

**10. SessionStart hook does almost nothing.** `hooks.json` registers only one hook — a 10-second `./scripts/session-init.sh`. Claude Code exposes 28 hook events; SuperClaude uses 1. The framework's own architecture docs flag this as a gap.

## Concrete recommendations for AISpec

Mapped against AISpec's existing surfaces (analyst / consultant / architect / developer / reviewer + skills + `artifacts/` + `MEMORY.md`):

**1. Add a Confidence-Check skill** modelled on SuperClaude's `confidence-check`, but scoped to AISpec's pipeline:
- Run at the start of *every* developer/architect invocation
- Five weighted checks: (a) does the ADR/plan exist?, (b) has the reviewer signed off on the previous phase?, (c) are MEMORY.md terms current?, (d) is the request scoped within the agent's `<decision_authority>`?, (e) are all input artifacts in their expected paths?
- Three branches: ≥90 → proceed, 70-89 → ask one clarifying question, <70 → stop and `PAUSED — <reason>`
- 100-200 tokens of overhead per invocation, prevents wrong-direction phases that cost thousands

**2. Normalise every agent file to the same section skeleton.** Today AISpec agents have a similar shape but not an enforced one. Lock in: `<role_identity>` → `<operating_constraints>` → `<deliverables>` → `<decision_authority>` → `<instructions>` → `<rules>` → `<interaction_model>` → `<completion_criteria>` → `<output_format>`. Already mostly there — make it formal.

**3. Steal the "Will / Will Not" section, add it to every agent.** AISpec already has `<decision_authority>` (autonomous / escalate / out of scope). Append a literal `## Will / Will Not` block to make the boundary visible at the bottom of every file.

**4. Adopt namespaced memory keys.** Rewrite `MEMORY.md` index entries as `glossary/<term>`, `decisions/<short-title>`, `flags/<term>`. Agent memory files become `agent/<role>/<topic>`. Matches Kubernetes/Git conventions and lets the team grep by namespace.

**5. Adopt the PDCA directory state machine — but lighter.** AISpec already has `artifacts/plans/`, `artifacts/adr/`, `artifacts/reports/`. Add an implicit phase structure inside each plan file: every plan has anchors `<!-- status:phase-N -->` (already present) plus an explicit `## Plan / ## Do / ## Check / ## Act` per phase. The developer fills `Do`, the reviewer fills `Check`, the architect fills `Act` (amendments). Same files, three writers, deterministic states.

**6. Add hard numeric thresholds to existing rules.** Examples:
- "Read every decided-to-read source in full" → "Read every file; for directories >30 files apply BFS cap at 60 reads" *(already present — extend elsewhere)*
- Reviewer verdicts: numeric severity bands (Critical/Major/Minor with counts) instead of free-form prose
- Architect plan phases: cap at N phases, each ≤M tasks

**7. Add a Token-Efficiency mode trigger.** When an agent's input context exceeds a threshold (e.g. >100K tokens), switch to compressed output — symbol vocabulary, table-based outputs, no decorative prose. Skill auto-loaded at the trigger.

**8. Add a SelfCheckProtocol to the reviewer.** Formalise the *questions* it must answer:
- Are all acceptance criteria met? (list)
- Is there test evidence for each? (paste or link)
- Has the ADR's key decision survived? (quote it)
- Are there speculation-language red flags in the developer's progress note? ("probably", "should work", "tests pass" without output)
- Verdict is `APPROVED` only if all four pass.

**9. Add per-command "STOP AFTER" exit clauses.** Each agent's `<output_format>` already terminates with a flag-token block. Make the *next agent* explicit. E.g. the analyst's output block could end with `Next: architect (if architectural flag) | consultant (if strategic flag) | user (no flags)`.

**10. Adopt effort-budget percentages on long workflows.** The architect's plan-creation could include phase budgets ("Phase 1 should consume ~10% of the implementation budget"). Forces calibration up front.

**11. Don't copy:** the MCP-heavy infrastructure, the marketing prose, the bilingual files, the `think_about_*` pseudo-tool-calls, the empty templated mistake files, the v5.0 plugin rewrite.

**12. Do copy verbatim:** the Confidence-Check skill (with AISpec-scoped checks), the namespaced memory key convention, the Will/Will-Not section, the PDCA template structure, the numeric-threshold-everywhere style, the SelfCheckProtocol Four Questions, and the explicit "STOP AFTER" exit clauses.
