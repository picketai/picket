---
kind: design
lane: design
title: Kernel groundwork for agents and skills
date: 2026-10-29
audience: developer
sources: [request.md, artifacts/refactor/11-kernel-groundwork.md, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-view.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/files.mts, src/lib/shared/work/block.mts, src/lib/shared/views.mts, src/lib/shared/review-summary.mts, src/lib/shared/action.mts, src/lib/shared/agent-name.mts, src/lib/shared/context.mts, src/lib/verbs/next/index.mts, src/lib/verbs/packet/index.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/summary/index.mts, src/lib/verbs/preflight/index.mts, src/lib/verbs/route/index.mts, src/lib/verbs/route/apply.mts, src/lib/verbs/route/plan.mts, src/lib/verbs/set/index.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/main.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/inject/state/index.mts, src/lib/hooks/hook-spec.mts, src/lib/shared/transcript/turn.mts, src/mods/status/hooks/band.ts, src/mods/status/types/index.d.ts, scripts/build.mjs, src/skills/reviewing/SKILL.md, src/skills/shared/procedures/gate.md, src/skills/shared/procedures/cumulative-review.md, src/skills/shared/procedures/amend.md, src/skills/designing/SKILL.md, src/skills/designing/steps/20-crosscheck.md, test/hooks/guard.block.test.mjs]
phases:
  - n: 1
    files: [src/lib/shared/work/action-text.mts, src/lib/shared/work/action-text.test.mts, src/lib/shared/work/next-step.mts, src/mods/status/hooks/band.ts, src/mods/status/hooks/band.test.ts, src/lib/hooks/inject/state/index.mts, src/lib/hooks/inject/state/index.test.mts, scripts/build.mjs]
    greps:
      - path: src/lib/shared/work/action-text.mts
        pattern: 'export const ACTION_TEXT\b'
      - path: src/lib/shared/work/action-text.mts
        pattern: 'export const NEXT_ACTIONS\b'
      - path: src/lib/shared/work/action-text.mts
        pattern: '^(?![\s\S]*\bimport\b)'
        flags: i
      - path: src/lib/shared/work/next-step.mts
        pattern: 'from "\./action-text\.mts"'
      - path: src/mods/status/hooks/band.ts
        pattern: 'ACTION_TEXT'
      - path: src/lib/hooks/inject/state/index.mts
        pattern: 'ACTION_TEXT'
      - path: scripts/build.mjs
        pattern: 'action-text\.mts'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/work/verdict-log.mts, src/lib/shared/work/verdict-log.test.mts, src/lib/shared/views.mts, src/lib/verbs/route/plan.mts, src/lib/verbs/route/index.mts, src/lib/verbs/route/index.test.mts, src/lib/shared/work/reviews.mts, src/lib/shared/work/reviews.test.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts]
    greps:
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'session\?: string'
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'amend\?: string'
      - path: src/lib/verbs/route/plan.mts
        pattern: 'amend\?: string'
      - path: src/lib/shared/work/reviews.mts
        pattern: 'export function saveReview\b'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'saveReview\('
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/review-checklists.mts, src/lib/shared/review-checklists.test.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/summary/index.test.mts, src/lib/shared/work/files.mts, src/lib/shared/work/files.test.mts, src/lib/verbs/preflight/index.mts, src/lib/verbs/preflight/index.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/review-checklists.mts
        pattern: 'export function reviewChecklists\b'
      - path: src/lib/shared/review-checklists.mts
        pattern: '60-crosscheck\.md'
      - path: src/lib/verbs/summary/index.mts
        pattern: '"save"'
      - path: src/lib/verbs/summary/index.mts
        pattern: '"scope"'
      - path: src/lib/shared/work/files.mts
        pattern: '"summary\.json"'
      - path: src/lib/shared/work/files.mts
        pattern: '"preflight\.txt"'
      - path: src/lib/verbs.mts
        pattern: 'summary: \{ summary: "[^"]*", readOnly: true \}'
      - path: src/lib/verbs.mts
        pattern: 'preflight: \{ summary: "[^"]*", readOnly: true \}'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/work/action-text.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/mods/status/hooks/band.test.ts]
    greps:
      - path: src/lib/shared/work/action-text.mts
        pattern: '"fix_findings", "amend"'
      - path: src/lib/shared/work/next-step.mts
        pattern: 'action: "fix_findings"'
      - path: src/lib/shared/work/next-step.mts
        pattern: 'action: "amend"'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/lib/shared/views.mts, src/lib/shared/work/next-view.mts, src/lib/shared/work/next-view.test.mts, src/lib/verbs/next/index.mts, src/lib/verbs/next/index.test.mts, src/lib/verbs/route/index.mts]
    greps:
      - path: src/lib/shared/work/send.mts
        pattern: 'export function sendsFor\b'
      - path: src/lib/shared/work/send.mts
        pattern: 'You are reviewing a change you did not write\. You have no context beyond what is below\.'
      - path: src/lib/shared/views.mts
        pattern: 'send: SendView\[\]'
      - path: src/lib/shared/work/next-view.mts
        pattern: 'sendsFor\('
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/work/replies.mts, src/lib/shared/work/replies.test.mts, src/lib/shared/work/files.mts, src/lib/shared/work/files.test.mts, src/lib/shared/work/snapshot.mts, test/support/snapshot.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts]
    greps:
      - path: src/lib/shared/work/replies.mts
        pattern: 'export function appendReply\b'
      - path: src/lib/shared/work/files.mts
        pattern: '"replies\.jsonl"'
      - path: src/lib/shared/work/send.mts
        pattern: 'developerName'
    tests: true
    drive: true
    security: false
  - n: 7
    files: [src/lib/verbs/reply/index.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.test.mts, src/lib/shared/work/block.mts, src/lib/shared/work/block.test.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts, src/lib/hooks/guard/bash/payloads.test.mts, docs/reference/cli.md, src/lib/shared/route/route.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/plan.test.mts, src/lib/verbs/route/, src/lib/verbs/route/index.mts, src/lib/shared/work/send.mts, src/lib/verbs/next/index.mts]
    greps:
      - path: src/lib/shared/route/route.mts
        pattern: 'export function route\b'
      - path: src/lib/verbs/route/index.mts
        pattern: 'from "\.\./\.\./shared/route/route\.mts"'
      - path: src/lib/verbs/reply/index.mts
        pattern: 'shared/route/route\.mts'
      - path: src/lib/verbs/reply/index.mts
        pattern: '^(?![\s\S]*verbs/route/)'
        flags: i
      - path: src/lib/shared/work/send.mts
        pattern: 'export function renderSends\b'
      - path: src/lib/verbs.mts
        pattern: 'reply: \{ summary: "apply the user.s reply at a gate", readOnly: false, leadOnly: true \}'
      - path: src/lib/cli/registry.mts
        pattern: 'reply: \(\) => import\("\.\./verbs/reply/index\.mts"\)'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function commentProposal\b'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function waiverProposal\b'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '^(?![\s\S]*const COMMENT_SEPARATOR)'
        flags: i
      - path: docs/reference/cli.md
        pattern: '^## picket reply\b'
    tests: true
    drive: true
    security: true
  - n: 8
    files: [src/lib/verbs/packet/index.mts, src/lib/verbs/packet/index.test.mts, src/lib/hooks/guard/block/index.mts, test/hooks/guard.block.test.mjs, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/verbs/preflight/index.mts, src/lib/verbs/preflight/index.test.mts]
    greps:
      - path: src/lib/verbs/packet/index.mts
        pattern: '```text'
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'ended without your block'
      - path: src/lib/verbs/preflight/index.mts
        pattern: 'preflight_file'
    tests: true
    drive: true
    security: false
