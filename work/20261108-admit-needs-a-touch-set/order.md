---
kind: order
lane: order
title: Admit answers pending without touch set
date: 2026-11-08
audience: developer
sources: work/20261108-admit-needs-a-touch-set/request.md, work/20261108-admit-needs-a-touch-set/preflight.txt, src/lib/shared/admission/lane.mts, src/lib/shared/admission/signals.mts, src/lib/shared/admission/admit.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/shared/admission/admit-labelled.test.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/admit.test.mts, src/lib/verbs/admit/index.mts, src/lib/verbs/admit/index.test.mts, src/lib/verbs/open/index.mts, src/lib/verbs/open/index.test.mts, test/cli/cli.test.mjs, test/cli/lane-check.test.mjs, test/kernel/init.test.mjs, test/timing/budgets.test.mjs, src/templates/claude-block.md, CLAUDE.md, src/skills/expediting/SKILL.md, src/skills/debugging/SKILL.md, work/20261108-kernel-and-template-gaps-from-runs/request.md, work/20261108-session-switch-and-project-status-line/request.md, work/20261108-fix-cumulative-review-minor-findings/request.md, the lead transcript of session 8e35c265 (the 11:08 admit of the mutate bug report)
phases:
  - n: 1
    files: [src/lib/shared/admission/lane.mts, src/lib/shared/admission/admit.mts, src/lib/verbs/open/index.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/admit.test.mts, src/lib/shared/admission/admit-labelled.test.mts, src/lib/verbs/admit/index.test.mts, src/lib/verbs/open/index.test.mts, test/cli/cli.test.mjs]
    greps:
      - path: src/lib/shared/admission/lane.mts
        pattern: 'export const PENDING = "pending"'
      - path: src/lib/shared/admission/lane.mts
        pattern: 'picket admit --request <file> --touched <paths>'
      - path: src/lib/shared/admission/admit.mts
        pattern: '\bPENDING\b'
      - path: src/lib/verbs/open/index.mts
        pattern: '\bPENDING\b'
      - path: src/lib/shared/admission/admit-labelled.test.mts
        pattern: '\bPENDING\b'
      - path: test/cli/cli.test.mjs
        pattern: '"--touched", "src/a.ts"'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/verbs/admit/index.test.mts]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: '\bnumbered_items\b'
      - path: src/lib/shared/admission/lane.mts
        pattern: '\bnumbered_items\b'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'Fix the kernel and template gaps seen on 2026-11-07'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'Two changes to the plugin-only install'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'Fix the three minor findings from the cumulative review'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'still uses `state.base'
    tests: true
    drive: true
  - n: 3
    files: [src/templates/claude-block.md, CLAUDE.md, src/skills/expediting/SKILL.md, src/skills/debugging/SKILL.md]
    greps:
      - path: src/templates/claude-block.md
        pattern: '`lane: pending`'
      - path: src/templates/claude-block.md
        pattern: '--touched <paths>'
      - path: CLAUDE.md
        pattern: '`lane: pending`'
      - path: src/skills/expediting/SKILL.md
        pattern: 'picket admit --request - --touched[\s\S]*picket open --lane fast'
      - path: src/skills/expediting/SKILL.md
        pattern: 'In the same tool batch as your first Edit, re-check admission'
        absent: true
      - path: src/skills/expediting/SKILL.md
        pattern: 'whenever the touch set grows'
      - path: src/skills/debugging/SKILL.md
        pattern: 'picket admit --request - --touched'
    tests: true
    drive: false
---
# Order: Admit answers pending without touch set

## Problem

