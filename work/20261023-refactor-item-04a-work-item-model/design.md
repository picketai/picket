---
kind: design
lane: design
title: Refactor item 04a, work item model
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/00-conventions.md, artifacts/refactor/02-code-conventions.md, artifacts/refactor/03-kernel-cli.md, artifacts/refactor/04b-sources-and-intake.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/04d-reading-and-reporting.md, artifacts/refactor/05-hooks.md, artifacts/refactor/06-tests.md, artifacts/refactor/08a-instructions.md, work/20261022-refactor-item-02-code-conventions/design.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, tsconfig.json, package.json, scripts/test.mjs, src/lib/shared/work (every module), src/lib/verbs/route, src/lib/verbs/close, src/lib/verbs/packet/packet.mjs, src/lib/verbs/verify/verify.mjs, src/lib/verbs (next, state, list, set, open, comment, waive, leave, source) adapters, src/lib/shared/verdicts.mjs, src/lib/shared/config.mjs, src/lib/shared/git.mts, src/lib/shared/sources/sources.mjs, src/lib/shared/review-summary.mjs, src/lib/verbs/admit/admit.mjs, src/lib/util/io.mts, src/lib/shared/action.mts, src/lib/shared/context.mts, src/lib/hooks (hook, route.verdict, inject.state, observe.drive, emit.ledger, guard.comments, guard.silenced), test/kernel (route, next, gate, close, packet, verify, work, context, conventions, extensions), test/hooks/handlers.test.mjs]
phases:
  - n: 1
    files: [src/lib/shared/security-paths.mts, src/lib/shared/work/gate.mjs, test/kernel/security-paths.test.mjs, test/kernel/gate.test.mjs]
    greps:
      - path: src/lib/shared/security-paths.mts
        pattern: 'export function securityPathOf\(path: string, configured: readonly string\[\]\): string \| null'
      - path: src/lib/shared/work/gate.mjs
        pattern: 'securityPathOf\('
      - path: src/lib/shared/work/gate.mjs
        pattern: '^(?![\s\S]*function asPrefix)'
        flags: i
      - path: test/kernel/security-paths.test.mjs
        pattern: 'src/Api/MyAuthentication/Handler\.cs'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/work/state.mts, src/lib/shared/work/markers.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/work/approvals.mts, src/lib/shared/work/block.mts, src/lib/shared/work/work.mjs, src/lib/shared/work/files.mts, src/lib/shared/context.mts, src/lib/shared/work/next-step.mjs, src/lib/verbs/route/route.mjs, src/lib/verbs/close/close.mjs, src/lib/verbs/packet/packet.mjs, src/lib/verbs/verify/verify.mjs, src/lib/verbs/preflight/preflight.mjs, src/lib/verbs/drive/drive.mjs, src/lib/verbs/admit/admit.mjs, src/lib/verbs/cost/cost.mjs, src/lib/verbs/mutate/mutate.mjs, src/lib/shared/mutation.mjs, src/lib/shared/checks.mjs, src/lib/shared/review-summary.mjs, src/lib/hooks/emit.ledger.mjs, src/lib/hooks/guard.comments.mjs, src/lib/hooks/guard.silenced.mjs, src/lib/hooks/inject.state.mjs, src/lib/hooks/observe.drive.mjs, src/lib/hooks/route.verdict.mjs, src/lib/verbs/comment/index.mts, src/lib/verbs/waive/index.mts, src/lib/verbs/set/index.mts, src/lib/verbs/leave/index.mts, src/lib/verbs/open/index.mts, src/lib/verbs/source/add.mts, src/lib/verbs/source/pick.mts, src/lib/verbs/list/index.mts, test/kernel/work-fixture.mjs, test/kernel/work.test.mjs, test/kernel/context.test.mjs, test/kernel/work-files.test.mjs, test/kernel/packet.test.mjs, test/kernel/route.test.mjs, test/kernel/next.test.mjs, test/kernel/close.test.mjs, test/kernel/gate.test.mjs, test/kernel/leave.test.mjs, test/kernel/migrate.test.mjs, test/kernel/mutate.test.mjs, test/kernel/preflight.test.mjs, test/kernel/review.test.mjs, test/kernel/verify.test.mjs, test/kernel/admit-labelled.test.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: src/lib/shared/work/state.mts
        pattern: 'export function readState\(root: string, id: WorkId\): WorkState'
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'export function readVerdicts\(root: string, id: WorkId\): JsonlRead<VerdictRow>'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function proposedCommit\(block: Block\): string \| null'
      - path: src/lib/shared/context.mts
        pattern: 'cwd: string'
      - path: src/lib/shared/work/work.mjs
        pattern: '^(?![\s\S]*export function (readState|writeState|setMarker|appendVerdict|readVerdicts|appendComment|listWork)\b)'
        flags: i
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '^(?![\s\S]*staged\.\*)'
        flags: i
      - path: test/kernel/work-fixture.mjs
        pattern: 'export function createWork\('
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/work/artifact.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/gate.mts, src/lib/shared/work/next-step.mjs, src/lib/verbs/route/route.mjs, src/lib/verbs/close/close.mjs, src/lib/verbs/packet/packet.mjs, src/lib/verbs/verify/verify.mjs, src/lib/verbs/preflight/preflight.mjs, src/lib/verbs/drive/drive.mjs, src/lib/shared/review-summary.mjs, src/lib/hooks/observe.drive.mjs, src/lib/hooks/inject.state.mjs, src/lib/verbs/list/index.mts, src/lib/verbs/state/index.mts, test/kernel/work-fixture.mjs, test/kernel/state-view.test.mjs, test/kernel/state-view.json, test/kernel/artifact.test.mjs, test/kernel/gate.test.mjs, test/kernel/verify.test.mjs, test/kernel/work.test.mjs, test/kernel/route.test.mjs, test/kernel/extensions.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: src/lib/shared/work/snapshot.mts
        pattern: 'export function readSnapshot\(root: string, id: WorkId\): WorkSnapshot'
      - path: src/lib/shared/work/snapshot.mts
        pattern: 'export function stateView\(snap: WorkSnapshot\): StateView'
      - path: src/lib/shared/work/artifact.mts
        pattern: 'export function parseArtifact\(text: string\): ParsedArtifact'
      - path: src/lib/shared/work/gate.mts
        pattern: 'export function ownGate\(phase: '
      - path: src/lib/verbs/verify/verify.mjs
        pattern: '^(?![\s\S]*export function mustHaves)'
        flags: i
      - path: test/kernel/state-view.test.mjs
        pattern: 'state-view\.json'
      - path: test/kernel/extensions.test.mjs
        pattern: 'shared/work/gate\.mts'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-view.mts, src/lib/verbs/route/route.mjs, src/lib/verbs/close/close.mjs, src/lib/verbs/packet/packet.mjs, src/lib/verbs/next/index.mts, src/lib/verbs/list/index.mts, src/lib/verbs/set/index.mts, src/lib/verbs/open/index.mts, src/lib/verbs/source/pick.mts, src/lib/hooks/inject.state.mjs, test/kernel/snapshot-fixture.mjs, test/kernel/next-step.test.mjs, test/kernel/work-fixture.mjs, test/kernel/next.test.mjs, test/kernel/extensions.test.mjs]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: 'export function nextStep\(snap: WorkSnapshot, securityPaths: readonly string\[\]\): NextStep'
      - path: src/lib/shared/work/next-view.mts
        pattern: 'export function readNext\(root: string, id: WorkId\): NextView'
      - path: src/lib/shared/work/next-view.mts
        pattern: 'export function latest\(root: string'
      - path: test/kernel/snapshot-fixture.mjs
        pattern: 'export function snapshotOf\('
      - path: test/kernel/next-step.test.mjs
        pattern: 'snapshotOf\('
      - path: test/kernel/extensions.test.mjs
        pattern: 'shared/work/next-step\.mts'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/verbs/route/index.mts, src/lib/verbs/route/plan.mts, src/lib/verbs/route/apply.mts, src/lib/verbs/route/commit.mts, src/lib/hooks/route.verdict.mjs, test/kernel/work-fixture.mjs, test/kernel/route.test.mjs, test/kernel/route-plan.test.mjs, test/kernel/extensions.test.mjs]
    greps:
      - path: src/lib/verbs/route/plan.mts
        pattern: 'export const EFFECTS'
      - path: src/lib/verbs/route/apply.mts
        pattern: 'export function applyChanges\('
      - path: src/lib/verbs/route/commit.mts
        pattern: 'export function commitPhase\('
      - path: src/lib/verbs/route/index.mts
        pattern: 'export function route\(input: RouteInput, ctx: Context\): RouteResult'
      - path: src/lib/hooks/route.verdict.mjs
        pattern: 'from "\.\./verbs/route/index\.mjs"'
      - path: test/kernel/route-plan.test.mjs
        pattern: 'EFFECTS'
      - path: test/kernel/extensions.test.mjs
        pattern: 'verbs/route/index\.mts'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/verbs/close/close.mts, src/lib/verbs/close/index.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: 'export function close\(root: string, id: WorkId'
      - path: src/lib/verbs/close/index.mts
        pattern: '^(?![\s\S]*closeOrRefuse)'
        flags: i
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'readSnapshot\('
    tests: true
    drive: true
    security: false
