---
kind: design
lane: design
title: Convert architect, analyst and reviewer
date: 2026-10-29
audience: developer
sources: [request.md, artifacts/refactor/12-agents.md, artifacts/reports/instructions-candidates-2026-10-25.md, work/20261029-convert-the-developer-agent-item-a/reviews/cumulative.md, src/agents/developer.md, src/agents/architect.md, src/agents/analyst.md, src/agents/reviewer.md, src/skills/implementing/SKILL.md, src/skills/ordering/steps/10-order.md, src/skills/designing/steps/10-design.md, src/skills/designing/steps/15-migration.md, src/skills/shared/procedures/amend.md, src/skills/researching/steps/10-outline.md, src/skills/researching/steps/20-deep.md, src/skills/researching/SKILL.md, src/skills/documenting/SKILL.md, src/skills/documenting/templates/report.md, src/skills/reviewing/SKILL.md, src/skills/ticketing/steps/20-jira.md, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/lib/shared/agent-name.mts, src/lib/shared/transcript/agent.mts, src/lib/shared/format.mts, src/lib/shared/views.mts, src/lib/verbs/reply/index.test.mts, src/lib/verbs/next/index.test.mts, test/repo/agents.test.mjs, test/repo/skills.test.mjs, test/repo/references.test.mjs, .claude/agent-memory/picket-reviewer/]
phases:
  - n: 1
    files: [src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/lib/shared/agent-name.test.mts, src/lib/verbs/reply/index.test.mts, src/lib/verbs/next/index.test.mts]
    greps:
      - path: src/lib/shared/work/send.mts
        pattern: 'export function instanceTag\b'
      - path: src/lib/shared/work/send.mts
        pattern: 'createHash'
      - path: src/lib/shared/agent-name.test.mts
        pattern: 'cumulative-reviewer'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/agents/architect.md, src/skills/ordering/steps/10-order.md, src/skills/designing/steps/10-design.md, src/skills/shared/procedures/amend.md, src/skills/documenting/references/schema-migration.md, src/skills/designing/steps/, test/repo/agents.test.mjs, test/repo/skills.test.mjs]
    greps:
      - path: src/agents/architect.md
        pattern: '^### Order\b'
      - path: src/agents/architect.md
        pattern: '^### Design\b'
      - path: src/agents/architect.md
        pattern: '^### Amendment\b'
      - path: src/agents/architect.md
        pattern: '^## Memory\b'
      - path: src/agents/architect.md
        pattern: 'documenting/references/schema-migration\.md'
      - path: src/agents/architect.md
        pattern: '^(?![\s\S]*(step:|shared/procedures))'
        flags: i
      - path: src/skills/ordering/steps/10-order.md
        pattern: '^(?![\s\S]*Architect section)'
        flags: i
      - path: src/skills/designing/steps/10-design.md
        pattern: '^(?![\s\S]*Architect section)'
        flags: i
      - path: src/skills/shared/procedures/amend.md
        pattern: '^(?![\s\S]*Architect section)'
        flags: i
      - path: src/skills/documenting/references/schema-migration.md
        pattern: '^# Documenting: schema migration\b'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [src/agents/analyst.md, src/skills/researching/steps/10-outline.md, src/skills/researching/steps/20-deep.md, src/skills/documenting/templates/report.md, test/repo/references.test.mjs, test/repo/agents.test.mjs, test/repo/skills.test.mjs]
    greps:
      - path: src/agents/analyst.md
        pattern: '^### Outline\b'
      - path: src/agents/analyst.md
        pattern: '^### Deep pass\b'
      - path: src/agents/analyst.md
        pattern: '^(?![\s\S]*(executeWrite|createJiraIssue|editJiraIssue|transitionJiraIssue|addOrEditJiraIssueComment))'
        flags: i
      - path: src/agents/analyst.md
        pattern: '\.claude/MEMORY\.md'
      - path: test/repo/references.test.mjs
        pattern: 'const EXCEPTIONS = \[\];'
      - path: src/skills/researching/steps/10-outline.md
        pattern: '^(?![\s\S]*Analyst section)'
        flags: i
      - path: src/skills/researching/steps/20-deep.md
        pattern: '^(?![\s\S]*Analyst section)'
        flags: i
    tests: true
    drive: false
    security: false
  - n: 4
    files: [src/agents/reviewer.md, test/repo/agents.test.mjs, .claude/agent-memory/picket-reviewer/, .claude/agent-memory/picket-reviewer/MEMORY.md]
    greps:
      - path: src/agents/reviewer.md
        pattern: '^### Review\b'
      - path: src/agents/reviewer.md
        pattern: '^## Memory\b'
      - path: src/agents/reviewer.md
        pattern: 'already reject'
      - path: src/agents/reviewer.md
        pattern: 'the verdict as its first line'
      - path: src/agents/reviewer.md
        pattern: '^(?![\s\S]*(scratchpad_pr5223|two live reviews|step:))'
        flags: i
      - path: test/repo/agents.test.mjs
        pattern: 'const PENDING = \[\];'
      - path: .claude/agent-memory/picket-reviewer/MEMORY.md
        pattern: '^(?![\s\S]*(send-review-by-message|new-next-action-check-band))'
        flags: i
    tests: true
    drive: false
    security: false