---
# Design: Kernel groundwork for agents and skills

## Problem

The approved draft `artifacts/refactor/11-kernel-groundwork.md` (2026-10-29) is the specification. Its Target, decisions D-1 to D-6, Migration order and the answered OQ-1 (a fresh developer after a stall is `developer-<n>`, numbered by the count of stall replies, `developer-2` first) carry over as given. Phase 8 implements draft Target items 3 (the packet fence) and 6 (the `guard.block` bounce on a `picket:` agent turn with no heading, no verdict token and `stop_hook_active` unset) as the draft states them, so no decision below covers it. The decisions below are the ones that checking the draft against trunk at `576f2cc` forced. Five premises shape them. The status mod can import only the files `MOD_LIB_SHARED` copies (`scripts/build.mjs:21`). A user rejection leaves `approve_phase` as the next action (`route/plan.mts:72`). The `AMENDMENT NEEDED` line of a `CHANGES REQUIRED` review is lost after routing (`route/index.mts:32-35` writes no reason). Nothing records a stall reply, so OQ-1 cannot be counted. A `SubagentStop` payload carries `agent_type` and the lead's `session_id` (`hook-spec.mts:5`, memory `session-identity-facts`). The binding constraint: no agent, skill, rule or CLAUDE.md text changes, and every phase leaves `npm test` green.

## Decisions

### D-001: One self-contained action text module, with a voice
**Decision:** Infrastructural decision. `src/lib/shared/work/action-text.mts` imports nothing. It holds `NEXT_ACTIONS` (moved from `next-step.mts`, which re-exports it), `type NextAction`, `type Voice = "user" | "observer"`, `type ActionStep = { actor: string | null; phase: number | null; lane: string; detail: string }` and `ACTION_TEXT: Readonly<Record<NextAction, (step: ActionStep, voice: Voice) => string>>`. It joins `MOD_LIB_SHARED`, so the build copies it to `dist/mods/status/shared/work/action-text.ts` and `LIB_SHARED_IMPORT` rewrites the band's import. The voice argument keeps both forms the band shows today in one place: "you approve phase 1" in the user's own session, "waits for approval of phase 1" in another session and in `inject/state`. The draft's `(step) => string` gains this second parameter.
**Instead of:** keeping `NEXT_ACTIONS` in `next-step.mts` and importing the type from there: `next-step.mts` imports `gate`, `snapshot` and `state`, none of which the mod build copies, so the built status mod would fail to load.
**Risks:**
- **RISK-001** A later edit adds an import to `action-text.mts` and breaks the built mod. Mitigation: a phase 1 grep asserts the file has no `import`, and `test/repo/mods.test.mjs` checks every `MOD_LIB_SHARED` file lands in each mod.

### D-002 (r2): Verdict rows carry the amendment line; amend outranks a plain block
**Decision:** `VerdictRow` gains `session?: string` (the draft) and `amend?: string`, the reviewer's `AMENDMENT NEEDED: …` line. `RouteInput` gains `amend`, and the verdict hook passes it next to today's `reason`, only when the block's agent is `reviewer`. An architect's `AMENDED` block that quotes the line would otherwise become the latest `amend` row with no `AMENDED` after it, and `next` would say `amend` again after every amendment. `nextStep` returns `amend` when the latest row carrying `amend` has no later `AMENDED` row. That holds when the item is open, and also when it is blocked without a stall. A stalled item (three drifts, three amendments, or `PHASE STALLED`) still goes to the user with `STALL_OPTIONS`. This puts the `designing/SKILL.md:37` row ("`resolve_block` after `DRIFT DETECTED` or `AMENDMENT NEEDED`, when its options offer no redesign → amend") into code. Both fields are optional, so rows written before this change still read.
**Instead of:** having `next` read the line back out of `reviews/<scope>.md`: the snapshot would then parse block text on every `next`, `state` and status line call.
**Risks:**
- **RISK-002** A reviewer writes the amendment line in a form the hook's `^AMENDMENT NEEDED:.*$` match misses, so no `amend` action follows. Mitigation: that match is unchanged from today, so the risk is no worse than now; the phase 2 hook test pins the line form.

### D-003: Gate replies are logged in work/<id>/replies.jsonl
**Decision:** The reply log is an append-only record of the user's gate decisions. It is a new work file (`replies.jsonl`, one `ReplyRow = { ts; session?; action; phase: number | null; reply: string; fresh?: true }` per applied reply), written only by `picket reply` and read by `readSnapshot` into `snap.replies`. `fresh: true` marks a `c` reply to `[c] continue with a fresh developer`. Two rules read the log. The developer instance is `developer` until the first fresh reply and then `developer-<1 + fresh count>` (OQ-1). A fresh reply later than the latest cumulative rejection turns `resolve_rejections` into `fix_findings`, which today's `rejectionsStep` (`next-step.mts:41-46`) would otherwise repeat forever.
**Instead of:** new lowercase user verdicts such as `continued` in `VERDICTS`: `findVerdict` matches every key at the start of a turn's last line (`verdicts.mjs:15`), so a lead turn ending "continued with phase 2" would route as a verdict.

### D-004: A reply that carries content builds its own send
**Decision:** `picket reply` returns `next`'s send list, except for the four replies whose message carries text the kernel holds only at that moment. For those it builds the send itself: `x <why>` (developer, `rejected: <why>`), `k <n>` (developer, `comment approved: <path>:<line> "<text>"`), `w <n>` (developer, `waiver approved: …`) and design-lane `d` (architect, `amend: <the blocked reason before the reply>`). `nextStep` keeps saying `approve_phase` after a rejection, as it does today.
**Instead of:** making a user rejection move `next` back to `implement_phase` with the reason stored on the row: that changes route effects, the band and the packet during every fix, which is beyond this step.

