---
kind: order
lane: order
title: Convert the developer agent, item A
date: 2026-10-29
audience: developer
sources: [request.md, preflight.txt, artifacts/refactor/12-agents.md, artifacts/reports/instructions-candidates-2026-10-25.md, src/agents/developer.md, src/skills/shared/procedures/prove.md, src/skills/shared/procedures/phase-loop.md, src/skills/expediting/SKILL.md, src/skills/expediting/steps/10-check.md, src/skills/debugging/steps/30-diagnose.md, src/lib/shared/work/block.mts, src/lib/shared/work/send.mts, src/lib/verbs/reply/index.mts, src/lib/hooks/inject/rules/index.mts, src/lib/hooks/inject/rules/index.test.mts, src/templates/claude-block.md, CLAUDE.md, src/rules/untrusted.md, src/.claude-plugin/plugin.json, test/repo/agents.test.mjs, test/repo/skills.test.mjs, test/repo/references.test.mjs, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/repo/docs.test.mjs, test/repo/markdown-paths.test.mjs, test/timing/budgets.test.mjs, test/kernel/init.test.mjs, test/support/snapshot.mts, scripts/test.mjs, scripts/docs.mjs, docs/reference/skills.md, docs/how-to.md, CONTRIBUTING.md, .claude/agent-memory/picket-developer/]
phases:
  - n: 1
    files: [src/rules/tests.md, src/lib/hooks/inject/rules/index.mts, src/lib/hooks/inject/rules/index.test.mts, src/templates/claude-block.md, CLAUDE.md, test/timing/budgets.test.mjs, CONTRIBUTING.md]
    greps:
      - path: src/rules/tests.md
        pattern: '^# Tests\b'
      - path: src/lib/hooks/inject/rules/index.mts
        pattern: '"security-paths\.md", "tests\.md", "untrusted\.md"'
      - path: src/templates/claude-block.md
        pattern: '`security-paths`, `tests`, `untrusted`'
      - path: CLAUDE.md
        pattern: '`security-paths`, `tests`, `untrusted`'
      - path: test/timing/budgets.test.mjs
        pattern: 'claude_md_bytes: 2560\b'
      - path: CONTRIBUTING.md
        pattern: '`tests`'
    tests: true
    drive: true
  - n: 2
    files: [src/skills/implementing/SKILL.md, src/.claude-plugin/plugin.json, src/skills/shared/procedures/, src/agents/developer.md, src/skills/expediting/SKILL.md, src/skills/expediting/steps/10-check.md, src/skills/debugging/steps/30-diagnose.md, src/lib/shared/work/block.mts, src/lib/shared/work/block.test.mts, test/repo/description-cases.json, docs/reference/skills.md, docs/how-to.md]
    greps:
      - path: src/skills/implementing/SKILL.md
        pattern: '^name: implementing\b'
      - path: src/skills/implementing/SKILL.md
        pattern: '^user-invocable: false\b'
      - path: src/skills/implementing/SKILL.md
        pattern: '^Waivers: '
      - path: src/skills/implementing/SKILL.md
        pattern: 'Expedited: <id>'
      - path: src/.claude-plugin/plugin.json
        pattern: '"\./skills/implementing"'
      - path: src/lib/shared/work/block.mts
        pattern: 'expedited: \["Decisions", "Waivers"\]'
      - path: src/agents/developer.md
        pattern: 'picket:implementing'
      - path: src/skills/expediting/SKILL.md
        pattern: '^(?![\s\S]*prove\.md)'
        flags: i
      - path: docs/reference/skills.md
        pattern: '^## picket:implementing\b'
      - path: test/repo/description-cases.json
        pattern: '"skill": "implementing"'
    tests: true
    drive: false
  - n: 3
    files: [src/agents/developer.md, src/skills/shared/procedures/phase-loop.md, test/repo/agents.test.mjs, test/repo/skills.test.mjs, .claude/agent-memory/picket-developer/, .claude/agent-memory/picket-developer/MEMORY.md]
    greps:
      - path: src/agents/developer.md
        pattern: '^### Phase loop\b'
      - path: src/agents/developer.md
        pattern: '^## Memory\b'
      - path: src/agents/developer.md
        pattern: 'compares your `Verified:` line with the drive log'
      - path: src/agents/developer.md
        pattern: '^(?![\s\S]*shared/procedures)'
        flags: i
      - path: test/repo/agents.test.mjs
        pattern: 'const PENDING = \["src/agents/analyst\.md", "src/agents/architect\.md", "src/agents/reviewer\.md"\]'
      - path: test/repo/agents.test.mjs
        pattern: 'sendsFor'
      - path: src/skills/shared/procedures/phase-loop.md
        pattern: '^(?![\s\S]*Developer section)'
        flags: i
    tests: true
    drive: false
