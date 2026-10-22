# 04a: Work item model

Status: approved (2026-10-22).

A work item is read once into a typed snapshot, every decision about it (what comes next, whether a phase takes its own gate, what a verdict changes) is a pure function of that snapshot, and `route` writes its changes in one step. `work.mjs` splits into single-job files under `shared/work/`. Fixes B3 (security path matching) and B4 (one bad JSONL line breaks an item).

Item 04 is split in four: 04a work item model, 04b sources and intake, 04c running things (`drive`, `check`, `verify`, `mutate`, `preflight`, B2, B5), 04d reading and reporting (`admit`, review summary, `pr`, cost and ledger, `statusline`, transcript).

## Today

### One verdict reads the same files many times

Counted by wrapping `fs.readFileSync` around one `route({ verdict: "PHASE DONE", phase: 1 })` on an order with two phases and a run grant through 2:

```
applied: ["phases/1.done","phases/1.approved (run grant through 2)","committed 199f31c: one, phase 1 of 20261022-probe"]
reads during one PHASE DONE: {"state.yaml":9,"order.md":5,"verdicts.jsonl":2}
```

The reads come from `route()` calling `deriveState`, `ownGate` reading the artifact again, `commitPhase` calling `deriveState` and `phasePaths` again, and `next()` calling `deriveState` and `ownGate` once more. The cost in time is small; the cost in reading is that each step has its own view of the same file. Two of them parse the same frontmatter entry:

```js
// gate.mjs:39
function phaseEntry(front, n) {
  const phases = Array.isArray(front?.phases) ? front.phases : [];
  return phases.find((p) => Number(p?.n) === Number(n)) ?? null;
}

// verify.mjs:19
export function mustHaves(id, n, root = projectRoot()) {
  const art = readArtifact(id, root);
  const list = Array.isArray(art.front?.phases) ? art.front.phases : [];
  return list.find((p) => Number(p.n) === Number(n)) ?? null;
}
```

### Deciding and writing are mixed

- `route()` (`route.mjs:93`, 86 lines) is one `switch` over effects. Each branch reads and writes `state.yaml` on its own, and the session claim reads and writes it again after the switch. A verdict from the wrong agent throws a plain `Error`, which the CLI reports as a crash (exit 1).
- `next()` (`next.mjs:22`, 60 lines) is a readable ladder of decisions, but it starts by reading disk (`deriveState`, `ambiguousRefs`, `ownGate`). Every test of "what comes next" first builds a temp folder with `state.yaml`, `order.md` and marker files: 86 tests across `route`, `next`, `gate`, `close`, `verify`, `packet` and `work` do this.

### `work.mjs` does six jobs

Ids and folders, state, the artifact, markers, the verdict log, and comment and waiver approvals, in 277 lines with 20 hidden `root = projectRoot()` defaults.

### Smaller duplicates

- The commit-message cleanup `.replace(/\s*\(staged.*\)$/i, "")` is in both `route.mjs:20` and `packet.mjs:177`.
- Block parsing (`saveBlock`, `readBlock`, `parseBlock`, `blockFiles`) lives in `packet.mjs` but is used by `close`, `route` and the `route.verdict` hook.

### B4: one bad line breaks the item

`readVerdicts` (`work.mjs:245`) parses every line of `verdicts.jsonl` with a bare `JSON.parse`. A truncated last line, for example after a crash mid-append, makes `next`, `state` and `route` throw for that item.

### B3: security paths are matched three ways

`gate.mjs:66` normalises the configured entry (backslashes, trailing `**`, trailing `/`). `admit.mjs:57` and `review.mjs:135,169` use a bare `startsWith`. Checked against today's `securityPathHits` in `admit.mjs`:

```
admit today ["src/payments/**"] src/payments/charge.ts -> []
admit today ["src/pay"] src/payment-ui/button.tsx -> ["src/payment-ui/button.tsx"]
```

So a project that configures `src/payments/**` gets a gated phase but is never sent to the design lane by `admit`, and `src/pay` matches a sibling folder.

## Target

