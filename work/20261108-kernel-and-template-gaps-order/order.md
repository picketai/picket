---
kind: order
lane: order
title: Kernel, guard and template gaps from runs
date: 2026-11-08
audience: developer
sources: work/20261108-kernel-and-template-gaps-order/request.md, work/20261107-plugin-only-install/verdicts.jsonl, work/20261107-plugin-only-install/reviews/phase-4.md, work/20261107-plugin-only-install/summary.json, src/lib/shared/work/next-step.mts, src/lib/shared/route/plan.mts, src/lib/hooks/route/verdict/index.mts, src/lib/verbs/reply/table.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/verbs/summary/index.mts, src/lib/shared/review-summary.mts, src/lib/verbs/close/block.mts, src/agents/reviewer.md, the lead transcript of session 8e35c265 (2026-11-07 22:20 to 22:22)
phases:
  - n: 1
    files: [src/lib/shared/work/stall.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, test/hooks/route.verdict.test.mjs, src/agents/reviewer.md]
    greps:
      - path: src/lib/shared/work/stall.mts
        pattern: 'export function amendmentsAnsweringBlocks'
      - path: src/lib/shared/work/stall.mts
        pattern: 'export function newestBlockRow'
      - path: src/lib/shared/work/next-step.mts
        pattern: 'amendmentsAnsweringBlocks'
      - path: src/lib/shared/route/plan.mts
        pattern: 'newestBlockRow'
      - path: src/lib/shared/route/plan.mts
        pattern: '\bSTALLING_AMENDMENTS\b'
        absent: true
      - path: src/lib/shared/work/next-step.mts
        pattern: 'countOf\(verdicts, "AMENDED"\)'
        absent: true
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '"checkpoint"'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '"CHANGES REQUIRED"'
      - path: src/agents/reviewer.md
        pattern: 'phase n \| checkpoint \| cumulative'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.test.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/rules.test.mts, test/hooks/guard.bash.test.mjs, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/researching/SKILL.md]
    greps:
      - path: src/lib/hooks/guard/bash/rules.mts
        pattern: '--get-all'
      - path: src/lib/hooks/guard/bash/rules.mts
        pattern: '--replace-all'
      - path: src/skills/ordering/SKILL.md
        pattern: 'Audit: <lane> · phases <n> · tokens'
      - path: src/skills/designing/SKILL.md
        pattern: 'Audit: <lane> · phases <n> · tokens'
      - path: src/skills/researching/SKILL.md
        pattern: 'Audit: <lane> · phases <n> · tokens'
    tests: true
    drive: true
  - n: 3
    files: [src/lib/shared/review-summary.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/summary/index.test.mts]
    greps:
      - path: src/lib/shared/review-summary.mts
        pattern: 'export function itemBase'
      - path: src/lib/verbs/summary/index.mts
        pattern: 'itemBase\('
      - path: src/lib/verbs/summary/index.mts
        pattern: 'pass --base'
      - path: src/lib/verbs/summary/index.mts
        pattern: '\?\? "HEAD"'
        absent: true
    tests: true
    drive: true
---
# Order: Kernel, guard and template gaps from runs

## Problem
Two runs on 2026-11-07 and 2026-11-08 (20261107-plugin-only-install, 20261105-kernel-blocks-run-sends-review-diffs) hit seven gaps: a reply form the packet offers is refused, a drift and a stall on the same item hide each other, a checkpoint verdict loses its scope, a repeated developer block after a rejection vanishes, the summary diffs from HEAD when no base was recorded, the bash guard denies read-only `git config`, and three closing templates miss the `Audit:` line `picket close` prints. Every fix stays inside the code that owns the rule (`next-step`, `plan`, `route.verdict`, `reply`, `guard.bash`, `summary`); no other kernel behaviour, no mods, no install or packaging.