`laneOf` in `src/lib/shared/admission/lane.mts:56` answers `fast` when a request carries a small-change word or names up to `lanes.fast.max_files` existing files, even when no `--touched` list was given. On 2026-11-08 three fast items were opened from that answer and abandoned once the real touch set re-admitted them to order (`work/20261108-kernel-and-template-gaps-from-runs`, `work/20261108-session-switch-and-project-status-line`, `work/20261108-fix-cumulative-review-minor-findings`), and a descriptive bug report was read as research. The fix must stay inside the admission module, the lane skills and the CLAUDE.md block: admit does not grep the repository, design-lane signals stay as they are, and other kernel verbs keep their behaviour.

## Decisions

### D-001: Admit answers pending in place of fast when no touch set is given
**Decision:** `lane.mts` exports `PENDING = "pending"` beside `NO_LANE`, and `Admission["lane"]` becomes `Lane | typeof NO_LANE | typeof PENDING`. Where `laneOf` would answer `fast` (the `fastOk` branch) and `signals.touched` is 0, it answers `pending` with two reasons: today's small-change reason, then `fast needs a touch set: find the files the change edits and re-run picket admit --request <file> --touched <paths>`. A touched list of any length that keeps `fastOk` gives `fast` as today. A forced `lane: fast` line is the user's word and keeps answering `fast` with no touched list; heavier answers (order, design, research, none) never become pending. Because only an answer with a touched list can be fast, a request naming exactly the cap (3 files) with no list is also pending, not only one naming fewer: the request's two sentences compose that way. `overridesAdmission` in `admit.mts` ranks `pending` with `fast`, so `picket open --lane fast|order|design` is never refused for it and `--lane research` still is. `laneRefusal` in `src/lib/verbs/open/index.mts:80` gives `follow admit's reason` for `pending` as it does for `none`, so the refusal never says `open it with --lane pending`; this is the only change in the open verb and it changes no routing.
**Instead of:** keeping `lane: fast` and adding a `needs_touch_set` flag: the lead reads the lane word and invokes the skill it names, which is exactly the failure seen today.
**Risks:**
- **RISK-001** `picket open` re-admits from the text alone, so a lead that skips the touch-set step can still open `--lane fast` on a pending answer. Mitigation: D-004's skill and CLAUDE.md steps; making open take `--touched` is another kernel verb and out of scope.
- **RISK-002** Every non-forced `fast` assertion made without a touched list in the admission tests turns red. Mitigation: phase 1 updates each to pass the named files as `touched` (keeps `fast`) or to assert `pending`.

### D-002: Three or more numbered items are never fast
**Decision:** `signalsOf` in `signals.mts` adds `numbered_items: number`, the count of lines matching `/^[ \t]*\d+[.)][ \t]/gm` (a line that starts with `1.` or `1)` and a space or tab). `laneOf` adds `signals.numbered_items < 3` to `fastOk`, with the threshold a named constant in `lane.mts`, and `orderReasons` adds a reason naming the count when it is 3 or more. The signal only blocks fast: forced lanes, diagnosis, research and the heavy design reasons keep their precedence, so a three-question research request stays research. The pattern was run on the inputs in T-2.1: it counts 3 for a three-line `1.` list and for a `1)` list, and 0 for `Bump vitest from 1.5 to 1.6` and for `Fix 3. the typo`.
**Instead of:** counting sentences or the word "and" as separate changes: it would also catch one-change requests written as two sentences, such as the labelled `When the port is taken ... Log the error in src/http/server.ts` case.
**Risks:**
- **RISK-003** A small request that quotes a three-item list as context (a pasted ticket) lands in order. Mitigation: order is the safe over-route, and a `lane: fast` line still forces fast.

### D-003: The labelled set keeps final lanes and counts pending as fast
**Decision:** `admit-labelled.test.json` keeps labelling the lane a request ends in once its touch set is known. `admit-labelled.test.mts` keeps calling `laneOf` with no touched list, as today, and its comparison counts an answer of `PENDING` as `fast`; by D-001 pending is only ever answered where `fast` would otherwise be, so the comparison keeps every existing pass and miss. The four misroutes join the set with the lanes the request gives.
**Instead of:** a `touched` field per entry, passed on a second call: 31 entries would be rewritten, and 6 fast entries name no fixture file, so their touch sets would be invented.

### D-004: The lead finds the touch set before any item is opened
**Decision:** step 1 of the CLAUDE.md block (`src/templates/claude-block.md`, copied verbatim at the top of `CLAUDE.md`) gains one sentence: on `lane: pending`, find in code the files the change edits and re-run admit with `--touched <paths>` before invoking a skill. The expediting skill names its touch set from code and runs `picket admit --request - --touched <a>,<b> --human` with the request in a quoted heredoc before `picket open`, opening nothing on any answer but `lane: fast`; the step that re-checked admission at the first Edit goes, while the `## Rules` re-run when the touch set grows stays. The debugging skill's `f` hand-off runs admit with `--touched <the files the fix edits>`, since a pending answer names no skill to invoke. The ordering, designing and researching skills run no admit and stay unchanged.
**Instead of:** leaving the expediting re-check at the first Edit: that is the point where today's three items were found too large, after `picket open` had already created them.
**Risks:**
- **RISK-004** The CLAUDE.md byte budget (2560 in `test/timing/budgets.test.mjs:15`; the file is 2225 bytes on the base). Mitigation: one sentence of about 100 bytes; T-3.1 runs the budget test.