---
# Design: Refactor item 04a, work item model

## Problem

One verdict reads `state.yaml` nine times and `order.md` five times, because `route`, `ownGate`, `commitPhase` and `next` each read the item again; `route()` mixes deciding with writing, `next()` decides only after reading disk, so 86 tests build temp folders to test a decision; `work.mjs` does six jobs behind 20 hidden `root` defaults; security paths are matched three ways (B3); and one truncated line in `verdicts.jsonl` breaks the item (B4). The user approved item 04a (`artifacts/refactor/04a-work-item-model.md`: W-1 to W-9, its migration, risks and revision log) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases and re-decides none (W-1, the split of item 04 into 04a to 04d, is why 04b to 04d stay out). Binding constraints: items 01 to 03 are done, so the real paths are `src/lib/shared/work/` and `src/lib/verbs/<verb>/` (item 03 D-005); the integration suites for `route`, `next`, `close` and `packet` keep passing with their bodies unchanged (draft R-1); `picket state` prints the same JSON (draft R-2); every phase leaves `npm test` green and the CLI working, because this session runs the harness from `dist/`; a phase's `files` name only paths that exist afterwards, and deletions go on the block's Files line.

## Decisions

### D-001: `shared/work/` is single-job `.mts` files, root first, with no barrel
**Decision:** Infrastructural decision, carrying W-2, C-006, C-007, C-010, C-011 and C-015. `work.mjs` splits by job, as the draft's "Target" lists. `state.mts`: `LANES`, `STATUSES`, `STATE_FIELDS` (the 12 keys of `work.mjs:98`) `as const` with `Lane` and `Status`; `WorkState`; `ARTIFACT_BY_LANE: Record<Lane, WorkFile | null>`; `validateState`, `readState(root, id)`, `writeState(root, state, now)`, `listWork(root)`, `listOpenWork(root)`, `newId(title, now)`, `isSessionId`, `createWork(root, request, now)`. `markers.mts`: `PhaseMark` (`Marker` without `block.md`), `hasMarker(root, id, n, mark)`, `setMarker(root, id, n, mark, now)`. `verdict-log.mts`: D-006. `approvals.mts`: `appendComment(root, id, { path, text }, { cwd, now })`, `approvedCommentsFor(root, rel)`, `appendWaiver(root, id, { path, text, deleted }, { cwd, now })`, `itemWaivers(root, id)`, `waiversFor(root, rel)`; `approvedComments`, which nothing calls, goes. `block.mts`: D-007. Every helper takes `root` first and gets `now` and `cwd` as values, so no `.mts` file reads the process (scan 1); `Context` gains `cwd: string`, set by `edgeContext` to `process.cwd()`, which `comment` and `waive` pass on. JSONL goes through `util/io.mts`; paths through `files.mts` (`workRel(id)` wherever code writes `work/<id>/`), which gains `isWorkId(text): text is WorkId` so `listWork` returns `WorkId[]` and skips a folder whose name is not an id. `createWork` takes the base commit from `head(root)` in `shared/git.mts` instead of its own `execFileSync`; item 04b replaces it with `createItem` in the same file. Imports name the defining file; `.mjs` callers name the built `.mjs` (C-002).
**Instead of:** keeping `work.mjs` as a file that re-exports the new modules under the old `(id, root)` signatures: C-015 forbids barrels, and two calling conventions in `src/` would outlive this item.
**Risks:**
- **RISK-001** The `(id, root)` to `(root, id)` flip is unchecked in `.mjs` callers (`tsconfig.json` has `checkJs: false`), so a missed call reads `work/` under the wrong folder at runtime. Mitigation: phase 2's touch set lists every caller; each is exercised by an existing import or spawn test; a phase 2 criterion greps for any leftover import of a moved name from `work.mjs`.
- **RISK-002** `Context` gains a field, a change to item 02's type. Mitigation: the field is additive; `context.test.mjs` gains one assertion; contexts built in tests need it only for `comment` and `waive`.

