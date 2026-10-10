---
kind: order
lane: order
title: Close refuses until next says close
date: 2026-10-10
audience: developer
sources: request.md, core/lib/close.mjs, core/lib/next.mjs, core/lib/work.mjs, core/lib/route.mjs, core/bin/picket.mjs, test/kernel/close.test.mjs, test/kernel/next.test.mjs, core/skills/researching/SKILL.md, core/skills/researching/steps/20-deep.md, core/skills/expediting/steps/30-check.md, core/skills/ordering/SKILL.md, core/skills/designing/SKILL.md
phases:
  - n: 1
    files:
      - core/lib/close.mjs
      - core/bin/picket.mjs
      - test/kernel/close.test.mjs
    greps:
      - path: core/lib/close.mjs
        pattern: 'from "\./next\.mjs"'
      - path: core/bin/picket.mjs
        pattern: 'not closed · next: '
    tests: true
    drive: true
---
# Order: Close refuses until next says close

## Problem

`close()` in `core/lib/close.mjs` checks only that the item is not abandoned, so it marks any open or blocked item done whatever `next()` says. On a design item the lead ran `picket close` about a second before the hook routed the cumulative review's `APPROVED`; `next` still said `review_cumulative`, close committed anyway, and a second close then committed the late review markers. The binding constraint: close must refuse unless `next()` computes `close`, print the pending action and actor, and exit non-zero, while fast-lane items (whose `next` is always `close`) keep closing.

Two callers close in a state where `next` is not `close` today, and the design keeps both working. A failed close commit (a `commit-msg` hook refusing) leaves the item `done` and staged, and the retry close is the only verb that commits it; `next` on a `done` item says `none`. The research lane closes on the user's `[a] accept`, while `next` for a research item with `research.md` always says `approve_phase` by `user` (`core/lib/next.mjs:46`); no marker records the accept.

## Decisions

### D-001: close asks next() and refuses on any other action
**Decision:** `close(id, root, opts)` calls `next(id, root)` before it writes anything, inside the existing order of checks: abandoned refusal first (its message is unchanged), then the gate, then the foreign-staged check and the commit. When the gate refuses, it throws `CloseRefused` carrying the `next` result as a `next` property. The CLI keeps exit 2 for `CloseRefused` and adds `next: { action, actor, phase, detail }` to the JSON; the `--human` line reads `<id>: not closed · next: <action> · <actor or -> · <detail>`, for example `20261010-x: not closed · next: review_cumulative · reviewer · all phases approved; one cumulative review remains`. A blocked item now refuses (its `next` is `resolve_block`), where today it closes. Giving up: closing a blocked item in one step; the user clears the block first.
**Instead of:** a separate predicate duplicated in `close.mjs` (all phases approved, all reviewed): it would drift from `next.mjs`, the one place the kernel computes the next action.
**Risks:**
- **RISK-001** `close.mjs` importing `next.mjs` creates an import cycle. Mitigation: `next.mjs` imports only `work.mjs`, `sources.mjs` and `gate.mjs`, none of which imports `close.mjs`; the developer confirms by running the suite.

### D-002: a done item re-closes as a commit retry
**Decision:** When `status` is `done`, close skips the gate and runs the current commit path, so a close whose commit failed can be retried and a second close on a committed item commits nothing (both existing tests stay green). The gate guards the transition from open to done, not the commit of an item already done. Abandoned items stay refused with today's message. Giving up: the literal reading "refuse unless next says close" for `done` items; `picket set <id> status=done` followed by `picket close <id>` still marks an item done without the gate, which is the deliberate escape hatch (see D-004).
**Instead of:** refusing `done` items too: a refused commit would leave a `done`, staged item that no verb can commit.
**Risks:**
- **RISK-002** A second close after a premature first close still commits late markers, as in the incident. Mitigation: the first close is the one the gate now refuses, so the premature `done` no longer happens through `close`.

