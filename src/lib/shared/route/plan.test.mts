import { test } from "node:test";
import assert from "node:assert/strict";
import { EFFECTS, type Change, type Effect, type PlannedVerdict } from "./plan.mts";
import { ownGate } from "../work/gate.mts";
import { phaseOf, type WorkSnapshot } from "../work/snapshot.mts";
import { Refused } from "../action.mts";
import { VERDICTS } from "../verdicts.mjs";
import { snapshotOf } from "#test/snapshot.mts";

const SECURITY_PATHS = ["src/auth/"];
const VERDICT_TABLE = VERDICTS as Record<string, { effect: Effect; agent: string }>;

function plan(verdict: string, snap: WorkSnapshot, planned: Partial<PlannedVerdict>): Change[] {
  const gateOf = (n: number) => ownGate(phaseOf(snap, n), SECURITY_PATHS);
  const marks = { done: false, approved: false };
  const { effect, agent } = VERDICT_TABLE[verdict];
  return EFFECTS[effect](snap, { id: snap.state.id, verdict, agent, phase: null, marks, ...planned }, gateOf);
}

function stateSet(change: Change | undefined) {
  assert.ok(change?.kind === "state" && change.set, JSON.stringify(change));
  return change.set;
}

test("PHASE DONE without a run grant marks the phase done and nothing else", () => {
  const snap = snapshotOf({ phases: [{ n: 1 }, { n: 2 }] });
  assert.deepEqual(plan("PHASE DONE", snap, { phase: 1 }), [{ kind: "marker", phase: 1, mark: "done", line: "phases/1.done" }]);
});

test("PHASE DONE under a run grant with no gate approves the phase and commits it", () => {
  const snap = snapshotOf({ run_through: 2, phases: [{ n: 1 }, { n: 2 }] });
  assert.deepEqual(plan("PHASE DONE", snap, { phase: 1 }), [
    { kind: "marker", phase: 1, mark: "done", line: "phases/1.done" },
    { kind: "marker", phase: 1, mark: "approved", line: "phases/1.approved (run grant through 2)" },
    { kind: "commit", phase: 1 },
  ]);
});

test("PHASE DONE on a security path stops the run grant", () => {
  const snap = snapshotOf({ run_through: 2, phases: [{ n: 1, touchSet: ["src/auth/x.ts"] }, { n: 2 }] });
  assert.deepEqual(plan("PHASE DONE", snap, { phase: 1 }), [
    { kind: "marker", phase: 1, mark: "done", line: "phases/1.done" },
    { kind: "state", unset: ["run_through"], line: "run grant stops here: phase 1 touches a security path (src/auth/x.ts); it takes its own approval" },
  ]);
});

test("PHASE DONE with no phase is refused", () => {
  assert.throws(() => plan("PHASE DONE", snapshotOf(), {}), (err) => err instanceof Refused && /PHASE DONE needs a phase/.test(err.message));
});

test("approved without a done marker on disk is refused, whatever the record says", () => {
  const snap = snapshotOf({ phases: [{ n: 1, done: true }] });
  assert.throws(() => plan("approved", snap, { phase: 1 }), (err) => err instanceof Refused && /not done/.test(err.message));
});

test("PHASE DONE under a run grant leaves a phase already approved on disk alone", () => {
  const snap = snapshotOf({ run_through: 2, phases: [{ n: 1 }, { n: 2 }] });
  assert.deepEqual(plan("PHASE DONE", snap, { phase: 1, marks: { done: false, approved: true } }), [{ kind: "marker", phase: 1, mark: "done", line: "phases/1.done" }]);
});

test("approved with through past the phase records the run grant and commits", () => {
  const snap = snapshotOf({ phases: [{ n: 1 }, { n: 2 }, { n: 3 }] });
  assert.deepEqual(plan("approved", snap, { phase: 1, through: 3, marks: { done: true, approved: false } }), [
    { kind: "marker", phase: 1, mark: "approved", line: "phases/1.approved" },
    { kind: "state", set: { run_through: 3 }, line: "run_through=3" },
    { kind: "commit", phase: 1 },
  ]);
});

const RESEARCH = { lane: "research", title: "Pricing rules", id: "20261029-pricing" } as const;

test("approved on a research item plans nothing, and no phase is needed", () => {
  assert.deepEqual(plan("approved", snapshotOf({ ...RESEARCH }), {}), []);
});

test("approved with publish on a research item plans one copy of research.md to the report path", () => {
  assert.deepEqual(plan("approved", snapshotOf({ ...RESEARCH }), { publish: true }), [
    { kind: "publish", from: "work/20261029-pricing/research.md", to: "artifacts/reports/pricing-rules.md", line: "published work/20261029-pricing/research.md to artifacts/reports/pricing-rules.md" },
  ]);
});

