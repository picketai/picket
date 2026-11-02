---
kind: order
lane: order
title: Lane skills and the end of shared
date: 2026-10-29
audience: developer
sources: [request.md, preflight.txt, artifacts/refactor/13-lane-skills.md, artifacts/reports/instructions-candidates-2026-10-25.md, src/templates/claude-block.md, CLAUDE.md, src/skills/expediting/, src/skills/ordering/, src/skills/designing/, src/skills/researching/, src/skills/shared/procedures/, src/skills/ticketing/SKILL.md, src/skills/ticketing/steps/20-jira.md, src/skills/resuming/SKILL.md, src/skills/implementing/SKILL.md, src/agents/reviewer.md, src/lib/verbs/open/index.mts, src/lib/verbs/admit/, src/lib/verbs/close/, src/lib/verbs/packet/packet.mjs, src/lib/verbs/reply/index.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/send.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/next-view.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/work/reviews.mts, src/lib/shared/work/artifact.mts, src/lib/shared/route/plan.mts, src/lib/hooks/route/verdict/index.mts, test/repo/skills.test.mjs, test/repo/references.test.mjs, test/repo/agents.test.mjs, test/repo/conventions.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/descriptions.test.mjs, test/support/routing.mts, test/support/snapshot.mts, test/timing/budgets.test.mjs, bench/test/tasks.test.mjs, docs/reference/skills.md, docs/how-to.md, CONTRIBUTING.md, .claude/rules/harness-authoring.md]
phases:
  - n: 1
    files: [src/lib/verbs/admit/index.mts, src/lib/shared/admission/, src/lib/verbs/open/index.mts, src/lib/verbs/open/index.test.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/views.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/agents/reviewer.md, test/repo/agents.test.mjs, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.mts, src/lib/verbs/close/index.test.mts, test/cli/close.test.mjs, src/lib/shared/git.mts, src/lib/shared/git.test.mts, src/lib/shared/work/report.mts, src/lib/shared/work/report.test.mts, src/lib/verbs/packet/packet.mjs, src/lib/shared/work/artifact.mts, src/lib/shared/work/artifact.test.mts, src/lib/shared/work/reviews.mts, src/lib/shared/work/reviews.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/admission/admit.mts
        pattern: 'export function admit\b'
      - path: src/lib/verbs/admit/index.mts
        pattern: 'shared/admission/admit\.mts'
      - path: src/lib/verbs/open/index.mts
        pattern: 'user-lane'
      - path: src/lib/shared/work/action-text.mts
        pattern: '"review_crosscheck"'
      - path: src/lib/shared/work/send.mts
        pattern: '`delta: '
      - path: src/agents/reviewer.md
        pattern: '`delta: '
      - path: src/lib/verbs/close/block.mts
        pattern: 'export function closingBlock\b'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'reportFindings'
      - path: docs/reference/cli.md
        pattern: '--user-lane'
    tests: true
    drive: true
  - n: 2
    files: [src/templates/claude-block.md, CLAUDE.md, src/skills/ordering/SKILL.md, src/skills/ordering/steps/open.md, src/skills/designing/SKILL.md, src/skills/designing/steps/open.md, src/skills/ticketing/SKILL.md, src/skills/ticketing/steps/20-jira.md, src/skills/resuming/SKILL.md, test/repo/skills.test.mjs, test/repo/references.test.mjs, test/repo/plugin-layout.test.mjs, test/support/routing.mts, test/timing/budgets.test.mjs, CONTRIBUTING.md]
    greps:
      - path: src/templates/claude-block.md
        pattern: 'Pass the reply to `picket reply <id> "<reply>"` and send what it prints\.'
      - path: CLAUDE.md
        pattern: 'run its `first:` lines'
      - path: src/skills/ordering/SKILL.md
        pattern: '^when_to_use:'
      - path: src/skills/ordering/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|shared/procedures|no `picket admit` answer))'
        flags: i
      - path: src/skills/designing/SKILL.md
        pattern: '^when_to_use:'
      - path: src/skills/designing/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|shared/procedures|no `picket admit` answer))'
        flags: i
      - path: src/skills/ordering/steps/open.md
        pattern: '^# Ordering: '
      - path: src/skills/designing/steps/open.md
        pattern: '^# Designing: '
      - path: src/skills/ticketing/steps/20-jira.md
        pattern: '\.picket/state/scratch/<KEY>\.md'
      - path: test/repo/references.test.mjs
        pattern: '^(?![\s\S]*(shared/procedures|"shared"))'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: '^(?![\s\S]*(shared/procedures|src/skills/(ordering|designing)/))'
        flags: i
      - path: test/support/routing.mts
        pattern: 'when_to_use'
    tests: true
    drive: false
  - n: 3
    files: [src/skills/expediting/SKILL.md, src/skills/researching/SKILL.md, src/skills/researching/steps/outline.md, src/skills/researching/steps/deep.md, test/repo/skills.test.mjs]
    greps:
      - path: src/skills/expediting/SKILL.md
        pattern: '^when_to_use:'
      - path: src/skills/expediting/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|steps/|no `picket admit` answer))'
        flags: i
      - path: src/skills/researching/SKILL.md
        pattern: '^when_to_use:'
      - path: src/skills/researching/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|no `picket admit` answer))'
        flags: i
      - path: src/skills/researching/steps/outline.md
        pattern: '^# Researching: '
      - path: src/skills/researching/steps/deep.md
        pattern: '^# Researching: '
      - path: test/repo/skills.test.mjs
        pattern: '^(?![\s\S]*src/skills/(expediting|researching|ordering|designing)/)'
        flags: i
    tests: true
    drive: false
