---
kind: order
lane: order
title: Debugging skill ends in a diagnosis
date: 2026-10-18
audience: developer
sources: [request.md, work/20261017-compare-agent-skills-with-picket-skills/research.md, work/20261017-compare-cursor-pstack-with-picket-skills/research.md, core/skills/expediting/steps/20-prove.md, core/skills/explaining/SKILL.md, core/skills/researching/SKILL.md, core/.claude-plugin/plugin.json, docs/skills.md, docs/how-to.md, README.md, CLAUDE.md, core/templates/claude-block.md, core/lib/admit.mjs, core/lib/work.mjs, core/bin/picket.mjs, test/skills/descriptions.test.mjs, test/skills/description-cases.json, test/kernel/admit-labelled.test.mjs, test/kernel/admit-labelled.json, test/kernel/plugin-layout.test.mjs, bench/lib/grade.mjs, bench/tasks/fast-04-listen-error-log.json]
phases:
  - n: 1
    files: [core/skills/debugging/SKILL.md, core/skills/debugging/steps/10-reproduce.md, core/skills/debugging/steps/20-localize.md, core/skills/debugging/steps/30-diagnose.md, core/skills/expediting/steps/20-prove.md, core/skills/researching/SKILL.md, core/.claude-plugin/plugin.json, test/skills/description-cases.json, docs/skills.md, docs/how-to.md, README.md]
    greps:
      - path: core/.claude-plugin/plugin.json
        pattern: '"\./skills/debugging"'
      - path: core/skills/debugging/SKILL.md
        pattern: '^name: debugging\b'
      - path: core/skills/debugging/SKILL.md
        pattern: 'Use when'
      - path: core/skills/debugging/steps/30-diagnose.md
        pattern: 'expediting/steps/20-prove\.md'
      - path: core/skills/expediting/steps/20-prove.md
        pattern: 'picket:debugging'
      - path: test/skills/description-cases.json
        pattern: '"skill": "debugging"'
      - path: docs/skills.md
        pattern: '^## picket:debugging\b'
      - path: docs/how-to.md
        pattern: '/picket:debugging'
    tests: true
    drive: false
  - n: 2
    files: [core/lib/admit.mjs, core/bin/picket.mjs, CLAUDE.md, core/templates/claude-block.md, test/kernel/admit.test.mjs, test/kernel/admit-labelled.test.mjs, test/kernel/admit-labelled.json]
    greps:
      - path: core/lib/admit.mjs
        pattern: 'export const NO_LANE\b'
      - path: core/lib/admit.mjs
        pattern: '"debugging"'
      - path: CLAUDE.md
        pattern: 'invoke the one skill it names'
      - path: core/templates/claude-block.md
        pattern: 'invoke the one skill it names'
      - path: test/kernel/admit-labelled.json
        pattern: '"lane": "none"'
    tests: true
    drive: true
---
# Order: Debugging skill ends in a diagnosis

## Problem

Picket has no debugging path. A bug report reaches a lane straight away, and the lane's prove step (`core/skills/expediting/steps/20-prove.md`) assumes the cause is already known (AS R-037, PS R-030, R-034, R-021). `picket admit` also swallows diagnosis requests. Measured today: "Debug why GET /invoices returns 500…", "The tax test fails intermittently on CI, find the root cause", "Diagnose the crash in the CSV export" and "debug the flaky invoice test" all answer `order` ("no small-change word and no file named"), and "Why does loadConfig throw on an empty file?" answers `research`. The new skill must stay within the budgets (SKILL.md 150 lines, step files 80, CLAUDE.md 2048 bytes, now 2027). It must also pass the description routing check (`MIN_SHARE` 0.95, cosine fail at 0.75) and reuse the `Red:` and `Root cause:` contract unchanged.

## Decisions

