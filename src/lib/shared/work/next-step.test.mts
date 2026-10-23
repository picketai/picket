import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep } from "./next-step.mts";
import { nextView } from "./next-view.mts";
import { snapshotOf, type PhaseInput, type SnapshotInput } from "#test/snapshot.mts";

const SECURITY_PATHS = ["src/auth/"];

function step(partial: SnapshotInput): any {
  return nextStep(snapshotOf(partial), SECURITY_PATHS);
}

function numbered(count: number, marks: Partial<PhaseInput> = {}): PhaseInput[] {
  return Array.from({ length: count }, (_, i) => ({ n: i + 1, ...marks }));
}

test("a done or abandoned item has nothing next", () => {
  assert.deepEqual(step({ status: "done" }), { action: "none", actor: null, detail: "work item is done" });
  assert.deepEqual(step({ status: "abandoned" }), { action: "none", actor: null, detail: "work item is abandoned" });
});

const STALL_OPTIONS = ["[c] continue with a fresh developer", "[d] redesign", "[x] abandon"];
const BLOCK_OPTIONS = ["[c] continue", "[x] abandon"];

function row(verdict: string, scope: string | null = null) {
  return { ts: "2026-10-23T10:00:00.000Z", agent: "reviewer", verdict, phase: 2, scope, through: null };
}

function times(count: number, verdict: string, scope: string | null = null) {
  return Array.from({ length: count }, () => row(verdict, scope));
}

test("a blocked item asks the user to continue or abandon", () => {
  assert.deepEqual(step({ status: "blocked", blocked_reason: "PHASE STALLED on phase 1" }), { action: "resolve_block", actor: "user", detail: "PHASE STALLED on phase 1", options: BLOCK_OPTIONS });
});

test("a blocked order or design item whose last row is PHASE STALLED, or that drifted or was amended three times, gets the stall options", () => {
  for (const lane of ["order", "design"] as const) {
    assert.deepEqual(step({ lane, status: "blocked", verdicts: [row("PHASE DONE"), row("PHASE STALLED")] }).options, STALL_OPTIONS);
    assert.deepEqual(step({ lane, status: "blocked", verdicts: times(3, "DRIFT DETECTED") }).options, STALL_OPTIONS);
    assert.deepEqual(step({ lane, status: "blocked", verdicts: [...times(3, "AMENDED"), row("PHASE DONE")] }).options, STALL_OPTIONS);
  }
});

test("one drift, or a blocked fast or research item, gets only continue or abandon", () => {
  assert.deepEqual(step({ lane: "design", status: "blocked", verdicts: times(1, "DRIFT DETECTED") }).options, BLOCK_OPTIONS);
  assert.deepEqual(step({ lane: "fast", status: "blocked", verdicts: [row("PHASE STALLED")] }).options, BLOCK_OPTIONS);
  assert.deepEqual(step({ lane: "research", status: "blocked", verdicts: times(3, "AMENDED") }).options, BLOCK_OPTIONS);
});

test("three cumulative rejections since the last approval stop the lane with the stall options", () => {
  const rejections = [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")];
  for (const lane of ["order", "design"] as const) {
    assert.deepEqual(step({ lane, phases: numbered(2, { done: true, approved: true }), verdicts: rejections }), {
      action: "resolve_rejections",
      actor: "user",
      detail: "3 cumulative reviews returned CHANGES REQUIRED since the last approval",
      options: STALL_OPTIONS,
    });
  }
});

test("a fresh PHASE DONE after the stop sends the item back to the cumulative review, and three more rejections stop it again", () => {
  const phases = numbered(2, { done: true, approved: true });
  const stopped = [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")];
  assert.equal(step({ phases, verdicts: [...stopped, row("PHASE DONE")] }).action, "review_cumulative");
  assert.equal(step({ phases, verdicts: [...stopped, row("PHASE DONE"), ...times(2, "CHANGES REQUIRED", "cumulative")] }).action, "review_cumulative");
  const again = step({ phases, verdicts: [...stopped, row("PHASE DONE"), ...times(3, "CHANGES REQUIRED", "cumulative")] });
  assert.equal(again.action, "resolve_rejections");
  assert.equal(again.detail, "6 cumulative reviews returned CHANGES REQUIRED since the last approval");
});

test("rejections before the last approval, or of another scope, do not count", () => {
  const phases = numbered(2, { done: true, approved: true });
  const before = [...times(2, "CHANGES REQUIRED", "cumulative"), row("approved"), row("CHANGES REQUIRED", "cumulative")];
  assert.equal(step({ phases, verdicts: before }).action, "review_cumulative");
  assert.equal(step({ phases, verdicts: times(3, "CHANGES REQUIRED", "phase 2") }).action, "review_cumulative");
});

test("a fast or research item never stops on cumulative rejections", () => {
  const verdicts = times(3, "CHANGES REQUIRED", "cumulative");
  assert.equal(step({ lane: "fast", verdicts }).action, "close");
  assert.equal(step({ lane: "research", verdicts }).action, "approve_phase");
});

test("an ambiguous story reference asks the user to pick a version", () => {
  const next = step({ ambiguousRefs: [{ ref: "api:src/a.ts", source: "api", path: "src/a.ts", status: "ambiguous", candidates: ["main", "dev"] }] });
  assert.deepEqual(next, { action: "resolve_sources", actor: "user", detail: "1 reference(s) differ across worktrees", options: ["[p] pick: picket source pick 20261023-probe <ref> <label>"] });
});

test("a fast item is closed by the lead", () => {
  assert.deepEqual(step({ lane: "fast" }), { action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" });
});

test("a missing artifact is written by the architect, or the analyst for research", () => {
  assert.deepEqual(step({ lane: "order", artifact: null }), { action: "write_artifact", actor: "architect", detail: "order.md does not exist yet" });
  assert.deepEqual(step({ lane: "research", artifact: null }), { action: "write_artifact", actor: "analyst", detail: "research.md does not exist yet" });
});

test("an artifact with no phase headings goes back to the architect", () => {
  assert.deepEqual(step({ lane: "order" }), { action: "write_artifact", actor: "architect", detail: '/probe/work/20261023-probe/order.md has no "## Phase N" headings' });
});

test("a written research report awaits the user's decision on phase 1", () => {
  assert.deepEqual(step({ lane: "research" }), { action: "approve_phase", actor: "user", phase: 1, detail: "report written; accept or ask for a deeper pass", options: ["[a] accept", "[d] deeper pass", "[x] reject: <why>"] });
});

test("every phase approved and none reviewed asks for the cumulative review", () => {
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true }) }), { action: "review_cumulative", actor: "reviewer", phase: 2, detail: "all phases approved; one cumulative review remains" });
});