## Decisions
### D-001: Stall bookkeeping in one module, newest block row decides
**Decision:** A new module `src/lib/shared/work/stall.mts` owns the stall facts that `next-step.mts` and `route/plan.mts` now each keep a copy of: `STALL_REPEATS = 3`, `newestBlockRow(rows)` (the newest `DRIFT DETECTED` or `PHASE STALLED` row, or null) and `amendmentsAnsweringBlocks(rows)` (the `AMENDED` rows whose nearest earlier row that is not `AMENDED` is a `DRIFT DETECTED` or `PHASE STALLED`). Three rules follow. (1) A blocked order or design item serves, in order, the pending amendment, then the post-drift re-check (`recheckStep`, design only), then the user's `resolve_block`; only a repeat stall (three drifts, or three answering amendments) skips the first two. (2) `resolve_block` offers the stall options when the newest block row is `PHASE STALLED` or a repeat stall holds, instead of only when the very last row is `PHASE STALLED`. (3) `AMENDED` reopens a blocked item only when the newest block row is not `PHASE STALLED` and the answering amendments, the incoming one included, stay under three; otherwise the item stays blocked. The replay of 20261107-plugin-only-install rows 1 to 6 shows why: the two `AMENDED` rows written before the cross-check made the post-drift `AMENDED` the third, so the item stayed blocked and no re-check was offered, and the developer's unrelated `PHASE STALLED` (git missing) had already hidden the amendment.
**Instead of:** reopening on `AMENDED` as today and letting the developer re-stall: it erases the developer's stall reason without the user seeing it, and the stall is a user gate.
**Risks:**
- **RISK-001** Existing tests that model "amended three times" with bare `AMENDED` rows and no drift or stall row before them change meaning (`next-step.test.mts` lines 39 to 45, `plan.test.mts` lines 113 to 118); the test at `next-step.test.mts:170` already puts a drift first and passes as is. Mitigation: Phase 1 gives each such fixture a `DRIFT DETECTED` row before the `AMENDED` rows, so the test keeps its intent, and adds the plugin-only replay as a new case.
- **RISK-002** `next-step.test.mts` lines 138 to 144 expect `resolve_block` for a blocked item with rows `[DRIFT, AMENDED]`; rule (1) makes that `review_crosscheck`. Mitigation: the blocked half of that test changes to expect the re-check, which is the outcome the request asks for; the open half stays.

### D-002: The lead's send names a review's scope when the heading disagrees
**Decision:** In `route.verdict`, when a reviewer block's heading reads `phase <n>` but the latest lead message in the agent transcript carries `scope: checkpoint`, the hook treats the block as a checkpoint review before saving or routing it: the row gets `scope: checkpoint`, the review is saved as `reviews/checkpoint.md`, and the phase stays the heading's or the message's number. The reviewer contract's heading line gains `checkpoint` so a correct reviewer writes it directly. The phase-4 review of 20261107-plugin-only-install was headed `## Review: 20261107-plugin-only-install · phase 4` because `src/agents/reviewer.md:65` lists only `crosscheck | phase n | cumulative | pr`; the hook then routed scope null, so `fix_findings` never came due and the fixes send would have pointed at a `reviews/checkpoint.md` that did not exist.
**Instead of:** fixing only the contract heading: the kernel would still trust a model-written heading over the scope it sent itself.

### D-003: A repeated developer block after a rejection is routed
**Decision:** `repeatsSavedBlock` drops an identical developer block only when no rejection row (user `rejected`, reviewer `CHANGES REQUIRED` of any scope) follows the newest developer row; after a rejection the block routes like any `PHASE DONE`, so a new row lands, `findingsOpen` closes, and the developer gets the hook's `PHASE DONE applied` context. In 20261107-plugin-only-install no `PHASE DONE` for phase 4 follows the checkpoint `CHANGES REQUIRED` row of 08:54:33, although the developer answered it.
**Instead of:** bouncing the repeat with a message asking for a changed block: a fix whose block text happens to match (a rejection that needed no code change, an environmental finding) would be forced to invent a change.