test("publish is refused for a title with no word left for a name, and for a missing research.md", () => {
  assert.throws(() => plan("approved", snapshotOf({ ...RESEARCH, title: "Of the" }), { publish: true }), (err) => err instanceof Refused && /leaves no word for a report name/.test(err.message));
  assert.throws(() => plan("approved", snapshotOf({ ...RESEARCH, artifact: null }), { publish: true }), (err) => err instanceof Refused && /no research.md to publish/.test(err.message));
});

test("a cumulative APPROVED marks every unreviewed phase in one line; a phase APPROVED marks that phase", () => {
  const snap = snapshotOf({ phases: [{ n: 1, reviewed: true }, { n: 2 }, { n: 3 }] });
  assert.deepEqual(plan("APPROVED", snap, { scope: "cumulative" }), [
    { kind: "marker", phase: 2, mark: "reviewed", line: null },
    { kind: "marker", phase: 3, mark: "reviewed", line: null },
    { kind: "note", line: "all phases reviewed" },
  ]);
  assert.deepEqual(plan("APPROVED", snap, { phase: 2 }), [{ kind: "marker", phase: 2, mark: "reviewed", line: "phases/2.reviewed" }]);
});

test("CHANGES REQUIRED clears the run grant", () => {
  assert.deepEqual(plan("CHANGES REQUIRED", snapshotOf({ run_through: 3 }), { phase: 1 }), [{ kind: "state", unset: ["run_through"], line: "run grant cleared" }]);
});

test("PHASE STALLED blocks the item with the phase in the reason, or the given reason", () => {
  assert.deepEqual(plan("PHASE STALLED", snapshotOf(), { phase: 2 }), [{ kind: "state", set: { status: "blocked", blocked_reason: "PHASE STALLED on phase 2" }, line: "status=blocked (PHASE STALLED on phase 2)" }]);
  assert.equal(stateSet(plan("DRIFT DETECTED", snapshotOf(), { reason: "AMENDMENT NEEDED: x" })[0]).blocked_reason, "AMENDMENT NEEDED: x");
});

test("ARTIFACT WRITTEN and ALIGNED change nothing", () => {
  for (const verdict of ["ARTIFACT WRITTEN", "ALIGNED"]) assert.deepEqual(plan(verdict, snapshotOf(), { phase: 1 }), [], verdict);
});

const DRIFT_BLOCKED = { lane: "design", status: "blocked", blocked_reason: "AMENDMENT NEEDED: D-002 x" } as const;
const amendedRows = (count: number) => Array.from({ length: count }, () => ({ agent: "architect", verdict: "AMENDED" }));

const REOPEN = [{ kind: "state", set: { status: "open" }, unset: ["blocked_reason"], line: "status=open (amended)" }];
const row = (agent: string, verdict: string) => ({ agent, verdict });
const DRIFT = row("reviewer", "DRIFT DETECTED");

test("AMENDED reopens a blocked item on the first and second answers to a drift and leaves the third blocked", () => {
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED }), {}), REOPEN);
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED, verdicts: [DRIFT] }), {}), REOPEN);
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED, verdicts: [DRIFT, ...amendedRows(1)] }), {}), REOPEN);
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED, verdicts: [DRIFT, ...amendedRows(2)] }), {}), []);
});

test("AMENDED after amendments made before the drift reopens the item (T-1.3)", () => {
  const verdicts = [row("architect", "ARTIFACT WRITTEN"), ...amendedRows(2), DRIFT];
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED, verdicts }), {}), REOPEN);
});

test("AMENDED on the plugin-only replay keeps the item blocked for the developer's stall (T-1.2)", () => {
  const verdicts = [row("architect", "ARTIFACT WRITTEN"), ...amendedRows(2), DRIFT, row("developer", "PHASE STALLED")];
  assert.deepEqual(plan("AMENDED", snapshotOf({ ...DRIFT_BLOCKED, verdicts }), {}), [{ kind: "note", line: "status stays blocked: the developer's stall waits for the user" }]);
});

test("AMENDED leaves an open item as it is", () => {
  assert.deepEqual(plan("AMENDED", snapshotOf({ lane: "design" }), { phase: 1 }), []);
});

test("every effect in VERDICTS has a plan", () => {
  for (const { effect } of Object.values(VERDICT_TABLE)) assert.equal(typeof EFFECTS[effect], "function", effect);
});
