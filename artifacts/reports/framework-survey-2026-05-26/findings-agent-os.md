# agent-os — Findings

## What it is (2-3 sentences)

`agent-os` is a lightweight, **prompt-only** scaffolding system by Brian Casel that helps AI coding agents (Claude Code, Cursor, etc.) discover, store, and inject project-specific coding **standards**, plus shape feature **specs** before implementation. It is purely a collection of slash-command markdown prompts (`/discover-standards`, `/inject-standards`, `/index-standards`, `/plan-product`, `/shape-spec`) plus bash installers — there are **no agents, no skills, no runtime, no orchestration**. The user runs commands; the LLM follows the prompt.

## Architecture at a glance

Three concepts only:

1. **Profiles** (`profiles/<name>/`) — bundles of starter standards/templates copied into a project on install. `config.yml` defines profile inheritance (`inherits_from`). The shipped `default` profile contains essentially one file (`global/tech-stack.md`).
2. **Commands** (`commands/agent-os/*.md`) — five slash-command prompts, copied to `.claude/commands/agent-os/` per project.
3. **Project artifacts** (created by commands at runtime, under `agent-os/` in the user's project):
   - `agent-os/standards/<folder>/<name>.md` — one terse rule file per pattern
   - `agent-os/standards/index.yml` — **machine-readable index** mapping `folder.name → one-line description`
   - `agent-os/product/{mission,roadmap,tech-stack}.md` — product context
   - `agent-os/specs/YYYY-MM-DD-HHMM-<slug>/{plan,shape,standards,references}.md` — per-feature spec folder

The whole framework is ~1,900 lines of markdown + bash. No Python, no TypeScript, no agent loop, no validation runtime. **Everything is enforced by prompt discipline alone.**

## Techniques for LLM consistency

1. **Hard-coded step numbering inside each command.** Every command file is structured as `### Step 1`, `### Step 2`, etc., with explicit transitions ("Wait for user response before proceeding"). This is the framework's main consistency mechanism — the LLM is told exactly what to do and in what order.

2. **One canonical interaction tool.** Every command opens with: *"Always use AskUserQuestion tool when asking the user anything."* Forcing structured questions instead of free-form prompts produces parseable, repeatable user replies.

3. **Inline output templates with fenced examples.** Each step ships a fully-rendered example block the LLM is meant to mimic. Example from `discover-standards.md`:

   ```
   Here's the draft for api/response-format.md:
   ---
   # API Response Format
   ...
   ```

   The LLM imitates the surface form rather than inventing one.

4. **"Good vs Bad" side-by-side exemplars.** `discover-standards.md` includes a `**Good:**` and `**Bad:**` example of a standard file, making the desired output shape mechanically obvious.

5. **Forced loop discipline.** `discover-standards.md` Step 3: *"For each selected standard, you MUST complete this full loop before moving to the next standard… Do NOT batch all questions upfront."* This prevents the LLM's natural tendency to enumerate all questions at once.

6. **Reserved-keyword conventions.** `root` is explicitly reserved (refers to files directly under `agent-os/standards/`, not a subfolder). Naming both the convention and the trap reduces drift.

## Techniques for determinism

1. **Deterministic spec folder naming.** `shape-spec.md` Step 6: `YYYY-MM-DD-HHMM-{feature-slug}/`. Timestamp + ≤40-char slug. Two runs an hour apart cannot collide.

2. **Task 1 is always the same.** *"Task 1 always being 'Save spec documentation'"* — every spec plan starts with the identical bootstrap task. The user always knows where artifacts land.

3. **Schema-shaped index file** (`index.yml`):
   ```yaml
   folder:
     filename:
       description: one short sentence
   ```
   Strict, no prose. Alphabetised by folder then filename — order is mechanical, not stylistic.

4. **Gated mode-detection.** `inject-standards.md` has a three-way scenario switch (Conversation / Skill / Plan). If detection is uncertain, the rule is explicit: *"Always ask when uncertain — don't assume conversation by default."* Refusing the default is itself a determinism technique.

5. **Plan-mode prerequisite.** `shape-spec.md` opens with a hard precondition: *"Before proceeding, check if you are currently in plan mode… Do not proceed with any steps below until confirmed."* A gating pattern with an explicit stop.

6. **Bash-side determinism for installer concerns.** Inheritance chain resolution, circular-dependency detection, and index-file generation are done in bash, not by the LLM (`project-install.sh` lines 127-158, 278-382). Anything that can be expressed in shell is taken away from the LLM.

7. **Explicit imperative verbs.** *"Read…", "Wait for…", "Use AskUserQuestion to…", "Do NOT batch…"* — consistent forms across all five commands.

## Techniques for efficiency

1. **Index-first lookup, lazy file reads.** The single biggest pattern. `index.yml` lists every standard with a one-line description. `/inject-standards` reads only the **index** to suggest matches, then reads the full standard file **only after** the user confirms it is relevant. From `inject-standards.md`: *"The index enables `/inject-standards` to suggest relevant standards without reading all files."*

2. **Reference-vs-copy choice for embedding.** When injecting standards into a skill or plan, the LLM asks:
   ```
   1. References — Add @ file paths that point to the standards
   2. Copy content — Paste the full standards content
   ```
   Lets the user trade freshness for self-containment.

3. **Two operating modes per command.** `/inject-standards` has *Auto-Suggest* (no args, LLM matches via index) and *Explicit* (`/inject-standards api/response-format`) which skips the suggestion step entirely. Power users pay no token tax for guesswork.

4. **Scoped codebase analysis.** `discover-standards.md` Step 2: *"Read key files in that area (5-10 representative files)"* — a hard cap that prevents whole-repo reads.

5. **Diff-only index updates.** `/index-standards` classifies files as new / deleted / unchanged and only re-evaluates the new ones. Existing descriptions are preserved verbatim (see `get_existing_description` awk routine in `project-install.sh` lines 301-327).

6. **Pre-resolved inheritance.** Profile inheritance is flattened at install time (bash), not at command time. The LLM never sees the inheritance chain.

## Techniques for cost reduction

1. **"Standards must be scannable by AI agents without bloating context windows."** Stated upfront in `discover-standards.md`. The framework's entire raison d'être for standards is token-frugality.

2. **The "Writing Concise Standards" ruleset** (`discover-standards.md` lines 167-196):
   - *Lead with the rule* — state what to do first
   - *Use code examples* — show, don't tell
   - *Skip the obvious* — don't document what code makes clear
   - *One standard per concept*
   - *Bullet points over paragraphs*

   The Bad example is a verbose paragraph; the Good example is 5 lines with a fenced JSON block.

3. **`@`-reference inlining for plans/skills.** `@agent-os/standards/api/response-format.md` is preferred over copy-paste, keeping plans slim and avoiding redundancy if the standard updates.

4. **One-sentence index descriptions.** *"Keep descriptions to **one short sentence** — they're for matching, not documentation."* The whole index stays under a single screen of tokens for most projects.

5. **No persistent agent memory.** There is no equivalent of AISpec's per-agent `MEMORY.md`. Cost is bounded because there is no growing memory store to load each turn.

6. **Suggestions capped.** `/inject-standards` Step 4: *"Keep suggestions focused — typically 2-5 standards. Don't overwhelm with too many options."* A hard upper bound on the menu.

## Notable patterns worth stealing

1. **Index file as a cheap retrieval layer.** A YAML index with one-line descriptions, mechanically alphabetised, is a poor man's vector store — match against the index (cheap) before reading the body (expensive). **AISpec does not have this for skills, ADRs, plans, or reports.**

2. **"Lead with the rule" prose style for reusable knowledge.** Every standard opens with the imperative form. Transferable style guide for any short reference document.

3. **Good/Bad exemplar pairs** inside command prompts. Showing the LLM exactly what to avoid is more effective than telling it.

4. **"Forbid batching" loop discipline.** *"Do NOT batch all questions upfront — process one at a time through the full loop."* Useful for any iterative workflow where intermediate user input changes downstream questions.

5. **Mode/scenario switch with explicit "ask when unsure" rule.** Three-way detection that refuses to fall through to a default is a clean disambiguation pattern.

6. **Deterministic per-feature folder naming** (`YYYY-MM-DD-HHMM-slug/`). Sorts easily, never collides, human-readable.

7. **Task 1 is always the bootstrap save.** Forces the spec to be persisted before any code is written.

8. **Reference vs Copy choice** when embedding referenced content — explicit user trade-off rather than a silent default.

## Caveats / things NOT to copy

1. **Single-agent assumption.** Every command is written for one LLM doing everything. No multi-agent hand-off, no role separation. AISpec's analyst/consultant/architect/developer/reviewer split is **more sophisticated** — do not regress.

2. **No validation / no review gate.** Nothing checks that a standard the LLM drafts actually matches the patterns in the codebase. *"Standards guide, not dictate"* — agent-os is willing to be wrong. AISpec's reviewer-led dual-approval gate is stronger.

3. **No machine-checked filenames.** Spec slug is generated freehand by the LLM ("max 40 chars"). AISpec's `scripts/filename.mjs` deterministic stem generator is more reliable.

4. **No confidence markers, no provenance.** Findings/standards have no `[VERIFIED]/[INFERRED]` tagging. Trust is implicit.

5. **`AskUserQuestion`-everywhere is chatty.** Confirmation-per-standard, confirmation-per-description, confirmation-per-creation. Token-cheap individually but conversation-heavy. AISpec's "plan → dual-approval" model batches better.

6. **No bounded contexts / strategic layer.** No concept analogous to AISpec's consultant role or `artifacts/strategy/` charters.

7. **`agent-os/specs/<timestamp>` accretes forever.** No archiving / no GC strategy mentioned. Becomes noise over months.

8. **Five commands, no skill auto-loading.** AISpec's `skills:` frontmatter mechanism (skills auto-loaded by named agents) is more powerful than free-form slash commands the user must remember to invoke.

## Concrete recommendations for AISpec

1. **Add an index file for ADRs, plans, and reports.** Today `artifacts/adr/`, `artifacts/plans/`, and `artifacts/reports/` have no machine-readable manifest. Mirror agent-os's `index.yml`:
   ```yaml
   # artifacts/adr/index.yml
   "00001":
     slug: auth-middleware
     decision: Move JWT validation into dedicated middleware
     status: accepted
   ```
   The architect maintains it; downstream agents read the index first and only `Read` the full ADR when its one-line decision matches the current task. Direct cost saving on every architect/developer turn.

2. **Add an index file for skills.** `.claude/skills/index.yml` with `name → one-line "when to use"` would let agents discover skills without globbing the directory or loading every `SKILL.md`. Particularly useful as skill count grows.

3. **Add a "concise writing" sub-skill or doc.** Extract agent-os's *"Writing Concise Standards"* rule block (Lead with the rule / Show don't tell / Skip the obvious / One concept per file / Bullets) into `.claude/skills/documenting/concise-writing.md` and reference it from every template that produces reusable reference material. AISpec's templates currently say *"length scales with the source; verbose where it aids understanding"* — fine for reports, but skill/ADR/glossary content should be optimised for **future re-load cost**, not first-write clarity.

