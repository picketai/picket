import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork, setMarker, writeState, appendVerdict } from "../../core/lib/work.mjs";
import { next } from "../../core/lib/next.mjs";

function root() {
  const r = mkdtempSync(join(tmpdir(), "harness-next-"));
  mkdirSync(join(r, ".claude"));
  return r;
}

function artifact(r, id, name, phases) {
  const body = phases.map((t, i) => `## Phase ${i + 1}: ${t}\n\ntext\n`).join("\n");
  writeFileSync(join(r, "work", id, name), `---\nlane: order\n---\n# Order\n\n${body}`);
}

test("order lane walks write, implement, approve, review, close", () => {
  const r = root();
  const s = createWork({ lane: "order", title: "Csv", root: r });
  assert.equal(next(s.id, r).action, "write_artifact");
  assert.equal(next(s.id, r).actor, "architect");

  artifact(r, s.id, "order.md", ["Module", "Route"]);
  let n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["implement_phase", "developer", 1]);

  setMarker(s.id, 1, "done", r);
  n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["approve_phase", "user", 1]);
  assert.deepEqual(n.options, ["[a] approve", "[r] run through 2", "[x] reject: <why>"]);

  setMarker(s.id, 1, "approved", r);
  assert.deepEqual([next(s.id, r).action, next(s.id, r).phase], ["implement_phase", 2]);

  setMarker(s.id, 2, "done", r);
  n = next(s.id, r);
  assert.equal(n.action, "approve_phase");
  assert.deepEqual(n.options, ["[a] approve", "[x] reject: <why>"]);

  setMarker(s.id, 2, "approved", r);
  n = next(s.id, r);
  assert.deepEqual([n.action, n.actor], ["review_cumulative", "reviewer"]);

  appendVerdict(s.id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" }, r);
  assert.equal(next(s.id, r).action, "close");

  writeState({ ...s, status: "done" }, r);
  assert.equal(next(s.id, r).action, "none");
  rmSync(r, { recursive: true, force: true });
});

test("blocked items ask the user; fast and research have their own shapes", () => {
  const r = root();
  const s = createWork({ lane: "fast", title: "Fix", root: r });
  assert.equal(next(s.id, r).action, "close");
  writeState({ ...s, status: "blocked", blocked_reason: "tests fail on main" }, r);
  assert.equal(next(s.id, r).action, "resolve_block");

  const q = createWork({ lane: "research", title: "How", root: r });
  assert.deepEqual([next(q.id, r).action, next(q.id, r).actor], ["write_artifact", "analyst"]);
  writeFileSync(join(r, "work", q.id, "report.md"), "# Report\n");
  assert.equal(next(q.id, r).action, "write_artifact", "the old report.md name is not read: no fallback");
  writeFileSync(join(r, "work", q.id, "research.md"), "# Report\n");
  assert.equal(next(q.id, r).action, "approve_phase");
  rmSync(r, { recursive: true, force: true });
});

test("an ambiguous source reference is the user's pick before the artifact is written, after a block", () => {
  const r = root();
  const s = createWork({ lane: "design", title: "Fees", root: r });
  const intake = (status) => `refs:\n  - ref: docs/fees.md\n    source: analysis\n    path: docs/fees.md\n    status: ${status}\n    candidates: [main, feat-fees]\nunmatched: []\n`;
  writeFileSync(join(r, "work", s.id, "sources.yaml"), intake("ambiguous"));
  const n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.detail], ["resolve_sources", "user", "1 reference(s) differ across worktrees"]);
  assert.deepEqual(n.options, [`[p] pick: picket source pick ${s.id} <ref> <label>`]);
  writeState({ ...s, status: "blocked", blocked_reason: "waiting" }, r);
  assert.equal(next(s.id, r).action, "resolve_block", "a block still comes first");
  writeState({ ...s, status: "open" }, r);
  writeFileSync(join(r, "work", s.id, "sources.yaml"), intake("resolved"));
  assert.equal(next(s.id, r).action, "write_artifact");
  rmSync(r, { recursive: true, force: true });
});

function design(r, id, entries) {
  const front = entries.map((extra, i) => `  - n: ${i + 1}\n    files: [lib/p${i + 1}.mjs]\n${extra}`).join("");
  const body = entries.map((_, i) => `## Phase ${i + 1}: P${i + 1}\n\nt\n`).join("\n");
  writeFileSync(join(r, "work", id, "design.md"), `---\nlane: design\nphases:\n${front}---\n# Design\n\n${body}`);
}

test("a done phase the record marks security-sensitive names its own_gate in the result and detail", () => {
  const r = root();
  const s = createWork({ lane: "design", title: "Marked", root: r });
  design(r, s.id, ["    security: true\n", "    security: false\n"]);
  setMarker(s.id, 1, "done", r);
  const n = next(s.id, r);
  assert.equal(n.action, "approve_phase");
  assert.deepEqual(n.own_gate, { kind: "security_mark", reason: "is marked security-sensitive in the record" });
  assert.ok(n.detail.endsWith("; it is marked security-sensitive in the record"), n.detail);
  rmSync(r, { recursive: true, force: true });
});

test("an unmarked done phase has a null own_gate and the plain detail", () => {
  const r = root();
  const s = createWork({ lane: "design", title: "Plain", root: r });
  design(r, s.id, ["    security: false\n", "    security: false\n"]);
  setMarker(s.id, 1, "done", r);
  const n = next(s.id, r);
  assert.equal(n.own_gate, null);
  assert.equal(n.detail, "phase 1 of 2 is done and awaits your decision");
  rmSync(r, { recursive: true, force: true });
});

test("every action other than an order or design approve_phase carries own_gate: null", () => {
  const r = root();
  const s = createWork({ lane: "design", title: "Walk", root: r });
  const seen = {};
  const record = () => {
    const n = next(s.id, r);
    seen[n.action] = n.own_gate;
  };
  record();
  design(r, s.id, ["    security: true\n"]);
  record();
  setMarker(s.id, 1, "done", r);
  setMarker(s.id, 1, "approved", r);
  record();
  appendVerdict(s.id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" }, r);
  record();
  const q = createWork({ lane: "research", title: "How", root: r });
  writeFileSync(join(r, "work", q.id, "research.md"), "# Report\n");
  const research = next(q.id, r);
  assert.deepEqual(seen, { write_artifact: null, implement_phase: null, review_cumulative: null, close: null });
  assert.deepEqual([research.action, research.own_gate], ["approve_phase", null]);
  rmSync(r, { recursive: true, force: true });
});

test("design lane inserts a checkpoint at the midpoint of a long plan", () => {
  const r = root();
  const s = createWork({ lane: "design", title: "Big", root: r });
  writeFileSync(join(r, "work", s.id, "design.md"), `---\nlane: design\n---\n# Design\n\n${[1, 2, 3, 4, 5, 6].map((n) => `## Phase ${n}: P${n}\n\nt\n`).join("\n")}`);
  for (const n of [1, 2, 3]) {
    setMarker(s.id, n, "done", r);
    setMarker(s.id, n, "approved", r);
  }
  const n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["review_checkpoint", "reviewer", 3]);
  setMarker(s.id, 3, "reviewed", r);
  assert.deepEqual([next(s.id, r).action, next(s.id, r).phase], ["implement_phase", 4]);
  rmSync(r, { recursive: true, force: true });
});
