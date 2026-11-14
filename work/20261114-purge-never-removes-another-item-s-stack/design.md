---
kind: design
lane: design
title: Purge never removes another item's stack
date: 2026-11-14
audience: developer
sources: [request.md, work/20261114-standard-test-environment-and-env-verbs/reviews/cumulative.md, work/20261114-standard-test-environment-and-env-verbs/design.md, src/lib/verbs/close/close.mts, src/lib/shared/env/purge.mts, src/lib/shared/env/stacks.mts, src/lib/shared/env/standard.mts, src/lib/verbs/env/purge.mts, src/lib/verbs/env/start.mts, src/lib/verbs/env/stop.mts]
phases:
  - n: 1
    files: [src/lib/shared/env/stacks.mts, src/lib/shared/env/stacks.test.mts, src/lib/shared/env/purge.mts, src/lib/shared/env/purge.test.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/index.test.mts, src/lib/verbs/env/purge.mts, src/lib/verbs/env/purge.test.mts]
    greps:
      - path: src/lib/shared/env/stacks.mts
        pattern: 'export function activeClaim\b'
      - path: src/lib/shared/env/purge.mts
        pattern: 'export function foreignClaim\b'
      - path: src/lib/verbs/close/close.mts
        pattern: '\bforeignClaim\('
      - path: src/lib/verbs/env/purge.mts
        pattern: '\bforeignClaim\('
      - path: src/lib/verbs/env/purge.mts
        pattern: '\brefuseActive\b'
        absent: true
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/verbs/env/start.mts, src/lib/verbs/env/start.test.mts, test/cli/env.test.mjs]
    greps:
      - path: src/lib/verbs/env/start.mts
        pattern: '\bactiveClaim\('
    tests: true
    drive: true
    security: false
---
# Design: Purge never removes another item's stack

## Problem
Two open items opened from one ticket share one stack name, `picket-<ticket key>` (`itemKey` and `stackName`, `src/lib/shared/env/standard.mts:20-26`), and `recordStack` replaces the stack's one `stacks.json` entry (`src/lib/shared/env/stacks.mts:29-31`). So when item B runs `env start` after item A, A's entry is gone, and `itemStack` (`src/lib/verbs/close/close.mts:212-216`) falls back to the shared name for A without asking whom it belongs to; closing A then runs `compose down --volumes` on B's stack and drops B's entry. This breaks RISK-012 of D-007 in `work/20261114-standard-test-environment-and-env-verbs/design.md` ("only `close` purges an item it is closing"), as the cumulative review of that item found (`reviews/cumulative.md`, the Major). The stack naming rule of SDR 00004 and D-006 stays as it is; the fix is an ownership check before removal and a refusal before a second item takes a shared stack.

## Decisions

### D-001: One ownership check before every removal, from the record and the label
**Decision:** Infrastructural decision. A stack has up to two claimants: the item `stacks.json` records for it, and the item named by the `io.github.picketai.item` label on its containers (`labelledItem`, `src/lib/shared/env/purge.mts:37-45`). `stacks.mts` gains `activeClaim(root, stack, item, owner): string | null`, which returns the refusal text `<stack> belongs to <item>, which is <status>; close it first` when `item` is not null, differs from `owner`, and its status is `open` or `blocked`, else null. `purge.mts` (shared) gains `foreignClaim(engine, root, stack, owner): string | null`, the record's claim first, then the label's. `close` calls it with the closing item as owner and `env purge` with owner null, both before `purgeStack`, so neither removes a stack an active item claims. The refusal text is the one `env purge` prints today (`src/lib/verbs/env/purge.mts:18`), so one sentence names the blocking item everywhere. `purgeStack` itself is unchanged.
**Instead of:** the check inside `purgeStack`, the single removal site: it adds a label query ahead of the listing, which changes the call order the T-8.1 test pins (`src/lib/shared/env/purge.test.mts:48-63`), and both callers of `purgeStack` are in this design.
**Risks:**
- **RISK-001** A future caller of `purgeStack` skips `foreignClaim`. Mitigation: `close` and `env purge` are its only callers today (`grep purgeStack src`); a reviewer row on a new caller is the check.
- **RISK-002** The label query answers text that is not JSON, and `jsonRecords` throws. Mitigation: in `close` the call sits inside the existing `try`, so the outcome is the warning `environment not removed: …` and nothing is removed; in `env purge` the verb ends without a removal. Both fail closed.