---
# Order: Lane skills and the end of shared

## Problem

The request implements `artifacts/refactor/13-lane-skills.md` (draft, 2026-10-29), whose Target, Decisions and Migration carry over as given. Checking them against trunk at `6a38c20` adds four binding facts. The layer rule in `test/repo/conventions.test.mjs:174` lets a verb import only its own folder, `shared`, `util` and `mods.mts`, so `open` cannot call `admit()` where it lives today. `test/repo/agents.test.mjs` fails on a send field a shell's `## Entry` does not name, so a `delta:` line needs the reviewer shell and its fixture together. The budget test requires "Use when" in the `description` (`test/timing/budgets.test.mjs:80`) and routing reads only `description` (`test/support/routing.mts:10`), so triggers cannot move to `when_to_use` without both helpers reading it. And after an `AMENDED` that answers a drift the item stays `blocked` (`AMENDED` changes nothing in the route plan; `next-step.test.mts:113` pins the block going back to the user), and only `amend.md` step 2 reopens it, by the lead's `picket set`. The phases follow the draft's migration: kernel (step 1), ticketing, CLAUDE.md, ordering, designing and the end of `shared/` (steps 2 and 3), then expediting and researching (step 4). The bench (step 5) is out.

## Decisions

### D-001: open enforces admit's lane through a shared admission module
**Decision:** `admit()`, `lane.mts`, `signals.mts` and their three tests move with `git mv` to `src/lib/shared/admission/`; `verbs/admit/index.mts` keeps the verb and re-exports `admit`, so `bench/test/tasks.test.mjs:5` still imports it from `dist/lib/verbs/admit/index.mjs`. With a request text, `open` runs `admit(root, text)` and refuses (exit 2) when the asked lane is lighter (rank fast < order < design), when one of the two is `research` and the other is not, or when admit answers `none`. The message names admit's lane, its reasons, and `--user-lane`. With `--user-lane` the item opens and the first row of `verdicts.jsonl` is `{ agent: "user", verdict: "user-lane", phase: null, scope: null, through: null, admitted: <admit's lane> }`; `VerdictRow` and `VerdictView` gain the optional `admitted`. Without a request text (`expediting` opens with a title only) no check runs. A heavier lane, a forced `lane:` line and a security-path upgrade pass, since admit already returns them.
**Instead of:** an exception in the layer rule for `open` importing `verbs/admit`: it breaks the rule that keeps verbs independent for one caller.
**Risks:**
- **RISK-001** An existing test opens a lighter lane with a request text and now fails. Mitigation: the developer adds `--user-lane` to that fixture, never weakens the refusal.

### D-002 (r2): AMENDED reopens the item, and the delta re-check is a next action of its own
**Decision:** The route plan's `amended` effect reopens a `blocked` item (`status: open`, `blocked_reason` unset, applied line `status=open (amended)`) when the `AMENDED` rows in the snapshot plus this one number fewer than 3. This does in the kernel what `amend.md` step 2 had the lead do with `picket set`. The third and later rounds change nothing, so a drift-blocked item stays blocked, and `blockStep`'s existing `isStalled` count (`AMENDED` 3 or more) offers the stall options as today. An item that is already open (a review's amendment) is left as it is. The stall check stays in `blockStep`, because the plan's count leaves it nothing to move. A new action `review_crosscheck` (actor `reviewer`, no phase, a `delta: string[]` field) joins `NEXT_ACTIONS`, `ACTION_TEXT` ("reviewer re-checks the amended decisions") and `sendsFor`. `phasedStep` returns it, right after the pending-amend check, when the lane is `design`, the last reviewer row with scope `crosscheck` is `DRIFT DETECTED`, and an `AMENDED` row follows it. The delta is the `D-###` ids on `## Revision log` lines dated on or after the drift row's UTC date, de-duplicated in order of first appearance. The send continues the reviewer instance with `work:`, `scope: crosscheck`, `artifact:` and `delta: D-002, D-004`; with no id found the `delta:` line is left out, which asks for a full pass. A drift therefore costs no user stop: the verdict hook's `Next:` line after `AMENDED` is `review_crosscheck`. After a review's amendment it is `implement_phase` or `fix_findings`.
**Instead of:** adding the reviewer send to `implement_phase` beside the developer, as the first cross-check rides: when phase 1 is already done, `next` says `approve_phase`, a gate with no sends, and the re-check never goes out. Leaving the item blocked after `AMENDED` lost too: it adds a user stop per drift, which bench tasks 13 and 14 never had (walkthrough D4 guard).
**Risks:**
- **RISK-002** An item blocked for another reason (a `PHASE STALLED`) when `AMENDED` lands would reopen too. Mitigation: `picket reply` reopens a stall before the architect is sent anything (`c` or `d`), so `AMENDED` cannot reach a stall-blocked item through the lane.

