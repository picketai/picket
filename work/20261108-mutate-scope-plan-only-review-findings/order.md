---
kind: order
lane: order
title: Mutate scope, plan-only review findings
date: 2026-11-08
audience: developer
sources: work/20261108-mutate-scope-plan-only-review-findings/request.md; work/20261108-session-switch-project-status-line/verdicts.jsonl; work/20261108-admit-needs-a-touch-set/mutation.json; src/lib/verbs/mutate/index.mts; src/lib/verbs/mutate/mutant.mts; src/lib/shared/review-summary.mts; src/lib/verbs/summary/index.mts; src/lib/shared/work/next-step.mts; src/lib/shared/work/send.mts; src/lib/verbs/reply/index.mts; src/lib/verbs/reply/table.mts; src/lib/hooks/route/verdict/index.mts; src/lib/shared/route/route.mts; src/lib/verbs/pullrequest/threads.mts; src/agents/architect.md; src/agents/reviewer.md; src/skills/reviewing/SKILL.md
phases:
  - n: 1
    files:
      - src/lib/shared/review-summary.mts
      - src/lib/verbs/mutate/index.mts
      - src/lib/verbs/mutate/mutant.mts
      - src/lib/verbs/mutate/index.test.mts
      - src/lib/verbs/summary/index.mts
    greps:
      - path: src/lib/shared/review-summary.mts
        pattern: 'export function itemOwnedPaths\b'
      - path: src/lib/shared/review-summary.mts
        pattern: 'export function ownedRootChange\b'
      - path: src/lib/verbs/mutate/index.mts
        pattern: 'ownedRootChange\('
      - path: src/lib/verbs/mutate/index.mts
        pattern: 'itemOwnedPaths\('
      - path: src/lib/verbs/summary/index.mts
        pattern: 'itemOwnedPaths\('
      - path: src/lib/verbs/summary/index.mts
        pattern: '\bfunction ownedPaths\b'
        absent: true
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/findings.mts
      - src/lib/verbs/pullrequest/threads.mts
      - src/lib/hooks/route/verdict/index.mts
      - src/lib/hooks/route/verdict/index.test.mts
      - src/lib/shared/route/plan.mts
      - src/lib/shared/route/route.mts
      - src/lib/shared/work/verdict-log.mts
      - src/lib/shared/work/replies.mts
      - src/lib/shared/work/next-step.mts
      - src/lib/shared/work/next-step.test.mts
      - src/lib/shared/work/action-text.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
      - src/lib/verbs/reply/table.mts
      - src/lib/verbs/reply/index.mts
      - src/lib/verbs/reply/index.test.mts
      - src/lib/verbs/packet/packet.mjs
      - src/lib/verbs/packet/index.test.mts
    greps:
      - path: src/lib/shared/findings.mts
        pattern: 'export function parseFindings\b'
      - path: src/lib/shared/findings.mts
        pattern: 'export function citesOnlyRecord\b'
      - path: src/lib/verbs/pullrequest/threads.mts
        pattern: '\bconst FINDING\b'
        absent: true
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'citesOnlyRecord\('
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'plan_only\?: true'
      - path: src/lib/shared/work/action-text.mts
        pattern: '"approve_amendment"'
      - path: src/lib/verbs/reply/table.mts
        pattern: '"approve_amendment"'
      - path: src/lib/shared/work/send.mts
        pattern: 'reword: approved by the user at the amendment gate'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '"approve_amendment"'
    tests: true
    drive: true
  - n: 3
    files:
      - src/agents/architect.md
      - src/skills/reviewing/SKILL.md
      - src/skills/ordering/SKILL.md
      - src/skills/designing/SKILL.md
      - src/skills/resuming/SKILL.md
      - src/lib/hooks/route/verdict/index.test.mts
    greps:
      - path: src/agents/architect.md
        pattern: '`reword: '
      - path: src/skills/reviewing/SKILL.md
        pattern: 'AMENDMENT NEEDED: T-'
      - path: src/skills/ordering/SKILL.md
        pattern: '`approve_amendment`'
      - path: src/skills/designing/SKILL.md
        pattern: '`approve_amendment`'
      - path: src/skills/resuming/SKILL.md
        pattern: '`approve_amendment`'
    tests: true
    drive: false