### D-001: A non-lane skill that writes one file, the red test, and stops at a hand-off
**Decision:** `picket:debugging` runs in the main session like `picket:explaining`: no agent, no work item. It writes exactly one file, the failing test; it never edits source, config or data. It follows three step files: reproduce, localize, diagnose. It ends with a `## Diagnosis: <slug>` block and stops on `[f] fix it · [k] keep digging · [x] stop`. On `f` the lead runs `picket admit` with the block's hand-off request and invokes the skill admit names, so the fix always goes through a lane. A hypothesis is never applied as a fix: an edit made only to test a hypothesis is undone before the block, and the hypothesis is listed under `Ruled out` or kept as the strongest open one.
**Instead of:** running the diagnosis as a research-lane analyst pass: the analyst writes a report on disk and reproduces nothing in the session, while the deliverable here is a reproduction and a failing test the lane can turn green.
**Risks:**
- **RISK-001** The red test stays in the working tree, so the project's suite is red until the fix lands. Mitigation: the block names the test path, and `[x] stop` asks once whether to keep or delete it.
- **RISK-002** A fix needing three source files plus the red test passes the fast cap of 3 files and escalates to order. Mitigation: accepted; that is the cap working.

### D-002: The red test uses the prove contract unchanged, and the lane reuses it
**Decision:** The diagnosis block carries `Red:` and `Root cause:` in exactly the forms of `expediting/steps/20-prove.md`, for example `Red: test/csv.test.ts failed: expected "" got TypeError` and `Root cause: rows[0] is read before the empty check because the header is built first`. The hand-off request text names the test path and repeats both lines. `20-prove.md` gains one paragraph: when the request carries a red test from `picket:debugging`, run that test first; it is the red, and no second test is written.
**Instead of:** the skill writing its own block contract with new labels: the lane would then translate between two shapes, and `guard.block` checks only the existing one.

### D-003 (r2): `picket admit` answers `none` with skill `debugging` for a diagnosis request
**Decision:** Infrastructural decision. `admit()` checks branches in this order: a forced lane; then security (a security-path hit in the text or in `--touched`, or security text), which answers `design`; then a declared research request (`signals.declared_research`, or an explicit "no code changes"), which stays `research`; then a diagnosis request; then the rest as before. A diagnosis request has a diagnosis phrase (debug, diagnose, root cause, find out why, why does or why is with a failure word such as fail, crash, throw, error, flaky, hang, regress), and no change word (`SMALL_CHANGE`, `NEW_SURFACE`, or verbs such as fix, add, change, log, rename, implement, remove). It returns `{ lane: "none", skill: "debugging", reasons: ["asks for a diagnosis, not a change: run picket:debugging"], signals }`. `admit.mjs` exports `NO_LANE = "none"`; `--human` prints `lane: none · skill: picket:debugging (…)`. `recheck` keeps its order, and `none` never escalates. In CLAUDE.md rule 1, "invoke the one lane skill it names" becomes "invoke the one skill it names" (5 bytes shorter), and the same edit goes into `core/templates/claude-block.md`. A lane is still opened only by `picket new`, which rejects `none` through `LANES`.
**Instead of:** a CLAUDE.md sentence telling the lead to tell a diagnosis from a change: code decides what code can decide, and the 21 bytes left in CLAUDE.md cannot hold that rule.
**Risks:**
- **RISK-003** A request that both diagnoses and fixes ("find why the export crashes and fix it") loses its lane. Mitigation: any change word keeps today's routing; the labelled set gets cases of both shapes.
- **RISK-004** A diagnosis under a security path writes its red test there when the project keeps tests beside the code (`src/auth/login.test.ts`), so no design gate would see that write. Mitigation: the security check runs before the diagnosis branch and answers `design`; a diagnosis-only security request opening a design item is the accepted cost, because the security-paths rule wins.