---
# Design: Convert architect, analyst and reviewer

## Problem

Work item B of `artifacts/refactor/12-agents.md` converts the architect, analyst and reviewer into the six-part shell that `src/agents/developer.md` now has (item A, user-approved at `1e75e89`). The draft's Target and decisions D-2 to D-5 carry over as given, and the request adds a fix to how `picket next` names spawned agents. Four facts bind the design. Claude Code renames a spawn whose name is taken in the session (`cumulative-reviewer-2`, `-3` observed), while `sendsFor` (`src/lib/shared/work/send.mts:17-35`) addresses bare role names and decides spawn or continue from this item's rows only. An agent may read only its preloaded skill (`test/repo/references.test.mjs:120-126`), and the architect's design half cites `designing/steps/15-migration.md`. The skills test's `PENDING` lists may only shrink, but the architect and analyst halves hold the only ordered list of `10-order.md`, `10-design.md` and `10-outline.md`. Item A's cumulative review showed that a deleted memory must land sentence by sentence.

## Decisions

### D-001: Instance names are <tag>-<role>, one set per work item
**Decision:** Infrastructural decision. Every send names its instance `<tag>-<role>`. `<role>` is `architect`, `analyst`, `developer`, `reviewer` or `cumulative-reviewer`, and a fresh developer after a stall is `<tag>-developer-<n>` (OQ-1 of item 11). `<tag>` is four letters from `a` to `p`, one per hex digit of the first four of `sha256(id)`, so `instanceTag(id)` is deterministic, starts with a letter and never ends in digits. Each work item therefore gets its own instances, and a live instance of an earlier item is never addressed. Spawn or continue still comes from this item's rows (D-005 of item 11), which is now correct by construction. The form keeps the role as the last word before an optional `-<n>`, which `bareAgentName` (`src/lib/shared/agent-name.mts:2`, `(?:[a-z0-9]+-)*role(?:-\d+)?`) and the transcript's `agent_name` reader (`transcript/agent.mts:35`) already parse. The cost: the user sees names like `kfpb-developer` in the status line instead of `developer`.
**Instead of:** keeping role names and continuing a live instance of any item in the session: rows store no instance name, Claude Code's `-2` suffix depends on spawn history the kernel cannot see, and an earlier item's context would leak into this one.
**Risks:**
- **RISK-001** Two spawns of one name in one item (the lead sends `Agent` twice before the first verdict lands) make Claude Code name the second `<tag>-developer-2`, the stall name. Mitigation: unchanged from item 11's RISK-003: the lead acts on `next` after each verdict, and phase 1's tests pin the names.
- **RISK-002** Two items in one session share a tag (1 in 65,536 per pair). Mitigation: the second item's spawn gets Claude Code's `-2` suffix and the lead sees the mismatch in the spawn result; a test pins different tags for this session's item ids.