## Scope

**In:**
- the `pending` answer, its reason and its rank in `overridesAdmission`, and the open refusal remedy for it
- the `numbered_items` signal
- the four misroutes in the labelled admission set
- the admit steps of the CLAUDE.md block, the expediting skill and the debugging hand-off

**Out:**
- admit grepping the repository; design-lane signals; open taking `--touched`; any other kernel verb behaviour
- the research signal that reads the mutate bug report as research (OQ-001)
- user docs that describe admit's answers (OQ-002)

## Phase 1: Pending answer without a touch set

**Touch set:**
- `src/lib/shared/admission/lane.mts`: PENDING constant and pending branch
- `src/lib/shared/admission/admit.mts`: pending ranks with fast
- `src/lib/verbs/open/index.mts`: refusal remedy for pending
- `src/lib/shared/admission/lane.test.mts`: pin pending and fast reasons
- `src/lib/shared/admission/admit.test.mts`: overridesAdmission pending cases
- `src/lib/shared/admission/admit-labelled.test.mts`: count pending as fast
- `src/lib/verbs/admit/index.test.mts`: update fast assertions, new cases
- `src/lib/verbs/open/index.test.mts`: research refused, fast opens
- `test/cli/cli.test.mjs`: CLI admit pending then fast

**Changes:** D-001 in `lane.mts`, `admit.mts` and the one remedy line of `open/index.mts`; D-003's comparison in the labelled test. `src/lib/verbs/admit/index.mts` renders `lane: <lane> (<reasons>)` generically and needs no edit. In `src/lib/verbs/admit/index.test.mts`, each non-forced `fast` assertion made without a touched list (the T-5.3 cap test, the six fast-lane requests, T-2.3, T-1.3, the removing-keys test, the `.claude/settings.json` test, and the `fast` lines of T-2.2 and T-3.2) either passes the files the request names as `touched` and keeps `fast`, or asserts `pending` where the request names no file. `lane.test.mts` pins the pending result for its small-change signals with `touched: 0` and the fast result with `touched: 1`, every field of each.