### D-005 (r2): Spawn or continue is decided per instance from rows
**Decision:** A send uses `SendMessage` when the instance has a verdict row with this session. Rows store the bare agent name, so each instance is matched by agent and scope. `architect` and `analyst` match any row by that agent. `reviewer` matches reviewer rows of scope `crosscheck`, `phase` or `checkpoint`. `cumulative-reviewer` matches reviewer rows of scope `cumulative`. `developer` matches any developer row before the first fresh reply, and `developer-<n>` matches developer rows later than the (n-1)-th fresh reply, which is the latest one while it is the current instance. The session comes from `ctx.session` (`CLAUDE_CODE_SESSION_ID`, `context.mts:12`). With no session, every send is `Agent`.
**Instead of:** storing the instance name on each row: the hook sees only `agent_type` (`picket:reviewer`), never the name the lead gave the instance.
**Risks:**
- **RISK-003** An instance spawned in this session that has not yet returned a verdict reads as not live, so a second `next` call says `Agent` again. Mitigation: the hooks print `next` after each verdict lands, which is the only point the lead acts on; phase 5 tests pin the rule.

### D-006: Checklist selection is a pure function with an explicit scope
**Decision:** `src/lib/shared/review-checklists.mts` exports `reviewChecklists(input, scope)`, where `input` is the size, frameworks, concerns, `security_path` and `extension_steps`, and `scope` is one of `phase`, `checkpoint`, `cumulative`, `crosscheck`. It follows the load table at `src/skills/reviewing/SKILL.md:43-55` through a static map of today's file names (draft D-5). Frameworks and concerns with no file (`react`, `python`) add nothing. `picket summary` takes `--scope`; without it, the verb uses `cumulative` when `next` says `review_cumulative`, `checkpoint` for `review_checkpoint`, and `phase` otherwise. A unit test reads `src/skills/reviewing/checklists/` and fails on a mapped name that is not on disk.
**Instead of:** checking the plugin's skills folder on disk while the verb runs: the kernel would depend on where the plugin is installed, and a renamed file would be skipped silently instead of failing a test.

### D-007 (r2): summary and preflight stay readOnly for the guard
**Decision:** Infrastructural decision. `summary --save` writes `work/<id>/summary.json`. `preflight` writes `work/<id>/preflight.txt`, or removes it when no warn line remains. A failed write or removal never throws: it adds a `warn preflight_file` check to the report, so a read-only work folder still gets its preflight report, as before this item. Both keep `readOnly: true` in `VERB_NAMES`, so `guard.bash` still allows them without a prompt (`kernel.mts:18-23`). The files are derived, kernel-owned and rewritten whole on each run. The cost: "readOnly" now means "writes nothing outside the work item's kernel files" for these two verbs.
**Instead of:** a per-flag class like `verify`'s (`kernel.mts:65`): that adds a second special case to the guard for files that are harmless to rewrite.

### D-008 (r2): reply is a lead-only verb over a shared route service
**Decision:** `reply` enters `VERB_NAMES` with `readOnly: false, leadOnly: true`, like `comment` and `waive`. A spawned agent's `picket reply` is then refused by `leadOnlyRefusal` (`guard/bash/payloads.mts:80`), so no agent can record the user's approval of its own phase. Phase 7 is marked `security: true` because it changes who may record that approval. `reply` applies verdicts through `route()`. The layer rule in `test/repo/conventions.test.mjs:174-189` lets a verb import only its own folder, `shared`, `util` and `mods.mts`, and `route()` lives in `src/lib/verbs/route/index.mts`. Route is a work-item service with three callers (the verb, the verdict hook and now `reply`), so it moves to `src/lib/shared/route/`: `route.mts` takes `route()` and the private helpers it calls, and `apply.mts`, `plan.mts`, `commit.mts` and `plan.test.mts` follow it. `src/lib/verbs/route/index.mts` keeps its parse, render, `routeVerdict` and `verb`, and re-exports `route`, `RouteInput` and `RouteResult`, so the verdict hook and the verb's tests import as before. The rendering of sends moves the same way into `src/lib/shared/work/send.mts` (`renderSends`), for `next` and `reply` to share.
**Instead of:** letting a verb import another verb's `index.mts`, as hooks may: the rule's own test names exactly that import as a violation (`conventions.test.mjs:220`), and relaxing it would open every verb to every other to serve one caller. Separately, `readOnly: false` without `leadOnly`, as `route` has, would let a developer approve its own phase through `reply a`.
**Risks:**
- **RISK-004** Markdown that cites the old module paths fails `test/repo/markdown-paths.test.mjs` once they move. Mitigation: a grep of tracked and untracked Markdown on 2026-10-29 found only four architect memory lines, which now name the modules without paths; Phase 7 greps again before staging.

## Scope

**In:**
- The draft's seven Target items, in its Migration order, as 8 phases.
- `VerdictRow.amend`, the `amend` rule over a non-stall block, and the reply log (D-002, D-003).
- `MOD_LIB_SHARED`, `WORK_FILES`, the guard's lead-only list and the generated `docs/reference/cli.md` where a phase changes them.

**Out:**
- Any change under `src/agents/`, `src/skills/`, `src/rules/`, `src/output-styles/` or `CLAUDE.md`.
- Research gate replies (`p`, `a`, `d`, `x`), which the draft defers until D6 lands; `picket reply` refuses the research lane.
- Routing an `AMENDED` verdict back to `open`; `amend.md` still has the lead run `picket set <id> status=open`.

## Phase 1: Action text map

**Touch set:**
- `src/lib/shared/work/action-text.mts`: new, actions and their text
- `src/lib/shared/work/action-text.test.mts`: new, every action has text
- `src/lib/shared/work/next-step.mts`: re-export `NEXT_ACTIONS`, `NextAction`
- `src/mods/status/hooks/band.ts`: step text from the map
- `src/mods/status/hooks/band.test.ts`: existing strings stay, fallback cases
- `src/lib/hooks/inject/state/index.mts`: `next:` line from the map
- `src/lib/hooks/inject/state/index.test.mts`: expected `next:` lines
- `scripts/build.mjs`: `MOD_LIB_SHARED` gains action-text
- `test/repo/mods.test.mjs`: read only, checks copied shared files
- `src/mods/status/types/index.d.ts`: read only, `Work` carries the step fields