### D-002: Entry names what picket next sends; other messages are described in Work
**Decision:** As item A's D-002, extended to all four shells. Each `## Entry` names exactly the field keys that `sendsFor` builds for that agent's type, and `agents.test.mjs` checks it through `ENTRY_FIXTURES`. The sets are: architect `work`, `lane`, `request`, `preflight`, `sources`, `amend`; analyst `work`, `request`, `pass`; reviewer `work`, `scope`, `artifact`, `phase`, `summary`. Messages from elsewhere are handled under `## Work`: the lead's deep-pass continuation (`deep pass`, `redirect:`), the pull request message (`pr:`), and `picket reply`'s design-lane `amend:`, which shares its key with the `amend` send.
**Instead of:** a looser Entry check that tolerates extra keys: Entry would drift back to describing pasted messages, the thing bundle 3 removed.

### D-003: The lead halves left behind are ordered lists that send what picket next prints
**Decision:** `ordering/steps/10-order.md`, `designing/steps/10-design.md`, `researching/steps/10-outline.md` and `researching/steps/20-deep.md` lose their agent section. `shared/procedures/amend.md` loses its architect section. Where a message fence with `step:` remains, it becomes "send what `picket next <id>` prints". The remaining lead actions are written as one ordered list, so the files keep the ordered list the skills test requires, and no `PENDING` list grows. A file that newly passes a check leaves that `PENDING` list. The rest of the lead text keeps its meaning; step 4 rewrites it.
**Instead of:** adding the three files to `PENDING.lists`: the lists may only shrink (item 10, D-1).

### D-004: The migration step moves into documenting, which the architect preloads
**Decision:** `git mv src/skills/designing/steps/15-migration.md src/skills/documenting/references/schema-migration.md`. Its one citer, the design half, now in the architect's `### Design`, cites `${CLAUDE_PLUGIN_ROOT}/skills/documenting/references/schema-migration.md`. Its first line becomes `# Documenting: schema migration`. Leaving `steps/` takes it out of the skills test's `names`, `headers` and `lists` checks, so it leaves those three `PENDING` lists.
**Instead of:** preloading `picket:designing` on the architect: a whole lane skill written for the lead would load into every architect spawn to reach one 36-line file.

### D-005 (r2): A deleted memory lands sentence by sentence, with its destination named
**Decision:** The phase that deletes a memory lists in `**Changes:**` each sentence of the file and where it goes: a shell line, another memory, or the code that made it obsolete. The developer repeats that map on the block's `Decisions:` line. The reviewer memory `send-review-by-message` is not obsolete. `route.verdict` saves every review to `work/<id>/reviews/<scope>.md`, but its context line carries only the verdict, `Next:` and the options (`route/verdict/index.mts:78,83`). The only `reviews/` path in code is the developer's `fix_findings` send (`send.mts:151`), and `cumulative-review.md:36-40` (step 4) still needs the findings and the `Questions:` line from the review text. So its rule and its how-to-apply land as one reviewer Constraints line: "In a team session, also send the block to the lead with `SendMessage`, the verdict as its first line." Its incident sentence is dropped, as shells carry no incident history (bundle 1). Of `new-next-action-check-band`, the band sentences are obsolete by `ACTION_TEXT`'s `Record<NextAction, …>` type (item 11, phase 1); its scratchpad sentence lands in the reviewer's Constraints. The lead deletes the files and their index lines, because agents never edit `.claude/`.
**Instead of:** checking only each memory's headline sentence: item A's cumulative review found a lost "stage without the deleted path" sentence that way.

### D-006: The analyst loses the five mutating Jira tools
**Decision:** The analyst's `tools` drop `mcp__atlassian__executeWrite`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue` and `addOrEditJiraIssueComment`. These are the five tools that `ticketing/steps/20-jira.md:3` calls mutating; the draft's "six" counted one too many. The reads stay: `getAccessibleAtlassianResources`, `discover`, `executeRead`, `getJiraIssue`, `searchJiraIssuesUsingJql`. The ticketing sentence leaves the shell, so `references.test.mjs` `EXCEPTIONS` ends empty, and its test asserts that.
**Instead of:** keeping `discover`, which can name write operations, out as well: `executeRead` needs it to find catalog reads, and without `executeWrite` it cannot write.