### D-003: the research accept passes the gate
**Decision:** For `lane: research`, close also passes when `next` returns `approve_phase` with actor `user`, because the user's `[a] accept` at that gate is the decision to close (`core/skills/researching/SKILL.md`, `steps/20-deep.md`). No hook routes a verdict between `REPORT WRITTEN` and the accept, so the race this order fixes does not exist in that lane. A research item without `research.md` (`write_artifact`) is refused. Giving up: one lane-specific branch in `close.mjs`.
**Instead of:** an accept marker that `next` turns into `close`: it needs a new marker, a `route` effect for research, and skill edits, three files and a second phase for the same outcome.

### D-004: no --force flag
**Decision:** close gets no `--force`. The existing `picket set <id> status=done` already moves an item to done without the gate, and D-002 lets the following close commit it, so the override exists, takes two explicit commands, and shows in `set` output. Giving up: a one-command override.
**Instead of:** `--force` on close: it makes skipping the gate one flag away for the lead, which is the step the incident shows the lead takes too early.

## Scope

**In:** the gate in `core/lib/close.mjs`; the refusal's JSON and `--human` rendering in `core/bin/picket.mjs`; tests in `test/kernel/close.test.mjs`, including moving the existing fixtures to items whose `next` is `close`.
**Out:** changes to `next.mjs`, `route.mjs` or any skill file; a wait or retry inside close for the hook lag (see OQ-002).

## Phase 1: Gate close on next

**Touch set:**
- `core/lib/close.mjs`: add the next() gate
- `core/bin/picket.mjs`: render refusal with next fields
- `test/kernel/close.test.mjs`: fixtures and gate tests
- `core/lib/next.mjs`: read only, gate source
- `core/lib/work.mjs`: read only, `appendVerdict`, `setMarker`

**Changes:** In `close.mjs`, import `next` and apply D-001 to D-003 before `markDone` on both the repo and non-repo paths: abandoned refused (message unchanged), `done` passes, `next.action === "close"` passes, research `approve_phase` by `user` passes, anything else throws `CloseRefused` with a `next` property. In `picket.mjs` `case "close"`, when the caught error has `next`, include it in the JSON and render the human line from D-001. In `close.test.mjs`, `repoWithOpenItem`, the subfolder test and the no-repo test create `lane: "fast"` items, since an order item without `order.md` now refuses; the existing assertions stay as they are. New tests build an order item the way `test/kernel/next.test.mjs` does (`artifact()` writing `order.md` with `## Phase N` headings, `setMarker` for `done` and `approved`, `appendVerdict` with `scope: "cumulative"`).

**Done when:**
- **T-1.1** An order item with every phase approved and no cumulative `APPROVED` verdict: `picket close <id>` exits 2, JSON `next.action` is `review_cumulative` and `next.actor` is `reviewer`, `state.yaml` still says `status: open`, and `HEAD` is unchanged.
- **T-1.2** The same item after `appendVerdict(..., { verdict: "APPROVED", scope: "cumulative" })`: `picket close <id>` exits 0 and `state.yaml` says `status: done`.
- **T-1.3** `picket close <id> --human` on the refused item prints exactly `<id>: not closed · next: review_cumulative · reviewer · all phases approved; one cumulative review remains`.
- **T-1.4** A blocked fast item is refused with exit 2 and `next.action` `resolve_block`; an open fast item closes with exit 0.
- **T-1.5** A research item with `research.md` closes with exit 0; a research item without it is refused with `next.action` `write_artifact`.
- **T-1.6** The existing tests for a second close, an abandoned item, a retry after a refused commit, the subfolder root and the no-repo root pass unchanged in their assertions.
- **T-1.7** `npm test` passes.

## Open questions

- **OQ-001** D-002 keeps `close` working on a `done` item although `next` says `none` there, which departs from the request's literal wording. Owner: user. Fallback: build D-002 as written; refusing `done` items would strand a refused commit with no verb to finish it.
- **OQ-002** When the reviewer's `APPROVED` arrives before the hook routes it, the lead's close is now refused with `review_cumulative · reviewer`, and a lead reading that literally could spawn another review. Should the ordering and designing closing steps say to rerun `picket next` once in that case? Owner: lead. Fallback: no skill change in this order; the refusal line shows the pending action, and the lead reruns `picket next` before acting on it.

## Revision log
