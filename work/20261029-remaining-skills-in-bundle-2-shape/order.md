---
kind: order
lane: order
title: Remaining skills in bundle 2 shape
date: 2026-10-30
audience: developer
sources: [request.md, preflight.txt, artifacts/refactor/16-remaining-skills.md, artifacts/reports/instructions-candidates-2026-10-25.md (bundle 2 line 99, bundle 6 line 104), src/skills/debugging/SKILL.md, src/skills/explaining/SKILL.md, src/skills/inspecting/SKILL.md, src/skills/proofreading/SKILL.md, src/skills/resuming/SKILL.md, src/skills/summarizing/SKILL.md, src/skills/ticketing/SKILL.md, src/skills/proofreading/steps/10-passes.md, src/skills/ticketing/steps/10-draft.md, src/skills/ticketing/steps/20-jira.md, src/skills/debugging/steps/30-diagnose.md, src/skills/explaining/steps/10-gather.md, src/skills/explaining/steps/20-walk.md, src/skills/consulting/SKILL.md, src/skills/documenting/SKILL.md, src/skills/researching/SKILL.md, test/repo/skills.test.mjs, test/support/instructions.mts, test/support/routing.mts, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/timing/budgets.test.mjs, docs/reference/skills.md, .claude/rules/harness-authoring.md, node --test baseline of skills and descriptions tests (22 of 22 pass at 34ff9fd)]
phases:
  - n: 1
    files: [src/skills/debugging/SKILL.md, src/skills/explaining/SKILL.md, src/skills/proofreading/SKILL.md, test/repo/skills.test.mjs]
    greps:
      - path: src/skills/debugging/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/debugging/SKILL.md
        pattern: '^argument-hint: "<symptom>"'
      - path: src/skills/debugging/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Rules that hold|\| When \| Read \|))'
        flags: i
      - path: src/skills/explaining/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/explaining/SKILL.md
        pattern: '^argument-hint: "<scenario or concept>"'
      - path: src/skills/explaining/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Rules that hold|\| When \| Read \|))'
        flags: i
      - path: src/skills/proofreading/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/proofreading/SKILL.md
        pattern: '^argument-hint: "<path or pasted text>"'
      - path: src/skills/proofreading/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Four rules|## Step 0|## Levels|\| When \| Read \|))'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: 'UNCONVERTED_SKILLS = \["benchmarking", "branching", "inspecting", "resuming", "summarizing", "ticketing", "understanding"\]'
    tests: true
    drive: false
  - n: 2
    files: [src/skills/inspecting/SKILL.md, src/skills/resuming/SKILL.md, src/skills/summarizing/SKILL.md, src/skills/ticketing/SKILL.md, test/repo/skills.test.mjs]
    greps:
      - path: src/skills/inspecting/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/inspecting/SKILL.md
        pattern: '^!`picket list --human`'
      - path: src/skills/inspecting/SKILL.md
        pattern: '^!`picket cost --human`'
      - path: src/skills/inspecting/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|argument-hint))'
        flags: i
      - path: src/skills/resuming/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/resuming/SKILL.md
        pattern: '^argument-hint: "\[<work-id>\]"'
      - path: src/skills/resuming/SKILL.md
        pattern: '^!`picket list --human`'
      - path: src/skills/resuming/SKILL.md
        pattern: '^(?![\s\S]*user-invocable)'
        flags: i
      - path: src/skills/summarizing/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/summarizing/SKILL.md
        pattern: '^argument-hint: "\[branch or repo hint\]"'
      - path: src/skills/summarizing/SKILL.md
        pattern: '^disable-model-invocation: true'
      - path: src/skills/summarizing/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Repositories|## Template, first match|## Sources, in priority|## Character limit|## Deliver))'
        flags: i
      - path: src/skills/ticketing/SKILL.md
        pattern: '^when_to_use: >\s+Use when'
      - path: src/skills/ticketing/SKILL.md
        pattern: '^argument-hint: "\[--pull\|--create\|--update\] \[--story\|--change\|--bug\|--debt\|--spike\|--epic\] <text or key>"'
      - path: src/skills/ticketing/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Routing|## Layout))'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: 'UNCONVERTED_SKILLS = \["benchmarking", "branching", "understanding"\]'
    tests: true
    drive: false
  - n: 3
    files: [src/skills/debugging/steps/reproduce.md, src/skills/debugging/steps/localize.md, src/skills/debugging/steps/diagnose.md, src/skills/explaining/steps/gather.md, src/skills/explaining/steps/walk.md, src/skills/proofreading/steps/passes.md, src/skills/proofreading/steps/apply.md, src/skills/ticketing/steps/draft.md, src/skills/ticketing/steps/jira.md, src/skills/debugging/SKILL.md, src/skills/explaining/SKILL.md, src/skills/proofreading/SKILL.md, src/skills/ticketing/SKILL.md, test/repo/skills.test.mjs]
    greps:
      - path: src/skills/debugging/steps/reproduce.md
        pattern: '^# Debugging: reproduce\b'
      - path: src/skills/debugging/steps/localize.md
        pattern: '^# Debugging: localize\b'
      - path: src/skills/debugging/steps/diagnose.md
        pattern: '^# Debugging: diagnose\b'
      - path: src/skills/explaining/steps/gather.md
        pattern: '^# Explaining: \S'
      - path: src/skills/explaining/steps/walk.md
        pattern: '^# Explaining: \S'
      - path: src/skills/debugging/steps/localize.md
        pattern: '^(?![\s\S]*step 3 writes)'
        flags: i
      - path: src/skills/debugging/steps/diagnose.md
        pattern: '^(?![\s\S]*(from step 2|steps 1 and 2))'
        flags: i
      - path: src/skills/proofreading/steps/passes.md
        pattern: '^(?![\s\S]*from step 0)'
        flags: i
      - path: src/skills/debugging/SKILL.md
        pattern: '^(?![\s\S]*steps/\d\d-)'
        flags: i
      - path: src/skills/explaining/SKILL.md
        pattern: '^(?![\s\S]*steps/\d\d-)'
        flags: i
      - path: src/skills/proofreading/SKILL.md
        pattern: '^(?![\s\S]*steps/\d\d-)'
        flags: i
      - path: src/skills/ticketing/SKILL.md
        pattern: '^(?![\s\S]*steps/\d\d-)'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: '^(?![\s\S]*src/skills/(debugging|explaining|proofreading|ticketing)/steps/)'
        flags: i
    tests: true
    drive: false