### D-007: The outline format moves into report.md as guidance on the optional section
**Decision:** `documenting/templates/report.md` already has `## Sources for the deep pass` as an optional section. The outline pass's format rules (Summary as far as known, every other required heading one line or `pending deep pass`, Findings so far, the sources list) go into that template as one HTML comment under `# Report`. The analyst's `### Outline` keeps only the bounds: one turn, 12 files at most, no whole directory.
**Instead of:** a separate outline template: two report templates would drift, and the outline is the same document half filled.

## Scope

**In:**
- The send naming of D-001 and its tests.
- The three shells in the six parts, with Entry checked for all four agents and `PENDING` empty.
- The agent halves of `10-order.md`, `10-design.md`, `amend.md`, `10-outline.md` and `20-deep.md`, the migration file move, the report template comment, the analyst tools, and the two reviewer memories.

**Out:**
- `reviewing/SKILL.md` (its "noise" line, the load table, `literal-criterion-misses-go-to-amendment`), `designing/steps/20-crosscheck.md`, `cumulative-review.md`, `phase-loop.md` and CLAUDE.md text naming `cumulative-reviewer`: step 4.
- The brief's fields `purpose:`, `in scope:`, `out of scope:` (draft D-2).

## Phase 1: Instance names per work item

**Touch set:**
- `src/lib/shared/work/send.mts`: `instanceTag`, tagged instance names
- `src/lib/shared/work/send.test.mts`: expected `to` values
- `src/lib/shared/agent-name.test.mts`: new, tagged names parse to roles
- `src/lib/verbs/reply/index.test.mts`: `developer`, `developer-2` expectations
- `src/lib/verbs/next/index.test.mts`: bare `to` asserted at :23, 40, 44
- `src/lib/shared/agent-name.mts`: read only, `INSTANCE_NAME`
- `src/lib/shared/transcript/agent.mts`: read only, `agent_name` reader

**Changes:**
1. `send.mts` exports `instanceTag(id: string): string`: `createHash("sha256")` from `node:crypto` over the id, and each of the first four hex digits mapped to the letter at that offset from `a`.
2. `INSTANCES` becomes `instancesOf(snap)` (or the tag is passed in). Every `to` is `<tag>-<role>` per D-001. `developerName(snap)` returns `<tag>-developer`, or `<tag>-developer-<1 + fresh count>` after a fresh reply. `messageTo` uses the same names, so `picket reply`'s sends follow.
3. `isLive` and the `owns` predicates are unchanged: spawn or continue still comes from this item's rows with this session.
4. Tests: every `to` in `send.test.mts`, `reply/index.test.mts` and `next/index.test.mts` carries the tag. A new `agent-name.test.mts` shows `bareAgentName` returns the role for `<tag>-architect`, `<tag>-cumulative-reviewer`, `<tag>-developer-2` and `picket:reviewer`.

**Done when:**
- **T-1.1** `instanceTag` returns four letters from `a` to `p`, the same value for the same id, and different values for `20261029-convert-the-developer-agent-item-a` and `20261029-convert-architect-analyst-and-reviewer-item-b-de`.
- **T-1.2** Each `sendsFor` row of item 11's table addresses `<tag>-architect`, `<tag>-analyst`, `<tag>-developer`, `<tag>-reviewer` or `<tag>-cumulative-reviewer`, and after one fresh reply the developer send goes to `<tag>-developer-2`.
- **T-1.3** For a snapshot with no rows of its own, the first developer send is `Agent` to its own tagged name, whatever another item's rows hold.
- **T-1.4** `bareAgentName` returns `architect`, `reviewer`, `developer` and `reviewer` for the four names of Changes item 4.
- **T-1.5** `picket reply`'s rejected, comment, waiver and design-lane `d` sends carry the tagged names (`reply/index.test.mts`).
- **T-1.6** Every other assertion in `send.test.mts` on `tool`, `type`, `model`, `first` and `message` passes unchanged.
- **T-1.7** Drive: the built CLI's `picket next 20261029-convert-architect-analyst-and-reviewer-item-b-de --human` prints every send heading with that item's tag before the role.
- **T-1.8** `npm test` passes.

## Phase 2: The architect shell