```
src/lib/shared/
  security-paths.mts       securityPathOf(path, configured): the one matcher (B3)
  work/
    files.mts              WorkId, workId(), workDir, workFile, phaseMarker, workRel (item 02)
    state.mts              WorkState, LANES, STATUSES, readState, writeState, listWork, listOpenWork, newId
    artifact.mts           ArtifactFront, PhaseEntry; parseArtifact(text): front, headings, sections, touch sets
    markers.mts            hasMarker, setMarker
    verdict-log.mts        appendVerdict, readVerdicts -> { rows, skipped } (B4)
    block.mts              saveBlock, readBlock, parseBlock, blockFiles, proposedCommit
    approvals.mts          comments and waivers
    left.mts               readLeft (used by close)
    snapshot.mts           readSnapshot(root, id): WorkSnapshot, the one read; stateView(snapshot)
    gate.mts               ownGate(snapshot, n, securityPaths), pure
    next-step.mts          nextStep(snapshot, securityPaths): NextStep, pure
src/lib/verbs/
  next/index.mts           reads a snapshot, returns nextStep
  state/index.mts          returns stateView(readSnapshot(...))
  route/
    index.mts              spec and action: check the agent, read, plan, apply
    plan.mts               EFFECTS: one pure function per effect -> Change[]
    apply.mts              applyChanges: markers, one state write, verdict row, commit
    commit.mts             commitPhase (only route commits a phase)
  close/index.mts          reads the snapshot; its own commit stays here
```

No `index.mts` in `shared/work/`: imports name the file that defines the symbol (C-015).

### The snapshot

```ts
// src/lib/shared/work/snapshot.mts
export type PhaseStatus = {
  n: number;
  title: string;
  entry: PhaseEntry | null;          // the frontmatter must_haves: files, greps, tests, drive, security
  touchSet: string[];
  irreversible: boolean;             // [IRREVERSIBLE] outside code in the phase section
  done: boolean;
  approved: boolean;
  reviewed: boolean;
};

export type WorkSnapshot = {
  state: WorkState;
  artifact: { path: string; expected: WorkFile } | null;
  phases: PhaseStatus[];
  verdicts: VerdictRow[];
  ambiguousRefs: string[];
  warnings: string[];                // "verdicts.jsonl: 1 unreadable line skipped"
};

export function readSnapshot(root: string, id: WorkId): WorkSnapshot
export function stateView(snap: WorkSnapshot): StateView     // the exact JSON `picket state` prints today
```

`readSnapshot` reads `state.yaml`, the artifact, the markers and `verdicts.jsonl` once each. `ambiguousRefs` comes from the sources code (04b) at read time, so `nextStep` stays pure.

### Pure decisions

```ts
// src/lib/shared/work/next-step.mts
export type NextStep =
  | { action: "none"; actor: null; detail: string }
  | { action: "resolve_block"; actor: "user"; detail: string; options: string[] }
  | { action: "resolve_sources"; actor: "user"; detail: string; options: string[] }
  | { action: "write_artifact"; actor: "architect" | "analyst"; detail: string }
  | { action: "implement_phase"; actor: "developer"; phase: number; detail: string }
  | { action: "approve_phase"; actor: "user"; phase: number; detail: string; options: string[]; own_gate: Gate | null }
  | { action: "review_checkpoint" | "review_cumulative"; actor: "reviewer"; phase: number; detail: string }
  | { action: "close"; actor: "lead"; detail: string };

export function nextStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep
```

```ts
// src/lib/shared/work/gate.mts
export type Gate = { kind: "security_path" | "security_mark" | "irreversible"; reason: string };

export function ownGate(phase: PhaseStatus, securityPaths: readonly string[]): Gate | null {
  const securePath = [...(phase.entry?.files ?? []), ...phase.touchSet].map((p) => securityPathOf(p, securityPaths)).find(Boolean);
  if (securePath) return { kind: "security_path", reason: `touches a security path (${securePath})` };
  if (phase.entry?.security) return { kind: "security_mark", reason: "is marked security-sensitive in the record" };
  if (phase.irreversible) return { kind: "irreversible", reason: "carries an irreversible step" };
  return null;
}
```

The ladder in `next()` keeps its order and wording; it stops reading disk, and the union type rejects an action name that does not exist. A test is a plain object:

```ts
test("a done phase on a security path takes its own gate", () => {
  const snap = snapshotOf({ lane: "design", phases: [{ n: 1, done: true, touchSet: ["src/auth/token.ts"] }] });
  assert.equal(nextStep(snap, ["src/auth/"]).own_gate?.kind, "security_path");
});
```

The JSON `picket next` prints keeps today's shape: `id`, `lane`, `status`, `phase`, `options`, `own_gate`, `action`, `actor`, `detail`, filled from the snapshot around the `NextStep`.

### `route`: plan, then apply

