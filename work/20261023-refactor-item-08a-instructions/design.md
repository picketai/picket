---
kind: design
lane: design
title: Refactor item 08a, instructions
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/08a-instructions.md, artifacts/refactor/00-conventions.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/04d-reading-and-reporting.md, work/20261023-refactor-item-04a-work-item-model/design.md, src/lib/shared/work/next-step.mts, src/lib/shared/work/gate.mts, src/lib/shared/work/artifact.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/verdicts.mjs, src/lib/verbs/route/plan.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/hooks/guard/block/index.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/pullrequest/threads.mts, src/lib/verbs.mts, src/mods/session/hooks/sessions.ts, src/skills (all 17 SKILL.md and their steps), src/agents (all four), src/rules (all five), src/output-styles/custom.md, test/repo/names.test.mjs, test/repo/markdown-paths.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/descriptions.test.mjs, test/timing/budgets.test.mjs, test/support/routing.mts, test/support/snapshot.mts, test/support/kernel-sources.mts, test/kernel/packet.test.mjs, scripts/build.mjs, .claude/rules/harness-authoring.md, docs/how-to.md]
phases:
  - n: 1
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/artifact.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs, src/lib/verbs/pullrequest/threads.mts, src/lib/verbs/pullrequest/threads.test.mts, test/hooks/emit.ledger.test.mjs, src/skills/reviewing/scripts/lint.craft.mjs, test/cli/lint-craft.test.mjs, src/mods/session/hooks/sessions.ts, src/mods/session/hooks/sessions.test.ts]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: 'NEXT_ACTIONS = \[[^\]]*"resolve_rejections"'
      - path: src/lib/shared/work/next-step.mts
        pattern: '\[i\] confirm the irreversible step'
      - path: src/lib/shared/work/next-step.mts
        pattern: '\[c\] continue with a fresh developer'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'irreversible: phase '
      - path: src/lib/verbs/pullrequest/threads.test.mts
        pattern: 'src/fees\.ts:42: Late fees'
      - path: src/lib/verbs/pullrequest/threads.mts
        pattern: '^(?![\s\S]*\u2014)'
        flags: i
      - path: src/lib/shared/work/artifact.mts
        pattern: '^(?![\s\S]*\u2014)'
        flags: i
      - path: src/mods/session/hooks/sessions.ts
        pattern: '^(?![\s\S]*\u2013)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/skills/shared/procedures/phase-loop.md, src/skills/shared/procedures/gate.md, src/skills/shared/procedures/cumulative-review.md, src/skills/shared/procedures/prove.md, src/skills/shared/procedures/amend.md, src/skills/shared/procedures/jira-intake.md, src/skills/reviewing/checklists/10-alignment.md, src/skills/reviewing/checklists/60-crosscheck.md, src/skills/understanding/steps/10-prepare.md, src/skills/understanding/steps/20-interview.md, src/skills/understanding/steps/30-capture.md, src/skills/expediting/steps/10-check.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/expediting/SKILL.md, src/skills/debugging/SKILL.md, src/skills/resuming/SKILL.md, src/skills/reviewing/SKILL.md, src/skills/understanding/SKILL.md, src/skills/ordering/steps/10-order.md, src/skills/designing/steps/10-design.md, src/skills/designing/steps/20-crosscheck.md, src/skills/debugging/steps/30-diagnose.md, src/skills/explaining/SKILL.md, src/skills/consulting/steps/20-ratify.md, src/skills/benchmarking/SKILL.md, src/skills/branching/SKILL.md, src/skills/consulting/SKILL.md, src/skills/documenting/SKILL.md, src/skills/inspecting/SKILL.md, src/skills/proofreading/SKILL.md, src/skills/researching/SKILL.md, src/skills/summarizing/SKILL.md, src/skills/ticketing/SKILL.md, src/agents/analyst.md, src/agents/architect.md, src/agents/developer.md, src/agents/reviewer.md, src/rules/security-paths.md, test/repo/plugin-layout.test.mjs, test/repo/names.test.mjs, test/timing/budgets.test.mjs, docs/how-to.md, .claude/rules/harness-authoring.md]
    greps:
      - path: src/skills/designing/SKILL.md
        pattern: '\.\./shared/procedures/phase-loop\.md'
      - path: src/skills/ordering/SKILL.md
        pattern: '\.\./shared/procedures/gate\.md'
      - path: src/skills/resuming/SKILL.md
        pattern: '\.\./shared/procedures/gate\.md'
      - path: src/skills/expediting/SKILL.md
        pattern: '\.\./shared/procedures/prove\.md'
      - path: src/skills/shared/procedures/gate.md
        pattern: '\[i\]'
      - path: src/skills/shared/procedures/phase-loop.md
        pattern: '^(?![\s\S]*work/<id>/order\.md)'
        flags: i
      - path: src/agents/developer.md
        pattern: 'shared/procedures/prove\.md'
      - path: src/agents/reviewer.md
        pattern: 'reviewing/checklists/'
      - path: src/agents/architect.md
        pattern: '^(?![\s\S]*designing/steps/40-amend\.md)'
        flags: i
      - path: src/skills/ordering/SKILL.md
        pattern: '^(?![\s\S]*Paths cited here)'
        flags: i
      - path: test/timing/budgets.test.mjs
        pattern: 'procedures'
      - path: test/repo/plugin-layout.test.mjs
        pattern: 'SKILL\.md'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [src/rules/prose.md, src/output-styles/custom.md, src/rules/work-items.md, src/agents/architect.md, src/agents/reviewer.md, src/skills/reviewing/SKILL.md, src/skills/reviewing/checklists/15-traced.md, src/skills/reviewing/checklists/60-crosscheck.md, src/skills/understanding/SKILL.md, src/skills/ordering/steps/10-order.md, src/skills/designing/steps/10-design.md, src/skills/ticketing/templates/jira/bug.md, src/skills/ticketing/templates/jira/change-request.md, src/skills/ticketing/templates/jira/epic.md, src/skills/ticketing/templates/jira/spike.md, src/skills/ticketing/templates/jira/tech-debt.md, src/skills/ticketing/templates/jira/user-story.md, src/skills/ticketing/examples/jira/bug.md, src/skills/ticketing/examples/jira/change-request.md, src/skills/ticketing/examples/jira/epic.md, src/skills/ticketing/examples/jira/spike.md, src/skills/ticketing/examples/jira/tech-debt.md, src/skills/ticketing/examples/jira/user-story.md, src/skills/branching/templates/manifest.example.yaml, src/skills/proofreading/steps/10-passes.md]
    greps:
      - path: src/output-styles/custom.md
        pattern: 'The prose rule applies'
      - path: src/output-styles/custom.md
        pattern: '^(?![\s\S]*B2/C1)'
        flags: i
      - path: src/rules/work-items.md
        pattern: 'run_through'
      - path: src/rules/work-items.md
        pattern: 'picket set'
      - path: src/skills/reviewing/SKILL.md
        pattern: '^(?![\s\S]*(protocol separator|CROSS_CHECK_REQUESTED|All Phases Complete))'
        flags: i
      - path: src/skills/reviewing/SKILL.md
        pattern: '- \[Severity\] path:line: '
      - path: src/skills/understanding/SKILL.md
        pattern: '^(?![\s\S]*consultant)'
        flags: i
      - path: src/agents/reviewer.md
        pattern: '^(?![\s\S]*\u2014)'
        flags: i
      - path: src/skills/ticketing/examples/jira/tech-debt.md
        pattern: '^(?![\s\S]*[\u2013\u2014])'
        flags: i
    tests: true
    drive: false
    security: false
  - n: 4
    files: [test/repo/references.test.mjs, test/repo/dashes.test.mjs, test/repo/names.test.mjs, bench/results/plugin-08a-fast.json]
    greps:
      - path: test/repo/references.test.mjs
        pattern: 'ticketing/SKILL\.md'
      - path: test/repo/dashes.test.mjs
        pattern: 'codeLines'
      - path: test/repo/names.test.mjs
        pattern: 'frobnicate'
    tests: true
    drive: false
    security: false