**Touch set:**
- `src/agents/architect.md`: rewritten into the six parts
- `src/skills/ordering/steps/10-order.md`: lead half as one ordered list
- `src/skills/designing/steps/10-design.md`: lead half as one ordered list
- `src/skills/shared/procedures/amend.md`: lead half only
- `src/skills/designing/steps/15-migration.md`: moved out (D-004)
- `src/skills/documenting/references/schema-migration.md`: moved in, new heading
- `src/skills/designing/steps/`: owns the move's old half
- `test/repo/agents.test.mjs`: architect fixtures, `PENDING`
- `test/repo/skills.test.mjs`: `PENDING` entries that leave
- `src/agents/developer.md`: read only, the approved pattern
- `src/skills/documenting/templates/order.md`: read only, cited template
- `src/skills/documenting/templates/design.md`: read only, cited template

**Changes:**
1. `architect.md`, at most 120 lines (about 87 by the draft), frontmatter unchanged:
   - **Identity:** today's paragraph.
   - **`## Entry`:** the six fields of D-002, written as `work: <id>`, `lane: <order | design>`, `request: <path>`, `preflight: <path>`, `sources: <path>` (the last two only when those files exist) and `amend: <line>`. The first tool batch: `picket state <id>`, the request, the lane's template under `${CLAUDE_PLUGIN_ROOT}/skills/documenting/templates/`, the preflight file when named, `.claude/PROJECT-MAP.md` and `.claude/MEMORY.md` when present, and the source files the request names. Today's sources paragraph (story, snapshots, `picket source find|grep|add`, an ambiguous document becomes an `OQ-###`) follows. No `step:`.
   - **`## Constraints`:** today's five paragraphs, plus "Report only in your block" as in the developer shell (bundle 4.4).
   - **`## Work`:** three subsections.
     - `### Order`: the architect section of `10-order.md`: items 1 to 4, the premise rule, the `exceeds order caps: <what>` reply.
     - `### Design`: the architect section of `10-design.md`: other open designs bind, the two saves, the caps, DDD vocabulary, `[IRREVERSIBLE]`, `schema-migration.md` for a schema or data migration, unverified premises and `[STRATEGIC]`.
     - `### Amendment`: the architect section of `amend.md`: load only what the finding names, classify, `RECONCILE`, never an approved phase.
   - **`## Memory`:** the developer shell's two sentences.
   - **`## Output`:** today's fence and its last line, unchanged.
2. `10-order.md` and `10-design.md` keep their lead text (open, preflight, Jira intake, the sources gate, the escalation on `exceeds order caps`, the cross-check hand-off) as one ordered list per D-003. The spawn instruction and its fence become "send what `picket next <id>` prints". `amend.md` drops `## Architect section` and its `step:` line the same way.
3. The migration file moves per D-004, and its first line becomes `# Documenting: schema migration`.
4. `agents.test.mjs`: `PENDING` drops `architect.md`; `ENTRY_FIXTURES.architect` sends `write_artifact` in the order lane with both optional files, and `amend`. `skills.test.mjs`: `designing/steps/15-migration.md` leaves `names`, `headers` and `lists`, and any file this phase fixes leaves its list.

**Done when:**
- **T-2.1** `architect.md` has the identity paragraph, the five parts in order and `### Order`, `### Design`, `### Amendment` under `## Work`, at most 120 lines, and `agents.test.mjs` `PENDING` no longer lists it.
- **T-2.2** The Entry check passes for the architect with exactly `work`, `lane`, `request`, `preflight`, `sources`, `amend`, and the first batch names `.claude/MEMORY.md` when present.
- **T-2.3** Every instruction of the three removed architect sections appears in one of the three subsections; the block's `Decisions:` line names any one dropped and why.
- **T-2.4** `architect.md` names no `step:` and no `shared/procedures` path; `10-order.md`, `10-design.md` and `amend.md` have no `Architect section` and no `step:` line, and the two step files each hold an ordered list.
- **T-2.5** `src/skills/documenting/references/schema-migration.md` exists and `### Design` cites it, and `src/skills/designing/steps/15-migration.md` does not.
- **T-2.6** `node --test test/repo/agents.test.mjs test/repo/skills.test.mjs test/repo/references.test.mjs test/repo/markdown-paths.test.mjs` passes, with no `PENDING` list longer than at the item's base.
- **T-2.7** `npm test` passes.