**Done when:**
- **T-1.1** In `src/lib/verbs/admit/index.test.mts`, ``admit(root, "Fix the typo in `src/config.ts`.")`` answers `pending` with a last reason containing `picket admit --request <file> --touched <paths>`, and the same call with `["src/config.ts"]` answers `fast`.
- **T-1.2** ``fix the typo in `src/config.ts`, `src/http/server.ts` and `src/domain/money.ts` `` (three named files, the default cap) answers `pending` with no touched list, and `order` with a four-file touched list.
- **T-1.3** `lane: fast. Fix the typo.` with no touched list answers `fast`, and the existing forced-lane and security tests in `src/lib/verbs/admit/index.test.mts` pass with their assertions unchanged.
- **T-1.4** `src/lib/shared/admission/admit.test.mts` asserts `overridesAdmission` is false for `("fast", "pending")`, `("order", "pending")` and `("design", "pending")`, and true for `("research", "pending")`.
- **T-1.5** In `src/lib/verbs/open/index.test.mts`, opening `Fix the typo in the fee helper.` with `--lane research` is refused with `details.admitted` equal to `pending` and a message containing `follow admit's reason` and not `--lane pending`; the same text with `--lane fast` opens.
- **T-1.6** `src/lib/shared/admission/admit-labelled.test.mts` passes with `laneOf` called with no touched list; on the base it misses 6 of 130 entries (share 124/130 = 0.954, from a one-off run of the base code), and counting pending as fast leaves that count unchanged.
- **T-1.7** `test/cli/cli.test.mjs` asserts that `admit --text` on ``Fix the typo in `src/a.ts`.`` answers `pending`, and with `"--touched", "src/a.ts"` answers `fast`, before the walk continues.
- **T-1.8** Drive, after `npm run build`: ``picket admit --text "Fix the typo in `src/lib/shared/admission/lane.mts`." --human`` prints a line starting `lane: pending (` that names `--touched <paths>`; adding `--touched src/lib/shared/admission/lane.mts` prints a line starting `lane: fast (`.

## Phase 2: Numbered items and today's misroutes

**Touch set:**
- `src/lib/shared/admission/signals.mts`: count numbered item lines
- `src/lib/shared/admission/signals.test.mts`: pin the count
- `src/lib/shared/admission/lane.mts`: block fast, order reason
- `src/lib/shared/admission/lane.test.mts`: add numbered_items to literal
- `src/lib/shared/admission/admit-labelled.test.json`: four new entries
- `src/lib/verbs/admit/index.test.mts`: numbered item routing cases