### D-004: The summary finds a missing base from the item's own commits, or refuses
**Decision:** `picket summary <id>` resolves its base as `--base`, then `state.base`, then the parent of the item's oldest commit in HEAD's history, where the item's commits are those that touch `work/<id>/` and those its ledger accept rows name; with none of these it refuses with `no base recorded for <id> and no commit of it found; pass --base <ref>` and writes no `summary.json`. A new `itemBase(root, id)` in `src/lib/shared/review-summary.mts` reuses `acceptedCommits` there. The search window only widens: `rootOwned` still counts only the item's own commits and owned dirty paths, so a commit touching `work/<id>/` before phase 1 adds nothing. Checked on de39bd7: `picket summary 20261107-plugin-only-install` reports base HEAD and 0 files; its first commit touching the folder is 79e51c2 (also the commit of `phases/1.approved`), and `--base 79e51c2^` (2646b200) reports 98 files.
**Instead of:** writing the found base into `state.yaml`: only `picket set` and `picket route` change state, and neither owns a base.
**Risks:**
- **RISK-003** A test that opens an item in a repo with no commit, so no base is recorded, and then calls the summary now gets a refusal. Mitigation: Phase 3 runs the full `npm test`; such a fixture passes `--base` or commits first, and the developer's block names each fixture changed.

### D-005: `git config` read forms are allowed whatever the scope flag
**Decision:** `checkGitConfig` calls a `git config` call safe when it carries a read form (`--get`, `--get-all`, `--get-regexp`, `--get-urlmatch`, `--list`, `-l`, or `get` or `list` as the first word after `config`) and no write form (`--unset`, `--unset-all`, `--add`, `--replace-all`, `--rename-section`, `--remove-section`, `--edit`, `-e`, or `set`, `unset`, `rename-section`, `remove-section`, `edit` as the first word). The scope selectors `--global`, `--system`, `--local`, `--worktree` and `--file` stop counting as writes. Every other `git config` call stays denied as now. Probed on de39bd7 through the guard: `git config --global --get credential.helper`, `git config --global --list`, `git config -l`, `git config get user.name`, `git config list` and `git config --get-all user.name` are all denied as destructive; `git config --get user.name` and `git config --list` are allowed.
**Instead of:** sending every `git config` call to the permission prompt: the lead and agents would pay a prompt for a read the guard can classify.

## Scope
**In:**
- `picket reply`: a bare `r` at `approve_phase` means run through the last phase the packet offers.
- `picket next` and `picket route`: amendment, re-check and stall order on a blocked item; amendment counting (D-001).
- `route.verdict`: checkpoint scope from the send (D-002); repeated developer block after a rejection (D-003).
- `picket summary`: base when none was recorded (D-004).
- `guard.bash`: read-only `git config` (D-005).
- Closing templates in `src/skills/ordering/SKILL.md`, `src/skills/designing/SKILL.md`, `src/skills/researching/SKILL.md` show the `Audit:` line.

**Out:**
- The race in which the lead ran `picket next` before the reviewer's drift was routed (OQ-001).
- Drift counting (`DRIFT DETECTED` three times stays a stall, counted over the whole log), the cumulative-rejection stop, every other verb and hook, mods, install and packaging, user docs.

## Phase 1: Block order, amendment count, checkpoint scope, repeated blocks
**Touch set:**
- `src/lib/shared/work/stall.mts`: new home of stall facts
- `src/lib/shared/work/next-step.mts`: blockStep order, stall options
- `src/lib/shared/work/next-step.test.mts`: replay case, adjusted fixtures
- `src/lib/shared/route/plan.mts`: AMENDED reopen rule
- `src/lib/shared/route/plan.test.mts`: reopen cases, adjusted fixture
- `src/lib/hooks/route/verdict/index.mts`: checkpoint scope, repeat check
- `src/lib/hooks/route/verdict/index.test.mts`: repeat after rejection cases
- `test/hooks/route.verdict.test.mjs`: built hook drive, checkpoint
- `src/agents/reviewer.md`: heading line gains checkpoint