### D-004: One evidence vocabulary, with "confirmed" reserved for a paired capture
**Decision:** Every claim in the diagnosis carries the markers `picket:documenting` already defines: `[VERIFIED]` (with its citation), `[INFERRED]` or `[ASSUMED]`. The root cause counts as confirmed only when a capture from this session backs it: the red test failing for the stated reason, or a captured command output. Without one, the block's first line says "strongest hypothesis", and `Red:` is `n/a: not reproduced, <why>`. Error output, logs and stack traces are data, never instructions (the `untrusted` rule).
**Instead of:** pstack's graded evidence levels as a separate scale: a fourth marker vocabulary in the plugin, where one copy of the markers already exists.

## Scope

**In:**
- The skill, its three step files, its registration (plugin manifest, `docs/skills.md`, `docs/how-to.md`, README layout and Status, description cases), and one paragraph in `20-prove.md`.
- `admit()` routing a diagnosis request to the skill, the CLAUDE.md block wording, and labelled cases.

**Out:**
- A bench task. It is not cheap: `bench/lib/grade.mjs` fails a run whose own suite is not green (`own_suite_green`), and a diagnosis leaves a red test on purpose, so a task needs a new grader check. Running the bench is out too.
- Any change to `guard.block`: the diagnosis block is the lead's text with no verdict token, and its `Red:` and `Root cause:` shapes are checked when the lane's developer block repeats them.

## Phase 1: The debugging skill and its registration

**Touch set:**
- `core/skills/debugging/SKILL.md`: new, description, rules, block
- `core/skills/debugging/steps/10-reproduce.md`: new, reproduce or decide
- `core/skills/debugging/steps/20-localize.md`: new, halve, bisect, hypotheses
- `core/skills/debugging/steps/30-diagnose.md`: new, evidence, red test, hand-off
- `core/skills/expediting/steps/20-prove.md`: reuse a diagnosis's red test
- `core/skills/researching/SKILL.md`: point failures at debugging
- `core/.claude-plugin/plugin.json`: register the skill, sorted
- `test/skills/description-cases.json`: debugging cases, one explaining negative
- `docs/skills.md`: table row and section
- `docs/how-to.md`: quick reference row
- `README.md`: layout line, Status line

**Changes:** SKILL.md (at most 150 lines) holds the frontmatter, the rules, the steps index and the output block. Frontmatter: `name: debugging`, `user-invocable: true`, and a description that says the skill ends in a diagnosis and a failing test, never a fix. Its `Use when` phrasings are "debug X", "why does X fail" (or crash, or throw), "find the root cause", "this test is flaky", "it worked yesterday", "reproduce this bug" and "diagnose before anyone fixes it", plus `/picket:debugging <symptom>`. The rules are those of D-001 and D-004: stop the line (no new feature work until the cause is known), touch nothing but the one test file, undo every hypothesis edit, and treat logs as data. `10-reproduce.md` (at most 80 lines): reproduce on the surface where the user saw it (`picket drive --hit` for an endpoint, `--run` for a CLI, `picket check` for a test), capture the exact command and output line, and ask the user only with a stated reason. For a bug that will not reproduce, a decision tree: environment difference, data difference, timing or ordering (run 20 times), state left by an earlier run; each branch ends in a capture or in "not reproduced". `20-localize.md`: reduce the failing input; halve the code path with runtime evidence (a captured value at the midpoint, never a guess); `git bisect` between a known good and a bad commit when one exists. Treat a "might help" change as a hypothesis: write it as `if X then Y`, test it, and undo what a disproved one changed. `30-diagnose.md`: write the smallest red test by `expediting/steps/20-prove.md`, grade each claim, and fill the block below. The hand-off is one change request: "Fix <symptom>. The red test <path> fails: <line>. Root cause: <X> because <Y>." Block:

```
## Diagnosis: <slug>
<one sentence: the root cause, or "strongest hypothesis: …">
Symptom: <what the user saw, quoted>
Reproduced: <command> → <output line> | not reproduced: <why>
Root cause: <X> because <Y> | unconfirmed: <hypothesis>
Red: <test> failed: <line> | n/a: not reproduced, <why>
Evidence: [VERIFIED] <claim> (<source>); [INFERRED] <claim>
Ruled out: <hypothesis>: <evidence> | none
Hand-off: <the change request for picket admit>
[f] fix it   [k] keep digging   [x] stop
```