```ts
// src/lib/verbs/route/plan.mts
export type Change =
  | { kind: "marker"; phase: number; marker: Marker }
  | { kind: "state"; set?: Partial<WorkState>; unset?: (keyof WorkState)[] }
  | { kind: "commit"; phase: number }
  | { kind: "note"; text: string };

export const EFFECTS: { [E in Effect]: (snap: WorkSnapshot, input: PlannedVerdict, gateOf: (n: number) => Gate | null) => Change[] } = {
  phase_done: (snap, { phase }, gateOf) => {
    const changes: Change[] = [{ kind: "marker", phase, marker: "done" }];
    const through = snap.state.run_through;
    if (!through || phase > through || isApproved(snap, phase)) return changes;
    const gate = gateOf(phase);
    if (gate) return [...changes, { kind: "state", unset: ["run_through"] }, { kind: "note", text: `run grant stops here: phase ${phase} ${gate.reason}; it takes its own approval` }];
    return [...changes, { kind: "marker", phase, marker: "approved" }, { kind: "commit", phase }];
  },
  rejection: () => [{ kind: "state", unset: ["run_through"] }, { kind: "note", text: "run grant cleared" }],
  stall: (snap, { phase, reason }) => [{ kind: "state", set: { status: "blocked", blocked_reason: reason ?? `PHASE STALLED on phase ${phase ?? "?"}` } }],
  ...
};
```

```ts
// src/lib/verbs/route/index.mts
export const route = action<RouteInput, RouteResult>(async (input, { root, session }) => {
  const spec = VERDICTS[input.verdict];
  if (!fromAllowedAgent(spec, input.agent)) return refuse(`"${input.verdict}" may only come from ${spec.agent}, not ${input.agent}`, { verdict: input.verdict, agent: input.agent });
  const snap = readSnapshot(root, input.id);
  const planned = withPhase(input, snap);
  const security = securityPaths(root);
  const changes = EFFECTS[spec.effect](snap, planned, (n) => ownGate(phaseOf(snap, n), security));
  const applied = applyChanges(root, snap, changes, { session, verdict: verdictRow(planned) });
  const after = readSnapshot(root, input.id);
  return done({ id: input.id, verdict: input.verdict, phase: planned.phase, applied, next: nextView(after, nextStep(after, security)) });
});
```

`applyChanges` writes the markers, merges every `state` change into one `writeState` (the session claim included), appends the verdict row, then commits. Its `applied` lines keep today's wording, which the gate packet and the skills read. An unknown verdict or a missing phase becomes `refuse(...)` (exit 2) instead of a thrown `Error`.

### One security path matcher (B3)

```ts
// src/lib/shared/security-paths.mts
const GLOB_TAIL = /\/\*\*?$/;

function normalise(path: string): string {
  return path.replaceAll("\\", "/").replace(/^(\.\/)+/, "");
}

function asPrefix(entry: string): string {
  const path = normalise(entry).replace(GLOB_TAIL, "");
  return path.endsWith("/") ? path : `${path}/`;
}

function isFolderName(prefix: string): boolean {
  return prefix.indexOf("/") === prefix.length - 1;
}

export function securityPathOf(path: string, configured: readonly string[]): string | null {
  const file = normalise(path);
  return configured.find((entry) => {
    const prefix = asPrefix(entry);
    return isFolderName(prefix) ? `/${file}`.includes(`/${prefix}`) : file.startsWith(prefix);
  }) ?? null;
}
```

Run on Node 24 straight from the `.mts` source, with `["src/auth/", "src/payments/**", "src/pay", "Authentication/", "./src/crypto/*"]` configured:

```
ok   src/auth/token.ts                      -> src/auth/
ok   src/authz/rule.ts                      -> null
ok   src\auth\token.ts                      -> src/auth/
ok   lib/src/auth/token.ts                  -> null
ok   src/payments/charge.ts                 -> src/payments/**
ok   src/payment-ui/button.tsx              -> null
ok   src/pay/refund.ts                      -> src/pay
ok   ./src/crypto/aes.ts                    -> ./src/crypto/*
ok   Authentication/Handler.cs              -> Authentication/
ok   src/Api/Authentication/Handler.cs      -> Authentication/
ok   src/Api/MyAuthentication/Handler.cs    -> null
ok   src/Api/Authentication.cs              -> null
```

The gate, `admit` (04d) and the review summary (04d) all call `securityPathOf`. It returns the matching entry, so callers can name it in a reason.

## Decisions

### W-1: Item 04 splits into 04a to 04d
Four discussions of a size the user can review, each with its own draft and approval.

### W-2: `shared/work/` is a folder of single-job files, without a barrel
Imports name the file (`shared/work/state.mts`). Records the user's rule as C-015.

### W-3: One read into a typed `WorkSnapshot`
`readSnapshot` replaces `deriveState`, `readArtifact`, `mustHaves`, `phaseEntry` and `phasePaths` as the way verbs see an item. `picket state` prints `stateView(snapshot)`, the same JSON as today, because skills and agents read those fields.

### W-4: `nextStep` and `ownGate` are pure
They take the snapshot and the security paths and touch no disk. Tests of decisions become plain objects; a few integration tests through `readSnapshot` stay.

