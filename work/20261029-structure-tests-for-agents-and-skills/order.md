---
kind: order
lane: order
title: Structure tests for agents and skills
date: 2026-10-29
audience: developer
sources: [request.md, artifacts/refactor/10-structure-tests.md, src/lib/shared/work/block.mts, src/lib/shared/work/block.test.mts, src/lib/shared/verdicts.mjs, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/verbs/route/commit.mts, src/lib/verbs/packet/packet.mjs, src/lib/util/yaml-lite.mts, src/agents/analyst.md, src/agents/architect.md, src/agents/developer.md, src/agents/reviewer.md, src/skills/expediting/SKILL.md, src/skills/*/SKILL.md, test/repo/references.test.mjs, test/support/routing.mts, test/support/kernel-sources.mts, scripts/test.mjs, package.json, tsconfig.json]
phases:
  - n: 1
    files: [src/lib/shared/work/block.mts, src/lib/shared/work/block.test.mts, src/lib/hooks/guard/block/index.mts, src/lib/verbs/route/commit.mts, src/lib/hooks/route/verdict/index.mts, src/lib/verbs/packet/packet.mjs]
    greps:
      - path: src/lib/shared/work/block.mts
        pattern: 'export const BLOCK_FIELDS\b'
      - path: src/lib/shared/work/block.mts
        pattern: 'export type BlockField\b'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function blockField\b'
      - path: src/lib/shared/work/block.mts
        pattern: '"Waivers"'
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'BlockField'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'BlockField'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '^(?![\s\S]*\^Classes:)'
        flags: i
      - path: src/lib/verbs/route/commit.mts
        pattern: 'blockField\('
      - path: src/lib/verbs/route/commit.mts
        pattern: '^(?![\s\S]*fields\.commit)'
        flags: i
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'blockField\('
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '^(?![\s\S]*\bb\.fields\b)'
        flags: i
    tests: true
    drive: true
  - n: 2
    files: [test/support/instructions.mts, test/repo/agents.test.mjs]
    greps:
      - path: test/repo/agents.test.mjs
        pattern: 'const PENDING = \["src/agents/analyst\.md", "src/agents/architect\.md", "src/agents/developer\.md", "src/agents/reviewer\.md"\]'
      - path: test/repo/agents.test.mjs
        pattern: 'const PARTS = \["Entry", "Constraints", "Work", "Memory", "Output"\]'
      - path: test/repo/agents.test.mjs
        pattern: 'BLOCK_FIELDS'
      - path: test/repo/agents.test.mjs
        pattern: 'VERDICTS'
      - path: test/repo/agents.test.mjs
        pattern: 'ignored for plugin agents'
    tests: true
    drive: false
  - n: 3
    files: [test/support/instructions.mts, test/repo/skills.test.mjs, test/repo/references.test.mjs]
    greps:
      - path: test/repo/skills.test.mjs
        pattern: 'const SECTIONS = \["Steps", "Rules", "Output"\]'
      - path: test/repo/skills.test.mjs
        pattern: 'const LISTING_CAP = 1536\b'
      - path: test/repo/skills.test.mjs
        pattern: 'const REPEAT_MIN_WORDS = 25\b'
      - path: test/repo/skills.test.mjs
        pattern: 'const STEP_FILE = /\^\[a-z\]\[a-z0-9\]\*'
      - path: test/repo/references.test.mjs
        pattern: '^(?![\s\S]*(STEP_NAME|nameProblems|orderedFolders))'
        flags: i
      - path: test/repo/references.test.mjs
        pattern: 'const EXCEPTIONS = \['
    tests: true
    drive: false
---
# Order: Structure tests for agents and skills

## Problem

The approved draft `artifacts/refactor/10-structure-tests.md` (2026-10-29) is the specification: its Target, its decisions D-1 to D-6 and its Migration carry over as given and are not re-decided here. This order adds the decisions that verifying the draft's premises against trunk at `3fa610c` forced. Three premises did not hold as written: the kernel reads more phase block labels than the draft lists (`packet.mjs`), no kernel code reads the expedited block's labels, and the Output fence headings in the four shells are templates that no `BLOCK_HEADINGS` entry matches until their placeholders are filled. The binding constraint is unchanged: no agent, skill or rule text changes, and `npm test` stays green after every phase.

## Decisions

### D-001: Three phases, one commit each
**Decision:** The work ships as three phases: the `BLOCK_FIELDS` code change, the agents test, then the skills test with the move out of `references.test.mjs`. Each phase is committed on its own approval, so the draft's Migration step 5 ("one commit") becomes three commits. The code change touches runtime surfaces (two hooks, two verbs) and earns its own gate; the two tests are independent of each other.
**Instead of:** one phase and one commit, as Migration step 5 says: three surfaces do not fit the 8-criterion cap of one phase, and a runtime change would share a gate with two new test files.
**Risks:**
- **RISK-001** Trunk carries `BLOCK_FIELDS` for a while with no repo test reading it. Mitigation: phase 1's unit tests in `block.test.mts` already read it, so it is never dead code.

### D-002: BLOCK_FIELDS holds every label kernel code reads, verified
**Decision:** `BLOCK_FIELDS.phase` lists the 10 labels kernel code reads from a phase block: `Files`, `Tests`, `Lint`, `Verified`, `Red`, `Root cause`, `Decisions`, `Comments`, `Waivers`, `Commit`. The draft's evidence missed `src/lib/verbs/packet/packet.mjs:107-131`, which reads `tests`, `lint`, `verified`, `red`, `root cause`, `files`, `decisions`, `comments` and `waivers` for the gate packet. `review` stays `["Classes"]` (`route/verdict/index.mts:36`). `expedited` is `[]`: a grep of `src/lib` finds no reader of the expedited block's fields (`guard.block` skips it at `guard/block/index.mts:63`, `AGENT_OF` in `route/verdict/index.mts:17` has no expedited entry), so listing `Files` and `Commit` there would claim a read that does not happen. All 10 phase labels already appear in `src/agents/developer.md:53-64`, so the agents test still passes on its first run. This widens the draft's Target, and `packet.mjs` joins the touch set.
**Instead of:** the draft's four phase labels and two expedited labels: the agents test would then let the developer's fence drop `Tests:` while the gate packet still reads it and prints "not reported".

### D-003: Readers name labels through a BlockField type and a guarded accessor
**Decision:** `BLOCK_FIELDS` is declared `as const satisfies Readonly<Record<BlockKind, readonly string[]>>`, and `block.mts` exports `type BlockField<K extends BlockKind = BlockKind> = (typeof BLOCK_FIELDS)[K][number]` and `blockField(block: Block, label: BlockField<"phase">): string | undefined`, which returns `block.fields[label.toLowerCase()]` and throws when `label` is not in `BLOCK_FIELDS.phase`. TypeScript readers keep readable literals typed as `BlockField<...>`, so `npm run typecheck` (the first step of `npm test`) fails on a label outside the list. `packet.mjs` is plain JS with `checkJs: false` (`tsconfig.json`), so it goes through `blockField`, whose runtime check fails `test/kernel/packet.test.mjs` instead. The draft named one export; this adds a type and a function next to it.
**Instead of:** positional destructuring such as `const [FILES, , , , RED] = BLOCK_FIELDS.phase`: reordering the list would silently swap labels, and nothing would fail.
**Risks:**
- **RISK-002** `blockField` throws inside `packet()` if a future edit passes an unlisted label. Mitigation: the label is always a code constant, so the throw is reached by `test/kernel/packet.test.mjs` before any user sees it.

### D-004: The output contract check fills the fence heading's placeholders first
**Decision:** Before matching `BLOCK_HEADINGS`, the agents test fills the first fence line under `## Output`: `<id>` becomes `20261029-sample`, `<n>` becomes `1`, and an alternation `<A | B | C>` becomes `A`. The four shells then read `## Report: 20261029-sample · outline`, `## Order: 20261029-sample`, `## Phase 1 of 20261029-sample: <phase title>` and `## Review: 20261029-sample · crosscheck`, and each matches one entry. "Ends with the agent's verdicts" is checked as: the fence's last non-empty line is a `VERDICTS` key whose `agent` is the shell's `name`, since every shell shows one verdict in its fence and names the rest in prose after it.
**Instead of:** matching the raw heading: none of the four matches today (`<id>` fails `[a-z0-9-]+`, and `<Order | Design | Amendment>:` fails the literal `(?:Order|Design|Amendment):`), so test 4 could not pass from the first commit as the draft requires.

### D-005: STEP_FILE requires a leading letter
**Decision:** `STEP_FILE` is `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.md$/`. The draft's `/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/` accepts `10-order.md`, so its test 3 ("no number prefix") would pass every current file and `PENDING.names` would be empty.
**Instead of:** the draft's regex plus a separate `/^\d/` check: two rules for one name check, where one regex says it.

## Scope

**In:**
- `BLOCK_FIELDS`, `BlockField` and `blockField` in `block.mts`, and the five readers pointed at them.
- `test/repo/agents.test.mjs`, `test/repo/skills.test.mjs` and a shared helper `test/support/instructions.mts`.
- Removing the `NN-` name check and its two companion tests from `references.test.mjs`.

**Out:**
- Any change under `src/agents/`, `src/skills/`, `src/rules/`, `src/output-styles/`.
- The Entry check (draft D-3) and `descriptions.test.mjs` reading `when_to_use` (draft Risks).

## Phase 1: BLOCK_FIELDS and its readers

**Touch set:**
- `src/lib/shared/work/block.mts`: add list, type and accessor
- `src/lib/shared/work/block.test.mts`: unit tests for the accessor
- `src/lib/hooks/guard/block/index.mts`: type `fieldValue` labels
- `src/lib/verbs/route/commit.mts`: read Commit through accessor
- `src/lib/hooks/route/verdict/index.mts`: build Classes pattern from label
- `src/lib/verbs/packet/packet.mjs`: read phase fields through accessor
- `test/hooks/guard.block.test.mjs`: stays green, unchanged
- `src/lib/hooks/route/verdict/index.test.mts`: stays green, unchanged
- `test/kernel/packet.test.mjs`: stays green, unchanged
- `src/lib/verbs/route/index.test.mts`: stays green, unchanged

**Changes:**
1. `block.mts`: export `BLOCK_FIELDS` with the content of D-002, `BlockField` and `blockField` per D-003. Inside `block.mts`, `blockFiles`, `proposedCommit` and the `m[1] === "Commit"` check in `parseBlock` read through `blockField` or a `BlockField<"phase">`-typed constant. `FIELD_LABEL` stays as is: every listed label already parses (`Root cause` is its one two-word case).
2. `guard/block/index.mts`: `fieldValue(lines, label: BlockField<"phase">)`; the three call sites keep their literals.
3. `route/commit.mts`: `commitMessage` reads the commit through `blockField(block, "Commit")`.
4. `route/verdict/index.mts`: `reviewClasses` builds its pattern with `new RegExp` from a `BlockField<"review">` constant holding `Classes`, matching exactly what `/^Classes:\s*(.*)$/m` matches today.
5. `packet.mjs`: every `b.fields.<x>` and `b.fields["root cause"]` read becomes `blockField(b, "<Label>")`. Output is unchanged.

**Done when:**
- **T-1.1** `BLOCK_FIELDS` in `block.mts` equals the D-002 content: `phase` has 10 labels in the order `Files, Tests, Lint, Verified, Red, Root cause, Decisions, Comments, Waivers, Commit`; `review` is `["Classes"]`; `artifact`, `report` and `expedited` are `[]`.
- **T-1.2** A new test in `block.test.mts` shows `blockField(parseBlock(text), "Root cause")` returns the `Root cause:` value, and `blockField(block, "Nope" as never)` throws.
- **T-1.3** `commit.mts` has no `fields.commit`, `packet.mjs` has no `b.fields`, and `route/verdict/index.mts` has no `/^Classes:` regex literal (greps in the frontmatter).
- **T-1.4** Changing `"Red"` to `"Rde"` at one `fieldValue` call in `guard/block/index.mts` makes `npm run typecheck` fail; the developer records this on the `Red:` line as `pinned:` and reverts it.
- **T-1.5** `test/hooks/guard.block.test.mjs`, `src/lib/hooks/route/verdict/index.test.mts`, `test/kernel/packet.test.mjs` and `src/lib/verbs/route/index.test.mts` pass without edits.
- **T-1.6** Drive: `picket packet <id>` on a scratch project with a saved phase block prints the same lines before and after the change (diff of the two outputs is empty).
- **T-1.7** `npm test` passes.

## Phase 2: Agents structure test

**Touch set:**
- `test/support/instructions.mts`: new, shared Markdown and frontmatter readers
- `test/repo/agents.test.mjs`: new, the five agent tests
- `src/lib/shared/work/block.mts`: imports `BLOCK_HEADINGS`, `BLOCK_FIELDS`
- `src/lib/shared/verdicts.mjs`: imports `VERDICTS`
- `src/agents/analyst.md`: read only, scanned
- `src/agents/architect.md`: read only, scanned
- `src/agents/developer.md`: read only, scanned
- `src/agents/reviewer.md`: read only, scanned

**Changes:**
1. `test/support/instructions.mts`: `frontmatterFields(text)` returning each top-level key with its value, folding `>` scalars into one line and reading `  - x` lists; `sections(body)` returning `##` and `###` headings with their line ranges, skipping fenced lines; `fences(lines)` returning fenced blocks. It cannot use `yaml-lite.mts`: `frontmatter()` throws `unsupported value at line 3: >` on every agent and SKILL.md (checked on `src/agents/analyst.md`). Follow the folding already in `frontmatterDescription` of `test/support/routing.mts`.
2. `test/repo/agents.test.mjs`: the constants `REQUIRED`, `ALLOWED`, `IGNORED_FOR_PLUGINS`, `PARTS`, `VALUES`, `PENDING` exactly as the draft's Target shows, plus `KNOWN_TOOLS`, the Claude Code tool names as of the 2026-10-28 docs check (draft D-2), at least `Agent, AskUserQuestion, Bash, Edit, Glob, Grep, NotebookEdit, PowerShell, Read, SendMessage, Skill, TodoWrite, WebFetch, WebSearch, Write`. Tool entries match `KNOWN_TOOLS` or `/^mcp__[\w-]+__[\w-]+$/`.
3. Tests 1 to 5 of the draft's Target, each with an inline sample that the scan flags. Test 4 follows D-004 and takes the first fence under `## Output`. Test 5 is one `deepEqual` of the sorted failing set against `PENDING`, so a new failure and a fixed but listed file both fail it.

**Done when:**
- **T-2.1** `agents.test.mjs` holds the six draft constants verbatim and `PENDING` names all four shells.
- **T-2.2** Frontmatter samples: a `hooks:` key fails with a message containing "ignored for plugin agents", a `foo:` key fails as unknown, `effort: extreme` fails, a tool `Frobnicate` fails, and `mcp__atlassian__getJiraIssue` passes.
- **T-2.3** Structure samples: a body with the identity paragraph and the five parts in order passes; `## Two passes`, a `###` under `## Entry`, and a missing `## Memory` each fail; a `## X` line inside a fence is not counted.
- **T-2.4** For each of the four shells, the filled fence heading matches a `BLOCK_HEADINGS` entry (report, artifact, phase, review), its last line is a `VERDICTS` key with `agent` equal to the shell's `name`, and each `BLOCK_FIELDS[kind]` label starts a line of the fence; a sample review fence without `Classes:` fails.
- **T-2.5** A sample where a fixed shell stays in `PENDING` fails test 5 and names the file.
- **T-2.6** `npm test` passes and `git diff --stat` shows no path under `src/agents/`.

## Phase 3: Skills structure test

**Touch set:**
- `test/repo/skills.test.mjs`: new, the eight skill tests
- `test/support/instructions.mts`: add paragraph and ordered-list readers
- `test/repo/references.test.mjs`: remove the `NN-` name check
- `test/support/routing.mts`: read only, description folding reference
- `src/skills/branching/SKILL.md`: read only, expected claim entry
- `src/skills/understanding/SKILL.md`: read only, expected claim entry

**Changes:**
1. `test/repo/skills.test.mjs`: `ALLOWED`, `SECTIONS`, `LISTING_CAP`, `REPEAT_MIN_WORDS` as the draft shows; `STEP_FILE` per D-005; `PENDING` with the seven lists `frontmatter`, `sections`, `names`, `headers`, `lists`, `repeats`, `claims`, each filled from a first run and sorted.
2. Tests 1 to 8 of the draft's Target. Test 4 covers files under `steps/` only and takes `<Skill>` from the skill folder (`ordering` gives `Ordering`). Test 5 covers `steps/` files and `src/skills/shared/procedures/*.md`. Test 6 scans `src/skills`, `src/agents`, `src/rules`, skipping fences and `examples/`, joins a paragraph's lines and compares whole paragraphs (draft D-6). Test 7 scans every file of a skill, frontmatter included (the `understanding` claim sits in its `description`), and matches a sentence where `the <agent>` (one or more of the four names) precedes `reads it` or `read it`, and passes only when every named agent's `skills:` holds `picket:<skill>`. `## Steps` "nothing else" means every non-blank line is an `N. ` item or an indented continuation.
3. `references.test.mjs`: delete `ORDERED_FOLDERS`, `RUN_IN_ORDER`, `STEP_NAME`, `directoriesUnder`, `orderedFolders`, `nameProblems` and the three tests at lines 142 to 157. The reach scan, `EXCEPTIONS` and their tests stay byte for byte.

**Done when:**
- **T-3.1** `skills.test.mjs` holds the draft constants, `STEP_FILE` per D-005, and a `PENDING` object with exactly the seven keys.
- **T-3.2** Each of tests 1 to 7 has a sample that fails: `user-invocable: true`; a `description` plus `when_to_use` of 1537 characters; a `## Registry` heading; `10-order.md` (while `order.md` passes); `# Ordering, step 1: x`; a step file with no `N. ` line; a 25-word paragraph in two files (a 24-word one passes); "the developer reads it" in a skill the developer does not preload.
- **T-3.3** Test 8 is one `deepEqual` per `PENDING` list against its sorted failing set.
- **T-3.4** `PENDING.names` has 34 entries, `PENDING.claims` is `src/skills/branching/SKILL.md` and `src/skills/understanding/SKILL.md`, and `PENDING.repeats` is the `SKILL.md` of designing, expediting, ordering and researching.
- **T-3.5** `references.test.mjs` no longer contains `STEP_NAME`, `nameProblems` or `orderedFolders`, and its remaining tests pass unchanged.
- **T-3.6** `npm test` passes and `git diff --stat` shows no path under `src/skills/`, `src/agents/` or `src/rules/`.

## Open questions

none

## Revision log