**Changes:**
- Create `stall.mts` with `STALL_REPEATS`, `newestBlockRow(rows)` and `amendmentsAnsweringBlocks(rows)` as D-001 defines them, plus a `isRepeatStall(rows)` for three `DRIFT DETECTED` rows or three answering amendments. `next-step.mts` imports `STALL_REPEATS` from it for the cumulative-rejection stop too; `plan.mts` drops `STALLING_AMENDMENTS`.
- `next-step.mts`: `blockStep` returns `amendStep ?? recheckStep ?? resolve_block` for an order or design item that is not a repeat stall; `isStalled` reads `newestBlockRow` instead of the last row.
- `plan.mts`: the `amended` plan keeps a blocked item blocked when `newestBlockRow` is `PHASE STALLED`, adding the note line `status stays blocked: the developer's stall waits for the user`, or when `amendmentsAnsweringBlocks` over the log plus the incoming row reaches `STALL_REPEATS`; otherwise it reopens as now.
- `route/verdict/index.mts`: after `blockInfo` and `latestHints`, a reviewer block whose heading scope is `phase` while `hints.scope` is `checkpoint` is handled as scope `checkpoint` for `saveReviewerBlock`, the row and the routed scope. `repeatsSavedBlock` returns false when a user `rejected` or reviewer `CHANGES REQUIRED` row comes after the newest developer row.
- `reviewer.md:65`: the heading line reads `## Review: <id> · <crosscheck | phase n | checkpoint | cumulative | pr>`; no line is added.
- Tests: the fixtures named in RISK-001 gain a leading `DRIFT DETECTED` row; the blocked half of the test at `next-step.test.mts:138` expects `review_crosscheck` (RISK-002).

**Done when:**
- **T-1.1** A `next-step` test replays rows 1 to 5 of `work/20261107-plugin-only-install/verdicts.jsonl` (`ARTIFACT WRITTEN`, `AMENDED`, `AMENDED`, crosscheck `DRIFT DETECTED` with an `amend` line, `PHASE STALLED`) on a blocked design item and gets `action: "amend"` with the drift's amend line as the detail.
- **T-1.2** A `plan` test routes `AMENDED` on that blocked item (rows 1 to 5) and gets no `status` change and the note line; a `next-step` test on rows 1 to 6, still blocked, gets `review_crosscheck` with the decisions revised since the drift's day, and on rows 1 to 7 (adding crosscheck `ALIGNED`) gets `resolve_block` with the three stall options.
- **T-1.3** A `plan` test routes `AMENDED` on a drift-blocked design item whose log is `ARTIFACT WRITTEN`, `AMENDED`, `AMENDED`, `DRIFT DETECTED` and gets the reopen change (`status: open`, `blocked_reason` unset); with a log of `DRIFT DETECTED` and two `AMENDED` rows it gets no change.
- **T-1.4** Through the built hook (`runHookBundle("route.verdict")` in `test/hooks/route.verdict.test.mjs`), a reviewer block headed `## Review: <id> · phase 4` ending `CHANGES REQUIRED`, after a lead message with `scope: checkpoint` and `phase: 4`, appends a row with `scope: "checkpoint"` and `phase: 4`, saves `work/<id>/reviews/checkpoint.md`, and the hook context names `fix_findings`.
- **T-1.5** A `route.verdict` test emits a developer block, routes a reviewer `CHANGES REQUIRED` on that phase, then emits the identical block in a new turn: the verdict log gains a second `PHASE DONE` row for the phase and the hook context contains `PHASE DONE applied`; the same holds after a user `rejected` row.
- **T-1.6** With no rejection after it, an identical developer block in a new turn still adds no row (the test at `src/lib/hooks/route/verdict/index.test.mts:294` passes unchanged).
- **T-1.7** `npm test` passes.

## Phase 2: Bare r, read-only git config, Audit line in templates
**Touch set:**
- `src/lib/verbs/reply/table.mts`: bare r approve form
- `src/lib/verbs/reply/index.test.mts`: bare r cases
- `src/lib/hooks/guard/bash/rules.mts`: checkGitConfig read and write forms
- `src/lib/hooks/guard/bash/rules.test.mts`: config allow and deny cases
- `test/hooks/guard.bash.test.mjs`: built guard drive
- `src/skills/ordering/SKILL.md`: closing template Audit line
- `src/skills/designing/SKILL.md`: closing template Audit line
- `src/skills/researching/SKILL.md`: closing sentence Audit line