---
# Order: Convert the developer agent, item A

## Problem

Work item A of `artifacts/refactor/12-agents.md` (draft, 2026-10-29) converts the developer: its Target sections "Shell shape" and "Developer" and its decisions D-2 to D-4 carry over as given, with bundles 1, 2, 3 and 5 of `artifacts/reports/instructions-candidates-2026-10-25.md` (Walkthrough outcomes) as the detail. Checking them against trunk at `33e58ba` adds three binding facts. `CLAUDE.md` is 2,046 of its 2,048-byte budget (`test/timing/budgets.test.mjs:15`), so the rules line cannot gain `tests` without the raise to 2,560 that bundle 4.7 approved. A new skill must pass the routing tests (`test/repo/descriptions.test.mjs`: a case entry, 95 % share, no pair at cosine 0.75), the budget test's "Use when" check, `plugin.json`'s skill list and the docs section check. And `npm test` rebuilds `dist/` (`scripts/test.mjs`), which the bench now running reads, so no phase builds until the lead says the bench finished. No other agent, and no lane skill beyond the citers named here, changes.

## Decisions

### D-001: Three phases, with prove.md deleted where its replacement lands
**Decision:** Phase 1 adds the `tests` rule, which nothing else depends on. Phase 2 creates `picket:implementing` and deletes `prove.md` in the same phase, pointing all four citers at the skill, the developer shell's three Phase loop lines included. Phase 3 rewrites the shell. `prove.md` cannot outlive the skill by a phase: the skills test fails on any paragraph of 25 words in two instruction files, and the skill takes `prove.md`'s paragraphs. It cannot go earlier either, because `references.test.mjs` fails on a cited file that does not exist.
**Instead of:** one phase for the skill and the shell together: the shell rewrite alone needs most of the 8 criteria, and the user sees the skill before the shell that preloads it.

### D-002: The Entry check covers what picket next sends; reply's lines stay in Constraints
**Decision:** The new check in `agents.test.mjs` runs on every shell not in `PENDING`. It compares the fields its `## Entry` names with the field keys of every message `sendsFor` (`src/lib/shared/work/send.mts`) builds for that agent's type over fixed snapshots (`#test/snapshot.mts`). A field is the text before `: ` on a message line, or `run through` for `run through <m>`. In Entry, a field is a backticked span that starts with that key. For the developer the set is `work`, `phase`, `artifact`, `run through`, `review`. The three lines `picket reply` builds (`rejected: <why>`, `comment approved: …`, `waiver approved: …`, `src/lib/verbs/reply/index.mts:38-80`) are reactions to a gate, and the shell states them in Constraints, outside Entry.
**Instead of:** driving `picket reply` in the test to collect its lines too: that needs a git project fixture per reply form for three fixed strings, and Entry would then list lines that only arrive after a gate.

### D-003: The block template lives once, in implementing; the agents test reads it there
**Decision:** The developer shell's `## Output` has no fence. It names the template in `picket:implementing` and the two verdict tokens. `agents.test.mjs` gains a map `TEMPLATES = { developer: "src/skills/implementing/SKILL.md" }`. For a mapped agent, the output check takes the first fence under that file's `## Output`, and checks the labels of `BLOCK_FIELDS.phase` and `BLOCK_FIELDS.expedited` together, plus a line naming `## Expedited: <id>` in that file (R-039). `BLOCK_FIELDS.expedited` becomes `["Decisions", "Waivers"]`, as the request says.
**Instead of:** a fence in both the shell and the skill: the two copies are what drifted (the expedited block lacks `Decisions` and `Waivers` today).

### D-004: The CLAUDE.md budget rises to 2,560 bytes here
**Decision:** `claude_md_bytes` becomes 2560 in phase 1, the raise bundle 4.7 approved, because adding `tests` to the rules line takes `CLAUDE.md` from 2,046 to about 2,056 bytes. The harness rule asks for a one-line rationale next to a raised number, and the `comments` rule allows a new comment only with the user's approval. So the developer proposes the rationale on the block's `Comments:` line and writes it only after `comment approved:`. The existing comment on that line stays as it is.
**Instead of:** shortening another line of the Picket block to make room: bundle 4.7 already decided the raise, and step 4 rewrites rule 4 into the space.

