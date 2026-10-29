# 10: Structure tests for agents and skills

Status: approved (2026-10-29).

Step 1 of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: the tests of bundles 1 and 2, written before any agent or skill changes, so every later change runs under them. Two new files, `test/repo/agents.test.mjs` and `test/repo/skills.test.mjs`, check the shape the walkthrough approved. Today almost every file fails that shape, so each test carries an exact list of the files still on the old shape; the list may only shrink, and a file that is fixed but still listed fails the test.

## Today

| Fact | Value |
|---|---|
| Agents | 4 shells, 52 to 69 lines; frontmatter keys `name`, `description`, `tools`, `skills` (not developer), `model`, `effort`, `memory`, `color`: all on the approved list |
| Agent sections | none has `## Memory` or `## Work`; the work section is `## Two passes` (analyst), `## Amendment` (architect), `## Phase loop` (developer), missing (reviewer) |
| Skills | 17; every one sets `user-invocable: true` (the default); none has `when_to_use` or `argument-hint`; `summarizing` sets `disable-model-invocation` |
| Skill sections | only `consulting` has exactly `## Steps`, `## Rules`, `## Output`; the others use 1 to 8 other headings (`## Registry`, `## Load table`, `## Step 1: open the work item…`) |
| Step, checklist and procedure files | 40, every one named `NN-<kebab>.md` except the 6 procedures; 17 of 23 step files open `# <Skill>, step N: …` or a bare title instead of `# <Skill>: <name>` |
| Ordered lists | 17 of 29 step and procedure files have no ordered list line |
| Repeated paragraphs | 1 paragraph of 25 words or more appears in 4 files: the "no `picket admit` answer yet" opening of the four lane skills |
| Reach claims | 2: `branching` "The developer reads it" (D5), `understanding` "the analyst and the architect read it" (D4) |
| Existing checks that overlap | `references.test.mjs` checks `NN-` step names and reach with one exception; `descriptions.test.mjs` routes prompt cases by `description` |

## Target

### `test/repo/agents.test.mjs`

```js
const REQUIRED = ["name", "description", "tools", "model", "effort", "memory", "color"];
const ALLOWED = [...REQUIRED, "skills", "disallowedTools", "maxTurns", "autoCompactWindow", "background", "omitClaudeMd", "isolation", "experimental"];
const IGNORED_FOR_PLUGINS = ["hooks", "mcpServers", "permissionMode", "initialPrompt"];
const PARTS = ["Entry", "Constraints", "Work", "Memory", "Output"];
const VALUES = { model: /^(sonnet|opus|haiku|fable|inherit|claude-[a-z0-9-]+)$/, effort: /^(low|medium|high|xhigh|max)$/, memory: /^(user|project|local)$/, color: /^(red|blue|green|yellow|purple|orange|pink|cyan)$/ };
const PENDING = ["src/agents/analyst.md", "src/agents/architect.md", "src/agents/developer.md", "src/agents/reviewer.md"];
```

Tests, each with a sample that proves the scan flags what it should:

1. Every frontmatter key is in `ALLOWED`; a key in `IGNORED_FOR_PLUGINS` fails with "ignored for plugin agents"; any other unknown key fails.
2. Every required key is present and every checked value matches `VALUES`; each `tools` entry is a known tool name or `mcp__<server>__<tool>`.
3. The body is an identity paragraph, then the five `##` parts in `PARTS` order and no other `##` heading; `###` appears only under `## Work`. Headings inside fences are not headings.
4. The fenced block under `## Output` opens with a heading that one `BLOCK_HEADINGS` entry matches, ends with the agent's verdicts from `VERDICTS` (those whose `agent` is this agent), and carries every label the kernel reads for that block kind.
5. `PENDING` lists exactly the agents that fail test 3, so it only shrinks.

Tests 1, 2 and 4 pass today and hold from the first commit. Test 3 passes today only through `PENDING`.

### `test/repo/skills.test.mjs`

```js
const ALLOWED = ["name", "description", "when_to_use", "argument-hint", "disable-model-invocation", "user-invocable", "allowed-tools", "model", "effort", "context", "agent", "hooks", "paths", "shell"];
const SECTIONS = ["Steps", "Rules", "Output"];
const LISTING_CAP = 1536;
const STEP_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const REPEAT_MIN_WORDS = 25;
const PENDING = { frontmatter: [...], sections: [...], names: [...], headers: [...], lists: [...], repeats: [...], claims: [...] };
```

Tests:

1. Every frontmatter key is in `ALLOWED`; `user-invocable: true` fails as a default; `description` plus `when_to_use` stay within `LISTING_CAP` characters.
2. Every SKILL.md is a purpose paragraph, then `## Steps`, `## Rules`, `## Output` in that order and no other `##` heading. `## Steps` holds one ordered list and nothing else.
3. Every file under `steps/` and `checklists/` matches `STEP_FILE`: kebab-case, no number prefix.
4. Every step file opens `# <Skill>: <name>`, where `<Skill>` is its folder name capitalised.
5. Every step file and procedure carries at least one ordered list.
6. No paragraph of `REPEAT_MIN_WORDS` words or more appears in two instruction files (skills, agents, rules; fences and `examples/` skipped).
7. A sentence "the <agent> reads it" (or "read it") holds only when that agent preloads the skill.
8. Each `PENDING` list names exactly the files that fail its test.

Test 3 replaces the `NN-` check in `references.test.mjs`; that file keeps the reach rule and its exception.

### Code the tests read

`src/lib/shared/work/block.mts` gains one export, `BLOCK_FIELDS`, the labels the kernel reads per block kind:

```ts
export const BLOCK_FIELDS: Readonly<Record<BlockKind, readonly string[]>> = {
  phase: ["Files", "Red", "Root cause", "Commit"],
  review: ["Classes"],
  artifact: [],
  report: [],
  expedited: ["Files", "Commit"],
};
```

`guard.block`, `route/commit.mts` and `route.verdict` read their labels from it instead of string literals, so the test and the code cannot drift.

## Evidence

Measured on trunk at `3fa610c` (2026-10-29): frontmatter keys and `##` headings of the 4 shells and 17 SKILL.md files; first line and ordered-list count of every file under `steps/`, `checklists/` and `shared/procedures/`; a paragraph scan of the 81 Markdown files under `src/skills`, `src/agents` and `src/rules`. The labels in `BLOCK_FIELDS` come from `guard/block/index.mts:29-41` (`Files`, `Red`, `Root cause`), `route/commit.mts:13` and `block.mts:75,117` (`Commit`, `Files`), and `route/verdict/index.mts:36` (`Classes`).

The ordered-list count (17 of 29) is a plain count of lines that start `N. `; the walkthrough's 13 of 29 counted files whose action sequence is prose, so a few of the 17 hold lists in another form. The test uses the plain count.

## Decisions

- **D-1 The tests land green through `PENDING` lists.** `npm test` gates the release workflow and every later commit, so a red test on trunk would block unrelated work, and a skipped test proves nothing. An exact list that may only shrink is the pattern `references.test.mjs` already uses for `EXCEPTIONS`.
- **D-2 The key lists are data in the test, dated to the 2026-10-28 docs check.** Fetching the official reference in a test would make the suite depend on the network. A Claude Code release that adds a key is a one-line change.
- **D-3 The Entry check waits for step 2.** Bundle 1 checks an agent's Entry fields against what the lead sends. After bundle 3 that is `picket next`'s `send:` block, which step 2 builds; checking against today's Markdown messages would test text that is about to go. The check lands with `send:`.
- **D-4 `BLOCK_FIELDS` is exported from code, not listed in the test.** The output contract is only worth testing against what the kernel reads; a second list in the test would drift the same way the Markdown does.
- **D-5 The `## Work` subsection names are not fixed by the test.** Bundle 3 renames them (`### Order`, `### Design`, `### Outline`, `### Deep pass`); the test checks only that `###` sits under `## Work`.
- **D-6 The repeated-paragraph scan joins a paragraph's lines and compares the whole text.** A sliding window of 25 words would also catch shared sentences, which the rules and verdict lines legitimately repeat; the whole-paragraph form found the one real copy and nothing else.

## Migration

1. Add `BLOCK_FIELDS` and point `guard.block`, `route/commit.mts` and `route.verdict` at it; their unit tests stay green.
2. Add `agents.test.mjs` with `PENDING` listing all 4 shells.
3. Add `skills.test.mjs` with each `PENDING` list filled from a first run.
4. Move the step-name check out of `references.test.mjs`.
5. `npm test` green; one commit, `test(repo): check the shape of agents and skills`.

## Risks

- A `PENDING` list that is long hides nothing but is easy to stop reading. The later steps remove entries file by file, and the list's length is the progress measure.
- `descriptions.test.mjs` routes on `description` alone. When bundle 2 moves trigger phrases to `when_to_use`, that test must read both fields or its routing share drops; noted for step 4, not changed here.
- The output contract check parses the fenced block in each shell. A shell that shows two example blocks (the reviewer's pull request form) needs the first fence under `## Output` to be the contract.

## Affects

`test/repo/agents.test.mjs` (new), `test/repo/skills.test.mjs` (new), `test/repo/references.test.mjs`, `src/lib/shared/work/block.mts`, `src/lib/hooks/guard/block/index.mts`, `src/lib/verbs/route/commit.mts`, `src/lib/hooks/route/verdict/index.mts`. No agent, skill or rule text changes.

## Open questions

None. D-1 and D-3 are the two choices most worth a second look.