**Changes:**
1. `action-text.mts` per D-001. `NEXT_ACTIONS` keeps today's 10 entries and order. Text, user voice then observer voice where they differ:
   - `resolve_sources`: `you pick source versions` / `waits for source picks`
   - `approve_phase`: `you approve phase <n>` / `waits for approval of phase <n>`
   - `resolve_rejections`: `you decide after repeated rejections` / `waits for a decision after repeated rejections`
   - `resolve_block`: `blocked: <detail>`
   - `write_artifact`: `<actor> writes <lane>.md`
   - `implement_phase`: `developer implements phase <n>`
   - `review_checkpoint`: `reviewer reviews phase <n>`
   - `review_cumulative`: `reviewer reviews all phases`
   - `close`: `lead closes the item`
   - `none`: `<detail>`
   It also exports `isNextAction(value: string): value is NextAction`.
2. `next-step.mts` drops its own `NEXT_ACTIONS` and `NextAction` and re-exports both from `./action-text.mts`.
3. `band.ts`: `agentVerb`, `userAsk` and the user branch of `otherSessionStep` become `ACTION_TEXT[action](work, voice)`, with voice `observer` when `work.other_session === true`. The blocked branches stay. An action string that `isNextAction` rejects shows `work.detail`, as today's `default` does. The `◀`, `⋯` and minutes pieces are unchanged.
4. `inject/state`: `openItemLine` prints `next: <ACTION_TEXT[action](n, "observer")>` in place of `next: <action> by <actor> (phase <n>)`.
5. `scripts/build.mjs`: append `join(LIB_SHARED, "work", "action-text.mts")` to `MOD_LIB_SHARED`.

**Done when:**
- **T-1.1** `action-text.mts` holds no `import`, its `NEXT_ACTIONS` lists the same 10 actions in the same order as `next-step.mts` did at `576f2cc`, and `next-step.mts` imports from `./action-text.mts`.
- **T-1.2** `action-text.test.mts` calls every `ACTION_TEXT` entry in both voices with `{ actor: "developer", phase: 2, lane: "order", detail: "d" }` and gets a non-empty line containing neither `undefined` nor `null`.
- **T-1.3** Every existing assertion in `band.test.ts` passes unchanged; a new case shows an unknown action `frobnicate` renders `work.detail`.
- **T-1.4** `inject/state` prints `next: developer implements phase 2` for an item at `implement_phase` phase 2, and `next: waits for approval of phase 1` for one at `approve_phase` phase 1.
- **T-1.5** After `npm run build`, `dist/mods/status/shared/work/action-text.ts` exists and `dist/mods/status/hooks/band.ts` imports `../shared/work/action-text`.
- **T-1.6** Drive: the built `inject.state` hook, run with a `SessionStart` payload in a scratch project holding one open item, prints the `next:` line of T-1.4.
- **T-1.7** `npm test` passes, its mods step included when `claude` is on PATH.

## Phase 2: Verdict rows gain session and amend; reviews are saved

**Touch set:**
- `src/lib/shared/work/verdict-log.mts`: `VerdictRow` gains two fields
- `src/lib/shared/work/verdict-log.test.mts`: legacy row still reads
- `src/lib/shared/views.mts`: `VerdictView` gains the same fields
- `src/lib/verbs/route/plan.mts`: `RouteInput.amend`
- `src/lib/verbs/route/index.mts`: `verdictRow` writes session, amend
- `src/lib/verbs/route/index.test.mts`: row contents
- `src/lib/shared/work/reviews.mts`: new, review file paths and save
- `src/lib/shared/work/reviews.test.mts`: new, scope to file name
- `src/lib/hooks/route/verdict/index.mts`: save reviewer blocks, pass amend
- `src/lib/hooks/route/verdict/index.test.mts`: saved files and rows
- `src/lib/shared/work/block.mts`: read only, `readHeading`, `ReviewScope`

**Changes:**
1. `VerdictRow` and `VerdictView`: add `session?: string` and `amend?: string` (D-002). `verdictRow` in `route/index.mts` adds `session` only when `isSessionId(input.session)` and `amend` only when `input.amend` is a non-empty string, so no `null` keys appear.
2. `RouteInput.amend?: string`. The verdict hook passes `amend: amend ?? undefined` beside the unchanged `reason: amend ?? undefined` (`route/verdict/index.mts:61`), so a drift still sets `blocked_reason` to the line.
3. `reviews.mts` exports:
   - `type SavedReviewScope = Exclude<ReviewScope, "pr">`
   - `reviewFileName(scope: SavedReviewScope, phase: number | null): string`: `crosscheck.md`, `phase-<n>.md`, `checkpoint.md`, `cumulative.md`
   - `reviewRel(id, scope, phase): string`: `work/<id>/reviews/<file>`
   - `saveReview(root, id, heading: BlockHeading, text: string): void`: writes `text.slice(heading.index)` with CRLF made LF, trimmed, plus one newline, replacing any file of that name (draft D-6), and creates `reviews/` when missing.
4. Verdict hook: when the block's agent is `reviewer` and its scope is not `pr`, save it with `saveReview` before `route` runs, inside a `try` that swallows errors, as `saveDeveloperBlock` does. `blockInfo` gains the heading's `index` so the hook does not parse twice. The `pr` path (`keepPullRequestReview`) is unchanged.

**Done when:**
- **T-2.1** `route()` with session `S` appends a row whose `session` is `S`; without a session id, the row has no `session` key.
- **T-2.2** A reviewer `SubagentStop` whose block carries `AMENDMENT NEEDED: D-002 the port moved` above `CHANGES REQUIRED` appends a row with `amend: "AMENDMENT NEEDED: D-002 the port moved"`; the same line above `DRIFT DETECTED` also sets `blocked_reason` to it.
- **T-2.3** Reviewer blocks of scopes `crosscheck`, `phase 2`, `checkpoint` and `cumulative` land at `reviews/crosscheck.md`, `reviews/phase-2.md`, `reviews/checkpoint.md` and `reviews/cumulative.md`, each starting with its `## Review:` line and ending with its verdict line.
- **T-2.4** A second cumulative block replaces `reviews/cumulative.md`, leaving one file with the newer text.
- **T-2.5** A `pr` scope review still lands in `.picket/state/<id>.review.md`, and no `reviews/` folder is created.
- **T-2.6** `readVerdicts` reads a row written without `session` and `amend` unchanged.
- **T-2.7** Drive: the built `route.verdict` hook, run with a reviewer `SubagentStop` payload in a scratch project, writes `work/<id>/reviews/cumulative.md` and a row carrying `session`.
- **T-2.8** `npm test` passes.

## Phase 3: Summary checklists and saved inputs

