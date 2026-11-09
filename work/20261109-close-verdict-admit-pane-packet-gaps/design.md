---
kind: design
lane: design
title: Close verdict, admit, pane, packet gaps
date: 2026-11-09
audience: developer
sources: [request, preflight, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/shared/transcript/turn.mts, src/lib/shared/transcript/agent.mts, src/lib/shared/agent-name.mts, src/lib/shared/verdicts.mjs, test/hooks/guard.block.test.mjs, dist/hooks/hooks.json, .picket/state/ledger.jsonl, work/20261109-stop-admit-misrouting-on-incidental-keywords/verdicts.jsonl, src/lib/shared/admission/signals.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/shared/admission/admit-labelled.test.mts, bench/test/tasks.test.mjs, src/mods/status/hooks/work-pane.ts, src/mods/status/hooks/work-pane.test.ts, src/mods/status/hooks/session-files.ts, src/lib/shared/live-session.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs, src/lib/verbs/check/index.mts, src/lib/shared/checks.mts, src/lib/shared/drive-log.mts, src/lib/shared/paths.mts, src/lib/shared/context.mts]
phases:
  - n: 1
    files: [src/lib/shared/agent-name.mts, src/lib/shared/agent-name.test.mts, src/lib/shared/transcript/turn.mts, src/lib/hooks/guard/block/index.mts, test/hooks/guard.block.test.mjs, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts]
    greps:
      - path: src/lib/shared/agent-name.mts
        pattern: "export function picketRole\\("
      - path: src/lib/shared/transcript/turn.mts
        pattern: "export function stopText\\("
      - path: src/lib/hooks/guard/block/index.mts
        pattern: "stopText\\("
      - path: src/lib/hooks/guard/block/index.mts
        pattern: "picketRole\\("
      - path: src/lib/hooks/guard/block/index.mts
        pattern: "startsWith\\(PICKET_AGENT\\)"
        absent: true
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: "stopText\\("
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: "picketRole\\("
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: "const REVIEWING_SKILL = new URL\\("
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: "REVIEWING_SKILL =new URL"
        absent: true
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/admit-labelled.test.json]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: "const CHANGE_VERBS = \"[^\"]*\\bcreate\\b"
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: "See if we can drop table legacy_users safely\\."
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: "Check whether the CSV export works and create a test for it\\."
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: "Verify whether the migration backfill ran on all rows\\."
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/mods/status/hooks/work-pane.ts, src/mods/status/hooks/work-pane.test.ts]
    greps:
      - path: src/mods/status/hooks/work-pane.ts
        pattern: "\\.isLive\\b"
    tests: true
    drive: false
    security: false
  - n: 4
    files: [src/lib/shared/paths.mts, src/lib/shared/check-log.mts, src/lib/shared/check-log.test.mts, src/lib/verbs/check/index.mts, src/lib/verbs/check/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/paths.mts
        pattern: "checkLog: \"check-log\\.jsonl\""
      - path: src/lib/shared/check-log.mts
        pattern: "export function appendCheckRow\\("
      - path: src/lib/shared/check-log.mts
        pattern: "export function latestCheck\\("
      - path: src/lib/verbs/check/index.mts
        pattern: "appendCheckRow\\("
      - path: src/lib/verbs/packet/packet.mjs
        pattern: "latestCheck\\("
    tests: true
    drive: true
    security: false
---
# Design: Close verdict, admit, pane, packet gaps

## Problem

Today's three work items exposed five gaps. Two teammate stops ended without a routable verdict and nothing bounced them: both replay silent through `dist/hooks/guard.block.mjs` on base 9cf11a4, and `route.verdict` routes nothing, so the lead found them by hand (`work/20261109-stop-admit-misrouting-on-incidental-keywords/verdicts.jsonl`, ledger rows at 10:59:33 and 11:07:34). `picket admit` sends "Check whether the CSV export works and create a test for it." and "See if we can drop table legacy_users safely." to research, where they answered order and design before commit ec3fc98. The status pane's Cleanup tab can list a live session, and the gate packet prints "not reported" for tests and lint whenever the block lacks those lines, although `picket check` ran. The binding constraints: `route` stays the only state mutator, a hook bounces a stop at most once (`stop_hook_active`), and the 142 labelled admit entries and 18 bench prompts keep their answers.

## Decisions

### D-001: Both Stop hooks judge the same turn text
**Decision:** A new `stopText(data)` in `src/lib/shared/transcript/turn.mts` returns the text a stop is judged on, in `route.verdict`'s current order: `last_assistant_message` when it carries a block heading, otherwise `readTurn(data, { includeToolPayloads: true }).text`. `route.verdict` and `guard.block` both call it. The cumulative incident happened because the two hooks read different texts: `guard.block` took the reviewer's earlier SendMessage body, a block ending in `APPROVED`, while `route.verdict` took the final message, the same block followed by a sentence about a saved memory. After this change, whatever `route.verdict` will reject is what `guard.block` checks, so a stop the kernel cannot route is bounced. Infrastructural decision.
**Instead of:** `route.verdict` bouncing a stop it cannot route itself: two hooks would then emit stop decisions, and a `SubagentStop` `additionalContext` already continues the subagent, so routing and validation would tangle in one hook.
**Risks:**
- **RISK-001** A teammate whose final message repeats a heading but whose valid block went only through SendMessage is now bounced, where before `guard.block` passed it. Mitigation: `route.verdict` already ignored that SendMessage block in this case, so the bounce reports a stop the kernel was dropping; the re-emitted block routes on the continued stop.

### D-002: A picket agent is known by its role, not by the `picket:` prefix
**Decision:** `picketRole(type)` in `src/lib/shared/agent-name.mts` returns `"analyst" | "architect" | "developer" | "reviewer"` when `bareAgentName(type)` is one of them, else `null`. `guard.block` treats a `SubagentStop` as a picket agent's turn when `picketRole(event.agent_type)` is not null, and `route.verdict`'s continued developer check uses `picketRole(...) === "developer"`. The crosscheck replay is silent with `agent_type: "bfoi-reviewer"` and bounces with `"picket:reviewer"`, so the `startsWith("picket:")` test is what let the first incident through. Commit 50e613e already resolves teammate instance names to roles for `route`. Infrastructural decision.
**Instead of:** reading the agent's `customAgentType` from the subagent's `.meta.json` file: it names `picket:reviewer` exactly, but the hook payload does not carry it, and a second file read joins the stop path.
**Risks:**
- **RISK-002** A user's own agent named like `code-reviewer` resolves to `reviewer` and gets one bounce when it ends without a block. Mitigation: the bounce happens once per stop (`stop_hook_active`), and its text says to reply in one line when no block applies.

### D-003: The bounce names the tokens the agent is expected to end with
**Decision:** `guard.block` names the expected tokens in both bounce reasons (a missing block and a wrong last line): the `VERDICTS` keys in `src/lib/shared/verdicts.mjs` whose `agent` is the role, narrowed for a reviewer by scope (crosscheck: `ALIGNED` or `DRIFT DETECTED`; any other scope: `APPROVED` or `CHANGES REQUIRED`). The scope comes from the block heading, else from `latestHints(agentTranscript(event)).scope`, which reads `crosscheck` and `cumulative` from the two incident transcripts. With no role (the lead's `Stop`), the reason lists every token as today. Infrastructural decision.
**Instead of:** one fixed message for every agent: the agent would still have to work out which of nine tokens applies, which is how both incidents ended on the wrong line.

### D-004: `create` is a change verb, and a review-only request naming a heavy step keeps the heavy lane
**Decision:** `CHANGE_VERBS` in `src/lib/shared/admission/signals.mts` gains `create`. `asksOnlyToReview` returns false when the text names an irreversible step (`IRREVERSIBLE`) or migration work (`isMigration`), so such a request falls through to `heavyReasons` and answers design, as it did at c05c79d. A scratch probe over the 142 corpus entries and the 18 bench prompts found no answer changed; the three request examples move to order, design and design, and "Check whether the CSV export works." and "Explain how the migration backfill works." stay research.
**Instead of:** moving the research branch of `laneOf` after `heavyReasons`: it would also send "Explain how the migration backfill works." to design, which answered research before ec3fc98 too.
**Risks:**
- **RISK-003** `CHANGE_VERB` (the diagnosis check) shares the list, so "find out why X fails and create Y" is no longer a diagnosis. Mitigation: that request asks for a change; the corpus answers are unchanged.

### D-005: The Cleanup tab leaves out a session whose `isLive` is true
**Decision:** `cleanupOf` in `src/mods/status/hooks/work-pane.ts` keeps its age and item filters and also drops an entry with `isLive` set. `listSessions` in `src/mods/status/hooks/session-files.ts` already sets `isLive` from the session registry through the shared `isProjectSession` rule, so `cleanupOf` stays a pure function of its inputs.
**Instead of:** reusing `isDeletable` from `session-files.ts`: it also requires a UUID id, which the cleanup tests' `s1` fixtures fail, and it mixes the deletion guard into a listing rule.

### D-006: `picket check` logs its result per work item and phase, and the packet falls back to it
**Decision:** `picket check` appends one row to a new state file `.picket/state/check-log.jsonl` (`STATE_FILES.checkLog`) when `driveTarget(root, { session })` finds a current item: `{ ts, session, work_id, phase, checkout, ok, steps: [{ name, status }] }`. A new `src/lib/shared/check-log.mts` owns `appendCheckRow` and `latestCheck(root, id, phase)`. The packet's tests and lint lines keep the block's `Tests:` and `Lint:` values; when one is missing, they show the newest logged row's step status for that item and phase as `<status> (picket check)`, and "not reported" only when no row has the step. Infrastructural decision.
**Instead of:** extending `drive-log.jsonl` rows with step results: `picket verify` reads those rows as drive evidence, and a check row in that file would invite a verify regression.
**Risks:**
- **RISK-004** The newest logged check can predate the phase's last edit, so the packet shows "passed" for code that changed after it. Mitigation: the label names `picket check` as the source, and the developer contract runs `picket check` until `CHECK OK` after every change.
- **RISK-005** `driveTarget` picks the most recently active item when several open items share a session, so a row can land on the wrong item. Mitigation: `picket drive` uses the same rule; the packet then shows "not reported", today's behaviour.

## Scope

**In:**
- `guard.block` and `route.verdict`: one stop text, role-based agent detection, bounces naming the expected tokens.
- The whitespace slip at `src/lib/hooks/route/verdict/index.test.mts:453`.
- `picket admit`: `create` as a change verb, heavy signals over the review-only research rule, three corpus entries.
- `cleanupOf` leaving out live sessions.
- `picket check` logging per item and phase, and the packet's tests and lint fallback.

**Out:**
- R-016 close order, R-017 wall time, worktrees outside `.worktrees/`, the bench run.
- Admit reading quoted examples and the word token as heavy signals; the `Drop the column` corpus miss.
- Developer agent habits, such as always writing `Tests:` and `Lint:` lines.
- `emit.ledger`'s own verdict reading, which keeps `readTurn`.
- A second bounce after a continued stop that still ends without a verdict (OQ-001).

## Phase 1: A stop the kernel cannot route is bounced, naming the token

**Touch set:**
- `src/lib/shared/agent-name.mts`: add `picketRole`
- `src/lib/shared/agent-name.test.mts`: pin `picketRole`
- `src/lib/shared/transcript/turn.mts`: add `stopText`
- `src/lib/shared/transcript/agent.mts`: read only, `agentTranscript`
- `src/lib/shared/transcript/entries.mts`: read only, `latestHints`
- `src/lib/shared/verdicts.mjs`: read only, tokens by agent
- `src/lib/hooks/guard/block/index.mts`: stop text, role, tokens
- `test/hooks/guard.block.test.mjs`: bounce tests
- `src/lib/hooks/route/verdict/index.mts`: use `stopText`, `picketRole`
- `src/lib/hooks/route/verdict/index.test.mts`: idle test, line 453

**Changes:**
- `agent-name.mts`: `export type AgentRole = "analyst" | "architect" | "developer" | "reviewer"` and `export function picketRole(type: unknown): AgentRole | null`, built on `bareAgentName` (D-002).
- `turn.mts`: `export function stopText(data: HookData): string` with the order of D-001. `route.verdict`'s local `payloadBlockText` and `turnText` go; its `routeTurn` calls `stopText(event)` and keeps `newestBlock`.
- `guard.block`: its `turnText` calls `stopText` inside the existing try, returning `""` on a throw. `isPicketAgentTurn` uses `picketRole`; `PICKET_AGENT` goes. Both bounce reasons name the expected tokens (D-003); the last-line reason still quotes the line it found.
- `route.verdict`: `isContinuedDeveloperStop` uses `picketRole(event.agent_type) === "developer"`; `DEVELOPER_TYPE` goes when nothing else reads it.
- `index.test.mts:453`: `const REVIEWING_SKILL =new URL(` becomes `const REVIEWING_SKILL = new URL(`.
- Drive: copy the first 89 lines of `~/.claude/projects/-mnt-work-development-github-picket/e9bcd41a-c78b-4202-960e-a3835d811df4/subagents/agent-abfoi-cumulative-reviewer-364913cf5a1df20c.jsonl` and the first 55 lines of `agent-abfoi-reviewer-6016c62a19eae3b5.jsonl` in the same folder into the scratchpad. Each ends at the incident stop. Build a `SubagentStop` payload for each with `agent_type` `bfoi-cumulative-reviewer` or `bfoi-reviewer`, `transcript_path` and `agent_transcript_path` set to the copy, `stop_hook_active: false`, and `last_assistant_message` set to the copy's last assistant text. Pipe each into `node dist/hooks/guard.block.mjs` with `CLAUDE_PROJECT_DIR` set to the scratchpad. Before-image, captured 2026-11-09 on base 9cf11a4 with the dist built at 13:42: both print nothing and exit 0.

**Done when:**
- **T-1.1** `guard.block` bounces a `SubagentStop` whose turn holds no block and no verdict, for `agent_type` `bfoi-reviewer` and for `picket:reviewer`, when the transcript's work line carries `scope: crosscheck`; the reason names `ALIGNED` and `DRIFT DETECTED`. A test pins both agent types.
- **T-1.2** `guard.block` bounces a stop whose `last_assistant_message` is a cumulative review block followed by a sentence after `APPROVED`, while a SendMessage earlier in the turn carried the same block ending in `APPROVED`; the reason names `APPROVED` and `CHANGES REQUIRED`. A test pins it.
- **T-1.3** These stops still pass `guard.block`, each pinned by a test: an `Explore` agent's stop without a block, the lead's `Stop` without a block, any continued stop (`stop_hook_active: true`), and a picket agent's stop ending on its token.
- **T-1.4** A continued developer stop with `agent_type` `bfoi-developer` that routes nothing, while the run grant hands it phase 3, writes `phases/3.idle`, as the existing `picket:developer` test does. A test pins it.
- **T-1.5** `src/lib/hooks/route/verdict/index.test.mts` line 453 reads `const REVIEWING_SKILL = new URL(`.
- **T-1.6** After `npm run build`, the drive above prints a `{"decision":"block",…}` line for each payload: the cumulative reason names `APPROVED`, the crosscheck reason names `ALIGNED`.
- **T-1.7** `npm test` passes.

## Phase 2: Admit keeps create requests and heavy review requests out of research

**Touch set:**
- `src/lib/shared/admission/signals.mts`: `CHANGE_VERBS`, `asksOnlyToReview`
- `src/lib/shared/admission/signals.test.mts`: pin the five requests
- `src/lib/shared/admission/admit-labelled.test.json`: three new entries
- `src/lib/shared/admission/lane.mts`: read only, heavy reasons
- `src/lib/shared/admission/admit-labelled.test.mts`: read only, corpus rules
- `bench/test/tasks.test.mjs`: read only, bench prompt lanes

**Changes:**
- `signals.mts`: `create` joins `CHANGE_VERBS`. `asksOnlyToReview(text)` also requires `!IRREVERSIBLE.test(text) && !isMigration(text)` (D-004). No other regex changes.
- `signals.test.mts`: the five requests below, each through `signalsOf` and `laneOf` as the corpus test calls them.
- `admit-labelled.test.json`: append three entries with a `why`: "Check whether the CSV export works and create a test for it." (order), "See if we can drop table legacy_users safely." (design), "Verify whether the migration backfill ran on all rows." (design).
- Before-image, captured 2026-11-09 on base 9cf11a4: `dist/bin/picket admit --human --text "<request>"` prints `lane: research` for all three. On the 142 corpus entries, base agrees with 135 labels. These are its 7 misses, label first:
  - order to fast: "Split `src/http/handlers.ts` into one file per resource…"
  - design to order: "Add role permissions: only an admin may delete an invoice."
  - design to fast: "lane: fast. Read the API key from `src/auth/keys.ts`…"
  - design to order: "Drop the column `legacyId` from every stored invoice."
  - design to order: "Add OAuth sign-in through the company identity provider…"
  - research to design: "How do the tests set up the invoices repository…"
  - fast to research: "src/lib/verbs/mutate/index.mts:68 still uses `state.base ?? "HEAD"`…"

**Done when:**
- **T-2.1** "Check whether the CSV export works and create a test for it." answers `order`, pinned in `signals.test.mts` and by its corpus entry.
- **T-2.2** "See if we can drop table legacy_users safely." answers `design` with the reason "an irreversible step", pinned in `signals.test.mts` and by its corpus entry.
- **T-2.3** "Verify whether the migration backfill ran on all rows." answers `design` with the reason "schema or data migration work", pinned in `signals.test.mts` and by its corpus entry.
- **T-2.4** "Check whether the CSV export works." and "Explain how the migration backfill works." still answer `research`, pinned in `signals.test.mts`.
- **T-2.5** The corpus holds 145 entries. Admit agrees with 138 of them: the 135 the base agreed with, plus the three new ones. Its misses are exactly the 7 listed above, shown by a one-off run of the corpus test's `admitted` function at the head.
- **T-2.6** After `npm run build`, the before-image commands print `lane: order`, `lane: design` and `lane: design`.
- **T-2.7** `npm test` passes, `bench/test/tasks.test.mjs` included, so all 18 bench prompts keep their lanes.

## Phase 3: The Cleanup tab leaves out live sessions

**Touch set:**
- `src/mods/status/hooks/work-pane.ts`: `cleanupOf` session filter
- `src/mods/status/hooks/work-pane.test.ts`: live-session test
- `src/mods/status/hooks/session-files.ts`: read only, sets `isLive`
- `src/lib/shared/live-session.mts`: read only, `isProjectSession`
- `src/mods/types/index.d.ts`: read only, `SessionEntry`

**Changes:**
- `cleanupOf`: the `sessions` filter also drops an entry whose `isLive` is true (D-005). The age rule (`CLEANUP_AGE_DAYS`), the item rule and the `worktrees` list stay as they are.
- `work-pane.test.ts`: a fixture entry with `isLive: true`. The `entry` helper may gain an optional `isLive` argument; the existing tests keep `isLive: false`.

**Done when:**
- **T-3.1** `cleanupOf` leaves out a session 15 days old that no item lists when its `isLive` is true, and lists the same entry when `isLive` is false. A test pins both.
- **T-3.2** The three existing `cleanup sessions (T-5.2)` tests and the worktree cleanup tests pass unchanged.
- **T-3.3** `npm test` passes, the mods step included.
- **T-3.4** [DEFERRED: QA, the release QA pass] With a second Claude Code session open in the project whose transcript was last written more than 14 days ago, the status pane's Cleanup tab does not list it.

## Phase 4: The gate packet shows the logged check when the block names none

**Touch set:**
- `src/lib/shared/paths.mts`: add `STATE_FILES.checkLog`
- `src/lib/shared/check-log.mts`: new, row writer and reader
- `src/lib/shared/check-log.test.mts`: new, reader tests
- `src/lib/shared/drive-log.mts`: read only, `driveTarget` pattern
- `src/lib/shared/checks.mts`: read only, `StepName`, `StepStatus`
- `src/lib/verbs/check/index.mts`: append the row
- `src/lib/verbs/check/index.test.mts`: row tests
- `src/lib/verbs/packet/packet.mjs`: tests and lint fallback
- `test/kernel/packet.test.mjs`: fallback tests

**Changes:**
- `paths.mts`: `checkLog: "check-log.jsonl"` in `STATE_FILES`.
- `check-log.mts`: `export type CheckRow = { ts: string; session: string | null; work_id: string; phase: number | null; checkout: string; ok: boolean; steps: { name: StepName; status: StepStatus }[] }`; `appendCheckRow(root, row)` over `appendJsonl`; `latestCheck(root, id, phase): CheckRow | null`, the newest row with that `work_id` and `phase`, skipping malformed lines through `readJsonl`.
- `check/index.mts`: `runChecks` reads `session` and `now` from the context. After the steps run, it calls `driveTarget(root, { session })` and appends one row when `work_id` is not null (D-006). The report, its rendering and the exit code stay as they are.
- `packet.mjs`: the tests line is `blockField(b, "Tests")`, else the logged `test` step as `<status> (picket check)`, else "not reported"; the lint line is the same with `Lint` and `lint`.
- Drive: build a scratch replay of `work/20261109-close-the-cumulative-amendment-loop` up to its phase 1 `PHASE DONE` (the record, `phases/1.done`, `phases/1.block.md`, `state.yaml` with `status: open`, and the verdict rows up to that `PHASE DONE`), plus a `package.json` whose `test` script is `node -e 0`. Its saved block has no `Tests:` or `Lint:` line. Before-image on base 9cf11a4: `CLAUDE_PROJECT_DIR=<scratch> picket packet <id>` prints `tests     not reported` and `lint      not reported`.

**Done when:**
- **T-4.1** `runChecks` with a current item at phase 2 appends one row to `.picket/state/check-log.jsonl` holding the item id, phase 2, `ok`, the checkout and each run step's name and status. A test in a temporary repository pins it.
- **T-4.2** `runChecks` with no open item appends no row, and its report equals the report the same run gave before this phase. A test pins it.
- **T-4.3** `latestCheck` returns the newest row for the asked item and phase, ignores rows of another item or phase, and returns null for a missing or malformed log. A test pins it.
- **T-4.4** A gate packet whose block has no `Tests:` or `Lint:` line, with a logged row for that phase holding test passed and lint none detected, shows `tests     passed (picket check)` and `lint      none detected (picket check)`. A test pins it.
- **T-4.5** A block's own `Tests:` and `Lint:` values win over a logged row, and with no row for the phase both lines read "not reported". A test pins it; the existing packet tests pass unchanged.
- **T-4.6** After `npm run build`, in the drive scratch, `CLAUDE_CODE_SESSION_ID=<the item's session> picket check` and then `picket packet <id>` print `tests     passed (picket check)`.
- **T-4.7** `npm test` passes.

## Open questions

- **OQ-001** A teammate bounced once that stops again without a verdict is not bounced a second time (`guard.block` skips continued stops), so the lane waits as before. Should the kernel tell the lead then, for example through `notify.user`? Owner: the product owner. Fallback: no change; the bounce row in `.picket/state/ledger.jsonl` and the lead's own check after the idle notification remain the signs.
- **OQ-002** The incidents show `agent_type` behaving as the teammate's instance name (`bfoi-reviewer`), but no captured hook payload shows the field itself. Owner: the developer of phase 1. Fallback: `picketRole` accepts both `picket:reviewer` and instance names, and T-1.1 pins both, so no criterion rests on either form.

## Revision log
