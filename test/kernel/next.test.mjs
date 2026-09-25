import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork, setMarker, writeState, appendVerdict } from "../../.claude/lib/work.mjs";
import { next } from "../../.claude/lib/next.mjs";

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