### D-003: close builds the whole closing block
**Decision:** `CloseResult` gains `closing: { phases, commits: { first, last } | null, decisions: { count, amended } | null, review, questions, report: { findings, architect_review } | null }`. A new `verbs/close/block.mts` exports `closingBlock(result)`, which `--human` renders. Three shared helpers feed it, each with a unit test: `report.mts` `reportFindings(body)` (the finding count `packet.mjs:130` computes today, which then calls it, plus the `R-###` ids on lines flagged `[ARCHITECT REVIEW NEEDED]`); `artifact.mts` `decisionCounts(body)` (`### D-###` headings, amended when the heading carries `(rN)`); `reviews.mts` `reviewQuestions(root, id)` (the `Questions:` value of `reviews/cumulative.md`, null when absent or `none`). `git.mts` gains `lastCommitOf(root, path)` (`git log -1 --format=%h -- <path>`): `first` is phase 1's `phases/1.approved` commit, `last` the close commit, or the last phase's when close commits nothing.
**Instead of:** a `--block` flag beside today's `--human` render: two human forms of one result, and the lead would still assemble one by hand.

### D-004: Triggers move to when_to_use, and the test helpers read both fields
**Decision:** In each lane skill, `description` says what the lane does and `when_to_use` opens "Use when" with the trigger phrases. `skillDescriptions` in `test/support/routing.mts` returns `when_to_use` too (one frontmatter reader taking the key), routing vectorises `description` and `when_to_use` joined, and the budget test looks for "Use when" in either while keeping its 1,024-character cap on `description` alone.
**Instead of:** keeping "Use when" inside `description`, as `implementing` does: bundle 2 approved the split, and `implementing` has no trigger phrases to move.

