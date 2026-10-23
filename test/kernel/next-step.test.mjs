import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep } from "../../dist/lib/shared/work/next-step.mjs";
import { nextView } from "../../dist/lib/shared/work/next-view.mjs";
import { snapshotOf } from "./snapshot-fixture.mjs";

const SECURITY_PATHS = ["src/auth/"];

function step(partial) {
  return nextStep(snapshotOf(partial), SECURITY_PATHS);
}

function numbered(count, marks = {}) {
  return Array.from({ length: count }, (_, i) => ({ n: i + 1, ...marks }));
}

test("a done or abandoned item has nothing next", () => {
  assert.deepEqual(step({ status: "done" }), { action: "none", actor: null, detail: "work item is done" });
  assert.deepEqual(step({ status: "abandoned" }), { action: "none", actor: null, detail: "work item is abandoned" });
});

test("a blocked item asks the user to continue or abandon", () => {
  assert.deepEqual(step({ status: "blocked", blocked_reason: "PHASE STALLED on phase 1" }), { action: "resolve_block", actor: "user", detail: "PHASE STALLED on phase 1", options: ["[c] continue", "[x] abandon"] });
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

test("nextView prints today's keys in order and adds warnings only when the snapshot has some", () => {
  const clean = snapshotOf({ phases: [{ n: 1 }] });
  const view = nextView(clean, nextStep(clean, SECURITY_PATHS));
  assert.deepEqual(Object.keys(view), ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail"]);
  assert.deepEqual(view, { id: "20261023-probe", lane: "order", status: "open", phase: 1, options: [], own_gate: null, action: "implement_phase", actor: "developer", detail: "phase 1 of 1: Phase 1" });
  const warned = snapshotOf({ phases: [{ n: 1 }], warnings: ["verdicts.jsonl: 1 unreadable line skipped"] });
  assert.deepEqual(nextView(warned, nextStep(warned, SECURITY_PATHS)).warnings, ["verdicts.jsonl: 1 unreadable line skipped"]);
});