---
# Order: Remaining skills in bundle 2 shape

## Problem

The request implements `artifacts/refactor/16-remaining-skills.md` (draft, 2026-10-30): seven skills take bundle 2's frontmatter and section shape with no behaviour change, and `UNCONVERTED_SKILLS` in `test/repo/skills.test.mjs:23` shrinks to `benchmarking`, `branching` and `understanding`. The shape is already checked: `frontmatterProblems` fails `user-invocable: true` and a listing over 1,536 characters, `sectionProblems` wants one purpose paragraph (no blank line before the first `##`), then exactly `## Steps`, `## Rules`, `## Output`, with `## Steps` holding only ordered items and indented continuation lines (fences outside `## Steps` are skipped). Routing already reads `description` and `when_to_use` joined (`test/support/routing.mts:71`), and the budget test finds "Use when" in either and caps `description` alone at 1,024. One fact in the draft is wrong: its Today table says `names`, `headers` and `lists` are empty, but they list nine step files of these skills (OQ-001).

## Decisions

### D-001: Frontmatter split keeps today's words and usage strings
**Decision:** In each of the seven, `description` keeps the sentences that say what the skill does. The "Use when" sentence, with its trigger phrases and the redirect sentences ("A question about how working code works goes to `picket:explaining` or `picket:researching`."), moves to `when_to_use`, which opens with "Use when". The `/picket:<skill> …` usage line leaves `description` and becomes `argument-hint`, quoted, with the exact argument text `docs/reference/skills.md` already shows: debugging `"<symptom>"`, explaining `"<scenario or concept>"`, proofreading `"<path or pasted text>"`, resuming `"[<work-id>]"`, summarizing `"[branch or repo hint]"`, ticketing `"[--pull|--create|--update] [--story|--change|--bug|--debt|--spike|--epic] <text or key>"`. `inspecting` takes no `argument-hint` (bundle 6's list); its usage line moves into its purpose paragraph, as `documenting` does ("Invoked as `/picket:documenting …`"). `summarizing` keeps `disable-model-invocation: true` and its "User-invoked only" sentence in `description`. Every `user-invocable: true` goes.
**Instead of:** rewriting the trigger phrases to fit the new field: the request says no behaviour change, and phrase rewrites change what routing scores.
**Risks:**
- **RISK-001** The usage words (`symptom`, `scenario`, `pasted`) leave the routed text, and a routing case drops. Mitigation: a share under 0.95 or a pair at cosine 0.75 is fixed by adding the lost word to that skill's `when_to_use` phrase; `test/repo/description-cases.json` and the thresholds stay as they are.

### D-002: Sections by role, text moved not reworded
**Decision:** The body becomes: one purpose paragraph (the skill's first sentence of intent, from its description or its opening line); `## Steps`, one ordered list; `## Rules`; `## Output`. The `Input: $ARGUMENTS …` line becomes step 1, with its empty-input action. A `| When | Read |` or `| Operation | Read |` row becomes one item, "<trigger>: read `steps/NN-name.md`", with today's step file paths. A procedural section becomes steps in its own order: proofreading's `## Step 0` (scope line, then read `references/recurring-errors.md`), summarizing's `## Repositories`, template lookup, source gathering, count and deliver. Standing rules go under `## Rules`: "Rules that hold throughout", proofreading's four rules and Levels table with the minimal-intervention paragraph, ticketing's provider and item tables, item-type inference, operation line and self-check, summarizing's template order, sources order and character limit, explaining's reference-answer pointer. `## Output` keeps each output block, the replies table and the notes under it; summarizing's `## Deliver` and inspecting's render block move there. `## Layout` goes: `ticketing/steps/10-draft.md:5` already says when to read templates and examples. A sentence is moved whole; only step connectives ("then", "read") and cross-references that named a removed heading change.
**Instead of:** tightening each rule as it moves: draft 16 D-2 makes a rule that reads wrong once moved a review finding, not a rewrite here.
**Risks:**
- **RISK-002** A step file names a heading or number that no longer exists. Mitigation: the only one found is `proofreading/steps/10-passes.md:31` "the reader from step 0", which becomes "the reader named in the scope line"; `30-diagnose.md:34`, `20-walk.md:3`, `10-gather.md:50`, `10-draft.md:12` and `20-jira.md:35` cite `SKILL.md` content that stays in it.

### D-003: Injected command output stays at line start, in the purpose paragraph
**Decision:** The injection lines (a `!` followed by a backticked command) for `picket list --human` and `picket cost --human` in `inspecting`, and for `picket list --human` in `resuming`, stay at the start of their own lines, joined to the purpose paragraph with their labels ("Work items:", "Cost, this project:") and no blank line between, so the section check sees one paragraph. Step 1 then says "print the work items and cost above". Inspecting's fenced render block moves to `## Output`, and step 2 points at it, because a fence at column 0 breaks the one-list rule of `## Steps`.
**Instead of:** the injections as continuation lines inside step 1: this repo has never verified that Claude Code expands an indented `!` command, and a silent miss is a behaviour change. What it gives up: the purpose paragraph carries live output, not only purpose.

### D-004: Step files lose their numbers, and steps are cited by name
**Decision:** The nine step files of debugging, explaining, proofreading and ticketing move with `git mv` to their name without the `NN-` prefix (`steps/10-reproduce.md` to `steps/reproduce.md`). Each opens `# <Skill>: <name>`, keeping today's name words (`# Debugging: diagnose and hand off`, `# Explaining: gather the data`). A file with no ordered list outside fences gets one by turning an existing action sequence into a numbered list, sentences unchanged. A reference to a step by number ("step 3 writes it as a test", "the shrunk input from step 2", "from steps 1 and 2") becomes the step's name ("the diagnose step"), because the SKILL.md numbering after phase 1 starts at the input step and no longer matches. Every citation of an old path (the four SKILL.md files, `reproduce.md:27`, `gather.md:52`, `draft.md:14`) and the `PENDING` entries follow the rename. This is the phase after phases 1 and 2, so it edits their citations once.
**Instead of:** renaming inside phases 1 and 2, skill by skill: phase 1 is already under way, and a rename split across two phases leaves `PENDING` half-updated at the phase 1 gate.
**Risks:**
- **RISK-003** `picket verify` of an earlier phase runs again at a later checkpoint and fails on a renamed file. Mitigation: no earlier phase's `files` or `greps` names a step file; phase 1's check of the "step 0" fix moved to phase 3 on `steps/passes.md`.

## Scope

**In:**
- Frontmatter and body of the seven `SKILL.md` files, the one stale reference in `proofreading/steps/10-passes.md`, and `UNCONVERTED_SKILLS`.
- The step files of debugging, explaining, proofreading and ticketing in bundle 2's shape (D-004), and their `PENDING.names`, `headers` and `lists` entries removed.

**Out:**
- The step files of `branching` and `understanding`: their `PENDING.names`, `headers` and `lists` entries stay (OQ-002).
- `benchmarking`, `branching`, `understanding` (D9, D5, D4).
- `docs/reference/skills.md`: usage strings and behaviour do not change. `test/repo/description-cases.json`: never edited to make routing pass.
- The uncommitted `artifacts/refactor/README.md` and `artifacts/refactor/16-remaining-skills.md`: the user's, left unstaged.

## Phase 1: debugging, explaining, proofreading

**Touch set:**
- `src/skills/debugging/SKILL.md`: frontmatter split, sections
- `src/skills/explaining/SKILL.md`: frontmatter split, sections
- `src/skills/proofreading/SKILL.md`: frontmatter split, sections
- `src/skills/proofreading/steps/10-passes.md`: stale "step 0" reference
- `test/repo/skills.test.mjs`: three names leave `UNCONVERTED_SKILLS`

**Changes:** Apply D-001 and D-002 to the three skills. Debugging: step 1 the input, steps 2 to 4 the three step files; its seven "rules that hold throughout" paragraphs under `## Rules`; diagnosis block, the `Red:`/`Root cause:` sentence and the replies table under `## Output`. Explaining: step 1 the input, then gather, then "read the reference answer for the mode once per session", then walk; the marker list and its paragraphs under `## Rules`. Proofreading: step 1 the input, step 2 the scope line, step 3 the recurring-errors read, step 4 the five passes, step 5 apply on "apply", "fix them", "apply the L0s". Remove `debugging`, `explaining`, `proofreading` from `UNCONVERTED_SKILLS`.

**Done when:**
- **T-1.1** Each of the three files has `description` with no "Use when" and no `/picket:` usage, `when_to_use` opening "Use when" with today's trigger phrases and redirects, the `argument-hint` D-001 names, and no `user-invocable` key.
- **T-1.2** Each body is a purpose paragraph, then `## Steps` (one ordered list whose step 1 carries the `$ARGUMENTS` line and its empty-input action), `## Rules`, `## Output`, and no other level-2 heading.
- **T-1.3** Every sentence of today's file is still present, moved; the developer's block names any sentence whose words changed beyond a connective or a cross-reference.
- **T-1.4** `proofreading/steps/10-passes.md` refers to the scope line instead of "step 0"; no other step file of the three skills changes.
- **T-1.5** `UNCONVERTED_SKILLS` lists the seven remaining names, `PENDING.names`, `headers`, `lists`, `repeats` and `claims` are unchanged, and `test/repo/description-cases.json` has no diff.
- **T-1.6** `picket check` prints `CHECK OK`, with the skills shape, routing share and budget tests passing.

## Phase 2: inspecting, resuming, summarizing, ticketing

**Touch set:**
- `src/skills/inspecting/SKILL.md`: frontmatter split, sections, D-003
- `src/skills/resuming/SKILL.md`: frontmatter split, sections, D-003
- `src/skills/summarizing/SKILL.md`: frontmatter split, sections
- `src/skills/ticketing/SKILL.md`: frontmatter split, sections, Layout goes
- `test/repo/skills.test.mjs`: four names leave `UNCONVERTED_SKILLS`

**Changes:** Apply D-001 to D-003. Inspecting: the usage line and the two injections in the purpose paragraph; steps 1 to 3 as today; the `not run` and ledger paragraphs under `## Rules`; the render block under `## Output`. Resuming: the injection in the purpose paragraph; steps 1 to 4 as today; "Never rewrite `state.yaml` by hand…" under `## Rules`; `## Output` states today's reply forms (the packet printed verbatim, or one line for `close` and `none`). Summarizing: steps for input, repositories, template, sources, write, count, deliver; template order with its keep-and-tick paragraph, sources order with its writing paragraph, and the character limit under `## Rules`; `## Deliver` under `## Output`. Ticketing: steps for input, draft (`steps/10-draft.md`), platform calls (`steps/20-jira.md`); provider text and table, item-type inference, item table, operation line and the self-check paragraph under `## Rules`; today's first rules paragraph ("Output is pure Markdown in the template's exact section order…") moves whole to `## Output`. Remove the four names from `UNCONVERTED_SKILLS`.

**Done when:**
- **T-2.1** Each of the four files has `description` with no "Use when" and no `/picket:` usage line, `when_to_use` opening "Use when" with today's trigger phrases, and no `user-invocable` key; resuming, summarizing and ticketing carry the `argument-hint` D-001 names, inspecting none.
- **T-2.2** `summarizing/SKILL.md` keeps `disable-model-invocation: true`, and no other of the seven sets it.
- **T-2.3** In `inspecting` and `resuming`, every `!` command line of today is still at column 0, inside the one purpose paragraph, and step 1 refers to its output.
- **T-2.4** Each body is a purpose paragraph, `## Steps` as one ordered list, `## Rules`, `## Output`, with no `## Layout`, `## Routing`, `## Repositories` or `## Deliver` left.
- **T-2.5** Every sentence and table row of today's file is still present, moved; the developer's block names any sentence whose words changed beyond a connective or a cross-reference.
- **T-2.6** `UNCONVERTED_SKILLS` is exactly `benchmarking`, `branching`, `understanding`, the other `PENDING` lists and `test/repo/description-cases.json` are unchanged, and `picket check` prints `CHECK OK`.

## Phase 3: Step files in bundle 2 shape

**Touch set:**
- `src/skills/debugging/steps/`: three renames, headers, lists, step names
- `src/skills/explaining/steps/`: two renames, headers, a list
- `src/skills/proofreading/steps/`: two renames, a list
- `src/skills/ticketing/steps/`: two renames, one citation
- `src/skills/debugging/SKILL.md`: step citations
- `src/skills/explaining/SKILL.md`: step citations
- `src/skills/proofreading/SKILL.md`: step citations
- `src/skills/ticketing/SKILL.md`: step citations
- `test/repo/skills.test.mjs`: nine, five and four `PENDING` entries leave

**Changes:** Apply D-004. Renames: debugging `10-reproduce`, `20-localize`, `30-diagnose` to `reproduce`, `localize`, `diagnose`; explaining `10-gather`, `20-walk` to `gather`, `walk`; proofreading `10-passes`, `20-apply` to `passes`, `apply`; ticketing `10-draft`, `20-jira` to `draft`, `jira`. Headers: debugging's three drop ", step N"; explaining's two gain the `Explaining: ` prefix; proofreading and ticketing headers already pass. Lists: `localize.md` numbers its hypothesis procedure (write "if X then Y", test with the smallest experiment, record the result); `diagnose.md` numbers its clean-up actions; `walk.md` numbers "Check before sending"; `passes.md` numbers pass 1's six sweeps and the two integrity checks. Step references by number in `localize.md:32` and `diagnose.md:7` and `:24` become step names. Old paths are deleted by the move; the directory bullets above own those deletions in the phase commit.

**Done when:**
- **T-3.1** The nine new paths exist, the nine `NN-` paths do not, and `git log --follow` on each new path reaches the old one (moved, not rewritten).
- **T-3.2** Each of the nine files opens `# <Skill>: <name>` and holds an ordered list outside fences.
- **T-3.3** No file under `src/` or `docs/` cites any of the nine old paths, and no step file of the four skills refers to another step by number.
- **T-3.4** `PENDING.names` lists only the `branching` and `understanding` step files, `PENDING.headers` and `PENDING.lists` only the `understanding` ones, and `PENDING.repeats` and `PENDING.claims` are unchanged.
- **T-3.5** Every sentence of the nine files is still present; the developer's block names any sentence whose words changed beyond a list marker, a header or a step reference.
- **T-3.6** `picket check` prints `CHECK OK`.

## Open questions

- **OQ-002** The answer to OQ-001 asks for `names`, `headers` and `lists` to end empty, but they also list two step files of `branching` (names) and three of `understanding` (names, headers, two in lists), which draft 16 D-1 keeps for D5 and D4. Convert those too? Owner: user. Fallback: they stay listed; phase 3 empties the lists of the four skills only.
- **OQ-001** [answered 2026-10-30: yes, phase 3] Draft 16's Today table says `names`, `headers` and `lists` are already empty, but `test/repo/skills.test.mjs:28-63` lists nine step files of debugging, explaining, proofreading and ticketing under `names` (the `NN-` prefix), five under `headers` and four under `lists`. Bring them into bundle 2's shape in this item (a third phase: `git mv` to kebab names, `# <Skill>: <name>` headers, ordered lists, the SKILL.md citations updated)? Owner: user. Fallback: out of scope; those lists stay as they are and the SKILL.md steps cite today's `NN-` names.

## Revision log
- 2026-10-30: D-004 (r1): new, with phase 3: step files of four skills take bundle 2 shape; OQ-001 answered yes; phase 1 passes check moved to phase 3