### W-5: `route` plans a `Change[]` and applies it once
One pure function per effect; one `writeState` per verdict; `applied` wording unchanged; a verdict from the wrong agent, an unknown verdict or a missing phase is a refusal (exit 2), not a crash.

### W-6: `parseArtifact` owns frontmatter entries, sections and touch sets
`PhaseEntry` is the typed must_haves (`files`, `greps`, `tests`, `drive`, `security`); `verify` (04c) and the gate both read it from the snapshot.

### W-7: `securityPathOf` is the one matcher (fixes B3)
`\` and `/` are treated alike, a leading `./` and a trailing `/*` or `/**` are ignored, and a folder boundary is required. An entry that is a single folder name (`Authentication/`, `Authorization/`) matches that folder at any depth; an entry with a `/` inside (`src/auth/`) is anchored at the repository root. Case stays significant, as today. The user chose the any-depth rule for folder names on 2026-10-22.

### W-8: Unreadable verdict lines are skipped and reported (fixes B4)
`readVerdicts` returns `{ rows, skipped }`; the snapshot adds a warning, which `picket state` and `picket next` show in `warnings`.

### W-9: Block parsing moves to `shared/work/block.mts`
Including `proposedCommit(block)`, the one place that strips `(staged; approval commits it)`; `route` and `packet` both call it.

## Migration

Two phases, after item 03's skeleton exists. Order inside follows C-003: files with no kernel imports first.

### Phase 1: the model
- `shared/security-paths.mts` with the twelve cases above as tests.
- `shared/work/files.mts`, `state.mts`, `artifact.mts`, `markers.mts`, `verdict-log.mts`, `block.mts`, `approvals.mts`, `left.mts`, `snapshot.mts`.
- A golden test: for three fixture items (fast, order mid-phase, design with a security phase), `stateView(readSnapshot(...))` equals today's `picket state` JSON byte for byte.
- A test with a truncated last line in `verdicts.jsonl`: `state` and `next` answer, with one warning.

### Phase 2: decisions and verbs
- `gate.mts` and `next-step.mts` as pure functions, with object tests for every branch of today's `next()` (14 tests today) and the gate (7 today).
- `verbs/route/` with `plan.mts` and `apply.mts`; `route.test.mjs` (22 tests) keeps passing unchanged as the integration suite, plus one object test per effect.
- `verbs/next`, `verbs/state`, `verbs/close` and `verbs/packet` read the snapshot; `deriveState`, `readArtifact`, `mustHaves`, `phaseEntry` and `phasePaths` are deleted.
- Repeat the read count: one `PHASE DONE` reads `state.yaml` and `order.md` at most twice each (once before planning, once for the `next` that follows).

## Risks

- R-1: the state machine is the heart of Picket. The existing integration tests (`route`, `next`, `close`, `packet`: 69 tests) stay and must pass unchanged; the new object tests are added, not swapped in.
- R-2: `stateView` must match today's JSON exactly; the golden test in phase 1 guards it.
- R-3: B3's fix changes behaviour. A project with `src/pay` configured stops flagging `src/payment-ui/`; one with `src/payments/**` starts getting the design lane from `admit`; and with the defaults, `src/Api/Authentication/` and `src/Api/Authorization/` become security paths in every project. All three are the intended meaning; the release note says so, and the security-paths rule text names the any-depth case (item 08).
- R-4: the snapshot is read before planning and again for the `next` that follows; a second process writing between the two would be missed. Same as today, and verdicts arrive one at a time.

## Affects

- 02: K-3's example `nextStep(root, id)` becomes `nextStep(snapshot, securityPaths)`.
- 03: the tree's `shared/block.mts`, `shared/gate.mts` and `shared/next-step.mts` move under `shared/work/`; the leave example imports `readState` from `shared/work/state.mts` and `workFile` from `shared/work/files.mts`, not from a barrel.
- 04b: `ambiguousRefs` is computed by the sources code for the snapshot.
- 04c: `verify` reads `PhaseEntry` from the snapshot instead of `mustHaves`.
- 04d: `admit` and the review summary call `securityPathOf`.
- 05: the `route.verdict` hook calls the `route` action and maps its outcome; `inject.state` uses `readSnapshot` and `nextStep`.

## Open questions

- Q-1: resolved 2026-10-22, the user chose that a single folder name matches at any depth (W-7).

## Revision log

- 2026-10-22: `shared/work/state.mts` gains `currentItem(root, { session })`, the one current-item rule (item 04c, E-4).
- 2026-10-22: `shared/work/block.mts` gains the block heading table from `turn-block` (item 04d, P-6).
- 2026-10-22: `nextStep` gains `resolve_rejections` after a third cumulative `CHANGES REQUIRED`, lane-aware `resolve_block` options, and `[i] confirm the irreversible step` for an irreversible phase (item 08a, I-4, I-5).