**Touch set:**
- `src/lib/shared/review-checklists.mts`: new, load table as code
- `src/lib/shared/review-checklists.test.mts`: new, rows and on-disk names
- `src/lib/verbs/summary/index.mts`: `checklists`, `scope`, `--scope`, `--save`
- `src/lib/verbs/summary/index.test.mts`: saved file equals output
- `src/lib/shared/work/files.mts`: `WORK_FILES` gains two names
- `src/lib/shared/work/files.test.mts`: count 13 becomes 15
- `src/lib/verbs/preflight/index.mts`: write or remove `preflight.txt`
- `src/lib/verbs/preflight/index.test.mts`: warn lines saved
- `docs/reference/cli.md`: regenerated usage lines
- `src/skills/reviewing/SKILL.md`: read only, load table source
- `src/skills/reviewing/checklists/`: read only, names on disk

**Changes:**
1. `review-checklists.mts` (D-006): `type ChecklistScope = "phase" | "checkpoint" | "cumulative" | "crosscheck"`, `type Checklist = { path: string; skip?: string[] }`, `CHECKLIST_ROOT = "${CLAUDE_PLUGIN_ROOT}/skills/reviewing/checklists/"` as a literal string, and `reviewChecklists(input: Pick<Summary, "size" | "frameworks" | "concerns" | "security_path" | "extension_steps">, scope: ChecklistScope): Checklist[]`. The rules, in output order:
   - `crosscheck`: `60-crosscheck.md` alone.
   - Every other scope: `10-alignment.md`, `12-bar.md`, then `15-traced.md` for `cumulative` only.
   - `20-patterns-core.md`: medium gives `skip: ["SOLID", "DRY"]`, large gives it in full, small leaves it out; `security_path: true` gives it in full at every size.
   - `25-design-red-flags.md` for medium and large.
   - `30-patterns-security.md` always.
   - `40-framework-<name>.md` per mapped framework (`typescript`, `dotnet`).
   - `50-concern-<name>.md` per mapped concern (`clean-architecture`, `vertical-slice`) for medium and large.
   - Each `extension_steps` path last, unprefixed (they are project-relative).
2. `summary`: both forms gain `checklists`, and the item form gains `scope`. `--scope <s>` overrides the default of D-006; the range form uses `phase`. `--save` writes the item form's JSON (the value printed, two-space indented) to `work/<id>/summary.json`, replacing it; `--save` with `--range` is a `UsageError`. Usage: `summary <id> [--base <ref>] [--scope <s>] [--save] | summary --range <base>..<head>`.
3. `WORK_FILES` gains `summary.json` and `preflight.txt`.
4. `preflight`: after the checks, when the item read succeeded, write each `warn` check as its rendered line (`warn <name>: <detail>`) to `work/<id>/preflight.txt`, one per line; with none, remove the file if present. `preflight` and `summary` keep `readOnly: true` (D-007).
5. Run `npm run docs` and stage `docs/reference/cli.md`.

**Done when:**
- **T-3.1** For `{ size: "small", frameworks: ["react", "typescript"], concerns: [], security_path: false }` at `phase`, the paths end in `10-alignment.md`, `12-bar.md`, `30-patterns-security.md`, `40-framework-typescript.md`, in that order.
- **T-3.2** Medium adds `20-patterns-core.md` with `skip: ["SOLID", "DRY"]`, `25-design-red-flags.md` and the mapped concern files; large has `20-patterns-core.md` with no `skip`; small with `security_path: true` has `20-patterns-core.md` with no `skip`.
- **T-3.3** `cumulative` puts `15-traced.md` right after `12-bar.md`; `crosscheck` returns exactly one entry ending in `60-crosscheck.md`; extension step paths come last, unchanged.
- **T-3.4** A test lists `src/skills/reviewing/checklists/` and fails if any file name in the map is missing there.
- **T-3.5** `picket summary <id> --save` prints JSON carrying `checklists` and `scope`, and `work/<id>/summary.json` parses to the same value; `picket summary --range a..b --save` exits 1.
- **T-3.6** `picket preflight <id>` with a dirty tree writes `work/<id>/preflight.txt` holding the `warn tree:` line; a later run with no warn line removes the file.
- **T-3.7** `VERB_NAMES` keeps `readOnly: true` for `summary` and `preflight` (D-007), and `kernelClass("summary")` and `kernelClass("preflight")` still return `safe` in `src/lib/hooks/guard/bash/kernel.test.mts`.
- **T-3.8** Drive: in a scratch project with one approved phase, the built CLI's `picket summary <id> --save` writes `summary.json`; `npm test` passes, the generated-pages test in `test/repo/docs.test.mjs` included.

## Phase 4: fix_findings and amend actions

**Touch set:**
- `src/lib/shared/work/action-text.mts`: two actions and their text
- `src/lib/shared/work/next-step.mts`: two `NextStep` variants and rules
- `src/lib/shared/work/next-step.test.mts`: rule cases
- `test/support/snapshot.mts`: read only, `snapshotOf` fixture builder
- `src/mods/status/hooks/band.test.ts`: one case for the new text

**Changes:**
1. `NEXT_ACTIONS` appends `fix_findings` and `amend` (12 entries). `ACTION_TEXT` gains `fix_findings`: `developer fixes the cumulative review findings` and `amend`: `architect amends <lane>.md`; the `Record` type makes either missing a type error (draft item 7).
2. `NextStep` gains `{ action: "fix_findings"; actor: "developer"; phase: number; detail: string }` and `{ action: "amend"; actor: "architect"; detail: string }`, where `detail` is the amendment line.
3. `pendingAmend(snap): string | null`: the `amend` of the latest row carrying one, when no `AMENDED` row follows it.
4. `nextStep` order, for the phased lanes only:
   - blocked: `pendingAmend` and `!isStalled` gives `amend`; otherwise `blockStep` as today.
   - open with phases left: `pendingAmend` gives `amend` before `startStep` and `approvalStep`.
   - all phases approved: `isCumulativelyReviewed` gives `close`; then `rejectionsStep`; then `pendingAmend` gives `amend`; then `findingsOpen` gives `fix_findings` with the last phase's number; then `review_cumulative`.
5. `findingsOpen(snap)`: the latest reviewer row of scope `cumulative` is `CHANGES REQUIRED`, and no developer `PHASE DONE` row follows it.

**Done when:**
- **T-4.1** `NEXT_ACTIONS` has 12 entries ending `fix_findings`, `amend`, and `npm run typecheck` passes.
- **T-4.2** All phases approved with one cumulative `CHANGES REQUIRED` row last gives `fix_findings` at the last phase; a developer `PHASE DONE` row after it gives `review_cumulative`.
- **T-4.3** A third cumulative `CHANGES REQUIRED` since the last approval still gives `resolve_rejections` with `STALL_OPTIONS`.
- **T-4.4** A reviewer row with `amend` and no later `AMENDED` gives `amend` with that line as `detail`, both when the item is open and when it is blocked after one `DRIFT DETECTED`.
- **T-4.5** After an `AMENDED` row, an open item with an open cumulative rejection gives `fix_findings`, and a blocked one gives `resolve_block`.
- **T-4.6** Blocked after a third `DRIFT DETECTED` with a pending amendment gives `resolve_block` with `STALL_OPTIONS`.
- **T-4.7** Drive: `picket next <id>` on a scratch item whose `verdicts.jsonl` ends in a cumulative `CHANGES REQUIRED` row prints `fix_findings`.
- **T-4.8** `npm test` passes.