---
# Order: Mutate scope, plan-only review findings

## Problem

`picket mutate` takes its candidate files from `changedSince(root, base)` (`src/lib/verbs/mutate/mutant.mts:65`), every change since the item's base, so two items that share a base share candidates: on 2026-11-08 both `work/20261108-admit-needs-a-touch-set/mutation.json` and `work/20261108-session-switch-project-status-line/mutation.json` planted in `scripts/docs.mjs:120` from base `009de42`. `picket summary` already limits the root repo to the item's own commits and owned dirty paths (`rootOwned`, `src/lib/shared/review-summary.mts:202`). Separately, a cumulative `CHANGES REQUIRED` always ends at `fix_findings` for the developer (`findingsStep`, `src/lib/shared/work/next-step.mts:98`), and the architect shell forbids touching an approved phase (`src/agents/architect.md:81`); the session switch item needed three `AMENDED` rows and a developer `PHASE DONE` to get past a criterion's wording.

## Decisions

### D-001: Mutate reuses the summary's ownership of the root repo
**Decision:** The root checkout's candidates become the summary's owned set: product files in the item's own commits plus dirty paths the plan, the phase blocks or the fixes files name. Two helpers move into `src/lib/shared/review-summary.mts`: `itemOwnedPaths(root, id, phases)` (today's `ownedPaths` in `src/lib/verbs/summary/index.mts:58`, `null` when the item has no phases) and `ownedRootChange(root, id, base, owned): { files: string[]; before: string }` (the file and `before` part of `rootOwned`, which `rootOwned` then uses). Mutate measures added lines against `before` (the parent of the item's first own commit, or `HEAD` when none) and saves that ref as `base`. With no phases, mutate keeps `changedSince` from the item base, as the summary does. Nested checkouts keep their recorded per-item base unchanged. This satisfies "the way `picket summary` already does" with one copy of the ownership rule.
**Instead of:** a mutate-only filter on `git log base..HEAD -- work/<id>/` commits: a second ownership rule that drifts from the summary's, so the reviewer could grade a mutant in a file the summary does not list.
**Risks:**
- **RISK-001** Another item's later commit to a file this item also changed still offers its added lines, since `before` is per item, not per commit. Mitigation: the summary has the same limit; the request's case (a file only the other item changed) is fully excluded.
- **RISK-002** Moving `ownedPaths` edits the summary verb, which is out of scope. Mitigation: a pure move; `src/lib/verbs/summary/index.test.mts` stays unedited and must pass.

### D-002: The verdict hook decides a plan-only rejection and the row records it
**Decision:** A cumulative `CHANGES REQUIRED` is plan-only when its block carries an `AMENDMENT NEEDED:` line and every finding line (zero allowed) cites the item's record: after dropping a `#anchor`, the path is `order.md`, `design.md`, or either under `work/<id>/`. The hook computes it with `citesOnlyRecord(findings, id)` over `parseFindings(text)`, both in a new `src/lib/shared/findings.mts` (the `FINDING` regex and `parseFindings` move there from `src/lib/verbs/pullrequest/threads.mts`, which re-exports `parseFindings`, `Finding` and `Severity`). `route` stores `plan_only: true` on that row only. `next-step` stays a pure function of rows and replies, and the saved review may be overwritten later without losing the fact.
**Instead of:** a new reviewer block line such as `Route: plan`: a contract field the reviewer could set on a code defect, where the finding paths are already in the block and checkable.
**Risks:**
- **RISK-003** A reviewer cites the record for a defect the code must fix. Mitigation: the gate (D-003) prints the review path and offers `[f]`, which sends the developer.

### D-003 (r2): A plan-only rejection gets its own gate, `approve_amendment`
**Decision:** A new next action `approve_amendment` (actor `user`) owns every state of a plan-only rejection, placed in `allApprovedStep` after `rejectionsStep` and before `amendStep`. With no reply since the row: the gate, detail `the cumulative review found only plan wording: <amend line>; review: work/<id>/reviews/cumulative.md`, options `[a] amend <record>, approved phases included` and `[f] fix the code instead`. After `a`: `amend` by the architect with a reword grant (D-004) until an `AMENDED` row follows the reply, then `review_cumulative`. After `f`: `fix_findings` by the developer until a `PHASE DONE` follows, then `review_cumulative`, with no amend step. A plan-only row answered with `f` is settled: `pendingAmend` skips its amend line, so a later plain cumulative `CHANGES REQUIRED` gives `fix_findings`, never the declined amendment. `picket reply` stores the choice as `choice: "amend" | "fix"` on the reply row, since `next-step` may not import the reply table. `picket packet` gives this gate its own branch that prints the detail in full, wrapped to the width and never cut, so the amend line and the review path RISK-003 relies on both show.
**Instead of:** sending the amendment straight to the architect with no gate: the request asks for a user gate, and a reworded approved criterion is the user's call.
**Risks:**
- **RISK-004** The third cumulative rejection hits the stall gate first. Mitigation: intended; `rejectionsStep` stays first, as for every other rejection.

### D-004: The reword grant travels as a send line the architect honours
**Decision:** The architect send after `a` carries `work: <id>`, `amend: <amend line>` and `reword: approved by the user at the amendment gate`. The architect shell lets that send change the wording of the criteria the amend line names inside approved phases, with a revision log line, and never a phase's touch set, changes or frontmatter. The reviewing skill tells the cumulative reviewer to write `AMENDMENT NEEDED: T-x.y <reason>` and to cite the record in each finding line when every defect is plan wording, so D-002 can see it.
**Instead of:** the kernel rewriting the criterion itself from the finding text: wording is judgement, and the architect already owns the record.

## Scope

**In:**
- `picket mutate` root candidates limited to the item's own commits and owned paths (phase 1).
- Detection, gate, reply, sends and re-review for a plan-only cumulative rejection (phase 2).
- The architect, reviewer skill and lane skill text that the new step needs (phase 3).

**Out:**
- Other review routing: checkpoint and phase reviews, non-plan-only cumulative rejections, the stall gate.
- The summary verb's behaviour (only the helper moves), mutation operators, nested-repo bases.

## Phase 1: Mutate picks only from the item's own change
**Touch set:**
- `src/lib/shared/review-summary.mts`: gains the two ownership helpers
- `src/lib/verbs/summary/index.mts`: imports moved `itemOwnedPaths`
- `src/lib/verbs/mutate/index.mts`: root checkout uses owned files
- `src/lib/verbs/mutate/mutant.mts`: `pickMutant` takes a file list
- `src/lib/verbs/mutate/index.test.mts`: two-item shared-base tests

**Changes:**
- Move `ownedPaths` from the summary verb to `itemOwnedPaths(root, id, phases: readonly ArtifactPhase[])` in `src/lib/shared/review-summary.mts`; the summary calls it with `snap.phases`.
- Extract `ownedRootChange(root, id, base, owned)` from `rootOwned`, returning the owned product files and `before`; `rootOwned` builds its stats on it.
- `Checkout` gains `files: readonly string[] | null`; `pickMutant(root, base, files)` filters `files` when given and calls `changedSince` when `null`. `candidateCheckouts` builds the root entry from `itemOwnedPaths` and, when non-null, `ownedRootChange` (`base: before`); nested entries pass `null`.
- Tests build one repo, open items A and B on the same base, commit B's `src/a.js` with `work/B/` and A's `src/same.js` with `work/A/`, each with an order record naming its file.

**Done when:**
- **T-1.1** With B's commit adding `if (a === b)` to `src/a.js` and A's adding it to `src/same.js`, `mutate(root, A)` saves a mutant at `src/same.js`, and `mutation.json` `base` is the parent of A's first commit.
- **T-1.2** When A's own commit adds no operator, `mutate(root, A)` returns `no candidate` with `mutant: null`, and `src/a.js` is byte-identical before and after.
- **T-1.3** An uncommitted change to a path in A's touch set is a candidate; an uncommitted operator line in a file outside A's plan paths and outside A's commits is not.
- **T-1.4** The existing tests in `src/lib/verbs/mutate/index.test.mts` (items without a record, the nested worktree case, the no-base case) pass with their assertions unedited.
- **T-1.5** `src/lib/verbs/summary/index.test.mts` passes and `git diff aa9c0b2 -- src/lib/verbs/summary/index.test.mts` is empty.
- **T-1.6** Drive: a scratch script under `.picket/state/scratch/` builds the two-item repo in a temp folder and runs `node dist/bin/picket.mjs mutate <A>` after `npm run build`; the printed line names `src/same.js`, not `src/a.js`.
- **T-1.7** `npm test` passes.

## Phase 2: A plan-only cumulative rejection gates an amendment
**Touch set:**
- `src/lib/shared/findings.mts`: new, finding parser and record check
- `src/lib/verbs/pullrequest/threads.mts`: imports and re-exports the parser
- `src/lib/hooks/route/verdict/index.mts`: computes plan-only, passes it
- `src/lib/hooks/route/verdict/index.test.mts`: round trip from a real block
- `src/lib/shared/route/plan.mts`: `RouteInput.planOnly`
- `src/lib/shared/route/route.mts`: `verdictRow` writes `plan_only`
- `src/lib/shared/work/verdict-log.mts`: `plan_only?: true` on the row
- `src/lib/shared/work/replies.mts`: `choice` on the reply row
- `src/lib/shared/work/next-step.mts`: `planAmendStep`, new variant
- `src/lib/shared/work/next-step.test.mts`: gate states
- `src/lib/shared/work/action-text.mts`: action name and text
- `src/lib/shared/work/send.mts`: `reword:` line on the amend send
- `src/lib/shared/work/send.test.mts`: the send lines
- `src/lib/verbs/reply/table.mts`: gate action and `a`/`f` forms
- `src/lib/verbs/reply/index.mts`: records the choice
- `src/lib/verbs/reply/index.test.mts`: reply sends
- `src/lib/verbs/packet/packet.mjs`: full detail at the gate
- `src/lib/verbs/packet/index.test.mts`: packet shows the review path

**Changes:**
- `src/lib/shared/findings.mts` holds `Severity`, `Finding`, the `FINDING` regex, `parseFindings`, and `citesOnlyRecord(findings, id)` as D-002 defines.
- In `applyVerdict`, set `planOnly` when the agent is the reviewer, scope `cumulative`, verdict `CHANGES REQUIRED`, an amendment line exists and `citesOnlyRecord` holds; `route` passes it to `verdictRow`, which writes `plan_only: true` only then.
- `NEXT_ACTIONS` and `ACTION_TEXT` gain `approve_amendment` (user voice `you approve a plan amendment`, observer `waits for approval of a plan amendment`). The `amend` variant of `NextStep` gains optional `reword: true`; `planAmendStep` follows D-003.
- `GATE_ACTIONS` gains `approve_amendment`; forms `a|approve|ok|yes` give `{ kind: "amend_record" }` and `f|fix` give `{ kind: "fix_code" }`. `applyReply` writes `choice` on the reply row and returns the next send.
- The `amend` case in `sendsFor` appends `reword: approved by the user at the amendment gate` when `step.reword`.
- `pendingAmend` in `src/lib/shared/work/next-step.mts` ignores the amend line of a `plan_only` row whose gate reply chose `fix`.
- `packet.mjs` gets an `approve_amendment` branch: heading as the default branch, then the detail wrapped over as many lines as it needs, never through `cut`.

**Done when:**
- **T-2.1** Routed through `routeVerdict`, a cumulative block in the reviewer shell's output shape ending `CHANGES REQUIRED`, with `AMENDMENT NEEDED: T-2.7 <reason>` and only `- [Minor] work/<id>/order.md:219: …` findings (and the same block with `Findings: clean`), writes a row with `plan_only: true`; one added `src/a.mts:3` finding, or no amendment line, writes no `plan_only` key.
- **T-2.2** After a `plan_only` row with no reply, `nextStep` returns `approve_amendment`, actor `user`, a detail holding the amend line and `work/<id>/reviews/cumulative.md`, and options `[a] amend order.md, approved phases included` and `[f] fix the code instead`.
- **T-2.3** `picket reply <id> a` at that gate returns one send, to `<tag>-architect`, whose message is the three lines `work: <id>`, `amend: AMENDMENT NEEDED: T-2.7 <reason>`, `reword: approved by the user at the amendment gate`.
- **T-2.4** After an architect `AMENDED` row following that reply, `nextStep` returns `review_cumulative`, and its send's `first:` list is `picket summary <id> --save` alone, with no developer step between.
- **T-2.5** After `picket reply <id> f`, `nextStep` returns `fix_findings` for the developer; after a following `PHASE DONE` it returns `review_cumulative`, never `amend`; a later plain cumulative `CHANGES REQUIRED` (no `plan_only`) after that `PHASE DONE` gives `fix_findings`, never `amend` (a next-step test).
- **T-2.6** The existing `next-step.test.mts` tests for cumulative rejections (lines 60 to 145 and 217 at `aa9c0b2`) pass; `git diff -U0 aa9c0b2 -- src/lib/shared/work/next-step.test.mts` removes only lines 89 to 91, the T-6.6 test's name, count and last-actions lines, which the new action changes.
- **T-2.7** `src/lib/verbs/pullrequest/threads.test.mts` and `post.test.mts` pass unedited, importing `parseFindings` from `./threads.mts`.
- **T-2.8** Drive: a scratch item with a `plan_only` cumulative row in a temp project; the built `picket packet <id>` prints `▶ approve amendment by user · <id>`, the whole detail with no `…` (an amend line over 100 characters and `work/<id>/reviews/cumulative.md` both visible), and both options; a `src/lib/verbs/packet/index.test.mts` test asserts the same, and `picket reply <id> a` prints the architect send of T-2.3.

## Phase 3: The architect and reviewer contracts carry the step
**Touch set:**
- `src/agents/architect.md`: Entry and Amendment honour `reword:`
- `src/skills/reviewing/SKILL.md`: plan-only finding shape
- `src/skills/ordering/SKILL.md`: gate list names the action
- `src/skills/designing/SKILL.md`: gate list names the action
- `src/skills/resuming/SKILL.md`: gate list names the action
- `src/lib/hooks/route/verdict/index.test.mts`: skill example round trip

**Changes:**
- `src/agents/architect.md:21`: the amend sentence adds "and `reword: …` when the user approved rewording at the amendment gate". `src/agents/architect.md:81`: an approved phase stays untouched unless the send carries `reword:`; then only the wording of the criteria the amend line names changes, with one revision log line naming each `T-N.x`, and never a touch set, changes, or the frontmatter. Edit in place; no new paragraph.
- `src/skills/reviewing/SKILL.md`, after the good-side paragraph (line 62): in a cumulative review whose every defect is plan wording, write `AMENDMENT NEEDED: T-x.y <reason>` (or `D-00x`) and cite the record in each finding line, with the example `- [Minor] work/<id>/order.md:219: <what>. <why>. <the new wording>.`; the kernel then gates an amendment instead of a developer fix.
- The gate lists at `src/skills/ordering/SKILL.md:24`, `src/skills/designing/SKILL.md:26` and `src/skills/resuming/SKILL.md:23` add `approve_amendment`.

**Done when:**
- **T-3.1** `src/agents/architect.md` names `reword:` in `## Entry` and in `### Amendment`, and still holds the sentence beginning "Never touch a phase that has an `.approved` marker".
- **T-3.2** A test reads the example finding line from `src/skills/reviewing/SKILL.md`, replaces `<id>` with a test item's id, routes a cumulative block holding it and an `AMENDMENT NEEDED: T-` line through `routeVerdict`, and finds `plan_only: true` on the row.
- **T-3.3** The three lane skills list `approve_amendment` beside `resolve_rejections` in their gate step; `src/skills/ordering/SKILL.md` step 6 still lists `amend`.
- **T-3.4** `npm test` passes, budgets included (`src/agents/architect.md` at most 120 lines, each SKILL.md at most 150).

## Open questions
none

## Revision log
- 2026-11-08: D-003 (r2): packet prints the gate detail uncut; an `f` answer settles the amend line; T-2.6 allows the T-6.6 count edit; review found both