### D-002: One read into a typed `WorkSnapshot`; `parseArtifact` owns the record's structure
**Decision:** The work item is the aggregate and `WorkSnapshot` its read model, built by one function; `stateView` is the published JSON (W-3, W-6). `artifact.mts` exports `PhaseEntry` (the frontmatter entry as written: `n` and optional `files`, `greps`, `tests`, `drive`, `security`, other keys kept, so `verify`'s list of declared keys does not change), `ArtifactPhase = { n; title; entry: PhaseEntry | null; touchSet: string[]; irreversible: boolean }`, `ParsedArtifact = { front; body; phases: ArtifactPhase[] }`, `parseArtifact(text)` (the heading regex of `work.mjs:152` and the section, touch set and code-stripping logic of `gate.mjs:16-64`, moved unchanged) and `phasePaths(phase)` (entry files, then touch set, once each, as `gate.mjs:34-37`). `snapshot.mts` exports `PhaseStatus = ArtifactPhase & { done; approved; reviewed }`, `WorkSnapshot = { state; artifact: { path; expected: WorkFile; body } | null; phases; verdicts: VerdictRow[]; ambiguousRefs: AmbiguousRef[]; warnings: string[] }`, `StateView`, `readSnapshot(root, id)`, `stateView(snap)`, `phaseOf(snap, n)` and `currentPhase(snap)`. `readSnapshot` reads `state.yaml`, the artifact, the markers, `verdicts.jsonl` and the intake record once each. Three changes from the draft's sketch, each from reading the code: `ambiguousRefs` holds the objects `sources.mjs:337` returns, because the packet prints their `source`, `path` and `candidates`; `artifact` carries `body`, because the research packet reads `## Summary` from it (`packet.mjs:130-133`); `stateView` adds `warnings` only when there is one, so a clean item prints what `deriveState` printed, byte for byte.
**Instead of:** a lazy snapshot whose getters read on first use: it saves reads for callers that need only `state`, but puts disk reads back inside the decisions W-4 makes pure.
**Risks:**
- **RISK-003** `stateView` differs from today's JSON in key order, the absolute `artifact` path or the phase fields, and skills reading `picket state` break (draft R-2). Mitigation: phase 3's golden test compares three items with JSON captured from `picket state` at `c7ee39d`.
- **RISK-004** A second process writing between two snapshot reads is missed (draft R-4). Mitigation: none needed; it is today's behaviour, and verdicts arrive one at a time.

### D-003: `ownGate` and `nextStep` are pure; `next-view.mts` holds the printed shape and the readers
**Decision:** Domain services over the read model (W-4). `gate.mts`: `Gate = { kind: "security_path" | "security_mark" | "irreversible"; reason: string }` and `ownGate(phase: Pick<ArtifactPhase, "entry" | "touchSet" | "irreversible"> | undefined, securityPaths: readonly string[]): Gate | null`, `null` for `undefined`. Two changes from the draft's sketch keep today's behaviour: the reason names the first matching file (`touches a security path (src/auth/apiKey.ts)`, as `gate.test.mjs:62` and every recorded packet show), not the configured entry; and the mark stays fail closed, any `security` value but `false` (`gate.mjs:48-50`). `next-step.mts`: `NEXT_ACTIONS` `as const`, the draft's `NextStep` union, and `nextStep(snap, securityPaths)` with the ladder of `next-step.mjs:22-81` in its order and wording. `next-view.mts`: `NextView`, today's keys in today's order (`id`, `lane`, `status`, `phase`, `options`, `own_gate`, `action`, `actor`, `detail`, then `warnings` only when present); `nextView(snap, step)`, pure; `readNext(root, id)`, which reads, decides and views; and `latest(root, { session })`, one snapshot per open item and no second read for its `next`.
**Instead of:** `readNext` and `latest` inside `next-step.mts`: one file mixing pure and reading code, whose tests would need folders again.
**Risks:**
- **RISK-005** Item 08a adds `resolve_rejections`, lane-aware `resolve_block` options and the `[i]` options (draft revision log). Mitigation: the union and `NEXT_ACTIONS` have one owner, so each addition is a checked change in one file with its object test.

### D-004: `route` plans a `Change[]` and applies it once
**Decision:** An application service in three steps (W-5). `verbs/route/plan.mts`: `Effect`, the nine effects of `shared/verdicts.mjs`; `PlannedVerdict = RouteInput & { phase: number | null }`; `Change = { kind: "marker"; phase; mark: PhaseMark; line: string | null } | { kind: "state"; set?: Partial<WorkState>; unset?: (keyof WorkState)[]; line: string | null } | { kind: "note"; line: string } | { kind: "commit"; phase }`, where `line` is the `applied` text; `EFFECTS: Record<Effect, (snap, planned, gateOf) => Change[]>`, pure, throwing `Refused` for "needs a phase" and "is not done; cannot approve". `apply.mts`: `applyChanges(root, snap, changes, { now, env, session, row }): string[]` writes markers in order, merges every `state` change and the session claim into one `writeState` (none when nothing changes), appends the verdict row, then commits. `commit.mts`: `commitPhase(root, snap, phase, env): string[]`, today's `route.mjs:18-40` with `proposedCommit` and `workRel`. `index.mts`: `route(input, ctx): RouteResult`, synchronous: agent and verdict checks throwing `Refused` with today's messages, read, plan, apply, read again, `nextView`; `routeVerdict = action(...)` fills `session` from `ctx.session` as the adapter does today. The `route.verdict` hook calls `route` with `edgeContext(root)` and keeps its catch, so it stays synchronous until item 05 maps outcomes. `applied` wording is unchanged; the CLI exits 2 for a refusal.
**Instead of:** only an async action, which the hook awaits: the hook and its handler tests turn async now, which is item 05's change (05 H-4).
**Risks:**
- **RISK-006** The order or wording of `applied` lines changes, and the gate packet and skills read them. Mitigation: `route.test.mjs` (23 tests) passes with bodies unchanged; one object test per effect pins its `line` texts.
- **RISK-007** One state write instead of one per branch drops a write a reader relied on, such as the `updated` bump of a rejection without a run grant. Mitigation: a `rejection` plan always holds a `state` change, so it still writes; the per-effect tests check which plans write.

### D-005: `securityPathOf` is the one matcher; this item wires it into the gate (fixes B3)
**Decision:** Infrastructural decision, carrying W-7 with the draft's code and its twelve cases: `src/lib/shared/security-paths.mts` exports only `securityPathOf(path, configured)`; `\` and `/` alike, a leading `./` and a trailing `/*` or `/**` ignored, a folder boundary required, a single folder name (`Authentication/`) matching at any depth, an entry with an inner `/` anchored at the root, case significant. The gate calls it from phase 1 on. `admit` and the review summary switch in item 04d (draft "Affects"; 04d P-1, P-2 and its phase 2), so B3 is fixed for the gate here and for `admit` there (OQ-001). Phase 1 is `security: false`, as the user directed for this item (OQ-002).
**Instead of:** fixing `gate.mjs`'s own `normalise` and `asPrefix`: B3 is three matchers, and a fourth correct one changes nothing about that.
**Risks:**
- **RISK-008** The fix changes behaviour (draft R-3): `src/pay` stops matching `src/payment-ui/`, and with the defaults `src/Api/Authentication/` gates a phase in every project. Mitigation: the user chose the any-depth rule on 2026-10-22; the twelve cases are tests; the rule text and the release note are items 08 and the release.

### D-006: Unreadable verdict lines are skipped and reported (fixes B4)
**Decision:** Infrastructural decision, carrying W-8 and C-010. `verdict-log.mts`: `VerdictRow = { ts: string; agent: string; verdict: string; phase: number | null; scope: string | null; through: number | null; classes?: string[] }`, `appendVerdict(root, id, row, now)` through `appendJsonl`, `readVerdicts(root, id): JsonlRead<VerdictRow>` through `readJsonl`. `readSnapshot` turns `skipped` into the warning `verdicts.jsonl: 1 unreadable line skipped` (`lines` for more than one), which `picket state` and `picket next` print in `warnings`; `close`'s repeated-class count reads `rows`. The approval files `comments.jsonl` and `waivers.jsonl` also go through `readJsonl` and skip silently, since no verb shows their warnings.
**Instead of:** refusing the item until the line is fixed by hand: one crash mid-append would stop the lane, and the fix is an edit to a file only the kernel writes.
**Risks:**
- **RISK-009** A skipped line hides a verdict, for example a cumulative `APPROVED`, so `next` asks for that step again. Mitigation: the warning names the file; a lost verdict repeats a step and never skips one.

### D-007: Block parsing in `shared/work/block.mts`, with `proposedCommit`
**Decision:** Infrastructural decision, carrying W-9. `block.mjs` converts in place: `Block = { title: string | null; headline: string; fields: Record<string, string>; verdict: "PHASE DONE" | "PHASE STALLED" | null }`, `blockPath(root, id, n)`, `saveBlock(root, id, n, text)`, `readBlock(root, id, n)`, `blockFiles(root, id, n)`, `parseBlock(text)` and `proposedCommit(block): string | null`, the commit field with its ` (staged...)` tail removed, the one copy of that regex; `PATH_TOKEN` and the field regexes stay as item 03 left them (B11). `commit.mts` keeps today's rule that a field holding only a 7 to 40 character hex sha falls back to `<title>, phase <n> of <id>`; the packet shows the field through `proposedCommit` as before. The block heading table from `turn-block` joins this file in item 04d (P-6, draft revision log).
**Instead of:** a regex constant shared by `route` and `packet`: it removes the copy but leaves the "what did the developer propose" rule in two callers.
**Risks:**
- **RISK-010** A caller passes `(id, n, root)` to a `(root, id, n)` function. Mitigation: the `.mts` callers are type-checked; the two `.mjs` callers (`route.verdict`, `packet`) are covered by `handlers.test.mjs` and `packet.test.mjs`.

### D-008: Integration tests keep their bodies; decisions get object tests
**Decision:** Infrastructural decision, carrying R-1 and W-4's "tests of decisions become plain objects". `test/kernel/work-fixture.mjs` exports today's call shapes for exactly the functions whose signature changes (`createWork(o)`, `readState(id, root)`, `writeState(state, root)`, `setMarker(id, n, kind, root)`, `appendVerdict(id, entry, root)`, `appendWaiver(id, entry, root)`, `saveBlock(id, n, text, root)`, `blockFiles(id, n, root)`, `newId(title, now)`, `deriveState(id, root)`, `ownGate(id, n, root)`, `phasePaths(id, n, root)`, `mustHaves(id, n, root)`, `next(id, root)`, `route(o)`), each one call into the new module with `new Date()` or `edgeContext(root)`; test files change only their import lines, so the integration suites (`route` 23, `next` 14, `close` 20, `packet` 14, plus `gate`, `work`, `verify` and the hook tests) keep their bodies. `test/kernel/snapshot-fixture.mjs` exports `snapshotOf(partial)`, a full `WorkSnapshot` with defaults (id `20261023-probe`, status `open`, phases with title `Phase <n>`, no markers, no entry); object tests cover each `ownGate` branch, each rung of the `nextStep` ladder and each route effect. Item 06 moves both helpers beside the code (`06-tests.md`, `snapshotOf`).
**Instead of:** rewriting about 250 test call lines to the new signatures: they would change in the same commit as the code they check, so a green suite would prove less.
**Risks:**
- **RISK-011** The fixture hides a mistake in the new signatures. Mitigation: each fixture function is one call; the object tests, the golden test and the CLI spawn tests call the new modules directly.

## Scope

**In:**
- `shared/security-paths.mts` and the gate on it (D-005).
- `shared/work/` split into `state`, `markers`, `verdict-log`, `approvals`, `block`, `artifact`, `snapshot`, `gate`, `next-step`, `next-view` (`.mts`); `work.mjs`, `gate.mjs`, `next-step.mjs`, `block.mjs` deleted (D-001 to D-003, D-006, D-007).
- `verbs/route/` as `index`, `plan`, `apply`, `commit` (`.mts`); `route.mjs` deleted; `verbs/close/close.mjs` converted to `.mts` with refusals narrowed, as item 03 left for this item (D-004).
- Every caller of a moved name repointed, `Context.cwd`, the two test fixtures, the golden, B4 and read-count tests (D-008).

**Out:**
- `currentItem` in `state.mts` (item 04c, E-4); `verify` built on `PhaseEntry` beyond dropping `mustHaves` (04c).
- `createItem` and `ambiguousRefs` computed by the sources code (04b); `admit` and the review summary on `securityPathOf`, and the block heading table in `block.mts` (04d).
- The hooks calling actions and mapping outcomes, and their heading regexes (05); tests beside their code and `#test/` helpers (06).
- `resolve_rejections`, lane-aware `resolve_block` options and the `[i]` options in `nextStep` (08a); the security-paths rule text naming the any-depth case (08); the release note (draft R-3).
- Converting `packet.mjs`, `verify.mjs`, `preflight.mjs`, `drive.mjs` and the other verb modules to `.mts`; they only repoint.

## Phase 1: One security path matcher (B3)

**Touch set:**
- `src/lib/shared/security-paths.mts`: new, `securityPathOf`
- `src/lib/shared/work/gate.mjs`: `firstSecurityPath` calls it; `asPrefix`, `normalise` go
- `src/lib/shared/config.mjs`: read only, `securityPaths(root)`, `DEFAULT_SECURITY_PATHS`
- `test/kernel/security-paths.test.mjs`: new, the twelve cases
- `test/kernel/gate.test.mjs`: three tests added, existing ones unchanged
- `src/lib/verbs/admit/admit.mjs:57`, `src/lib/shared/review-summary.mjs:135,169`: read only, item 04d's (OQ-001)

**Changes:**
- `security-paths.mts` holds the draft's code (`04a-work-item-model.md`, "One security path matcher (B3)"): private `normalise`, `asPrefix`, `isFolderName` and the exported `securityPathOf(path: string, configured: readonly string[]): string | null`, returning the matching entry.
- `gate.mjs` imports `securityPathOf` from `../security-paths.mjs`; `firstSecurityPath(paths, root)` returns the first path for which `securityPathOf(path, securityPaths(root))` is not `null`, so the reason still names the file. Its `asPrefix` and `normalise` go; nothing else in `gate.mjs` changes.
- `security-paths.test.mjs` imports `dist/lib/shared/security-paths.mjs` and runs the draft's twelve rows against `["src/auth/", "src/payments/**", "src/pay", "Authentication/", "./src/crypto/*"]`.
- `gate.test.mjs` adds three tests through its own `withDesign`: the default config with `src/Api/Authentication/Handler.cs` in the touch set; `security_paths: ["./src/crypto/*"]` with `files: [src/crypto/aes.ts]`; `security_paths: ["src/pay"]` with `files: [src/payment-ui/button.tsx]`.

**Done when:**
- **T-1.1** `security-paths.test.mjs` shows each of the draft's twelve rows: `src/auth/token.ts` and `src\auth\token.ts` give `src/auth/`; `src/authz/rule.ts`, `lib/src/auth/token.ts`, `src/payment-ui/button.tsx`, `src/Api/MyAuthentication/Handler.cs` and `src/Api/Authentication.cs` give `null`; `src/payments/charge.ts` gives `src/payments/**`; `src/pay/refund.ts` gives `src/pay`; `./src/crypto/aes.ts` gives `./src/crypto/*`; `Authentication/Handler.cs` and `src/Api/Authentication/Handler.cs` give `Authentication/`.
- **T-1.2** `gate.test.mjs`'s seven existing tests pass unchanged; the added tests show `{ kind: "security_path", reason: "touches a security path (src/Api/Authentication/Handler.cs)" }`, `security_path` for `src/crypto/aes.ts` under `./src/crypto/*` (`null` before this phase), and `null` for `src/payment-ui/button.tsx` under `src/pay`.
- **T-1.3** `gate.mjs` holds no security path matching of its own (no `asPrefix`, no `normalise`); `npm run typecheck` exits 0 and `npm test` passes with no fewer passing tests than at `c7ee39d`, plus the new ones.
- **T-1.4** Driven: on a temp design item whose phase 1 is done and whose touch set lists `src/Api/Authentication/Handler.cs`, `node dist/bin/picket.mjs next <id> --root <tmp>` prints `"own_gate":{"kind":"security_path","reason":"touches a security path (src/Api/Authentication/Handler.cs)"}`, where `c7ee39d` printed `"own_gate":null`.

## Phase 2: `work.mjs` splits into single-job files (B4 stops the crash)

**Touch set:**
- `src/lib/shared/work/state.mts`, `markers.mts`, `verdict-log.mts`, `approvals.mts`: new (D-001, D-006)
- `src/lib/shared/work/block.mjs` to `src/lib/shared/work/block.mts`: convert in place, `proposedCommit` (D-007)
- `src/lib/shared/work/work.mjs`: keeps only `readArtifact` and `deriveState`, over the new files
- `src/lib/shared/work/files.mts`: `isWorkId`
- `src/lib/shared/context.mts`: `cwd`
- `src/lib/shared/git.mts`: read only, `head(root)` for `createWork`
- `src/lib/util/io.mts`: read only, `readJsonl`, `appendJsonl`, `readText`
- `src/lib/util/yaml-lite.mjs`, `src/lib/shared/repos.mjs`, `src/lib/shared/sources/sources.mjs`, `src/lib/shared/config.mjs`: read only, `createWork`'s imports
- `.mjs` callers, imports and argument order: `shared/work/next-step.mjs`, `verbs/route/route.mjs`, `verbs/close/close.mjs`, `verbs/packet/packet.mjs`, `verbs/mutate/mutate.mjs`, `shared/mutation.mjs`, `shared/review-summary.mjs`, `hooks/emit.ledger.mjs`, `hooks/guard.comments.mjs`, `hooks/guard.silenced.mjs`, `hooks/inject.state.mjs`, `hooks/observe.drive.mjs`, `hooks/route.verdict.mjs` (all under `src/lib/`)
- `projectRoot` from `shared/paths.mjs` instead of `work.mjs`: `verbs/verify/verify.mjs`, `verbs/preflight/preflight.mjs`, `verbs/drive/drive.mjs`, `verbs/admit/admit.mjs`, `verbs/cost/cost.mjs`, `shared/checks.mjs` (all under `src/lib/`)
- `.mts` adapters: `src/lib/verbs/comment/index.mts`, `waive/index.mts`, `set/index.mts`, `leave/index.mts`, `open/index.mts`, `source/add.mts`, `source/pick.mts`, `list/index.mts`
- `test/kernel/work-fixture.mjs`: new (D-008)
- import lines only: `test/kernel/route.test.mjs`, `next.test.mjs`, `close.test.mjs`, `packet.test.mjs`, `gate.test.mjs`, `leave.test.mjs`, `migrate.test.mjs`, `mutate.test.mjs`, `preflight.test.mjs`, `review.test.mjs`, `verify.test.mjs`, `admit-labelled.test.mjs`, `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs`
- `test/kernel/work.test.mjs`, `context.test.mjs`, `work-files.test.mjs`: imports, plus the tests below

**Changes:**
- Order follows C-003: `files.mts` and `context.mts`, then `verdict-log`, `markers`, `approvals`, `block`, `state`, then `work.mjs`, then the callers; build and test after each group.
- The new files hold today's bodies with D-001's signatures. `writeState(root, state, now)` sets `updated` from `now`; `setMarker` writes `now.toISOString()`; `appendVerdict` puts `ts` first, as today. `readApprovals` uses `readJsonl` and keeps adding `id` to each row. `appendWaiver` keeps its open-or-blocked check and message. `createWork`'s checks, write order and messages stay; `IntakeError` still comes from `sources.mjs`.
- `.mjs` callers pass `new Date()` and `process.cwd()` where a new helper needs them; `.mts` adapters pass `ctx.now()` and `ctx.cwd`. `close.mjs` reads `readVerdicts(root, id).rows`.
- `route.mjs`'s commit message and `packet.mjs`'s commit line call `proposedCommit(parseBlock(...))`; `route.mjs` still tests the raw field against the sha pattern first, as today.
- `work.mjs` keeps `readArtifact(id, root)` and `deriveState(id, root)` with today's signatures and output; `deriveState` reads `readVerdicts(...).rows`. Nothing else stays in it.
- `work-fixture.mjs` starts with the shapes this phase changes: `createWork`, `readState`, `writeState`, `setMarker`, `appendVerdict`, `appendWaiver`, `saveBlock`, `blockFiles`, `newId`; each test file imports a moved name from the fixture when its call shape changed and from the defining `dist/` file otherwise (`LANES` from `dist/lib/shared/work/state.mjs`, `parseBlock` from `block.mjs`).

**Done when:**
- **T-2.1** The paths in this phase's `files` exist and `src/lib/shared/work/block.mjs` does not; `npm run typecheck` exits 0; `npm test` passes, and `git diff HEAD -- test` (against phase 1's commit) shows only import lines changed in the existing tests, plus the new tests.
- **T-2.2** `work.mjs` exports only `readArtifact` and `deriveState`; `git grep -n "work/work.mjs" -- src` lists only files that import those two; no file under `src/` imports `projectRoot` from `work.mjs`.
- **T-2.3** `conventions.test.mjs` passes with the new `.mts` files in its scans: none holds `projectRoot(`, `process.cwd(`, `process.env`, `new Date(`, `execFileSync` or a `` `work/${ `` template.
- **T-2.4** `work.test.mjs` shows `readVerdicts` over two valid lines and a last line `{"ts":"2026` returning 2 rows and `skipped: 1`; `listWork` skipping a folder `Bad_Name` that holds a `state.yaml`, and `work-files.test.mjs` showing `isWorkId` true for `20261023-x` and false for `Bad_Name`; `appendComment` with `cwd` at `<root>/src` and path `a.ts` recording `src/a.ts`; `proposedCommit` giving `feat(x): y` for `Commit: feat(x): y (staged; approval commits it)` and `null` for a block with no `Commit:` field.
- **T-2.5** `context.test.mjs` shows `edgeContext("/r").cwd` equal to `process.cwd()`.
- **T-2.6** Driven: on a temp order item whose `verdicts.jsonl` ends with the line `{"ts":"2026`, `node dist/bin/picket.mjs next <id> --root <tmp>` and `picket state <id>` exit 0 (at `c7ee39d` both exit 1 with a JSON parse error); `picket comment <id> --path a.ts --text t --root <tmp>` run from `<tmp>/src` records `"path":"src/a.ts"`.

## Phase 3: One read into a `WorkSnapshot`; `ownGate` pure

**Touch set:**
- `src/lib/shared/work/artifact.mts`, `snapshot.mts`, `gate.mts`: new (D-002, D-003)
- `src/lib/shared/work/work.mjs`, `src/lib/shared/work/gate.mjs`: deleted
- `src/lib/shared/work/next-step.mjs`: reads one snapshot; `ownGate(phaseOf(snap, n), securityPaths(root))`; `ambiguousRefs` from the snapshot
- `src/lib/verbs/route/route.mjs`: `stateView(readSnapshot(...))`, `ownGate` and `phasePaths` on `phaseOf`
- `src/lib/verbs/close/close.mjs`: phases and `phasePaths` from the snapshot
- `src/lib/verbs/packet/packet.mjs`: `stateView(readSnapshot(...))`; research body from `snap.artifact.body`
- `src/lib/verbs/verify/verify.mjs`: phase and entry from the snapshot; `mustHaves` goes
- `src/lib/verbs/preflight/preflight.mjs`, `verbs/drive/drive.mjs`, `shared/review-summary.mjs`, `hooks/observe.drive.mjs`, `hooks/inject.state.mjs`, `verbs/list/index.mts`, `verbs/state/index.mts` (under `src/lib/`): `stateView(readSnapshot(root, id))` for `deriveState(id, root)`
- `src/lib/shared/sources/sources.mjs:337`, `src/lib/shared/config.mjs:197`: read only, `ambiguousRefs`, `securityPaths`
- `test/kernel/work-fixture.mjs`: adds `deriveState`, `ownGate`, `phasePaths`, `mustHaves` (D-008)
- `test/kernel/state-view.test.mjs`, `test/kernel/state-view.json`, `test/kernel/artifact.test.mjs`: new
- `test/kernel/gate.test.mjs`: object tests appended; `verify.test.mjs`, `work.test.mjs`, `route.test.mjs`, `test/hooks/hooks.test.mjs`: import lines
- `test/kernel/extensions.test.mjs:121-127`: the start list names `src/lib/shared/work/gate.mts`

**Changes:**
- Capture first: before any change, build the three golden items (below) in a temp root and save `JSON.stringify(deriveState(id, root))` for each, with the root replaced by `<root>`, as `test/kernel/state-view.json` (`{ "fast": "...", "order": "...", "design": "..." }`). Phase 2 left `deriveState`'s output as at `c7ee39d`.
- The golden items are written as files with fixed text, not through `createWork`: a fast item with no artifact; an order item with three phases, phase 1 done and approved, phase 2 done, two verdict rows; a design item whose phase 2 is `security: true` and lists `src/auth/token.ts`, one `reviewed` marker, and a `blocked` status with its reason.
- `artifact.mts`, `snapshot.mts` and `gate.mts` per D-002 and D-003. `readSnapshot` checks markers with `hasMarker`, reads the artifact with `readText`, and builds `warnings` per D-006. `stateView` maps each phase to `{ n, title, done, approved, reviewed }` and keeps `deriveState`'s key order: the state fields as parsed, then `artifact`, `artifact_expected`, `phases`, `phase_count`, `phases_approved`, `current_phase`, `verdicts`, `last_verdict`, then `warnings` when not empty.
- Callers switch as the touch set says; behaviour is unchanged, except that `picket state` now prints the B4 warning.
- Object tests for `ownGate` build phases as plain objects: a security path from entry files, from the touch set, with backslashes; a mark of `true`, `"yes"` and `false`; an absent mark; `irreversible: true`; `undefined`.

**Done when:**
- **T-3.1** The paths in this phase's `files` exist and `work.mjs` and `gate.mjs` do not; `git grep -nE "\b(deriveState|readArtifact|mustHaves)\b|export function phaseEntry\b" -- src` finds nothing (private helpers such as `phaseEntry` and `readArtifactFile` may remain); `npm run typecheck` exits 0; `npm test` passes with existing test bodies unchanged.
- **T-3.2** `state-view.test.mjs` shows `JSON.stringify(stateView(readSnapshot(root, id)))`, root replaced by `<root>`, equal to the stored string for each of the three items.
- **T-3.3** `artifact.test.mjs` shows `parseArtifact` reading `## Phase 1: A` and `## Phase 2 - B` as titles `A` and `B`, each phase's frontmatter entry, the touch set's backticked paths and nothing from `**Changes:**`, `irreversible` true for a prose `[IRREVERSIBLE]` and false inside inline code or a fence, and `phasePaths` giving entry files then touch-set paths once each.
- **T-3.4** `gate.test.mjs`'s object tests cover each branch listed in Changes and create no folder; its seven folder tests pass unchanged.
- **T-3.5** Driven: `picket state <id> --root <tmp>` on the truncated-verdicts item of T-2.6 prints `"warnings":["verdicts.jsonl: 1 unreadable line skipped"]` with `last_verdict` the last readable row; on a clean item the output has no `warnings` key.
- **T-3.6** `extensions.test.mjs` passes with `gate.mts` in its start list, so nothing reachable from the gate imports the extension loader.

## Phase 4: `nextStep` pure; one snapshot per caller

**Touch set:**
- `src/lib/shared/work/next-step.mts`, `src/lib/shared/work/next-view.mts`: new (D-003)
- `src/lib/shared/work/next-step.mjs`: deleted
- `src/lib/verbs/route/route.mjs`, `src/lib/verbs/close/close.mjs`, `src/lib/verbs/set/index.mts`, `src/lib/verbs/open/index.mts`, `src/lib/verbs/source/pick.mts`: `readNext(root, id)`
- `src/lib/verbs/packet/packet.mjs`: one snapshot, `nextView(snap, nextStep(snap, securityPaths(root)))`
- `src/lib/verbs/list/index.mts`, `src/lib/hooks/inject.state.mjs`: one snapshot per item for its row and its next action
- `src/lib/verbs/next/index.mts`: `readNext` and `latest`; its action is renamed `showNext`, freeing the name `nextStep`
- `test/kernel/snapshot-fixture.mjs`, `test/kernel/next-step.test.mjs`: new (D-008)
- `test/kernel/work-fixture.mjs`: adds `next(id, root)`; `test/kernel/next.test.mjs`: import lines (`latest` from `dist/lib/shared/work/next-view.mjs`)
- `test/kernel/extensions.test.mjs`: the start list names `next-step.mts`

**Changes:**
- `nextStep` is `next-step.mjs:22-81` over `snap` with no I/O: `ambiguousRefs` and `warnings` come from the snapshot, `ownGate(phaseOf(snap, n), securityPaths)` from `gate.mts`. `HEAVY`, the midpoint rule, every `detail` and every option string are unchanged.
- `nextView` puts `id`, `lane` and `status` from `snap.state` around the step, `phase: null`, `options: []` and `own_gate: null` where the step has none, in the key order of D-003, and `warnings` last when the snapshot has any. `latest` keeps `sinceOf`, `newestOf`, `stampOf` and its extra keys (`title`, `phases_approved`, `phase_count`, `blocked_reason`, `since`, `by`, `session`, `other_session`) and its empty answer.
- `snapshotOf(partial)` per D-008; `next-step.test.mjs` holds one object test per rung of the ladder.

**Done when:**
- **T-4.1** The paths in this phase's `files` exist and `next-step.mjs` does not; `git grep -n "next-step.mjs" -- src test` finds nothing; `npm run typecheck` exits 0; `npm test` passes with `next.test.mjs`'s 14 test bodies unchanged.
- **T-4.2** `next-step.test.mjs` shows, from plain objects and with no folder created: `none` for done and for abandoned; `resolve_block` with `[c] continue`, `[x] abandon`; `resolve_sources` for one ambiguous reference; `close` by `lead` for a fast item; `write_artifact` by `architect` (order) and by `analyst` (research) with no artifact, and by `architect` with no phase headings; `approve_phase` phase 1 for a research report; `review_cumulative` when every phase is approved and none reviewed; `close` when all are reviewed or a cumulative `APPROVED` row exists; `review_checkpoint` on phase 3 of a six-phase design before phase 4; `implement_phase` with detail `phase 2 of 3: Phase 2`; `approve_phase` with `[a] approve`, `[r] run through 3`, `[x] reject: <why>`, and without `[r]` on the last phase; and an `own_gate` detail ending `; it touches a security path (src/auth/token.ts)`.
- **T-4.3** A `nextView` test shows `Object.keys` in D-003's order, no `warnings` key for a clean snapshot, and `["verdicts.jsonl: 1 unreadable line skipped"]` for a snapshot carrying that warning.
- **T-4.4** Driven: `picket next <id> --root <tmp>` on the truncated-verdicts item prints that warning and exits 0; `picket next --latest --root <tmp>` and `picket list --root <tmp>` print what they printed at `c7ee39d` for the same items (the `cli.test.mjs` cases pass unchanged).
- **T-4.5** `extensions.test.mjs` passes with `next-step.mts` in its start list.

## Phase 5: `route` plans, then applies once

**Touch set:**
- `src/lib/verbs/route/index.mts`: `route(input, ctx)`, the action, spec and renderer (D-004)
- `src/lib/verbs/route/plan.mts`, `apply.mts`, `commit.mts`: new (D-004)
- `src/lib/verbs/route/route.mjs`: deleted
- `src/lib/hooks/route.verdict.mjs:110`: `route({ ... }, edgeContext(root))` from `../verbs/route/index.mjs`
- `src/lib/shared/verdicts.mjs`, `src/lib/shared/agent-name.mjs`, `src/lib/shared/ledger.mjs`, `src/lib/shared/git.mts`: read only
- `test/kernel/work-fixture.mjs`: adds `route(o)`; `test/kernel/route.test.mjs`: import lines, plus the read-count test
- `test/kernel/route-plan.test.mjs`: new, one object test per effect
- `test/kernel/extensions.test.mjs`: the start list names `verbs/route/index.mts`
- `test/hooks/handlers.test.mjs`: read, the `routeVerdict` tests pass unchanged

**Changes:**
- `plan.mts`, `apply.mts`, `commit.mts` and `index.mts` per D-004; `RouteInput` gains `classes?: string[]` for the hook; `RouteResult = { id, verdict, phase: number | null, applied: string[], next: NextView }`.
- `EFFECTS` keeps each branch of `route.mjs:78-145`: `phase_done` (done marker; with a run grant covering the phase and not yet approved, either the stop note with `run_through` unset or the approved marker with `(run grant through <n>)` and a commit), `phase_approved` (refused unless done; approved marker; `run_through=<n>` when `through` is past the phase; commit), `phase_reviewed` (cumulative: every unreviewed phase, one line `all phases reviewed`; else the phase), `rejection`, `drift` and `stall`, and the three that change nothing.
- `applyChanges` writes state only when a change or the session claim differs from `snap.state`; the verdict row is `{ ts, agent, verdict, phase, scope, through }` plus `classes` on a classed `CHANGES REQUIRED`, as `route.mjs:50-54,148`.
- The hook builds the context with `edgeContext(root)` and passes `session: event.session_id` in the input; its text and catch stay.

**Done when:**
- **T-5.1** The paths in this phase's `files` exist and `route.mjs` does not; `git grep -n "route/route" -- src test` finds nothing; `npm run typecheck` exits 0; `npm test` passes with `route.test.mjs`'s 23 bodies and `handlers.test.mjs`'s `routeVerdict` tests unchanged.
- **T-5.2** `route-plan.test.mjs` shows, from `snapshotOf` objects: `PHASE DONE` without a grant gives one marker line `phases/1.done`; with `run_through: 2` and no gate, `phases/1.approved (run grant through 2)` and a commit change; with a touch set on `src/auth/x.ts`, an unset of `run_through` and the line `run grant stops here: phase 1 touches a security path (src/auth/x.ts); it takes its own approval`; `approved` on a phase not done throws `Refused` matching `not done`; `approved` with `through: 3` gives `run_through=3`; `CHANGES REQUIRED` gives `run grant cleared`; `PHASE STALLED` on phase 2 gives `status=blocked (PHASE STALLED on phase 2)`; `ARTIFACT WRITTEN` gives no change; and every `effect` in `VERDICTS` has an `EFFECTS` entry.
- **T-5.3** A `route.test.mjs` test that wraps `fs.readFileSync` (with `syncBuiltinESMExports`) around one `PHASE DONE` on a two-phase order with a run grant through 2, in a git repo, counts at most 2 reads each of `state.yaml` and `order.md`, against 9 and 5 in the draft's evidence, and `applied` starting `phases/1.done`, `phases/1.approved (run grant through 2)`, `committed `.
- **T-5.4** The same wrapping around `fs.writeFileSync` shows one write of `state.yaml` for an `approved --through 3` that also claims a new session.
- **T-5.5** Driven: `picket route <id> --verdict APPROVED --agent developer --root <tmp>` exits 2 with `"ok":false` and `"error":"\"APPROVED\" may only come from reviewer, not developer"`; `--verdict BOGUS` exits 2; `--verdict approved --agent user --phase 2` on a phase not done exits 2; a valid `PHASE DONE` exits 0 with `applied` as before.
- **T-5.6** `extensions.test.mjs` passes with `verbs/route/index.mts` in its start list.

## Phase 6: `close` and `packet` read one snapshot

**Touch set:**
- `src/lib/verbs/close/close.mjs` to `src/lib/verbs/close/close.mts`: convert in place
- `src/lib/verbs/close/index.mts`: `closeOrRefuse` goes; the action calls `close` with the context
- `src/lib/verbs/packet/packet.mjs`: one `readSnapshot` per call
- `src/lib/shared/git.mts`, `src/lib/shared/ledger.mjs`, `src/lib/shared/work/left.mts`: read only
- `test/kernel/close.test.mjs`: read, 20 tests pass unchanged
- `test/kernel/packet.test.mjs`: the read-count test added

**Changes:**
- `close(root, id, { message, touched }, { now, env }): CloseResult` reads one snapshot for the status, lane, phases and `nextStep`; `itemOwner` takes `phasePaths(phase)` and `blockFiles` for each phase and `workRel(id)`; `markDone` writes with `now`; `commitOwned` gets `env` from the context, not `process.env`. Refusals throw `Refused`: abandoned, staged paths outside the item, next not `close` (details `{ id, next: { action, actor, phase, detail } }`), and a failed commit (details `{ id }`), which keeps `close.test.mjs`'s T-1.6 case at exit 2. Any other error is a crash (exit 1), the narrowing item 03 left here.
- `packet(id, root, { width })` keeps its signature and output; it reads the snapshot once and takes the state fields, phases, the next view, the research body and the ambiguous references from it.

**Done when:**
- **T-6.1** The paths in this phase's `files` exist and `close.mjs` does not; `git grep -nE "CloseRefused|closeOrRefuse" -- src` finds nothing; `npm run typecheck` exits 0; `npm test` passes with `close.test.mjs`'s 20 and `packet.test.mjs`'s 14 test bodies unchanged.
- **T-6.2** Driven: `picket close <id> --root <tmp>` on an order item awaiting its cumulative review exits 2 with `{"ok":false,"error":"next is review_cumulative, not close","id":"<id>","next":{...}}` and `--human` prints `refused: next is review_cumulative, not close`, as before; `picket close no-such-item --root <tmp>` exits 1 with `picket: no work item` on stderr (exit 2 at `c7ee39d`).
- **T-6.3** A `packet.test.mjs` test that wraps `fs.readFileSync` around `packet(id, root)` on a done phase counts one read each of `state.yaml` and `order.md`.
- **T-6.4** `git grep -n "process.env" -- src/lib/verbs/close` finds nothing.

## Open questions

- **OQ-001** B3 is fixed here for the gate only: `admit.mjs:58` and `review-summary.mjs:135,169` keep a bare `startsWith` until item 04d (draft "Affects"), so a project with `src/payments/**` still gets no design lane from `admit` until then. Should the three call sites switch to `securityPathOf` in phase 1 instead? Owner: the lead, with the user. Fallback: follow the draft; 04d switches them.
- **OQ-002** Phase 1 changes when a run grant stops for a security path, which the template's `security` field counts as security-sensitive; the user's note for this item says to mark only a phase that touches a security path. Owner: the lead. Fallback: `security: false` on every phase, as the user directed; phase 1 is small and alone, so flipping it costs one extra gate.

## Revision log

- 2026-10-23: T-3.1: grep narrowed to the removed exports; it matched the private helpers `phaseEntry` and `readArtifactFile`, which phase 3 rightly added.