test("every phase reviewed, or a cumulative APPROVED row, lets the lead close", () => {
  const close = { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true, reviewed: true }) }), close);
  const cumulative = { ts: "2026-10-23T10:00:00.000Z", agent: "reviewer", verdict: "APPROVED", phase: 2, scope: "cumulative", through: null };
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true }), verdicts: [cumulative] }), close);
});

test("phase 4 of a six-phase design starts with a checkpoint on phase 3", () => {
  const phases = numbered(6).map((p) => (p.n <= 3 ? { ...p, done: true, approved: true } : p));
  assert.deepEqual(step({ lane: "design", phases }), { action: "review_checkpoint", actor: "reviewer", phase: 3, detail: "mid-plan checkpoint before phase 4" });
});

test("the first unfinished phase goes to the developer", () => {
  const phases = [{ n: 1, done: true, approved: true }, { n: 2 }, { n: 3 }];
  assert.deepEqual(step({ phases }), { action: "implement_phase", actor: "developer", phase: 2, detail: "phase 2 of 3: Phase 2" });
});

test("a done phase awaits approval, with a run offer only when later phases remain", () => {
  assert.deepEqual(step({ phases: [{ n: 1, done: true }, { n: 2 }, { n: 3 }] }), {
    action: "approve_phase",
    actor: "user",
    phase: 1,
    detail: "phase 1 of 3 is done and awaits your decision",
    options: ["[a] approve", "[r] run through 3", "[x] reject: <why>"],
    own_gate: null,
  });
  const last = step({ phases: [{ n: 1, done: true, approved: true }, { n: 2, done: true }] });
  assert.deepEqual(last.options, ["[a] approve", "[x] reject: <why>"]);
});

test("a done phase on a security path names its own gate in the detail", () => {
  const next = step({ lane: "design", phases: [{ n: 1, done: true, touchSet: ["src/auth/token.ts"] }] });
  assert.equal(next.own_gate?.kind, "security_path");
  assert.match(next.detail, /; it touches a security path \(src\/auth\/token\.ts\)$/);
});

test("a done irreversible phase offers only the confirm and reject options, on a security path too", () => {
  const irreversible = ["[i] confirm the irreversible step", "[x] reject: <why>"];
  const plain = step({ lane: "design", phases: [{ n: 1, done: true, irreversible: true }, { n: 2 }] });
  assert.deepEqual(plain.options, irreversible);
  assert.equal(plain.own_gate?.kind, "irreversible");
  const secure = step({ lane: "design", phases: [{ n: 1, done: true, irreversible: true, touchSet: ["src/auth/token.ts"] }, { n: 2 }] });
  assert.deepEqual(secure.options, irreversible);
  assert.equal(secure.own_gate?.kind, "security_path");
});

test("nextView prints today's keys in order and adds warnings only when the snapshot has some", () => {
  const clean = snapshotOf({ phases: [{ n: 1 }] });
  const view = nextView(clean, nextStep(clean, SECURITY_PATHS));
  assert.deepEqual(Object.keys(view), ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail"]);
  assert.deepEqual(view, { id: "20261023-probe", lane: "order", status: "open", phase: 1, options: [], own_gate: null, action: "implement_phase", actor: "developer", detail: "phase 1 of 1: Phase 1" });
  const warned = snapshotOf({ phases: [{ n: 1 }], warnings: ["verdicts.jsonl: 1 unreadable line skipped"] });
  assert.deepEqual(nextView(warned, nextStep(warned, SECURITY_PATHS)).warnings, ["verdicts.jsonl: 1 unreadable line skipped"]);
});