### D-005: ticketing --pull <KEY> --story is the lane intake
**Decision:** With `--pull`, a key and `--story`, ticketing does `jira-intake.md`'s work instead of rendering: `getJiraIssue` with `view: full`, the description and acceptance-criteria fields written unedited, in that order, to `.picket/state/scratch/<KEY>.md`, then one line with the flags `--ticket <KEY> --story .picket/state/scratch/<KEY>.md` for `picket open`, and stop. `--pull` without `--story` renders as today.
**Instead of:** a new `--intake` flag: the request names `--pull <KEY> --story`. What it gives up: pulling a story to read it in the user-story template now takes `--pull <KEY>` alone.

## Scope

**In:**
- `open`'s lane refusal, `close --human`'s block, the `review_crosscheck` action, and their docs and tests.
- CLAUDE.md block rules 3 and 4, the four lane skills in bundle 2's shape, ticketing's intake, `src/skills/shared/` removed with every citer.

**Out:**
- The reviewing skill and its cross-check checklist (draft 14), the bench run, and the developer's phase 1 re-check message after an amendment (the delta re-check and the cumulative review cover it).

## Phase 1: Kernel: lane refusal, closing block, delta re-check

**Touch set:**
- `src/lib/verbs/admit/`: lane, signals and three tests leave
- `src/lib/verbs/admit/index.mts`: verb stays, re-exports `admit`
- `src/lib/shared/admission/`: new home, `admit.mts` included
- `src/lib/verbs/open/index.mts`: refusal and `--user-lane`
- `src/lib/verbs/open/index.test.mts`: refusal cases
- `src/lib/shared/work/verdict-log.mts`: optional `admitted`
- `src/lib/shared/views.mts`: `VerdictView` mirrors it
- `src/lib/shared/route/plan.mts`: `amended` reopens (D-002)
- `src/lib/shared/route/plan.test.mts`: line 89 splits
- `src/lib/shared/work/next-step.mts`: `review_crosscheck` step
- `src/lib/shared/work/next-step.test.mts`: re-check cases
- `src/lib/shared/work/action-text.mts`: action and its text
- `src/lib/shared/work/send.mts`: reviewer send with `delta:`
- `src/lib/shared/work/send.test.mts`: send lines
- `src/agents/reviewer.md`: Entry names `delta:`
- `test/repo/agents.test.mjs`: reviewer fixture and `sentKeys`
- `src/lib/verbs/close/close.mts`: `closing` facts
- `src/lib/verbs/close/block.mts`: new, `closingBlock`
- `src/lib/verbs/close/index.mts`: render calls `closingBlock`
- `src/lib/verbs/close/index.test.mts`: block per lane
- `test/cli/close.test.mjs`: render strings follow
- `src/lib/shared/git.mts`: `lastCommitOf`
- `src/lib/shared/git.test.mts`: its test
- `src/lib/shared/work/report.mts`: new, `reportFindings`
- `src/lib/shared/work/report.test.mts`: new
- `src/lib/verbs/packet/packet.mjs`: count through `reportFindings`
- `src/lib/shared/work/artifact.mts`: `decisionCounts`
- `src/lib/shared/work/artifact.test.mts`: its test
- `src/lib/shared/work/reviews.mts`: `reviewQuestions`
- `src/lib/shared/work/reviews.test.mts`: its test
- `docs/reference/cli.md`: regenerated by `npm run docs`
- `test/repo/conventions.test.mjs`: read only, layer rule
- `test/support/snapshot.mts`: read only, fixtures

