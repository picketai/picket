# mattpocock/skills — Findings

## What it is (2-3 sentences)

A flat, install-pick-what-you-want collection of Claude Code "skills" (slash commands + behaviour packs) hand-curated by Matt Pocock for daily real engineering work — grilling sessions, TDD loops, bug diagnosis, triage state machines, PRD/issue generation, architectural deepening, prototyping, handoffs, and a "caveman mode" for terse output. Skills are independent and composable; each one is a folder with a `SKILL.md` plus optional reference docs and scripts, distributed via the `skills.sh` installer (`npx skills@latest add mattpocock/skills`). There is no global orchestrator, no agent roster, no plans/ADRs/memory pipeline — the user is the orchestrator and the skills are the pieces.

## Architecture at a glance

```
repo root
├── README.md            human-facing catalogue of every skill
├── CLAUDE.md            agent-facing layout rules (where skills live, how they're listed)
├── CONTEXT.md           project's own DDD-style glossary (Issue tracker / Issue / Triage role)
├── skills/
│   ├── engineering/     daily code work (tdd, diagnose, grill-with-docs, triage, ...)
│   ├── productivity/    non-code workflow (grill-me, caveman, handoff, write-a-skill)
│   ├── misc/            rarely used (git-guardrails, scaffold-exercises, ...)
│   ├── personal/        not promoted
│   ├── in-progress/     drafts
│   └── deprecated/      retired
└── docs/adr/            this repo's own ADRs (self-hosting the technique)
```

Every skill is a directory with this shape:

```
skill-name/
  SKILL.md              required; frontmatter (name, description) + body
  REFERENCE.md / *.md   bundled docs read on demand
  scripts/              deterministic helpers (rare)
```

The frontmatter the agent sees is tiny:

```yaml
---
name: skill-name
description: <what it does>. Use when <trigger keywords / situations>.
---
```

That `description` is the only thing loaded into the system prompt — everything else is fetched lazily when the skill fires.

## Techniques for LLM consistency

1. **Frozen vocabulary lists per skill.** `improve-codebase-architecture/LANGUAGE.md` defines `Module`, `Interface`, `Implementation`, `Depth`, `Seam`, `Adapter`, `Leverage`, `Locality` and explicitly forbids near-synonyms ("`_Avoid_`: unit, component, service" / "`_Avoid_`: boundary"). The SKILL body opens with: "Use these terms exactly in every suggestion. Consistent language is the point — don't drift into 'component,' 'service,' 'API,' or 'boundary.'" Rule-based in-output vocabulary lock-in.

2. **Project-level glossary as a runtime input.** `grill-with-docs` and `improve-codebase-architecture` both read a `CONTEXT.md` at session start and use those terms in every output, so the same skill produces consistent prose across different repos because each repo brings its own vocabulary. Compare AISpec's `.claude/MEMORY.md` — same role, different shape (mattpocock's is strict glossary, AISpec's is glossary + decisions log).

3. **Explicit anti-pattern callouts inside the prompt.** The `tdd` skill has a full "Anti-Pattern: Horizontal Slices" section with a labelled good/bad ASCII diagram (`WRONG (horizontal): ... / RIGHT (vertical): ...`). Naming the failure mode and showing the contrast is far more reliable than "do TDD properly."

4. **Reusable templates inlined with placeholders.** Every output-producing skill (`to-prd`, `to-issues`, `triage`'s needs-info, `grill-with-docs`'s ADR/CONTEXT format) ships a literal markdown template inside `<prd-template>` / `<issue-template>` / fenced blocks. The model fills slots rather than inventing structure.

5. **Banned-list discipline.** `caveman` is built from a single rule list: "Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging." Combined with worked examples ("Not: ... Yes: ...") — pure pattern matching, very repeatable.

## Techniques for determinism

1. **State machines with explicitly named states.** `triage` defines five canonical state roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) plus two category roles (`bug`, `enhancement`) and writes out every legal transition: *"an unlabeled issue normally goes to `needs-triage` first; from there it moves to `needs-info`, `ready-for-agent`, `ready-for-human`, or `wontfix`. `needs-info` returns to `needs-triage` once the reporter replies."* The whole skill is then "look at current state → run the matching procedure." Same family as AISpec's dual-approval gate + `**Status: Complete**` anchors.

