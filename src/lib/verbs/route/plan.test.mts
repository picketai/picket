import { test } from "node:test";
import assert from "node:assert/strict";
import { EFFECTS, type Change, type Effect, type PlannedVerdict } from "./plan.mts";
import { ownGate } from "../../shared/work/gate.mts";
import { phaseOf, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { Refused } from "../../shared/action.mts";
import { VERDICTS } from "../../shared/verdicts.mjs";
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

test("ARTIFACT WRITTEN, ALIGNED and AMENDED change nothing", () => {
  for (const verdict of ["ARTIFACT WRITTEN", "ALIGNED", "AMENDED"]) assert.deepEqual(plan(verdict, snapshotOf(), { phase: 1 }), [], verdict);
});

test("every effect in VERDICTS has a plan", () => {
  for (const { effect } of Object.values(VERDICT_TABLE)) assert.equal(typeof EFFECTS[effect], "function", effect);
});