---
# Design: Refactor item 08a, instructions

## Problem

The instructions (17 skills, 4 agents, 5 rules, the output style) share steps across lane folders, repeat facts that have drifted (the state fields, the prose rule, the options at a stall), carry stale facts, name steps three different ways, and keep an em dash as the reviewer's finding separator while `rules/prose.md` bans it; the kernel offers only `[c] continue · [x] abandon` at a block and renders no `[i]` option (`artifacts/refactor/08a-instructions.md`, "Today"). The user approved item 08a on 2026-10-22 (decisions I-1 to I-9, its migration and risks) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`, C-019 from this item); this record carries them into phases and re-decides none. I-1 is why the docs stay out (item 08b). Binding constraints: the user's ruling on dashes ("BAN em dashes, do not replace with another separator", the kernel may parse one in input, nothing Picket writes contains one); agents keep their current reach (I-9; F-1 is a later item); every phase leaves the skills, agents and rules consistent and loadable, because this session reads them from `dist/` through the `core` junction and `npm test` rebuilds it; the PR module keeps posting old findings (item 04d); a path a later phase deletes never sits in an earlier phase's `files`. Migration phase 2 of the draft is split in two here (layout, then facts), in the draft's order, so each review stays readable.

## Decisions

### D-001: The kernel computes the options at a stall (I-4, Q1)
**Decision:** A domain service change: `nextStep` stays pure over the `WorkSnapshot` read model and derives every stall from `snap.state` and `snap.verdicts`. `NEXT_ACTIONS` gains `resolve_rejections`; the `NextStep` union gains `{ action: "resolve_rejections"; actor: "user"; detail: string; options: string[] }`. Two option lists live in `next-step.mts`: the stall list `["[c] continue with a fresh developer", "[d] redesign", "[x] abandon"]` and the block list `["[c] continue", "[x] abandon"]`. `resolve_rejections` applies when the lane is `order` or `design`, every phase is approved and the cumulative review has not passed, the verdict rows after the last row with verdict `approved` hold k rows with verdict `CHANGES REQUIRED` and scope `cumulative`, the last row of all is one of them, and k is a multiple of 3; its detail is `<k> cumulative reviews returned CHANGES REQUIRED since the last approval`. A blocked order or design item gets the stall list when its last row is `PHASE STALLED`, when it holds three or more `DRIFT DETECTED` rows, or three or more `AMENDED` rows; every other blocked item, and every blocked fast or research item, gets the block list. The user's `[c]` needs no write: the fresh developer's `PHASE DONE` becomes the last row, so `next` returns `review_cumulative`, and three more rejections stop the lane again. There is no "accept as is" (the user's choice, 2026-10-22).
**Instead of:** having `route` set `status: blocked` on the third cumulative rejection so `resolve_block` covers it: one action fewer, but it writes state for a count the rows already hold, and the approved table names `resolve_rejections` as its own action.
**Risks:**
- **RISK-001** An unreadable verdict line is skipped (04a D-006), so k undercounts. Mitigation: `picket next` prints the skip warning; an undercount costs one more review round and never skips a stop.
- **RISK-002** Until phase 2 lands, lane skills still print their own option lists beside the kernel's. Mitigation: phase 2 follows in the same run; `emit.ledger` classifies both wordings the same.

### D-002: The kernel renders the irreversible `[i]` option (I-5, Q2)
**Decision:** In `approvalStep`, a done phase whose `irreversible` flag is set (the mark `parseArtifact` already reads outside code) gets `options: ["[i] confirm the irreversible step", "[x] reject: <why>"]`: no `[a]`, no run offer. The flag is read from the phase, not from `own_gate.kind`, because `ownGate` returns the first gate only, so a phase that touches a security path and is irreversible has kind `security_path` and would lose `[i]`; 04a's revision log words it "for an irreversible phase". `picket packet` adds the line `irreversible: phase <n> carries an irreversible step` and drops its `gate` line when `own_gate.kind` is `irreversible`, which would say the same thing twice. The lead's `[i]` routes as `approved` (`gate.md`, phase 2). `emit.ledger`'s `[i] confirm` match is unchanged and pinned by a test.
**Instead of:** a new user verdict `confirmed`: it grows the verdict table and the route effects for a reply whose effect is `approved`.
**Risks:**
- **RISK-003** A phase that only mentions the mark in prose gets `[i]`. Mitigation: code spans are stripped before the match, as today; the same text already gives the phase its own gate, so nothing new is gated.

### D-003 (r2): Nothing Picket writes holds an em or en dash; a finding's location ends with a colon (I-6, Q4)
**Decision:** Infrastructural decision. The finding line is `- [Severity] path:line: <what>. <why>. <fix>.`, `- [Severity] path: <text>` without a line, and `- [Severity] record.md#D-003: <text>` in a cross-check. `parseFindings` reads a colon and whitespace after the location, or the old spaced em dash, written as the `\u2014` escape so no source line holds the character; `artifact.mts`'s phase heading regex gets the same escape. Outputs lose theirs: `lint.craft.mjs`'s printed strings and the session mod's window label (`↕ 4 to 13 / 25`). Existing code comments that hold a dash stay (the `comments` rule: leave other comments as they are). In Markdown: `reviewing/SKILL.md` and `reviewer.md` drop "the protocol separator" sentence; `rules/prose.md` keeps its ban with no exception; the ticketing templates and examples, the branching manifest example and proofreading's dash grep lose theirs; the grep's form is the developer's choice, as long as the line holds neither character and still finds both in a sample file under the shell the skill runs in (a `grep -P` with `\x{...}` escapes exits 2 in the default locale, so it does not qualify). Check 4 (D-007) keeps it so.
**Instead of:** keeping the dash as a protocol separator: the user ruled against it on 2026-10-22 and again for this item.
**Risks:**
- **RISK-004** A reviewer still writes the old dash. Mitigation: posting still works, since the parser reads both; the examples it learns from all use the colon.

### D-004: `skills/shared/procedures/` holds the six shared steps; cross-folder paths are base-relative (I-2)
**Decision:** Infrastructural decision. Six procedures, each from its draft source: `phase-loop.md` (`ordering/steps/20-phase.md`, lane-neutral: `artifact:` is the `artifact` field `picket state` prints), `gate.md` (`ordering/steps/30-gate.md`, plus the replies to every option `picket next` returns), `cumulative-review.md` (`ordering/steps/40-review.md`, checkpoint included), `prove.md` (`expediting/steps/20-prove.md`, plus the `picket check` and drive paragraphs of `expediting/steps/30-check.md` and `developer.md`), `amend.md` (`designing/steps/40-amend.md`), `jira-intake.md` (the paragraph in `10-order.md` and `10-design.md`). The folder has no `SKILL.md`, so it is not a skill (draft: `claude plugin validate --strict` still lists 17); tests that list skills count folders holding a `SKILL.md`. A procedure names no other procedure: it ends with "run `picket next <id>` and follow your lane's table", so the lane table stays the one dispatcher. Path forms: lead-facing text in a skill or procedure cites its own files bare (`steps/10-order.md`) and other folders with `../` (`../shared/procedures/gate.md`, `../documenting/templates/design.md`), both relative to the "Base directory for this skill" line Claude Code prints when a skill loads (seen in this session's transcript: `...\core\skills\designing`). Agent-facing text (a `step:` value, an agent section pasted into a message, an agent file) is relative to `${CLAUDE_PLUGIN_ROOT}/skills/`, as `developer.md` is today, because a subagent sees no base line (checked in a reviewer transcript). The "Paths cited here" line leaves all 17 `SKILL.md` files.
**Instead of:** keeping skills-root paths with the boilerplate line: it is one fact in 17 copies, which I-3 removes; the user chose `skills/shared/` over a plugin-root `procedures/` folder.
**Risks:**
- **RISK-005** Two path forms cost a reader one rule to learn. Mitigation: the form follows the reader (lead or agent); check 2 resolves every reference in either form and fails on a missing file.
- **RISK-006** (draft R-1) `npm test` rebuilds `dist/` during phase 2, so the old step files vanish from the running session before approval. Mitigation: the lead re-reads `designing/SKILL.md` once phase 2 is staged; agent messages carry a fresh `step:` line from the lead.

### D-005 (r2): One owner per fact; stale facts corrected (I-3, I-8)
**Decision:** Infrastructural decision, the draft's owner table. Prose rules: `rules/prose.md`; `output-styles/custom.md` opens with "The prose rule applies" and keeps only tangents, one recommendation, when to break the rules, the pre-send check and scope (one reader level, B2). State fields, who writes state, caps, the amendment format: `rules/work-items.md`, which lists the 12 `STATE_FIELDS` of `state.mts` and names `picket set` (status, blocked_reason, branch, title, run_through) and `picket route` as the writers. Options at a gate, a block or a stall: the kernel (D-001, D-002); skills print what `picket next` returns. Review summary fields, findings cap, finding line: `skills/reviewing/SKILL.md`. Jira intake: `jira-intake.md`; drive and `picket check`: `prove.md`. Every other copy becomes a pointer, or goes when its reader does not need the fact: `cumulative-review.md` lists no summary field and points at nothing, because the lead passes the JSON verbatim and the reviewer reads the fields in its preloaded `picket:reviewing`. Phase 2 writes the new procedures with their pointers already in place (`amend.md` to the `work-items` rule for the amendment format and caps); phase 3 makes every other pointer. Stale facts: the reviewing description names `review_cumulative`, `review_checkpoint` and the scopes instead of "All Phases Complete", `CROSS_CHECK_REQUESTED`, `/cross-check`; `security_path` comes from the security-paths rule and `.picket/config.json`, not a CLAUDE.md section; `understanding` names the analyst and the architect; `resuming` renders the gate with `picket packet`; `security-paths.md` names checklist 30.
**Instead of:** keeping the copies and a test that diffs them: copies still cost tokens on every spawn, and a diff cannot judge two wordings of one rule.
**Risks:**
- **RISK-007** `custom.md` loses lines `prose.md` lacks (the forbidden openers). Mitigation: `prose.md` takes one line per removed section it lacks, within the 60-line rule budget and the 10000-character injection budget (rules are 6954 characters today).

### D-006: Step and checklist files are `NN-<name>.md`; reviewing's checklists get their own folder
**Decision:** Infrastructural decision, the draft's "Step names" and layout. `reviewing/steps/` becomes `reviewing/checklists/` with its 11 file names kept; `understanding/steps/01-prepare.md`, `02-interview.md`, `03-capture.md` become `10-`, `20-`, `30-`; `expediting/steps/30-check.md` becomes `steps/10-check.md` holding the stage, block and reply part (check and drive move to `prove.md`). A `steps/` folder holds files run in order, so its two-digit prefixes are distinct; `checklists/` prefixes are load tiers and may repeat (`40-framework-dotnet.md`, `40-framework-typescript.md`), which the load table names by pattern. Procedures carry no prefix because they are not ordered.
**Instead of:** distinct prefixes in `checklists/` too: it breaks the `40-framework-<name>` and `50-concern-<name>` patterns the load table relies on.
**Risks:**
- **RISK-008** Something outside the skills cites `reviewing/steps/`. Mitigation: verified none in `src/lib` (the extension schema names project paths only); `docs/how-to.md:215`, the one Markdown citation outside `src/` of a moved file, is fixed in phase 2.

### D-007 (r2): Reference, naming and dash checks run in `npm test` (I-7)
**Decision:** Infrastructural decision. The step budget in `test/timing/budgets.test.mjs` covers `steps/`, `checklists/` and `shared/procedures/` from phase 2 on (check 5), so no moved file leaves its budget. Phase 4 adds the rest beside the existing repository checks, each with a planted-violation self test as `names.test.mjs` does. Check 1 (`test/repo/references.test.mjs`): every file in a `steps/` or `checklists/` folder is named `NN-<kebab>.md`, prefixes distinct within `steps/`. Check 2 (same file): every skill path in a backticked span or a fenced line of Markdown under `src/skills` (examples skipped), `src/agents`, `src/rules`, `src/output-styles` resolves to an existing file in either form of D-004 and follows the reach table, whose one owner is D-008. Check 3 (`test/repo/names.test.mjs`): a span or fenced line starting `picket ` (after an optional `!` or `$ `) names a `VERB_NAMES` verb or `help`, and a group verb names one of its subverbs, across `src/` Markdown, `CLAUDE.md`, `README.md` and `docs/`. Check 4 (`test/repo/dashes.test.mjs`): no U+2013 or U+2014 in Markdown under `src/skills`, `src/agents`, `src/rules`, `src/output-styles`, `docs/` or in `README.md`, nor in a code line (`codeLines`) of a non-test module under `src/lib`, `src/bin` or `src/mods`.
**Instead of:** a lint script run by hand: the draft puts the checks in `npm test`, and drift in this very session is what they guard.
**Risks:**
- **RISK-009** Check 2 reads the reviewing skill's fenced layout tree as references. Mitigation: those are bare own-folder paths and resolve; the self test plants one tree line.

### D-008 (r2): Who may reference what; agents keep their current reach (I-9)
**Decision:** Infrastructural decision, the draft's table "Who may reference what" in full, which check 2 enforces. Every instruction file may cite `documenting/templates/` and `documenting/scripts/`, the shared document kit (`consulting/steps/20-ratify.md:12` runs `documenting/scripts/filename.mjs`). A `SKILL.md` or a skill's step or checklist cites, beyond that, its own `steps/`, `templates/`, `references/`, `checklists/`, `examples/`, `scripts/` and `shared/procedures/`. A procedure cites nothing beyond the document kit. A rule or the output style cites nothing beyond the document kit. An agent file cites `shared/procedures/`, the files of a skill in its `skills:` frontmatter (reviewer: `reviewing/`; analyst and architect: `documenting/`), and a lane step only as "the file your message's `step:` line names". A `step:` value in a message template is not subject to reach: it is the sanctioned way a lead hands an agent its file (I-9), so it only has to name an existing file under `src/skills`. So `architect.md` loses its three step paths, `developer.md` cites `prove.md` and the developer section pasted from `phase-loop.md`, `reviewer.md` cites `reviewing/checklists/`, and `analyst.md` loses `researching/steps/10-outline.md`. One current reach has no row: `analyst.md` reads `ticketing/SKILL.md` for ticket work; check 2 lists it as the one named exception, which F-1 removes.
**Instead of:** preloading `picket:ticketing` into the analyst: every analyst spawn pays its 62 lines for a branch most research runs never take. And for the document kit, a second named exception for `20-ratify.md`: the scripts serve every skill that writes a document, as the templates do, so an exception would be the rule in disguise.
**Risks:**
- **RISK-010** A lead that forgets to paste the agent section leaves the agent to find its step from the `step:` line alone. Mitigation: that is today's fallback, and the `step:` line names the file.

## Scope

**In:**
- `nextStep`, `picket packet`, the finding parser and the dash-free outputs (phase 1; D-001 to D-003).
- `skills/shared/procedures/` with six procedures, the dispatch tables, the renamed steps and checklists, agent entries on the `step:` line, the boilerplate line gone, the tests that list skills, the step budget (phase 2; D-004, D-006, D-008).
- One owner per fact, the stale facts, the finding line and the dashes in Markdown (phase 3; D-003, D-005).
- Checks 1 to 4 in `npm test` and the fast-lane bench comparison (phase 4; D-007).

**Out:**
- Agents off skill files, `agents/shared/**/*.md` (F-1).
- The docs beyond the one moved path in `docs/how-to.md` (item 08b); `README.md` changes.
- `CLAUDE.md` and `src/templates/claude-block.md` (2046 of 2048 bytes; nothing here adds to them, draft R-2).
- Renaming the review summary field `extension_steps`, a published JSON key.
- Existing code comments that hold a dash.

## Phase 1: The kernel decides the stall and irreversible options and reads the colon finding

**Touch set:**
- `src/lib/shared/work/next-step.mts`: actions, option lists, the two rules
- `src/lib/shared/work/next-step.test.mts`: object tests per rule
- `src/lib/shared/work/snapshot.mts`: read only, `WorkSnapshot`, `phaseOf`
- `src/lib/shared/work/gate.mts`: read only, gate kinds
- `src/lib/shared/work/artifact.mts`: heading regex dash as `\u2014`
- `src/lib/shared/verdicts.mjs`: read only, verdict names
- `test/support/snapshot.mts`: read only, `snapshotOf`
- `src/lib/verbs/packet/packet.mjs`: irreversible line
- `test/kernel/packet.test.mjs`: irreversible packet test
- `src/lib/verbs/pullrequest/threads.mts`: colon form, old dash read
- `src/lib/verbs/pullrequest/threads.test.mts`: colon fixtures added, old ones kept
- `test/cli/pullrequest.test.mjs`: read only, old form keeps passing
- `src/lib/hooks/emit/ledger/index.mts`: read only, `gateKind`
- `test/hooks/emit.ledger.test.mjs`: new option strings classified
- `src/skills/reviewing/scripts/lint.craft.mjs`: printed strings without dashes
- `test/cli/lint-craft.test.mjs`: output holds no dash
- `src/mods/session/hooks/sessions.ts`: `windowLabel` range with "to"
- `src/mods/session/hooks/sessions.test.ts`: expectation follows

**Changes:** `nextStep` per D-001 and D-002: `resolve_rejections` in `NEXT_ACTIONS` and the union; the stall and block lists as module constants; a pure helper over `snap.verdicts` for the cumulative rejection count and one for the stall causes; `approvalStep` reads `current.irreversible`. `next-view.mts` needs no change, since `options` is already a view key. `packet.mjs`: the irreversible line per D-002; `resolve_rejections` renders through the generic branch (heading, detail, options). `threads.mts`: `FINDING` accepts `:\s+` or `\s+\u2014\s+` after the location, the path class excludes the dash by escape; `buildThreads` is unchanged. In `lint.craft.mjs` only string literals change (a colon or a semicolon in place of each dash); its comments stay. `windowLabel` returns `↕ <a> to <b> / <total>`.

**Done when:**
- **T-1.1** Object tests: an order or a design item with all phases approved and three cumulative `CHANGES REQUIRED` rows after its last `approved` row, the last row one of them, gets `resolve_rejections` with the stall list; with a later `PHASE DONE` row it gets `review_cumulative`; with six such rows and the last one a rejection it gets `resolve_rejections` again; a fast or research item never gets it.
- **T-1.2** Object tests: a blocked order or design item gets the stall list when its last row is `PHASE STALLED`, or it holds three `DRIFT DETECTED` rows, or three `AMENDED` rows; with one `DRIFT DETECTED` row, or in the fast or research lane, it gets exactly `["[c] continue", "[x] abandon"]`.
- **T-1.3** A done phase whose section holds the `[IRREVERSIBLE]` mark outside code gets options exactly `["[i] confirm the irreversible step", "[x] reject: <why>"]`, also when it touches a security path; `picket packet` for it prints `irreversible: phase <n> carries an irreversible step` and no `gate` line when the gate kind is irreversible.
- **T-1.4** `test/hooks/emit.ledger.test.mjs` shows a turn ending in `[i] confirm the irreversible step` recorded as gate kind `irreversible`, and one ending in `[c] continue with a fresh developer` recorded as `stall`.
- **T-1.5** `parseFindings` reads `- [Major] src/fees.ts:42: Late fees round half-down.` with line 42, `- [Minor] src/fees.ts: Two date libraries in one file.` with line null, and `- [Critical] design.md#D-003: Decision coverage.` with path `design.md#D-003`; every old-form fixture in `threads.test.mts` and `test/cli/pullrequest.test.mjs` passes unchanged.
- **T-1.6** No line of `threads.mts`, `artifact.mts` or `sessions.ts` holds U+2013 or U+2014; `windowLabel(3, 10, 25)` returns `↕ 4 to 13 / 25`; the lint-craft CLI test asserts its output holds neither character.
- **T-1.7** `npm test` passes, and a drive of `picket next <id>` on a scratch design item with three cumulative rejections prints `resolve_rejections` and the stall list.

## Phase 2: Shared procedures and the new step layout

**Touch set:**
- `src/skills/shared/procedures/phase-loop.md`, `gate.md`, `cumulative-review.md`, `prove.md`, `amend.md`, `jira-intake.md` (all under that folder): new
- `src/skills/ordering/steps/20-phase.md`, `src/skills/ordering/steps/30-gate.md`, `src/skills/ordering/steps/40-review.md`: content moves to procedures, files deleted
- `src/skills/designing/steps/40-amend.md`, `src/skills/expediting/steps/20-prove.md`: content moves, files deleted
- `src/skills/expediting/steps/30-check.md`: `git mv` to `steps/10-check.md`; check and drive paragraphs move to `prove.md`
- `src/skills/reviewing/steps/`: `git mv` to `src/skills/reviewing/checklists/`, all 11 files, names kept
- `src/skills/understanding/steps/01-prepare.md`, `02-interview.md`, `03-capture.md`: `git mv` to `10-`, `20-`, `30-`; the `Next:` line in the first follows
- `src/skills/ordering/SKILL.md`, `src/skills/designing/SKILL.md`: dispatch tables to procedures; no option lists
- `src/skills/ordering/steps/10-order.md`, `src/skills/designing/steps/10-design.md`: Jira paragraph becomes a pointer
- `src/skills/designing/steps/20-crosscheck.md`: phase-loop, gate and checkpoint pointers
- `src/skills/expediting/SKILL.md`: steps 2 and 3 point at `prove.md` and `steps/10-check.md`
- `src/skills/debugging/SKILL.md`, `src/skills/debugging/steps/30-diagnose.md`: `prove.md` pointer; `picket:documenting` by name
- `src/skills/explaining/SKILL.md`: `picket:documenting` by name
- `src/skills/resuming/SKILL.md`: every action through `gate.md` or the lane table
- `src/skills/reviewing/SKILL.md`: load table, layout, PR `step:` line on `checklists/`
- `src/skills/understanding/SKILL.md`: step table and layout names
- `src/skills/consulting/steps/20-ratify.md`: templates as `../documenting/templates/`
- `src/skills/benchmarking/SKILL.md`, `src/skills/branching/SKILL.md`, `src/skills/consulting/SKILL.md`, `src/skills/documenting/SKILL.md`, `src/skills/inspecting/SKILL.md`, `src/skills/proofreading/SKILL.md`, `src/skills/researching/SKILL.md`, `src/skills/summarizing/SKILL.md`, `src/skills/ticketing/SKILL.md`: the "Paths cited here" line only
- `src/agents/analyst.md`, `src/agents/architect.md`, `src/agents/developer.md`, `src/agents/reviewer.md`: entries per D-008
- `src/rules/security-paths.md`: "steps 30" becomes checklist 30
- `test/repo/plugin-layout.test.mjs`, `test/repo/names.test.mjs`: skill folders are those holding `SKILL.md`
- `test/support/routing.mts`: read only, already filters on `SKILL.md`
- `test/timing/budgets.test.mjs`: step budget covers `checklists/` and `procedures/`
- `test/repo/markdown-paths.test.mjs`: read only, resolves plugin paths under `src/skills`
- `docs/how-to.md`: line 215 cites `src/skills/shared/procedures/prove.md`
- `.claude/rules/harness-authoring.md`: line 18 describes the new reach; the lead writes it from the developer's message

**Changes:** The six procedures per D-004, wording moved as it stands except: `phase-loop.md`'s first message carries `artifact: <the artifact field of picket state>` and `step: shared/procedures/phase-loop.md, developer section follows`; every by-hand option list becomes "print the options `picket next` returns"; `gate.md` holds the reply table for every option the kernel returns: `a`, `r <m>`, `i` (routes as `approved`), `x <why>`, `k <n>`, `w <n>`, and at a block or stall `c` (`picket set <id> status=open`, then a fresh developer for a stall), `d` (order lane: `picket set <id> status=abandoned` and `picket:designing` with the same request; design lane: continue the architect with `step: shared/procedures/amend.md` and the diagnosis), `x` (`picket set <id> status=abandoned`); `cumulative-review.md` drops the summary field list without a pointer (the lead passes the JSON verbatim; D-005) and keeps the `step: reviewing/checklists/15-traced.md` line; `amend.md` points at the `work-items` rule for the amendment format and caps; `prove.md` holds the check and drive paragraphs once. Dispatch rows as in the draft's "Layout". Path forms per D-004, the boilerplate line removed from all 17 `SKILL.md` files. Agents per D-008; each agent that cites a skill path says once that such paths are under `${CLAUDE_PLUGIN_ROOT}/skills/`. Phase 2 makes the pointers inside the procedures it creates; every other file keeps its facts as they stand except where a move needs it, and phase 3 makes the remaining pointers (D-005).

**Done when:**
- **T-2.1** The six procedures exist; `src/skills/ordering/steps/20-phase.md`, `30-gate.md`, `40-review.md`, `src/skills/expediting/steps/20-prove.md`, `30-check.md`, `src/skills/designing/steps/40-amend.md` and the folder `src/skills/reviewing/steps/` no longer exist (the block's Files line lists each deletion); no procedure cites another procedure outside a `step:` line; `amend.md` states no cap number and no revision log line format of its own, and `cumulative-review.md` lists no summary field.
- **T-2.2** No Markdown file under `src/` cites any of the deleted paths, and `ordering/SKILL.md` and `designing/SKILL.md` send `implement_phase` (later phases), `approve_phase`, `review_cumulative`, `review_checkpoint`, `resolve_block` and `resolve_rejections` to a procedure.
- **T-2.3** No file under `src/skills` or `src/agents` lists `[c] continue` or `[d] redesign` outside `gate.md`'s reply table; `gate.md` maps `i` to `picket route <id> --verdict approved --agent user --phase <n>`.
- **T-2.4** None of the 17 `SKILL.md` files holds "Paths cited here"; `src/.claude-plugin/plugin.json` still lists the same 17 skills and the plugin-layout test passes with `shared/` present.
- **T-2.5** `architect.md` and `analyst.md` cite no lane step path; `developer.md` cites `shared/procedures/prove.md`; `reviewer.md` cites `reviewing/checklists/`.
- **T-2.6** `understanding/steps/` holds `10-prepare.md`, `20-interview.md`, `30-capture.md`; `expediting/steps/` holds only `10-check.md`; the budget test fails on an 81-line file planted under `shared/procedures/` and passes on the repository.
- **T-2.7** `npm test` passes (markdown paths, names, budgets and descriptions included), and `claude plugin validate --strict dist` reports no error.
- **T-2.8** `docs/how-to.md:215` cites `src/skills/shared/procedures/prove.md`, and `.claude/rules/harness-authoring.md` no longer says "never further" about references.

## Phase 3: One owner per fact, stale facts and no dashes

**Touch set:**
- `src/rules/prose.md`: sole owner of the prose rules; gains lines `custom.md` drops
- `src/output-styles/custom.md`: "The prose rule applies", lead's sections only, description follows
- `src/rules/work-items.md`: 12 state fields, writers, caps, amendment format
- `src/lib/shared/work/state.mts`: read only, `STATE_FIELDS`
- `src/lib/verbs/set/index.mts`: read only, settable keys
- `src/agents/architect.md`: Amendment section points at `amend.md` and the rule
- `src/skills/ordering/steps/10-order.md`, `src/skills/designing/steps/10-design.md`: caps point at the rule
- `src/skills/shared/procedures/amend.md`: read only, its pointer is phase 2's (T-2.1)
- `src/skills/reviewing/SKILL.md`: description triggers, `security_path` source, finding line, findings cap
- `src/agents/reviewer.md`: finding lines, summary fields and cap as pointers
- `src/skills/reviewing/checklists/15-traced.md`, `src/skills/reviewing/checklists/60-crosscheck.md`: example lines with the colon
- `src/skills/understanding/SKILL.md`: analyst and architect, no consultant
- `src/skills/ticketing/templates/jira/bug.md`, `change-request.md`, `epic.md`, `spike.md`, `tech-debt.md`, `user-story.md`: dashes out
- `src/skills/ticketing/examples/jira/bug.md`, `change-request.md`, `epic.md`, `spike.md`, `tech-debt.md`, `user-story.md`: dashes out
- `src/skills/branching/templates/manifest.example.yaml`: line 1 dash out
- `src/skills/proofreading/steps/10-passes.md`: line 15 dash grep without the characters (form per D-003)
- `test/repo/descriptions.test.mjs`, `test/repo/description-cases.json`: read only, routing must stay green

**Changes:** Per D-005 and D-003. `prose.md` states each prose rule once, in the always-loaded rule voice, with one reader level (B2); `custom.md` keeps sections 7, 8, "When to break these rules", "Pre-send check" and "Scope", renumbered, under a first line naming the prose rule. `work-items.md` lists `id`, `lane`, `title`, `status`, `created`, `updated`, `blocked_reason`, `branch`, `run_through`, `source`, `base`, `session`, says `picket set` and `picket route` write them, and keeps caps and the amendment format as the owner. The reviewing description names `picket next`'s `review_cumulative` and `review_checkpoint`, the scopes `crosscheck`, `phase n`, `cumulative`, `pr`, and keeps every trigger phrase `description-cases.json` relies on. The finding format in `reviewing/SKILL.md` follows D-003; `reviewer.md`'s output block keeps its field lines and shows finding lines in the colon form with "format: `reviewing/SKILL.md`". Dashes in templates and examples become a colon, a comma, parentheses or two sentences per the prose rule, never a hyphen stand-in; a range becomes "to".

**Done when:**
- **T-3.1** `custom.md` starts its body with "The prose rule applies" and holds no section on dashes, bullets, plain English, leading with the answer, scale or preamble; `prose.md` is the one file stating them; the rule line and injection budgets pass.
- **T-3.2** `work-items.md` names all 12 fields of `STATE_FIELDS` and `picket set`; `architect.md`, `10-order.md` and `10-design.md` state no cap number and no revision log line format of their own.
- **T-3.3** `reviewing/SKILL.md` shows the finding line `- [Severity] path:line: ...`, holds no "protocol separator", "All Phases Complete", `CROSS_CHECK_REQUESTED` or `/cross-check`, and names the security-paths rule and `.picket/config.json` as the source of `security_path`.
- **T-3.4** `reviewer.md` holds no copy of the summary field list or the 25-finding cap, and its finding lines use the colon form.
- **T-3.5** No file under `src/skills`, `src/agents`, `src/rules` or `src/output-styles` other than a code module holds U+2013 or U+2014 (a grep over those folders, `*.mjs` excluded, prints nothing); the proofreading grep line, run in Git Bash with its default locale, still finds both characters in a sample file.
- **T-3.6** `understanding/SKILL.md` names no consultant, and `npm test` passes, the description routing test included.

## Phase 4: Reference, naming and dash checks, and the bench comparison

**Touch set:**
- `test/repo/references.test.mjs`: new, checks 1 and 2 with self tests
- `test/repo/dashes.test.mjs`: new, check 4 with self tests
- `test/repo/names.test.mjs`: check 3 with self tests
- `src/lib/verbs.mts`: read only, `VERB_NAMES`, `isGroup`
- `test/support/kernel-sources.mts`: read only, `codeLines`, `KERNEL_DIRS`
- `test/repo/markdown-paths.test.mjs`: read only, span and fence parsing to mirror
- `bench/run.mjs`, `bench/report.mjs`, `bench/results/baseline-trunk.json`: read only
- `bench/results/plugin-08a-fast.json`: new, the run's record

**Changes:** The checks per D-007, with the reach table exactly as D-008 states it (the document kit `documenting/templates/` and `documenting/scripts/` open to every file; `step:` values checked for existence only); the one exception is the pair `src/agents/analyst.md` to `ticketing/SKILL.md`, listed with "F-1 removes it". A reference resolves as base-relative, `../`-relative or skills-root-relative (D-004); spans holding `{`, `<` or `*` skip the existence test but not the reach test. The bench runs once after `npm test` passes: `node bench/run.mjs --harness plugin --tasks lane:fast --runs 1 --out bench/results/plugin-08a-fast.json`, then `node bench/report.mjs bench/results/baseline-trunk.json bench/results/plugin-08a-fast.json`.

**Done when:**
- **T-4.1** `references.test.mjs` fails on a planted `steps/5-x.md` and on two `steps/` files sharing a prefix, and passes on the repository, where `checklists/` repeats 40 and 50.
- **T-4.2** `references.test.mjs` fails on a planted reference from a skill to another skill's `steps/`, from a procedure to a lane skill (`reviewing/SKILL.md` included), from an agent to a lane step path, and to a missing file; it accepts a `step:` value naming any existing skill file and a citation of `documenting/scripts/filename.mjs`; it passes on the repository with exactly one listed exception.
- **T-4.3** `names.test.mjs` fails on `picket frobnicate` and on `picket source` with no subverb, accepts `picket help` and a `!`-prefixed `picket list --human`, and passes on `src/` Markdown, `CLAUDE.md`, `README.md` and `docs/`.
- **T-4.4** `dashes.test.mjs` fails on a planted U+2014 in Markdown and in a code line, ignores one on a comment line, and passes on the repository.
- **T-4.5** `npm test` passes.
- **T-4.6** The bench record `bench/results/plugin-08a-fast.json` exists, and the block's `Verified:` line quotes the pass rate and cost lines `bench/report.mjs` printed against `baseline-trunk.json`.

## Open questions

- **OQ-001** The bench comparison in phase 4 may show a lower fast-lane pass rate than the baseline; the record cannot say which drop is acceptable. Owner: the user, at the cumulative gate. Fallback: phase 4 reports the numbers on its block and the closing block repeats them; no phase is held for them.

## Revision log
- 2026-10-23: D-003 (r2): proofreading's dash grep form left to the developer; `grep -P` escapes exit 2 in the default locale (cross-check).
- 2026-10-23: D-005 (r2): cumulative-review.md drops summary fields without a pointer; phase 2 makes procedure pointers, phase 3 the rest (cross-check).
- 2026-10-23: D-007 (r2): check 2 takes the reach table from D-008, its one owner (cross-check).
- 2026-10-23: D-008 (r2): whole reach table here; document kit includes documenting/scripts/; step: values checked for existence only (cross-check).