### D-002: Close removes only a stack recorded for itself or for nobody
**Decision:** Infrastructural decision. When `itemStack` falls back to `stackName(itemKey(state))` and `stacks.json` records that name for a different item, at any status, `close` makes no engine call and reports the warning `environment not removed: <stack> is recorded for <item>`. A different done item's stack is then left to `picket env purge <stack>`, which purges it because that item is closed. An unrecorded fallback stack still goes through D-001's label check, so a stack whose containers name another open item stays too.
**Instead of:** returning null, so close prints no environment line (the review's first suggestion): the user would not learn that a stack stays behind or which item holds it.
**Risks:**
- **RISK-003** A stack recorded for a done item stays after the other item closes. Mitigation: the warning names it, and the SessionStart line of `env.stacks` already lists stacks whose item is done (`closedStacks`, `src/lib/shared/env/stacks.mts:66-71`).

### D-003: env start refuses a stack recorded for another active item
**Decision:** Infrastructural decision. `env start <id>` computes its stack name right after `openState` and, before any Compose call, refuses with `activeClaim(root, stack, <recorded item>, id)`'s text when `stacks.json` records the stack for another item that is open or blocked. A stack recorded for the same item, or for a done, abandoned or unknown item, starts as today and the new entry replaces the old one. It reads the record only: `env start` writes the record before `compose up` (`src/lib/verbs/env/start.mts:99-100`), so every stack a start made carries one.
**Instead of:** reading the container label as well, as D-001 does: it adds an engine call to every start, which changes the call list the T-5.4 test pins (`src/lib/verbs/env/start.test.mts:72-80`), for a case (containers without a record) that only a lost `stacks.json` creates.
**Risks:**
- **RISK-004** Two items from one ticket cannot have running stacks at the same time. Mitigation: the refusal names the item to close first; distinct names per item would change SDR 00004's naming rule, which is out of scope.

## Scope
**In:**
- `itemStack` and `purgeOnClose` in `src/lib/verbs/close/close.mts`
- the ownership check of `env purge` in `src/lib/verbs/env/purge.mts`
- `activeClaim` in `src/lib/shared/env/stacks.mts` and `foreignClaim` in `src/lib/shared/env/purge.mts`
- the refusal in `env start` for a stack recorded for another open or blocked item
- a test that fails on the current code: two open items from one ticket, B started after A, close A, B's stack, volume and entry remain

**Out:**
- the stack naming rule of SDR 00004 and D-006 (`picket-<ticket key>`)
- `env stop <id>`, which stops the shared stack whoever holds it; it removes nothing
- the kernel gaps around amendments and run grants; the Se4 follow-up; saved scenarios (TF-003)

## Phase 1: Close and purge leave another item's stack in place
**Touch set:**
- `src/lib/shared/env/stacks.mts`: gains `activeClaim`
- `src/lib/shared/env/stacks.test.mts`: tests for `activeClaim`
- `src/lib/shared/env/purge.mts`: gains `foreignClaim`
- `src/lib/shared/env/purge.test.mts`: tests for `foreignClaim`
- `src/lib/verbs/close/close.mts`: recorded-for-other check, `foreignClaim` call
- `src/lib/verbs/close/index.test.mts`: two-item tests, stub answers labels
- `src/lib/verbs/env/purge.mts`: `refuseActive` replaced by `foreignClaim`
- `src/lib/verbs/env/purge.test.mts`: record-done, label-open case

**Changes:**
- `stacks.mts` exports `ACTIVE_STATUSES = ["open", "blocked"]` and `activeClaim(root: string, stack: string, item: string | null, owner: string | null): string | null` per D-001, with the status from `itemStatus`.
- `purge.mts` (shared) exports `foreignClaim(engine: Engine, root: string, stack: string, owner: string | null): string | null`: `activeClaim` on `readStacks(root)[stack]?.item ?? null`, then on `labelledItem(engine, stack)`; the first non-null text wins. `purgeStack`, `listResources` and `removeAll` are untouched.
- `close.mts`: `purgeOnClose` keeps `itemStack`'s choice. Before `machineCheck`, a stack whose `stacks.json` item is set and differs from `state.id` returns `notRemoved` with the reason `<stack> is recorded for <item>` per D-002. After the engine check and inside the existing `try`, a non-null `foreignClaim(engine, root, stack, state.id)` returns `notRemoved(<text>)`; otherwise `purgeStack` runs as today. The no-environment path still makes no engine call (T-8.4).
- `env/purge.mts` (verb): `refuseActive` and the local `ACTIVE` go; after the engine check, a non-null `foreignClaim(engine, root, stack, null)` throws `Refused(<text>)`. `item` for the image filter stays `recorded ?? labelledItem(engine, stack)`.
- Tests: the close test's engine stub (`engine`, `src/lib/verbs/close/index.test.mts:149-161`) answers `ps … --format json` with JSON (a label record for the closing item, or nothing), since it now answers every `ps` with `c1` and `jsonRecords` would throw. The two-item tests open A and B with `source: "PROJ-481"` and different titles, mark A done as `doneItem` does, write `.picket/env/compose.yaml`, and seed `stacks.json` with `recordStack` for B: the state an `env start` of B after A leaves on the current code, and one phase 2's refusal stops new starts from making.

**Done when:**
- **T-1.1** A unit test in `src/lib/verbs/close/index.test.mts`: with `picket-proj-481` recorded for open item B and its containers labelled with B, closing item A makes no `compose … down` and no `image rm` call, `readStacks(root)` still maps `picket-proj-481` to B's entry unchanged, A's status is `done`, and `environment` is `{ removed: null, warning: "environment not removed: picket-proj-481 is recorded for <B's id>" }`.
- **T-1.2** With `src/lib/verbs/close/close.mts` alone restored from `eb4afe7f` (`git show eb4afe7f:src/lib/verbs/close/close.mts`), the T-1.1 test fails on its no-down assertion; with the phase's file back, it passes. The developer's block quotes both runs' result lines.
- **T-1.3** A unit test: with no `stacks.json` entry for `picket-proj-481` and its containers labelled with open item B, closing A makes no `down` call, leaves `stacks.json` as it was, and warns `environment not removed: picket-proj-481 belongs to <B's id>, which is open; close it first`.
- **T-1.4** A unit test: with no entry and containers labelled with a done item, or with no label, closing A still runs `compose … down --volumes --remove-orphans` on `picket-proj-481` (the fallback still purges an unclaimed stack).
- **T-1.5** A unit test in `src/lib/verbs/env/purge.test.mts`: with `stacks.json` recording a done item and containers labelled with open item B, `env purge picket-proj-481` throws `Refused` with `picket-proj-481 belongs to <B's id>, which is open; close it first`, makes no `down` call and keeps the entry.
- **T-1.6** Unit tests of `activeClaim` cover each branch with the whole return value: item null, item equal to owner, another item done, abandoned and unknown (each null), another item open and blocked (each the text with that status).
- **T-1.7** The T-8.1 to T-8.6 tests pass, and `git diff eb4afe7f -- src/lib/shared/env/purge.test.mts src/lib/verbs/env/purge.test.mts src/lib/verbs/close/index.test.mts` changes no line of their bodies except the close stub's answer to the `--format json` form of `ps`.

## Phase 2: env start refuses a stack another active item holds
**Touch set:**
- `src/lib/verbs/env/start.mts`: refusal before any Compose call
- `src/lib/verbs/env/start.test.mts`: refusal and pass-through unit tests
- `test/cli/env.test.mjs`: two-item start through the binary

**Changes:**
- `start.mts`: in `startStack`, the key and stack name are computed right after `openState` and before `checkedModel`. A non-null `activeClaim(root, stack, readStacks(root)[stack]?.item ?? null, id)` throws `Refused(<text>)` per D-003, so no `compose config`, `build` or `up` runs and `recordStack` is not reached. The rest of `startStack` keeps its order.
- `start.test.mts`: new tests use the existing `project` and `engine` helpers, open the second item with `source: "PROJ-481"` and another title, and seed `stacks.json` with `recordStack`. The stub records every call except `info` and `compose version` (`src/lib/verbs/env/start.test.mts:27-45`), and `machineCheck` makes only those two (`src/lib/shared/env/engine.mts:211-224`), so an empty call list means no Compose call.
- `test/cli/env.test.mjs`: one test on the `startProject` git copy with the fake engine (`envVerb`), which opens a second item from `PROJ-481`; it is the request's "B started after A" sequence run through `dist/bin/picket.mjs`.

**Done when:**
- **T-2.1** A unit test: with `picket-proj-481` recorded for item B at status `open`, and again at `blocked`, `startEnvironment(ctx, runner, A)` throws `Refused` with `picket-proj-481 belongs to <B's id>, which is <status>; close it first`, the stub's call list is empty, and `readStacks(root)` still maps `picket-proj-481` to B's entry unchanged.
- **T-2.2** A unit test: with `picket-proj-481` recorded for a done item B, `env start` for A exits 0 and `readStacks(root)["picket-proj-481"].item` is A's id.
- **T-2.3** A unit test: with `picket-proj-481` already recorded for A, a second `env start` for A exits 0 and the entry's item is still A's id.
- **T-2.4** A CLI test in `test/cli/env.test.mjs`: `env start A` exits 0; `env start B` for a second open item from `PROJ-481` exits 2, its output holds `picket-proj-481 belongs to <A's id>, which is open; close it first`, and `stacks.json` maps `picket-proj-481` to A.
- **T-2.5** The T-5.4 and T-5.6 tests pass, and `git diff eb4afe7f -- src/lib/verbs/env/start.test.mts test/cli/env.test.mjs` shows added lines only, so no existing assertion changed.

## Open questions
none

## Revision log