## Phase 5: next builds the send list

**Touch set:**
- `src/lib/shared/work/send.mts`: new, `sendsFor` and the message lines
- `src/lib/shared/work/send.test.mts`: new, one case per table row
- `src/lib/shared/views.mts`: `SendView`, `NextView.send`
- `src/lib/shared/work/next-view.mts`: session parameter, `send` field
- `src/lib/shared/work/next-view.test.mts`: `send` present and empty
- `src/lib/verbs/next/index.mts`: pass `ctx.session`, render sends
- `src/lib/verbs/next/index.test.mts`: JSON and human render
- `src/lib/verbs/route/index.mts`: `readNext` with the route's session
- `src/lib/verbs/close/close.mts`: read only, `nextOf` caller
- `src/lib/verbs/list/index.mts`: read only, `nextOf` caller
- `src/lib/hooks/inject/state/index.mts`: read only, `nextOf` caller
- `src/lib/verbs/packet/packet.mjs`: read only, `nextOf` caller

**Changes:**
1. `views.mts`: `type AgentType = "picket:analyst" | "picket:architect" | "picket:developer" | "picket:reviewer"`, `type SendView = { tool: "Agent" | "SendMessage"; to: string; type: AgentType; model?: "opus"; first?: string[]; message: string }`, and `NextView.send: SendView[]`.
2. `send.mts`: `sendsFor(snap: WorkSnapshot, step: NextStep, session: string | null): SendView[]`. A message is `key: value` lines joined by `\n`. `tool` follows D-005. Rows, draft table order:
   - `write_artifact`, order or design: `architect`, lines `work`, `lane`, `request: work/<id>/request.md`, then `preflight: work/<id>/preflight.txt` and `sources: work/<id>/sources.yaml` only when the file exists.
   - `write_artifact`, research: `analyst`, lines `work`, `request: …`, `pass: outline`.
   - `implement_phase`: `developer`, lines `work`, `phase`, then `artifact: work/<id>/<order|design>.md` only when `tool` is `Agent`, then `run through <m>` when `state.run_through` is at least the phase. In the design lane, while phase 1 is not done and no reviewer row of scope `crosscheck` exists in any session, a second send: `reviewer`, lines `work`, `scope: crosscheck`, `artifact: work/<id>/design.md`.
   - `review_checkpoint`: `reviewer`, lines `work`, `scope: checkpoint`, `phase`, `summary: work/<id>/summary.json`; `first: ["picket summary <id> --save"]`.
   - `review_cumulative`: `cumulative-reviewer`, `model: "opus"`; on `Agent` the message opens with `You are reviewing a change you did not write. You have no context beyond what is below.`, then `work`, `scope: cumulative`, `summary: …`. `first` is `picket mutate <id>` (only while no cumulative reviewer row exists) then `picket summary <id> --save`.
   - `fix_findings`: `developer`, lines `work`, `review: work/<id>/reviews/cumulative.md`.
   - `amend`: `architect`, lines `work`, `amend: <detail>`.
   - every user, lead and `none` action: `[]`.
3. `nextView`, `nextOf` and `readNext` take `session: string | null = null` and set `send`; the default keeps every other caller as it is. The `next` verb passes `ctx.session`, and `route` passes its input session.
4. `next --human`: today's line, then per send a line `<tool> <to> · <type>` (plus ` · model opus`), one `first: <command>` line per command, and the message inside a ```` ```text ```` fence.