4. **Add Good/Bad exemplars to skill and template files.** Each template under `.claude/skills/documenting/templates/` could ship a `**Good:**` / `**Bad:**` pair (agent-os style). Currently AISpec has `examples/<type>.md` but the user is told *not* to read them by default. A short inline Good/Bad pair inside each template would land for free on every load.

5. **Steal the "ask when uncertain — never default" pattern.** AISpec already does this for audience detection (good). Extend to **flag-token routing**: when a finding could plausibly need either `[ARCHITECT REVIEW NEEDED]` or `[CONSULTANT REVIEW NEEDED]`, the analyst should ask rather than silently pick.

6. **Cap "read" scope in the analyst's step 5 directory rule with a tighter inner number.** Agent-os hard-caps at "5-10 representative files." AISpec's analyst caps at 60 reads via BFS — useful but generous. Consider a tighter inner cap ("read 5-10 representative files first, expand only if the step-6 model is unanswerable") to cut tokens on routine analyses.

7. **Adopt deterministic per-task folders for in-progress work.** AISpec has `artifacts/plans/<stem>.md` (single file). Agent-os's `agent-os/specs/YYYY-MM-DD-HHMM-slug/` folder pattern would let the architect bundle a plan with its source notes, references, and visuals.

8. **Add an `inherits_from` profile concept for skill packs.** Agent-os's `config.yml` profile inheritance (`profiles/rails → inherits_from: default`) lets a team ship a domain-specialised skill set without forking the base. AISpec's skills are flat; a profile layer would let users layer "fintech-skills" on top of "default-skills" cleanly.

9. **Do not adopt:** `AskUserQuestion`-per-step chattiness, lack of confidence markers, single-agent assumption, or absence of review gates. AISpec is already past agent-os on all four.