**Changes:**
1. The admission move and `open`'s refusal of D-001. `open`'s usage gains `[--user-lane]`.
2. D-002: the `amended` effect in `plan.mts` (the `AMENDED` case leaves `plan.test.mts:89` for its own test), and `review_crosscheck` in `next-step.mts`, `action-text.mts` and `send.mts`. `reviewer.md` `## Entry` adds one sentence: a re-check after an amendment adds `` `delta: <D-### ids>` ``. `agents.test.mjs` adds a re-check fixture to the reviewer's `ENTRY_FIXTURES`; `sentKeys("reviewer")` becomes `artifact, delta, phase, scope, summary, work`.
3. The closing block of D-003, rendered as below; a line whose value is empty or absent is left out. The lead prints one sentence on what shipped above it.

   ```
   ## <Expedited|Order|Design|Research> closed: <id>
   Commit: <sha> <message> | nothing to commit                   (fast)
   Phases: <n> · commits <first>..<last> · review: <verdict>      (order)
   Phases: <n> · decisions: <n> (<k> amended) · commits <first>..<last> · review: <verdict>   (design)
   Report: work/<id>/research.md · findings: <n> · architect review: <R-ids | no>   (research)
   Questions: <reviewQuestions>
   Repeats: <class> (<items>)                                     (one per repeat)
   Left for you: <leftLine>                                       (one per entry)
   Left staged: <paths, comma-separated>
   WARNING: <each commit warning, then the dirty-path warning>
   Follow-up: Fix the <class> mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in <items> rejected.
   ```

**Done when:**
- **T-1.1** `admit`, `laneOf` and `signalsOf` live under `src/lib/shared/admission/` with their tests; `verbs/admit` keeps only `index.mts` and `index.test.mts`; `node --test test/repo/conventions.test.mjs` passes.
- **T-1.2** `open --lane fast` with the text "add a /summary endpoint" is refused with exit 2 naming `order` and `--user-lane`, and no `work/` folder is written; `--lane order` with a text that admits `design`, `--lane research` with a change text and `--lane order` with a research question are refused too; `--lane design` with an order text and `--lane fast` without a text open.
- **T-1.3** With `--user-lane` the refused fast item opens and its first `verdicts.jsonl` row is `user-lane` with `admitted: "order"`.
- **T-1.4** Routing `AMENDED` on a drift-blocked design item sets it `open` with no `blocked_reason` on the first and second rounds, and leaves it `blocked`, with `next` offering the stall options, on the third. On a design snapshot with a crosscheck `DRIFT DETECTED` row dated 2026-10-29, then `AMENDED`, status open, and a revision log with `2026-10-28: D-001 (r2)` and `2026-10-29: D-003 (r2)` lines, `next` is `review_crosscheck` with one `SendMessage` to the reviewer instance carrying `delta: D-003`; after a later crosscheck `ALIGNED` it is not; on an order snapshot it never is; `node --test test/repo/agents.test.mjs` passes.
- **T-1.5** `closingBlock` unit tests cover each lane's line, a design record of 3 decisions with 1 `(r2)` giving `decisions: 3 (1 amended)`, `Questions:` left out for `none`, and one `Follow-up:` line per repeat.
- **T-1.6** `packet.mjs` and `close` count findings through `reportFindings`; a report with lines `- **R-002** ... [ARCHITECT REVIEW NEEDED]` and `- **R-004** ...` gives `findings: 2 · architect review: R-002`.
- **T-1.7** Driven through the built CLI in a scratch git project: the refused `open` of T-1.2 and its `--user-lane` retry, and `close <id> --human` on a research item with that report, print the lines above.
- **T-1.8** `npm run docs` leaves `docs/reference/cli.md` with both new usages, and `npm test` passes.

## Phase 2: CLAUDE.md, ordering, designing, ticketing; shared/ removed