**Done when:**
- **T-5.1** `write_artifact` in the order lane with `preflight.txt` and `sources.yaml` present gives one `Agent` send to `architect` with the five lines; with both absent, those two lines are missing. Research gives `analyst` with `pass: outline`.
- **T-5.2** `implement_phase` with no developer row in session `S` gives `Agent` with `artifact:`; with one gives `SendMessage` without it; a developer row from another session gives `Agent`; `run_through: 3` at phase 2 adds `run through 3`.
- **T-5.3** Design lane, phase 1 not done, no crosscheck row: two sends, the second to `reviewer` with `scope: crosscheck`; after any crosscheck row, one send.
- **T-5.4** `review_cumulative` before any cumulative row: `Agent`, `cumulative-reviewer`, `model: "opus"`, the fixed opening sentence, `first` of mutate then summary; after a cumulative row in `S`: `SendMessage`, no opening sentence, `first` of summary alone.
- **T-5.5** `review_checkpoint`, `fix_findings` and `amend` give the lines of Changes item 2; `approve_phase`, `resolve_block`, `close` and `none` give `send: []`.
- **T-5.6** `picket next <id>` JSON carries `send`; `--human` prints one ```` ```text ```` fence per send.
- **T-5.7** Drive: `picket next <id> --human` in a scratch order item with an order written prints the developer send with `artifact:`.
- **T-5.8** `npm test` passes.

## Phase 6: Reply log and fresh developers

**Touch set:**
- `src/lib/shared/work/replies.mts`: new, `ReplyRow`, append and read
- `src/lib/shared/work/replies.test.mts`: new, round trip and skipped lines
- `src/lib/shared/work/files.mts`: `WORK_FILES` gains `replies.jsonl`
- `src/lib/shared/work/files.test.mts`: count 15 becomes 16
- `src/lib/shared/work/snapshot.mts`: `snap.replies`
- `test/support/snapshot.mts`: `snapshotOf` accepts `replies`
- `src/lib/shared/work/next-step.mts`: a fresh reply ends `resolve_rejections`
- `src/lib/shared/work/next-step.test.mts`: rejection and fresh-reply cases
- `src/lib/shared/work/send.mts`: `developer-<n>` naming and liveness
- `src/lib/shared/work/send.test.mts`: OQ-1 numbering cases
- `src/lib/util/io.mts`: read only, `appendJsonl`, `readJsonl`

**Changes:**
1. `replies.mts` (D-003): `type ReplyRow = { ts: string; session?: string; action: NextAction; phase: number | null; reply: string; fresh?: true }`, `appendReply(root, id, entry: Omit<ReplyRow, "ts">, now: Date)` and `readReplies(root, id): JsonlRead<ReplyRow>`, both on `workFile(root, id, "replies.jsonl")`, the same way `verdict-log.mts` handles its file.
2. `WorkSnapshot.replies: ReplyRow[]`. `readSnapshot` fills it, and its skipped-line warning covers `replies.jsonl` too. `StateView` does not show replies.
3. `freshReplies(snap)`: the rows with `fresh: true`. `developerName(snap)`: `developer` when there are none, else `developer-<1 + count>` (OQ-1).
4. `rejectionsStep` returns `null` when a fresh reply is later (by `ts`) than the latest cumulative `CHANGES REQUIRED` row, so `allApprovedStep` falls through to `fix_findings`.
5. `sendsFor`: the developer sends of `implement_phase` and `fix_findings` go `to: developerName(snap)`. `SendMessage` applies only when a developer row with this session is later than the latest fresh reply. An `Agent` send to a fresh developer carries `artifact:` (and `review:` for `fix_findings`) as a first send does.

**Done when:**
- **T-6.1** `appendReply` then `readReplies` returns the row with `ts`; a garbled line is skipped and counted, and `readSnapshot` reports it in `warnings`.
- **T-6.2** `WORK_FILES` has 16 entries, among them `replies.jsonl`.
- **T-6.3** With no fresh reply the developer send goes to `developer`; after one, to `developer-2` as `Agent`; after two, to `developer-3`.
- **T-6.4** After one fresh reply and a later developer row with session `S`, the send to `developer-2` is `SendMessage`; a developer row from before the fresh reply does not count.
- **T-6.5** All phases approved, three cumulative rejections, then a fresh reply: `next` gives `fix_findings`, sent to `developer-2` with `review: work/<id>/reviews/cumulative.md` and `artifact:`.
- **T-6.6** The same three rejections with no fresh reply still give `resolve_rejections`.
- **T-6.7** Drive: a scratch item with a hand-written `replies.jsonl` row `fresh: true` after a `PHASE STALLED` and `status: open` makes `picket next <id> --human` print `Agent developer-2`.
- **T-6.8** `npm test` passes.

## Phase 7: picket reply

**Touch set:**
- `src/lib/verbs/reply/index.mts`: new, verb spec, parse, render
- `src/lib/verbs/reply/table.mts`: new, reply forms per gate
- `src/lib/verbs/reply/index.test.mts`: new, each reply form
- `src/lib/shared/work/block.mts`: proposal split and parse, moved here
- `src/lib/shared/work/block.test.mts`: proposal parsing cases
- `src/lib/verbs/packet/packet.mjs`: import proposals from `block.mts`
- `src/lib/verbs.mts`: `reply` entry, lead-only (D-008)
- `src/lib/cli/registry.mts`: `reply` loader
- `src/lib/hooks/guard/bash/kernel.test.mts`: lead-only list gains `reply`
- `docs/reference/cli.md`: regenerated, new `## picket reply` section
- `src/lib/shared/route/route.mts`: new, `route()` moved from the verb
- `src/lib/shared/route/apply.mts`: moved from `src/lib/verbs/route/`
- `src/lib/shared/route/plan.mts`: moved from `src/lib/verbs/route/`
- `src/lib/shared/route/commit.mts`: moved from `src/lib/verbs/route/`
- `src/lib/shared/route/plan.test.mts`: moved with `plan.mts`
- `src/lib/verbs/route/`: owns the three deletions and `plan.test.mts`
- `src/lib/verbs/route/index.mts`: keeps the spec, re-exports `route`
- `src/lib/verbs/route/index.test.mts`: stays, imports through the re-export
- `src/lib/shared/work/send.mts`: `renderSends` for next and reply
- `src/lib/verbs/next/index.mts`: render through `renderSends`
- `src/lib/hooks/guard/bash/payloads.test.mts`: lead-only refusal case
- `src/lib/hooks/route/verdict/index.mts`: read only, import unchanged
- `test/repo/conventions.test.mjs`: read only, the layer rule stays
- `src/lib/shared/work/approvals.mts`: read only, `appendComment`, `appendWaiver`
- `src/lib/shared/work/state.mts`: read only, `readState`, `writeState`
- `src/skills/shared/procedures/gate.md`: read only, the reply table