**Changes:** D-002 in `signals.mts` and `lane.mts`; `lane.test.mts` adds `numbered_items: 0` to its `Signals` literal so the typecheck passes. Four entries are appended to `admit-labelled.test.json`, each with a `why`:
- the whole of `work/20261108-kernel-and-template-gaps-from-runs/request.md`, trailing newline dropped, lane `order` (seven numbered items);
- the whole of `work/20261108-session-switch-and-project-status-line/request.md`, lane `order` (it admits order against `bench/fixture` by the default rule: no fixture file named and no small-change word; in this repository it named existing files and admitted fast);
- the whole of `work/20261108-fix-cumulative-review-minor-findings/request.md`, lane `order` (three numbered items);
- lane `fast`, this text from the lead transcript, verbatim:

  > src/lib/verbs/mutate/index.mts:68 still uses `state.base ?? "HEAD"`: an item with no recorded base mutates against HEAD, so it finds no changed lines. Use the same missing-base lookup that `picket summary` now uses (the item's own commits, from 20261108-kernel-and-template-gaps-order) and report when no base can be found, never HEAD.

**Done when:**
- **T-2.1** `src/lib/shared/admission/signals.test.mts` asserts `numbered_items` is 3 for `"Fix these:\n1. a\n2. b\n3. c"` and for `"1) a\n 2) b\n3) c"`, 1 for `"2.1.319 is the version\n1. x"`, and 0 for `"Bump vitest from 1.5 to 1.6"` and `"Fix 3. the typo"`.
- **T-2.2** In `src/lib/verbs/admit/index.test.mts`, ``"Fix these typos in `src/config.ts`:\n1. a\n2. b\n3. c"`` with touched `["src/config.ts"]` answers `order` with a reason naming 3 numbered items; the two-item version with the same touched list answers `fast`.
- **T-2.3** A three-item list keeps a heavier answer: `"How does pricing pick the tier?\n1. x\n2. y\n3. z"` answers `research`, and a three-item fix list with touched `["src/auth/login.ts"]` answers `design`.
- **T-2.4** `admit-labelled.test.json` holds 134 entries; the four new requests are the texts named in Changes, byte for byte, labelled `order`, `order`, `order` and `fast`.
- **T-2.5** `admit-labelled.test.mts` passes; the kernel gaps and minor findings entries now agree with their labels, and the only new miss is the mutate entry (answered `research`, OQ-001), so 7 of 134 miss (share 127/134 = 0.948, from a one-off run of D-002's pattern over the set).
- **T-2.6** Drive, after `npm run build`: `picket admit --request work/20261108-kernel-and-template-gaps-from-runs/request.md --touched src/lib/verbs/reply/table.mts --human` prints a line starting `lane: order (` that names the 7 numbered items.

## Phase 3: Lead and skill steps find the touch set

**Touch set:**
- `src/templates/claude-block.md`: step 1 handles pending
- `CLAUDE.md`: same block, verbatim copy
- `src/skills/expediting/SKILL.md`: admit with touch set before open
- `src/skills/debugging/SKILL.md`: hand-off passes touched files

**Changes:** D-004. In `src/templates/claude-block.md` step 1, after the sentence naming the four lane skills, one sentence for `lane: pending` naming `--touched <paths>`; `CLAUDE.md` gets the identical edit so it still starts with the template. In `src/skills/expediting/SKILL.md`, the steps become: Read every file the request names (Grep for the symbol or route when none is named) and name the touch set, at most three files; run `picket admit --request - --touched <a>,<b> --human` with the request in a quoted heredoc and, on any answer but `lane: fast`, open nothing and invoke the skill it names; then the existing `picket open --lane fast --title "<six-word title>" --request - <<'PICKET_REQUEST_END'` step, in the exact form `test/cli/lane-check.test.mjs` matches. Old step 4 (the re-check at the first Edit) goes; the `## Rules` paragraph on re-running when the touch set grows stays. In `src/skills/debugging/SKILL.md`, the `f` row runs `picket admit --request - --touched <the files the fix edits> --human` with the `Hand-off:` text.

**Done when:**
- **T-3.1** `src/templates/claude-block.md` step 1 names `lane: pending` and `--touched <paths>`; `test/kernel/init.test.mjs` (CLAUDE.md starts with the template) and `test/timing/budgets.test.mjs` (CLAUDE.md at most 2560 bytes) pass.
- **T-3.2** In `src/skills/expediting/SKILL.md`, `picket admit --request - --touched` appears before `picket open --lane fast`, and the step says that any answer but `lane: fast` opens nothing.
- **T-3.3** `src/skills/expediting/SKILL.md` no longer holds `In the same tool batch as your first Edit, re-check admission`, and still holds the `## Rules` re-run `whenever the touch set grows`.
- **T-3.4** The `f` row of `src/skills/debugging/SKILL.md` runs `picket admit --request - --touched` with the `Hand-off:` text.
- **T-3.5** `test/cli/lane-check.test.mjs` passes, including the expediting `picket open` form check.

## Open questions

- **OQ-001** The mutate bug report stays a labelled miss: `RESEARCH` in `src/lib/shared/admission/signals.mts:21` matches its bare word `report` ("report when no base can be found"), and with that word dropped it lands in `order`, because `src/lib/verbs/mutate/index.mts` does not exist in `bench/fixture`. Should a research-signal change follow? Owner: product owner. Fallback: the entry is added labelled `fast` and counted as a miss; the share stays at 0.948, above the 0.9 minimum.
- **OQ-002** `docs/how-to.md:110` says admit answers "one of four lanes" and `docs/reference/skills.md:28` says the fast lane starts when admit answers `fast`; neither mentions `pending`. Owner: product owner. Fallback: the docs stay unchanged in this item; a follow-up updates them.

## Revision log