**Touch set:**
- `src/templates/claude-block.md`: rules 3 and 4
- `CLAUDE.md`: same block, must start with it
- `src/skills/ordering/SKILL.md`: rewritten
- `src/skills/ordering/steps/`: `10-order.md` becomes `open.md`
- `src/skills/ordering/steps/open.md`: the opening only
- `src/skills/designing/SKILL.md`: rewritten, crosscheck folded in
- `src/skills/designing/steps/`: `10-design.md` to `open.md`; `20-crosscheck.md` deleted
- `src/skills/designing/steps/open.md`: the opening only
- `src/skills/ticketing/SKILL.md`: operation line names the intake
- `src/skills/ticketing/steps/20-jira.md`: Pull gains the intake
- `src/skills/resuming/SKILL.md`: lines 24 and 25 cite rules
- `src/skills/shared/`: deleted, five files
- `test/repo/skills.test.mjs`: `PROCEDURES_DIR` and `PENDING`
- `test/repo/references.test.mjs`: no procedures, fixtures move
- `test/repo/plugin-layout.test.mjs`: shared/ test plants a folder
- `test/support/routing.mts`: reads `when_to_use` (D-004)
- `test/timing/budgets.test.mjs`: "Use when" in either field
- `CONTRIBUTING.md`: C-019 line at 100
- `.claude/rules/harness-authoring.md`: line 18, by the lead
- `src/skills/implementing/SKILL.md`: read only, shape model
- `test/support/instructions.mts`: read only, `frontmatterFields`

**Changes:**
1. Rules 3 and 4 of the block, in both files, read exactly as below. The draft's rule 3 gains the `first:` clause (the cumulative summary and mutation runs now live there) and bundle 4.6's end-the-turn sentence.

   ```
   3. Agents are `picket:analyst`, `picket:architect`, `picket:developer`, `picket:reviewer`. Send exactly what `picket next <id>` prints: run its `first:` lines, then use its tool, instance name, type and model, with the message verbatim. While an agent works, end the turn; its notification brings the block, then run `picket next <id>` again.
   4. Stop only at a user gate: print `picket packet <id>` verbatim and end the turn. Pass the reply to `picket reply <id> "<reply>"` and send what it prints. Never two stops in a row.
   ```
2. `ordering/SKILL.md` and `designing/SKILL.md` in bundle 2's shape (D-004 frontmatter, no `user-invocable`, no lane check, purpose paragraph, `## Steps` one ordered list of 5 to 8 items, `## Rules`, `## Output`). Steps: a Jira key runs `picket:ticketing --pull <KEY> --story` by name; `steps/open.md`; then each `picket next` action as one item saying what to send or print, `close` being `picket close <id> --human` with the lead's sentence above it. Designing adds: phase 1's two sends go in one tool block; a `PHASE DONE` before the cross-check verdict holds the packet; after a drift, `amend`, then `review_crosscheck` with no gate between (D-002). Rules keep each lane's run-grant, caps (`exceeds order caps`), irreversible, checkpoint and three-round facts, `amend.md`'s batch-the-rulings sentence, and "a refusal naming `--user-lane`: ask the user; add the flag only on their word". `## Output` is the closing block.
3. `steps/open.md` per lane, header `# <Skill>: open the work item`, one ordered list: `picket open` with the request in a quoted heredoc and the ticketing flags; exit 2 for a pinned reference prints the places it lists and asks; preflight, `fail` lines stop; `resolve_sources` prints the packet and applies `picket source pick`.
4. Ticketing's intake of D-005 in `20-jira.md` `## Pull`, and the SKILL's operation line names it.
5. `resuming/SKILL.md` line 24 cites rule 4 instead of `gate.md`; line 25 says the lane's Steps and the messages `picket next` prints.
6. `git rm -r src/skills/shared` as one escalated command; the block lists the five paths `(deleted)` and says the lead reads rules 3 and 4 from phase 3 on.
7. Tests: `skills.test.mjs` drops `PROCEDURES_DIR` and its uses, `PENDING` loses every ordering, designing and procedure entry (frontmatter and sections become `EVERY_SKILL` without the two). `references.test.mjs` drops `"shared"`, `PROCEDURES` and the procedure owner; fixtures naming moved files use `open.md`; the base-relative assertion runs on literal text through `references()`. `plugin-layout.test.mjs:113` plants its own folder without a `SKILL.md`. Routing and budgets per D-004.
8. `CONTRIBUTING.md:100` drops the procedures clause and says step and checklist files are kebab-case with no number prefix. Propose the new `harness-authoring.md:18` text (no shared procedures in the reach sentence) to the lead on the block.