## Phase 3: The analyst shell

**Touch set:**
- `src/agents/analyst.md`: rewritten; tools and description trimmed
- `src/skills/researching/steps/10-outline.md`: lead half as one ordered list
- `src/skills/researching/steps/20-deep.md`: lead half only
- `src/skills/documenting/templates/report.md`: outline-pass comment (D-007)
- `test/repo/references.test.mjs`: `EXCEPTIONS` empty and asserted
- `test/repo/agents.test.mjs`: analyst fixtures, `PENDING`
- `test/repo/skills.test.mjs`: `PENDING` entries that leave
- `src/skills/researching/SKILL.md`: read only, the deep-pass message
- `src/skills/ticketing/steps/20-jira.md`: read only, mutating tool list

**Changes:**
1. `analyst.md`, at most 120 lines (about 103 by the draft):
   - **Frontmatter:** `tools` drop the five tools of D-006; `description` drops "and drafts".
   - **Identity:** today's paragraph.
   - **`## Entry`:** `work: <id>`, `request: <path>` and `pass: outline`. The first batch: `picket state <id>`, the request, `${CLAUDE_PLUGIN_ROOT}/skills/documenting/templates/report.md`, `.claude/PROJECT-MAP.md` and `.claude/MEMORY.md` when present, and every source the request names. Then today's batching sentence. No `step:`.
   - **`## Constraints`:**
     - today's write scope, coverage, markers and describe-not-propose paragraphs;
     - Jira: pulls and searches only, never a write (D-006);
     - "Report only in your block".
   - **`## Work`:** two subsections.
     - `### Outline`: the bounds of `10-outline.md`'s analyst section (one turn, 12 files at most, no whole directory), then the report written from the template and its outline comment (D-007).
     - `### Deep pass`: the lead continues the analyst with `deep pass` and a `redirect:` line (`researching/SKILL.md:53`), then the analyst section of `20-deep.md`.
   - **`## Memory`:** the two sentences, plus "Write outside `work/<id>/research.md` and `.claude/PROJECT-MAP.md` is for your memory folder only".
   - **`## Output`:** today's fence and lines.
2. `report.md` gains the one comment of D-007 under `# Report`; its sections and their optional marks are unchanged.
3. `10-outline.md` keeps its lead text as one ordered list with "send what `picket next <id>` prints"; `20-deep.md` keeps its lead text and message (the deep pass has no `picket next` send) and drops `## Analyst section`.
4. `references.test.mjs`: `EXCEPTIONS` becomes `[]`, and the test "exactly one exception is listed" becomes "no exception is listed".
5. `agents.test.mjs`: `PENDING` drops `analyst.md`; `ENTRY_FIXTURES.analyst` sends `write_artifact` in the research lane. `skills.test.mjs`: any file this phase fixes leaves its list.

**Done when:**
- **T-3.1** `analyst.md` has the identity paragraph, the five parts in order and `### Outline`, `### Deep pass` under `## Work`, at most 120 lines, and `PENDING` no longer lists it.
- **T-3.2** The Entry check passes for the analyst with exactly `work`, `request`, `pass`, and the first batch names `.claude/MEMORY.md` when present.
- **T-3.3** `tools` holds none of the five tools of D-006 and still the five reads; the shell names no `ticketing` path.
- **T-3.4** `references.test.mjs` has `EXCEPTIONS = []`, asserts it empty, and passes.
- **T-3.5** `report.md` carries the outline-pass comment, and `## Sources for the deep pass` is still marked optional.
- **T-3.6** `10-outline.md` and `20-deep.md` have no `Analyst section` and no `step:` line, and `10-outline.md` holds an ordered list.
- **T-3.7** `node --test test/repo/agents.test.mjs test/repo/skills.test.mjs test/repo/markdown-paths.test.mjs` passes, with no `PENDING` list longer than at the item's base.
- **T-3.8** `npm test` passes.

## Phase 4: The reviewer shell

**Touch set:**
- `src/agents/reviewer.md`: rewritten into the six parts
- `test/repo/agents.test.mjs`: reviewer fixtures, `PENDING` empty
- `.claude/agent-memory/picket-reviewer/`: two memories deleted by the lead
- `.claude/agent-memory/picket-reviewer/MEMORY.md`: their two index lines, by the lead
- `src/skills/reviewing/SKILL.md`: read only, summary fields and load table
- `src/lib/shared/review-checklists.mts`: read only, `checklists` paths