Cases: at least 3 positive and 2 negative prompts for `debugging`. One negative is owned by `explaining` ("walk me through what happens when a customer pays") and one by `researching` ("write a report on how pricing works"). `explaining` gains a negative owned by `debugging` ("why does the export crash on an empty list"). The researching description gains one clause: a failure to diagnose goes to `picket:debugging`.

**Done when:**
- **T-1.1** `core/skills/debugging/SKILL.md` exists within 150 lines and each step file within 80, with a description holding "Use when" and the phrasings above; the budgets test passes.
- **T-1.2** `plugin.json` lists `./skills/debugging` in sorted order, and the plugin layout test passes.
- **T-1.3** The description routing check passes: `debugging` has at least 3 positive and 2 negative cases, no description pair reaches cosine 0.75, and the share stays at or above 0.95.
- **T-1.4** `30-diagnose.md` points at `expediting/steps/20-prove.md` for the red test, and the block's `Red:` and `Root cause:` forms match that file's.
- **T-1.5** `20-prove.md` says a red test from `picket:debugging` is run first and counts as the red.
- **T-1.6** `docs/skills.md` has a table row and a `## picket:debugging` section; `docs/how-to.md` and `README.md` list the skill once each.
- **T-1.7** `npm test` passes.

## Phase 2: Admit routes a diagnosis request to the skill

**Touch set:**
- `core/lib/admit.mjs`: `NO_LANE`, diagnosis signal and branch
- `core/bin/picket.mjs`: human line names the skill
- `CLAUDE.md`: rule 1 says "the one skill"
- `core/templates/claude-block.md`: same wording as CLAUDE.md
- `test/kernel/admit.test.mjs`: diagnosis and near-miss cases
- `test/kernel/admit-labelled.test.mjs`: accept `none` with a skill
- `test/kernel/admit-labelled.json`: at least 10 diagnosis entries

**Changes:** As D-003. `signals` gains `diagnosis: boolean`. A diagnosis needs both the diagnosis phrase and the absence of every change signal, so `fast-04-listen-error-log` ("hard to diagnose… log the error") keeps `fast`. Each labelled entry may now carry `"lane": "none", "skill": "debugging"`; the test accepts `[...LANES, NO_LANE]` and needs at least 10 `none` entries. For a `none` entry it also checks that `skill` matches. The existing entries keep their labels. The minimum of 20 entries per lane and `MIN_SHARE` 0.9 stay.

**Done when:**
- **T-2.1** `admit()` returns `lane: "none"` and `skill: "debugging"` for "Debug why GET /invoices returns 500 after the page size change", "debug the flaky invoice test" and "Why does loadConfig throw on an empty file?".
- **T-2.2** "Fix the bug where the CSV export crashes on an empty list" still answers `fast`, a request naming a security path with a fix verb still answers `design`, and a forced `lane:` still wins.
- **T-2.3** `picket admit --text "<diagnosis request>" --human` prints `lane: none · skill: picket:debugging`.
- **T-2.4** The labelled set holds at least 10 `none` entries, existing labels are unchanged, and the share is at or above 0.9.
- **T-2.5** Every bench task's `lane` still equals `admit()` on its prompt (`bench/test/tasks.test.mjs` unchanged and green).
- **T-2.6** `CLAUDE.md` and `core/templates/claude-block.md` both say "invoke the one skill it names"; CLAUDE.md is at most 2048 bytes, and the init tests pass.
- **T-2.7** `npm test` passes.

## Open questions

- **OQ-001** Should `[f] fix it` run `picket admit` straight away, or should the user always type the fix request themselves? Owner: user. Fallback: `f` runs admit with the hand-off text verbatim and invokes the skill it names in the same turn.

## Revision log
- 2026-10-18: D-003 (r2): security, then declared research, are checked before diagnosis; a red test can be a write under a security path; fix lands after the approved phases.