**Done when:**
- **T-2.1** Both block files carry rules 3 and 4 of Changes item 1; `CLAUDE.md` starts with the template and stays under 2,560 bytes.
- **T-2.2** `ordering` and `designing` pass the frontmatter, sections, names, headers, lists and repeats checks with no `PENDING` entry, and each `SKILL.md` has at most 150 lines.
- **T-2.3** Designing's Steps name the two-send phase 1, the held packet, and `amend` followed by `review_crosscheck` with no user stop between.
- **T-2.4** `src/skills/shared/` and `designing/steps/20-crosscheck.md` do not exist, and `git grep -n "shared/procedures" -- src docs README.md CONTRIBUTING.md` prints nothing.
- **T-2.5** `20-jira.md` describes the intake of D-005, with `.picket/state/scratch/<KEY>.md` and the `--ticket`/`--story` line.
- **T-2.6** `node --test test/repo/skills.test.mjs test/repo/references.test.mjs test/repo/plugin-layout.test.mjs test/repo/descriptions.test.mjs test/repo/markdown-paths.test.mjs` passes, with `EXCEPTIONS` empty.
- **T-2.7** `npm test` passes, the budget test's "Use when" and `CLAUDE.md` checks included.

## Phase 3: Expediting and researching

**Touch set:**
- `src/skills/expediting/SKILL.md`: rewritten, steps inline
- `src/skills/expediting/steps/`: `10-check.md` folded in, deleted
- `src/skills/researching/SKILL.md`: rewritten
- `src/skills/researching/steps/`: renames by `git mv`
- `src/skills/researching/steps/outline.md`: from `10-outline.md`
- `src/skills/researching/steps/deep.md`: from `20-deep.md`
- `test/repo/skills.test.mjs`: last lane `PENDING` entries
- `src/lib/verbs/reply/index.mts`: read only, refuses research items

**Changes:**
1. `expediting/SKILL.md` in bundle 2's shape. `## Steps`: open (one tool batch with the reads), name the touch set, load `picket:implementing` before the first edit, re-admit with `--touched` in the batch of the first edit, check and drive, stage only the touch set, print the block of `picket:implementing`'s fast-lane form and stop, apply the reply. `## Rules`: the craft bar, the escalation rule, and `10-check.md`'s reply table (artifact D-2), whose commit row runs `picket close <id> --message "<m>" --touched <paths> --human` and prints its output. `## Output`: today's text.
2. `researching/SKILL.md` in the same shape: Steps open via `steps/outline.md`, print the packet and stop, `d` via `steps/deep.md`, close with `picket close <id> --human`. `## Rules`: the analyst's scope, the `a`/`d`/`x` mapping (`picket reply` refuses research items), the third-redirect rule. `## Output`: the packet sample. Step files open `# Researching: <name>` and hold an ordered list.
3. `skills.test.mjs`: `PENDING` loses every expediting and researching entry, so `repeats` is empty and frontmatter and sections drop all four lane skills.

**Done when:**
- **T-3.1** `expediting` and `researching` pass the frontmatter, sections, names, headers, lists and repeats checks with no `PENDING` entry, each `SKILL.md` at most 150 lines.
- **T-3.2** `src/skills/expediting/steps/` and the two numbered researching step files do not exist; `outline.md` and `deep.md` open `# Researching: ` and hold an ordered list.
- **T-3.3** Expediting's `## Rules` holds the five reply rows, and its commit row ends with `--human`.
- **T-3.4** `PENDING.repeats` is empty and no `PENDING` list names a lane skill file.
- **T-3.5** `npm test` passes.

## Open questions

- **OQ-001** `reviewing/checklists/60-crosscheck.md:9` asks for a full pass when the previous verdict was `DRIFT DETECTED`, and a delta pass only after `ALIGNED`, so the reviewer may ignore the `delta:` line D-002 sends. Owner: user, in the reviewing group (draft 14). Fallback: the send still names the delta; a full pass checks more, never less.

## Revision log

- 2026-10-29: D-002 (r2): AMENDED reopens a blocked item below three rounds; no user stop per drift; why: amend.md's reopen moves into the kernel, bench stop counts hold