2. **Numbered, gated phases.** `diagnose` has six numbered phases ("Phase 1 — Build a feedback loop … Phase 6 — Cleanup + post-mortem") and embeds hard gates between them: *"Do not proceed to Phase 2 until you have a loop you believe in."* / *"Do not proceed until you reproduce the bug."* / *"Never refactor while RED. Get to GREEN first."* Mirrors AISpec's `<instructions>` step ordering and the reviewer's per-phase gate.

3. **Canonical role names mapped to project-specific strings.** `triage` separates the canonical role (what the LLM reasons about) from the actual label string (what the agent applies via `gh`). The mapping lives in `docs/agents/triage-labels.md`, written once by `setup-matt-pocock-skills`. Same indirection AISpec uses with `scripts/filename.mjs` — push variable bits into config, keep prompt language fixed.

4. **Hard refusal rules.** `grill-with-docs` on ADRs: "Only offer to create an ADR when **all three** are true: 1. Hard to reverse. 2. Surprising without context. 3. The result of a real trade-off. If any of the three is missing, skip the ADR." Three booleans, all-must-be-true, no ambiguity.

5. **Deterministic checklists at end of phase.** Every phase of `tdd` and `diagnose` ends with markdown checkboxes ("Original repro no longer reproduces", "Regression test passes (or absence of seam is documented)", etc.). The LLM either ticks them or has to surface why it can't.

6. **One question at a time.** Every grilling skill enforces this explicitly: *"Ask the questions one at a time, waiting for feedback on each question before continuing."* Prevents compressing five questions into one mega-question.

## Techniques for efficiency

1. **Progressive disclosure via bundled reference files.** The framework's signature pattern. `SKILL.md` is short (intentionally < 100 lines per the `write-a-skill` checklist) and points to `[tests.md](tests.md)`, `[mocking.md](mocking.md)`, `[refactoring.md](refactoring.md)`, read only on demand. `tdd/SKILL.md` is ~110 lines; its full reference set (`tests.md`, `mocking.md`, `interface-design.md`, `refactoring.md`, `deep-modules.md`) is several times that and never loaded unless TDD fires *and* the moment-to-moment work needs the specific page.

2. **Description-only system-prompt cost.** Per `write-a-skill/SKILL.md`: *"The description is **the only thing your agent sees** when deciding which skill to load. It's surfaced in the system prompt alongside all other installed skills."* Full body is fetched only after the description is picked. Budget: max 1024 chars.

3. **"Use when …" trigger language.** Every description ends with explicit triggers so routing is fast and deterministic:
   - `tdd`: *"Use when user wants to build features or fix bugs using TDD, mentions 'red-green-refactor', wants integration tests, or asks for test-first development."*
   - `diagnose`: *"Use when user says 'diagnose this' / 'debug this', reports a bug, says something is broken/throwing/failing, or describes a performance regression."*
   - `caveman`: *"Use when user says 'caveman mode', 'talk like caveman', 'use caveman', 'less tokens', 'be brief', or invokes /caveman."*

4. **Code exploration over interrogation.** Hard rule in `grill-me` and `grill-with-docs`: *"If a question can be answered by exploring the codebase, explore the codebase instead."* A few Read/Grep tokens beat a question round-trip with the user.

5. **Lazy file creation.** Every persistent-state file (`CONTEXT.md`, `docs/adr/`, `.scratch/`) is created the first time it's actually written to — never up front. *"Create files lazily — only when you have something to write."*

6. **`disable-model-invocation: true`** on `zoom-out` and `setup-matt-pocock-skills`. User-invoked only — never auto-routed. Stops the model from "discovering" them mid-unrelated work.

7. **Sub-agents for codebase walks.** `improve-codebase-architecture` step 1: *"use the Agent tool with `subagent_type=Explore` to walk the codebase."* The huge exploration cost is paid in a child context that doesn't pollute the parent.

## Techniques for cost reduction

1. **SKILL.md under 100 lines.** `write-a-skill` enforces this as a checklist item. When something exceeds, it splits to a sibling `.md`. Smaller always-loaded surface area.

2. **Reference depth capped at one.** `write-a-skill` checklist: "[ ] References one level deep." `SKILL.md` can point to `REFERENCE.md`, but `REFERENCE.md` can't recursively pull more files. Prevents unbounded fetch chains.