**Changes:**
1. `block.mts` takes `COMMENT_SEPARATOR`, `WAIVER_SEPARATOR` and `proposals(value, separator)` from `packet.mjs` unchanged, and adds two parsers. `commentProposal(text)` returns `{ path, line, text } | null` from `<path>:<line> "<text>"`. `waiverProposal(text)` returns `{ path, text: string | null, deleted: boolean } | null` from `<path>:<line> "<text>" because <why>` or `<path> deleted because <why>`.
2. `table.mts`: `matchReply(reply: string, step: NextStep, proposals): Matched | null`. Matching is trimmed and case-insensitive, and only offered options match (an option's letter is in `step.options`; `k` and `w` need that proposal number in the saved block).
   - `approve_phase`: `a`/`approved`/`ok`/`yes`; `i`/`confirm`; `r <m>`/`approved through <m>`/`run to <m>` with `m` past the phase and at most the last phase; `x <why>`/`reject: <why>` with a non-empty why; `k <n>`/`keep <n>`; `w <n>`/`waive <n>`.
   - `resolve_block` and `resolve_rejections`: `c`/`continue`, `d`/`redesign`, `x`/`abandon`.
3. `reply/index.mts`: `ReplyInput = { id; reply }` (`reply <id> <words…>`, the words joined). `ReplyResult = { id; reply; applied: string[]; next: NextView; send: SendView[] }`. It refuses (exit 2) when the lane is `research`, when the action is not one of the three gates (naming the action), or when nothing matches (listing `step.options`). Effects:
   - `a`, `i`: `route` `approved`, agent `user`; `r <m>` adds `through`.
   - `x <why>`: `route` `rejected` with `reason`; own send (D-004).
   - `k <n>`: `appendComment`; `w <n>`: `appendWaiver`; own sends.
   - `c`: status `open`, blocked reason dropped; the row gets `fresh: true` when the options hold `[c] continue with a fresh developer`.
   - `d`: order lane, status `abandoned` and the applied line `abandoned; open the same request in the design lane`; design lane, status `open` and an own send to `architect` with `amend: <blocked_reason read before the change>`.
   - `x` at a block: status `abandoned`.
   Every applied reply appends one `ReplyRow` with `ctx.session`. `next` and the default send come from `readNext(root, id, ctx.session)` after the effect.
4. Render: the `applied` lines, then the `next` line and `renderSends(send)`.
5. Route move (D-008 r2): `git mv` `apply.mts`, `plan.mts`, `commit.mts` and `plan.test.mts` from `src/lib/verbs/route/` to `src/lib/shared/route/`, and fix their relative imports (`../../shared/x` becomes `../x`). Create `src/lib/shared/route/route.mts` with `route()`, `RouteResult`, the `RouteInput` re-export and the helpers only `route()` uses (`verdictSpec`, `verdictRow`, `gateOf`, `marksOnDisk`, `CLASSED_VERDICT`, `SPECS`), unchanged in behaviour. `src/lib/verbs/route/index.mts` imports from there and adds `export { route, type RouteInput, type RouteResult } from "../../shared/route/route.mts"`. `reply` imports `route` from `../../shared/route/route.mts`. The `renderSend` in `src/lib/verbs/next/index.mts` moves to `send.mts` as `renderSends(sends: SendView[]): string`, and `next` renders its sends through it with byte-identical output. `test/repo/conventions.test.mjs` is not edited.
6. `VERB_NAMES.reply = { summary: "apply the user's reply at a gate", readOnly: false, leadOnly: true }`, the registry entry, the lead-only list in `kernel.test.mts`, and `npm run docs`.

**Done when:**
- **T-7.1** `reply <id> a` at `approve_phase` writes `phases/<n>.approved`, its `applied` names the commit as `picket route` does, and `replies.jsonl` gains one row.
- **T-7.2** `reply <id> r 3` sets `run_through: 3`; `r 9` past the last phase and `r 3` with no `[r]` option exit 2.
- **T-7.3** `reply <id> x tests are flaky` routes `rejected` with that reason and returns one developer send whose message holds `rejected: tests are flaky`.
- **T-7.4** With `Comments: src/a.ts:4 "half-up"` in the block, `k 1` appends to `comments.jsonl` and sends `comment approved: src/a.ts:4 "half-up"`. With `Waivers: src/b.test.ts deleted because moved`, `w 1` appends a deleted waiver.
- **T-7.5** At a `PHASE STALLED` block: `c` reopens and the send goes to `developer-2`; `d` abandons an order item; `d` reopens a design item and sends `amend: <the old blocked reason>`; `x` abandons.
- **T-7.6** `reply <id> maybe` exits 2 with the options in its error; at `implement_phase`, any reply exits 2 naming `implement_phase`.
- **T-7.7** `guard.bash` refuses `picket reply <id> a` from `agent_type: picket:developer`, and `kernel.test.mts` lists `comment`, `reply`, `uninstall`, `waive` as lead-only.
- **T-7.8** Drive: in a scratch order item with phase 1 done, the built CLI's `picket reply <id> a` commits the phase. `npm test` passes with `test/repo/conventions.test.mjs` unchanged, generated pages included. `src/lib/verbs/route/` holds only `index.mts` and `index.test.mts`, and `picket next <id> --human` prints the same text as before the move.

## Phase 8: Packet fence and the missing-block bounce

**Touch set:**
- `src/lib/verbs/packet/index.mts`: render inside a text fence
- `src/lib/verbs/packet/index.test.mts`: fenced text, bare JSON
- `test/kernel/packet.test.mjs`: read only, `packet()` text unchanged
- `src/lib/hooks/guard/block/index.mts`: bounce a picket turn without a block
- `test/hooks/guard.block.test.mjs`: missing-block cases
- `src/lib/shared/verdicts.mjs`: read only, `findVerdict`
- `src/lib/shared/transcript/turn.mts`: read only, `blockLines`, `readTurn`
- `src/lib/hooks/route/verdict/index.mts`: pass `amend` for reviewer blocks only
- `src/lib/hooks/route/verdict/index.test.mts`: architect block quoting the line
- `src/lib/verbs/preflight/index.mts`: guard the `preflight.txt` write
- `src/lib/verbs/preflight/index.test.mts`: unwritable work folder case

**Changes:**
1. `packet` verb: `render` returns the packet text between a ```` ```text ```` line and a ```` ``` ```` line. `packet()` in `packet.mjs` and the `--json` value keep the bare text.
2. `guardBlock`: when `readHeading(text)` is null, the event is `SubagentStop`, `event.agent_type` starts with `picket:`, `stop_hook_active` is not set, and `findVerdict(blockLines(text).last)` is null, it bounces once with `guard.block: the turn ended without your block. Finish the task and end with your block, or reply in one line why you cannot.` Every other no-heading turn passes as today.
3. Verdict hook (D-002 r2): the `route` call at `route/verdict/index.mts:77` passes `amend` only when `info?.agent === "reviewer"`. `reason` keeps today's behaviour.
4. `preflight` (D-007 r2): `saveWarnings` catches a failed write or removal and returns a `{ name: "preflight_file", level: "warn", detail: "work/<id>/preflight.txt not written: <error message>" }` check, which `preflight` appends to `checks`. `ok` is unchanged by it.

**Done when:**
- **T-8.1** `picket packet <id>` prints ```` ```text ```` as its first line and ```` ``` ```` as its last; `picket packet <id> --json` has a `text` field with no fence line.
- **T-8.2** A `SubagentStop` with `agent_type: "picket:developer"` whose text is `I looked at the file.` is bounced with the message of Changes item 2.
- **T-8.3** The same turn with `stop_hook_active: true`, with `agent_type: "Explore"`, or as the lead's `Stop` is not bounced.
- **T-8.4** A `picket:` agent turn whose last line is a verdict token is not bounced for a missing block.
- **T-8.5** Every existing test in `test/hooks/guard.block.test.mjs` passes unchanged.
- **T-8.6** Drive: the built `guard.block` hook, run with the T-8.2 payload in a scratch project, prints a `decision: block` JSON; `npm test` passes.
- **T-8.7** An architect `AMENDED` block containing a line `AMENDMENT NEEDED: D-002 x` appends a row with no `amend` key, and `next` after it does not say `amend`; a reviewer block with the same line still carries `amend`.
- **T-8.8** `picket preflight <id>` with a work folder it cannot write still exits as the other checks decide, and its output holds a `warn preflight_file:` line instead of a thrown error.

## Open questions

none

## Revision log
- 2026-10-29: D-005 (r2): developer-<n> counts rows after the (n-1)-th fresh reply, matching T-6.4; Problem cites Target items 3 and 6 for Phase 8; T-3.7 checks D-007
- 2026-10-29: D-002 (r2): only reviewer blocks carry amend, so an architect block cannot re-arm it; checkpoint Minor, fixed in Phase 8 (T-8.7)
- 2026-10-29: D-007 (r2): a failed preflight.txt write becomes a warn check, never a throw; checkpoint Minor, fixed in Phase 8 (T-8.8)
- 2026-10-29: D-008 (r2): route() moves to src/lib/shared/route/ so reply can call it within the layer rule; Phase 7 stall, user chose redesign