**Changes:**
- `table.mts`: an `APPROVE_FORMS` entry with letter `r` matches a bare `r` (case-insensitive) and returns `{ kind: "approve", through: runLimit(step) }`; with no run offer the letter check already skips it.
- `rules.mts`: `checkGitConfig` follows D-005, with the read and write forms as named sets.
- Ordering and designing templates: a line `Audit: <lane> · phases <n> · tokens <agent> <n>, ... · bounces <n> · blocks <n> · wall <duration>` directly after the `Phases:` line, matching the order of `closingBlock` in `src/lib/verbs/close/block.mts:59`. Researching: the closing sentence names the same `Audit:` line right after the `Report:` line. No line is added to the researching file.

**Done when:**
- **T-2.1** A `reply` test on a three-phase order whose phase 1 is done: reply `r` approves phase 1, the verdict row has `through: 3`, and `state.yaml` holds `run_through: 3`.
- **T-2.2** A `reply` test on the last phase (no `[r]` offered) refuses a bare `r` with `matches no option at approve_phase`; `r 9` on phase 1 of 3 is still refused (`src/lib/verbs/reply/index.test.mts:92`).
- **T-2.3** Through the built guard bundle in `test/hooks/guard.bash.test.mjs`, each of `git config --global --get credential.helper`, `git config --global --list`, `git config -l`, `git config get user.name`, `git config list`, `git config --get-all user.name` is allowed.
- **T-2.4** A `rules` test gets `deny` for each of `git config user.name x`, `git config --global user.name x`, `git config --unset user.name`, `git config --global --replace-all user.name x`, `git config --get user.name --unset user.name` and `git config set user.name x`.
- **T-2.5** Each of the three SKILL.md files holds `Audit: <lane> · phases <n> · tokens` (greps).
- **T-2.6** `npm test` passes, the SKILL.md budgets and the dash check included.

## Phase 3: Summary base when none was recorded
**Touch set:**
- `src/lib/shared/review-summary.mts`: itemBase from item commits
- `src/lib/verbs/summary/index.mts`: base order, refusal
- `src/lib/verbs/summary/index.test.mts`: no-base cases

**Changes:**
- `review-summary.mts`: export `itemBase(root, id): string | null`, the parent of the oldest commit in HEAD's history among those touching `work/<id>/` and those `acceptedCommits` returns; null when there is none or the oldest has no parent.
- `summary/index.mts`: `itemSummary` resolves `base ?? state.base ?? itemBase(root, id)` and, when all three are missing, throws `Refused` with `no base recorded for <id> and no commit of it found; pass --base <ref>`; `--save` writes nothing then.

**Done when:**
- **T-3.1** A `summary` test opens an item, removes `base` from its state, approves phase 1 through `route` (so `commitPhase` makes the commit), and gets that commit's files in `changed_files` and the commit's parent as `base`.
- **T-3.2** A `summary` test whose oldest item commit is found only through a ledger accept row (made without the work folder) gets that commit's parent as `base`.
- **T-3.3** A `summary` test on an item with no base and no commit gets a refusal containing `pass --base`, and `work/<id>/summary.json` does not exist after `--save`.
- **T-3.4** The summary tests that pass `--base` or record a base (`src/lib/verbs/summary/index.test.mts:98`, `:341`, `:396`) pass unchanged.
- **T-3.5** Drive, after `npm run build`: `picket summary 20261107-plugin-only-install --human` prints `base 2646b200` and the same file count as `picket summary 20261107-plugin-only-install --base 79e51c2^ --human` (98 on de39bd7).
- **T-3.6** `npm test` passes.

## Open questions
- **OQ-001** The request says `picket next` printed the implement_phase sends after the drift. The lead transcript shows the reviewer's message reached the lead at 22:20:00.173, the lead ran `picket next` at 22:20:04.045, and the hook wrote the drift row at 22:20:04.927: next was right for the log it read, and a replay with the drift row gives `amend`. Should the lead wait for the reviewer's idle notification (a skill or contract change), or should the reviewer not message its block before stopping? Owner: product owner. Fallback: no kernel change for that moment; Phase 1 covers what follows it.

## Revision log