### D-005: Until the bench finishes, phases test without building
**Decision:** Infrastructural decision. Until the lead says the bench finished, a phase runs `npm run typecheck`, `node scripts/test.mjs unit`, `picket verify <id> <n> --no-tests`, and `node --test` on the repo tests that read only `src/` (`agents`, `skills`, `references`, `descriptions`, `markdown-paths`). `npm test`, `picket verify` with tests, and any drive of a built hook wait for the lead's word. Each phase's last criterion is the full run.
**Instead of:** gating the whole order on the bench: phases 2 and 3 change only Markdown and tests, which the src-only commands cover.

## Scope

**In:**
- The `tests` rule, its injection, the rules line and the CLAUDE.md budget.
- `picket:implementing`, `prove.md`'s removal and its four citers, `BLOCK_FIELDS.expedited`.
- The developer shell, the developer half of `phase-loop.md`, the Entry and template checks, the two developer memories.

**Out:**
- The architect, analyst and reviewer shells and their step files (item B), and the brief's fields (draft D-2).
- Rows Ts1 to Ts4 citing the `tests` rule, and the lane skills' lead halves (step 4).

## Phase 1: The tests rule

**Touch set:**
- `src/rules/tests.md`: new, four test facts
- `src/lib/hooks/inject/rules/index.mts`: `INJECTED_RULES` gains `tests.md`
- `src/lib/hooks/inject/rules/index.test.mts`: six rules, untrusted last
- `src/templates/claude-block.md`: rules line gains `tests`
- `CLAUDE.md`: same line; must start with the template
- `test/timing/budgets.test.mjs`: `claude_md_bytes` 2560 (D-004)
- `CONTRIBUTING.md`: shipped rules list at line 21
- `src/rules/untrusted.md`: read only, rule form to follow
- `test/kernel/init.test.mjs`: read only, template prefix check

**Changes:**
1. `src/rules/tests.md` in the form of the other rules (`# Tests`, an "Always loaded." opening, short paragraphs, one concrete example), at most 60 lines, stating the draft's four facts:
   - write unit tests, plus architecture tests only where the project already has them;
   - write other kinds (integration, end-to-end, performance) only when the phase's `**Done when:**` or the fast-lane request names the kind;
   - a unit test touches no real infrastructure (database, network, file system outside a temp folder, clock);
   - every test asserts the rule its name claims; one that only checks a mock was called or that nothing threw pins nothing.
2. `INJECTED_RULES` becomes `prose, comments, work-items, security-paths, tests, untrusted`; the inject test's name and count follow, `untrusted` still last.
3. The rules line in `claude-block.md` and `CLAUDE.md` reads `` `prose`, `comments`, `work-items`, `security-paths`, `tests`, `untrusted` ``.
4. `claude_md_bytes: 2560`; propose the rationale comment per D-004.
5. `CONTRIBUTING.md:21` lists `tests` among the shipped rules.

**Done when:**
- **T-1.1** `src/rules/tests.md` exists, has at most 60 lines, opens `# Tests`, and states each of the four facts of Changes item 1.
- **T-1.2** `INJECTED_RULES` lists the six files in the order of Changes item 2, and `src/lib/hooks/inject/rules/index.test.mts` asserts six rules with `untrusted` last.
- **T-1.3** `CLAUDE.md` still starts with `src/templates/claude-block.md`, and both carry the line of Changes item 3.
- **T-1.4** `claude_md_bytes` is 2560, and the block's `Comments:` line proposes the rationale for `test/timing/budgets.test.mjs:15`.
- **T-1.5** `CONTRIBUTING.md` names six shipped rules, `tests` among them.
- **T-1.6** Before the bench finishes: `npm run typecheck` and `node scripts/test.mjs unit` pass.
- **T-1.7** After the lead says the bench finished: `npm test` passes, with the timing test's `CLAUDE.md` and `inject_chars` budgets included. The built `inject.rules` hook, run with `{}`, prints text containing `# Tests`.

## Phase 2: The implementing skill replaces prove.md

**Touch set:**
- `src/skills/implementing/SKILL.md`: new, agent-only skill with the template
- `src/.claude-plugin/plugin.json`: skill list gains implementing
- `src/skills/shared/procedures/prove.md`: deleted (escalated `git rm`)
- `src/skills/shared/procedures/`: owns the deletion for the commit
- `src/agents/developer.md`: preload, three Phase loop citations only
- `src/skills/expediting/SKILL.md`: two citations, Output points at template
- `src/skills/expediting/steps/10-check.md`: citation at line 3
- `src/skills/debugging/steps/30-diagnose.md`: citation at line 7
- `src/lib/shared/work/block.mts`: `BLOCK_FIELDS.expedited`
- `src/lib/shared/work/block.test.mts`: expected `BLOCK_FIELDS`
- `test/repo/description-cases.json`: implementing routing case
- `docs/reference/skills.md`: `## picket:implementing` section
- `docs/how-to.md`: line 215 cites `prove.md`
- `test/repo/skills.test.mjs`: read only, the shape it must pass
- `test/repo/descriptions.test.mjs`: read only, routing thresholds