**Changes:**
1. `reviewer.md`, at most 120 lines, frontmatter unchanged:
   - **Identity:** today's paragraph.
   - **`## Entry`:** the five fields of D-002: `work: <id>`, `scope: <crosscheck | checkpoint | cumulative>`, `artifact: <path>` (cross-check), `phase: <n>` (checkpoint) and `summary: <path>`. A fresh cumulative reviewer's message opens with a fixed sentence. The first batch: `picket state <id>`, the summary file, exactly the checklists its `checklists` list names (a `${CLAUDE_PLUGIN_ROOT}` path resolves like this file's skill paths) plus its `extension_steps`, the artifact, and the diff. The hunk-reading rule follows. No `step:`.
   - **`## Constraints`:**
     - "Write and Edit are for your memory folder only; a probe script goes to the session scratchpad, never `$TMP` or the repository, because `guard.bash` blocks `rm`";
     - no shell redirection, without the `scratchpad_pr5223.diff` incident note;
     - today's scope, disprove, cross-flow, removed-guard and verdict paragraphs, with "noise" replaced by "skip a finding the project's own gates already reject; name the gate once on the `Checked:` line";
     - "Report only in your block";
     - "In a team session, also send the block to the lead with `SendMessage`, the verdict as its first line" (D-005 r2).
   - **`## Work`** with **`### Review`:** the reading order per scope.
     - Cross-check: the artifact and `reviewing`'s cross-check checklist.
     - Checkpoint: today's batch.
     - Cumulative: `request.md`, `story.md` and the snapshots first, the diff of every repo, the plan last, under the traced checklist.
     - Pull request: the message carries `pr:`; the `git -C` rule, line numbers from `git -C <repo_root> show <head>:<path>`, the description as the plan, the heading form. Without the "two live reviews" note.
   - **`## Memory`:** the two sentences plus "Write and Edit outside it are for your memory folder only".
   - **`## Output`:** today's fence and notes.
2. Sentence map (D-005), repeated on the block's `Decisions:` line:
   - `send-review-by-message`: the rule and its how-to-apply land as the last Constraints line of item 1; the incident sentence is dropped (D-005 r2).
   - `new-next-action-check-band`: the band and "phase null" sentences are obsolete by `ACTION_TEXT`. The regression-step sentence is obsolete by the same type check. The scratchpad sentence lands in Constraints item 1.
3. Ask the lead to delete the two files and their index lines once item 1 is in.
4. `agents.test.mjs`: `PENDING` becomes `[]`; `ENTRY_FIXTURES.reviewer` sends the design-lane cross-check, `review_checkpoint` and `review_cumulative`; a test asserts `ENTRY_FIXTURES` covers all four agents.

**Done when:**
- **T-4.1** `reviewer.md` has the identity paragraph, the five parts in order and `### Review` under `## Work`, at most 120 lines, and `PENDING` is `[]`.
- **T-4.2** The Entry check passes for the reviewer with exactly `work`, `scope`, `artifact`, `phase`, `summary`, and `ENTRY_FIXTURES` has the four agents.
- **T-4.3** Entry opens the checklists that `summary.json` lists, and `reviewer.md` names no `step:`.
- **T-4.4** Constraints hold the memory-folder and scratchpad sentence, the gates sentence in place of "noise", and the team-session `SendMessage` sentence; `reviewer.md` contains neither `scratchpad_pr5223` nor `two live reviews`.
- **T-4.5** The two memory files and their index lines are gone, and the block's `Decisions:` line maps each of their sentences as in Changes item 2.
- **T-4.6** `node --test test/repo/agents.test.mjs test/repo/references.test.mjs test/repo/skills.test.mjs test/repo/markdown-paths.test.mjs` passes.
- **T-4.7** `npm test` passes.

## Open questions

none

## Revision log
- 2026-10-29: D-005 (r2): send-review-by-message lands as a reviewer SendMessage line; no code delivers review text to the lead; cross-check drift