3. **Skip-the-greeting rule.** `caveman` strips articles, pleasantries, hedging, conjunctions; uses arrows for causality; abbreviates `DB/auth/config/req/res/fn/impl`. Claim: ~75% token reduction. The same posture (terse bullets, no prose paragraphs) appears in `to-issues` and `triage` templates.

4. **No file paths or line numbers in long-lived artifacts.** `to-prd` and `to-issues` both warn: *"Do NOT include specific file paths or code snippets. They may end up being outdated very quickly."* / `AGENT-BRIEF.md`: *"Don't reference file paths — they go stale."* Behavioural descriptions instead — cheap to write, durable across refactors.

5. **Out-of-temp-dir scratch writes.** `handoff` and `improve-codebase-architecture`'s HTML report both write to the OS temp dir (`$TMPDIR` / `%TEMP%`), not into the repo. Keeps git diffs clean and avoids the model later re-reading those files as project artifacts.

6. **One ADR = one paragraph.** `grill-with-docs/ADR-FORMAT.md`: *"An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections."* Optional sections only when they add value. Drastically cheaper than AISpec's full ADR template.

7. **Disclaimer prefix, not a separate post.** Every triage comment starts with `> *This was generated by AI during triage.*` — one line in the same comment, not a meta-message.

## Notable patterns worth stealing

- **`description: <capability>. Use when <triggers>.`** as a literal convention. Two sentences, < 1024 chars. Improves auto-loading for any skill not pre-attached via `skills:` frontmatter.
- **Bundled `LANGUAGE.md` for in-output vocabulary lock.** The architecture skill enforces `Module / Interface / Seam / Adapter / Depth` in every suggestion. AISpec could do the same for analyst/architect/consultant outputs and forbid near-synonyms.
- **State machine with canonical → project-specific mapping.** `triage`'s split between canonical role names (in-prompt) and project label strings (in `docs/agents/triage-labels.md`) is a clean template for AISpec's `**Status: Complete**` and review-flag tokens.
- **Disclaimer prefix on AI-generated content.** Trivially copyable to ADRs, plans, or reports.
- **Three-condition ADR trigger** (`hard to reverse` AND `surprising without context` AND `real trade-off`). AISpec architect/consultant could adopt this gate.
- **HTML report to temp dir.** The architectural review uses Tailwind + Mermaid via CDN to render before/after module diagrams. AISpec analyst reports could optionally produce a sibling HTML view when call graphs are the point.
- **`scripts/hitl-loop.template.sh`.** A copyable bash template with `step` and `capture` helpers for human-in-the-loop reproduction. The agent runs it; the user follows prompts; captured `KEY=VALUE` lines feed back.
- **One-sentence skills.** `zoom-out` is literally three lines: *"I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary vocabulary."*
- **"Throwaway from day one"** marking. `prototype` requires the artifact be named so a casual reader knows it's not production code.

## Caveats / things NOT to copy

- **No multi-agent orchestration.** mattpocock's skills assume a single Claude Code session. No analogue to AISpec's analyst/architect/consultant/developer/reviewer pipeline, no team-lead message routing, no flag tokens like `[ARCHITECT REVIEW NEEDED]`. Stealing the skill structure does **not** mean abandoning your agent topology.
- **Glossary-only `CONTEXT.md`.** mattpocock is dogmatic: *"`CONTEXT.md` should be totally devoid of implementation details… It is a glossary and nothing else."* AISpec's `.claude/MEMORY.md` is broader (glossary + decisions log). If you tighten AISpec's MEMORY toward pure glossary, split the decisions out into ADRs/SDRs — don't lose them.
- **"100 lines" is a hard cap that mattpocock himself violates.** `diagnose/SKILL.md` is ~120 lines, `tdd/SKILL.md` ~110, `triage/SKILL.md` ~105. Treat as smell threshold, not fail.
- **No versioning / no compatibility statements.** Skills are versioned only via git. If you adopt the install model, you'll need a story for "skill X v2 changes its description, which breaks routing for users on v1."
- **Caveman mode is a sledgehammer.** ~75% token reduction comes at the cost of readability for outputs anyone reads later. Don't apply caveman compression to ADRs, plans, or reports.
- **CDN dependency in the architecture report.** Tailwind + Mermaid from CDN means the HTML report breaks offline and pins behaviour to whatever CDN serves on a given day. Bundle locally if adopting.
- **`disable-model-invocation: true` is Claude Code-specific frontmatter.** Not portable to other agents.
- **No skill composition contract.** Skills call other skills informally ("run `/grill-with-docs` for grilling"), but there's no machine-readable dependency graph and no enforcement that the called skill is installed. AISpec's `skills:` frontmatter is stricter and better.