**Changes:**
1. `implementing/SKILL.md`, bundle 2's shape (draft D-4), at most 150 lines. Frontmatter: `name: implementing`, a `description` that says what it does and carries "Use when" (the budget test requires it), `user-invocable: false`. Then a purpose paragraph, then the sections:
   - `## Steps`: one ordered list, from `prove.md`: name the kind of change; a bug, red first (including the `picket:debugging` hand-off); a refactor, pin first; a symptom fix needs `Root cause:`; `picket check` until `CHECK OK`; drive through the real entry point or record `no drivable surface: <reason>`.
   - `## Rules`: the `picket drive` forms and scratch-file rule from `prove.md`'s Drive section, and a citation of the `tests` rule in place of `prove.md`'s "What a good test is". No drive reminder (bundle 4.2: the shell states it as a fact).
   - `## Output`: one fence whose heading is `## Phase <n> of <id>: <phase title>`, with the headline line, the ten labels in `BLOCK_FIELDS.phase` order and `PHASE DONE` last. After the fence, prose says the fast lane uses the same lines under `## Expedited: <id>` and ends with its options line (`[c] commit   [x] discard: <why>`, plus `[k] keep comment <n>` when comments are proposed) instead of a verdict.
2. `plugin.json` lists `./skills/implementing` in sorted place.
3. Delete `prove.md` with an escalated `git rm` alone, and list it `(deleted)` on `Files:`.
4. `developer.md`: add `skills:` with `- picket:implementing` to the frontmatter. Phase loop items 1 to 3 name `picket:implementing` where they name `prove.md`. Nothing else in the shell changes in this phase.
5. `expediting/SKILL.md` lines 31 and 39 load `picket:implementing` (by name, never by path, per the reach rule). `## Output` keeps its first two lines, replaces the fence with one sentence pointing at the template's fast-lane form, and keeps the comment-numbering line. `10-check.md:3` and `30-diagnose.md:7` name `picket:implementing`.
6. `BLOCK_FIELDS.expedited` becomes `["Decisions", "Waivers"]`, and `block.test.mts` expects it.
7. `description-cases.json` gains an `implementing` entry (3 or more positive, 2 or more negative cases with existing owners). `docs/reference/skills.md` gains a `## picket:implementing` section in the page's form, saying the user never invokes it. `docs/how-to.md:215` names the skill instead of the `prove.md` path.

**Done when:**
- **T-2.1** `implementing/SKILL.md` passes `test/repo/skills.test.mjs` with no `PENDING` entry, has at most 150 lines, and its frontmatter holds `user-invocable: false` and a description with "Use when".
- **T-2.2** Its `## Steps` is one ordered list covering the six steps of Changes item 1, and its `## Rules` cites the `tests` rule and has no "drive you did not run" sentence.
- **T-2.3** Its Output fence heading fills to a `phase` heading; the fence holds each label of `BLOCK_FIELDS.phase` and `BLOCK_FIELDS.expedited` and ends `PHASE DONE`; the file names `## Expedited: <id>` and the fast-lane options line.
- **T-2.4** `src/skills/shared/procedures/prove.md` does not exist, and a grep for `prove.md` under `src/`, `docs/`, `README.md` and `CONTRIBUTING.md` finds nothing.
- **T-2.5** `developer.md` preloads `picket:implementing`; `expediting/SKILL.md`, `expediting/steps/10-check.md` and `debugging/steps/30-diagnose.md` name `picket:implementing`; `node --test test/repo/references.test.mjs` passes.
- **T-2.6** `BLOCK_FIELDS.expedited` is `["Decisions", "Waivers"]`, and `node scripts/test.mjs unit` passes.
- **T-2.7** `node --test test/repo/descriptions.test.mjs test/repo/skills.test.mjs test/repo/markdown-paths.test.mjs test/repo/agents.test.mjs` passes, `plugin.json` lists the skill, and `docs/reference/skills.md` has its section.
- **T-2.8** After the lead says the bench finished: `npm test` passes, the docs and plugin layout tests included.

## Phase 3: The developer shell in six parts