## Concrete recommendations for AISpec

1. **Tighten skill descriptions to the `<one-sentence capability>. Use when <triggers>.` convention.** Audit `documenting/SKILL.md`, `understanding/SKILL.md`, and any other skills against this. Each description < 1024 chars, explicit trigger sentence. Sharpens skill auto-loading anywhere skills aren't pre-attached via `skills:` frontmatter.

2. **Add an in-output `LANGUAGE.md` bundle for each agent's outputs.** mattpocock's `improve-codebase-architecture/LANGUAGE.md` enforces `Module / Interface / Seam / Adapter / Depth / Leverage / Locality` and forbids "component / service / API / boundary." AISpec analyst already has `<domain_vocabulary>` — promote it to a `templates/assets/vocabulary.md` that the report template includes by reference. Do the same for architect (ADR/plan terms), consultant (charter/SDR terms), reviewer (verdict tokens). Cuts cross-agent drift.

3. **Adopt the three-condition ADR/SDR trigger.** Hard "all three must be true" gate per artifact type: hard-to-reverse + surprising-without-context + result-of-a-real-trade-off. Currently the architect and consultant probably emit ADRs/SDRs more eagerly than needed.

4. **Move `Status: Complete` anchors and review-flag tokens into a `tokens.yaml` registry.** mattpocock-style: canonical names in the prompt (`COMPLETE`, `ARCHITECT REVIEW NEEDED`, `STRATEGIC REVIEW NEEDED`, `ARCHITECT AMENDMENT NEEDED`) → concrete strings in a single config file. AISpec's `documenting/templates/assets/tokens.yaml` already exists for confidence markers — extend it to cover all routing tokens.

5. **Add an `Anti-patterns` section to every long-lived agent prompt.** mattpocock's TDD skill calls out "horizontal slicing" by name with a labelled good/bad diagram. AISpec analyst already has `<anti_patterns>`; audit consultant, architect, developer, reviewer for the same shape.

6. **Adopt the disclaimer prefix on AI-authored ADRs/plans/reports.** Single line at the top: `> *This artifact was generated by an AI agent during the <analyst|architect|consultant|developer|reviewer> phase.*` Cheap traceability.

7. **Steal the `prototype` skill verbatim.** AISpec has no equivalent. The two-branch routing (logic prototype = terminal app with state surfaced after each action; UI prototype = several variants on one route, switchable by URL param) is good design, and the shared rules ("throwaway from day one, named as such; one command to run; no persistence; surface the state; delete or absorb when done") apply directly to AISpec's developer phase when designs are still soft.

8. **Steal `zoom-out` as a literal tiny skill.** Three lines. Useful for analyst and developer. Demonstrates that not every skill needs template + workflow + checklist.

9. **Steal `caveman` as a per-message override**, scoped to non-durable outputs (chat replies, status pings) — explicitly forbid it for ADRs, plans, reports, and any artifact under `artifacts/`. Keep mattpocock's `## Auto-Clarity Exception` for security warnings and multi-step sequences.

10. **Adopt the "reference depth capped at one" rule for AISpec skills.** Currently `documenting/SKILL.md` → `templates/*.md` → `templates/assets/*.md` is two hops. Either flatten or formalize the depth limit.

11. **Consider a `setup-aispec` skill.** mattpocock's `setup-matt-pocock-skills` writes one-time per-repo config (issue tracker choice, label vocabulary, domain doc layout). AISpec's equivalent would scaffold `artifacts/`, `.claude/MEMORY.md`, team setup, project-specific token overrides — run-once, then never. Codifies onboarding to new repos.

12. **Don't import the whole "skills are flat, no agents" worldview.** mattpocock's skills work because *the user* is the orchestrator. AISpec already has a richer architecture (named teammates, dual-approval gates, owned artifact directories). Pull the prompt-engineering techniques out of mattpocock's skills; leave the topology alone.