**Touch set:**
- `src/agents/developer.md`: rewritten into the six parts
- `src/skills/shared/procedures/phase-loop.md`: lead half only
- `test/repo/agents.test.mjs`: Entry check, template map, `PENDING`
- `test/repo/skills.test.mjs`: `PENDING.lists` if phase-loop gains a list
- `.claude/agent-memory/picket-developer/`: two memory files deleted by the lead
- `.claude/agent-memory/picket-developer/MEMORY.md`: their two index lines, by the lead
- `src/lib/shared/work/send.mts`: read only, `sendsFor`
- `test/support/snapshot.mts`: read only, `snapshotOf` fixtures
- `test/support/instructions.mts`: read only, `sections`, `fences`

**Changes:**
1. `developer.md`, at most 120 lines (about 79 by the draft), the frontmatter unchanged since phase 2:
   - **Identity:** today's paragraph.
   - **`## Entry`:** the fields of D-002 (`work: <id>`, `phase: <n>`, `artifact: <path>` on the first message, `run through <m>` inside a granted run, `review: <path>` after a cumulative review), the first tool batch, and the continuation rule. No `step:`, no pasted section.
   - **`## Constraints`:**
     - today's write scope, Bash, scope and stall sentences;
     - the `tests` rule cited in place of the test paragraph;
     - "`picket verify` compares your `Verified:` line with the drive log" (bundle 4.2);
     - the comments and waivers paragraphs, plus the reaction to `rejected: <why>`;
     - a `.claude/` path in the touch set goes to the lead with path, line and text;
     - a deleted file goes by an escalated `git rm` alone and is listed `(deleted)` on `Files:`;
     - report only in your block, never a status-only turn (bundle 4.4).
   - **`## Work`** with **`### Phase loop`:** today's steps with `picket:implementing`, plus `phase-loop.md`'s developer half: the artifact once per item, touch set reads, verify before and after, granted runs, the stall rule.
   - **`## Memory`:** save repo, machine and tool facts; a workflow rule goes on the block's `Decisions:` line, never into memory.
   - **`## Output`:** no fence (D-003). End with the block in `picket:implementing`'s template; the last line is exactly `PHASE DONE` or `PHASE STALLED`; the hooks route it; the commit body goes indented under `Commit:`.
2. `phase-loop.md` drops the paste sentence, the `step:` line and `## Developer section`. Its first-phase message becomes "send what `picket next` prints". If the result has an ordered list, it leaves `PENDING.lists`.
3. `agents.test.mjs`: `PENDING` drops `developer.md`. Add the Entry check of D-002 with developer fixtures (`implement_phase` as `Agent` with `run_through`, as `SendMessage`, and `fix_findings`), plus a test that every shell outside `PENDING` has fixtures. Add `TEMPLATES` and the template-based output check of D-003, with samples: an Entry missing `review:`, an Entry naming an extra `foo:`, and a template fence without `Waivers:` each fail.
4. Ask the lead to delete `claude-dir-edits-via-lead.md` and `deleting-files-in-a-phase.md` and their two lines in `.claude/agent-memory/picket-developer/MEMORY.md` (the shell forbids `.claude/` edits), once item 1's two sentences are in.

**Done when:**
- **T-3.1** `developer.md` has the identity paragraph and the five `##` parts in order with `### Phase loop` under `## Work`, has at most 120 lines, and `agents.test.mjs` `PENDING` no longer lists it.
- **T-3.2** The Entry check passes for the developer, with fields exactly `work`, `phase`, `artifact`, `run through`, `review`; the missing-field and extra-field samples fail.
- **T-3.3** Constraints hold the `.claude/` sentence, the escalated `git rm` sentence, the `tests` rule citation, the `Verified:` fact sentence and the status-only-turn sentence.
- **T-3.4** `developer.md` has no fenced block; the output check passes through `TEMPLATES` with kinds still `artifact`, `phase`, `report`, `review`, and the template sample without `Waivers:` fails.
- **T-3.5** `developer.md` names no `shared/procedures` path, `phase-loop.md` has no `Developer section` and no `step:` line, and `node --test test/repo/references.test.mjs test/repo/skills.test.mjs` passes with `PENDING` exact.
- **T-3.6** The two memory files and their index lines are gone, and `node --test test/repo/markdown-paths.test.mjs` passes.
- **T-3.7** `node --test test/repo/agents.test.mjs` and `node scripts/test.mjs unit` pass before the bench finishes.
- **T-3.8** After the lead says the bench finished: `npm test` passes.

## Open questions

none

## Revision log
