import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { latest, readNext } from "./next-view.mts";
import { readState, writeState, type WorkState } from "./state.mts";
import { setMarker, type PhaseMark } from "./markers.mts";
import { appendVerdict, type VerdictEntry, type VerdictRow } from "./verdict-log.mts";
import type { WorkId } from "./files.mts";
import { openItem, withProject } from "#test/project.mts";

type VerdictInput = Partial<VerdictRow> & { agent: string; verdict: string };

function root(t: TestContext): string {
  return withProject(t, { host: true, picket: false });
}

function open(r: string, lane: string, title: string, session?: string | null): WorkState {
  return openItem(r, { lane, title, session });
}

const next = (id: WorkId, r: string) => readNext(r, id);
const mark = (id: WorkId, n: number, kind: PhaseMark, r: string) => setMarker(r, id, n, kind, new Date());
const verdict = (id: WorkId, entry: VerdictInput, r: string) => appendVerdict(r, id, entry as VerdictEntry, new Date());
const save = (state: WorkState, r: string) => writeState(r, state, new Date());

function latestItem(r: string, options: { session?: string | null } = {}) {
  const n = latest(r, options);
  assert.ok(n.id !== null, "an open item is latest");
  return n;
}

function artifact(r: string, id: WorkId, name: string, phases: string[]) {
  const body = phases.map((t, i) => `## Phase ${i + 1}: ${t}\n\ntext\n`).join("\n");
  writeFileSync(join(r, "work", id, name), `---\nlane: order\n---\n# Order\n\n${body}`);
}

test("order lane walks write, implement, approve, review, close", (t) => {
  const r = root(t);
  const s = open(r, "order", "Csv");
  assert.equal(next(s.id, r).action, "write_artifact");
  assert.equal(next(s.id, r).actor, "architect");

  artifact(r, s.id, "order.md", ["Module", "Route"]);
  let n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["implement_phase", "developer", 1]);

  mark(s.id, 1, "done", r);
  n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["approve_phase", "user", 1]);
  assert.deepEqual(n.options, ["[a] approve", "[r] run through 2", "[x] reject: <why>"]);

  mark(s.id, 1, "approved", r);
  assert.deepEqual([next(s.id, r).action, next(s.id, r).phase], ["implement_phase", 2]);

  mark(s.id, 2, "done", r);
  n = next(s.id, r);
  assert.equal(n.action, "approve_phase");
  assert.deepEqual(n.options, ["[a] approve", "[x] reject: <why>"]);

  mark(s.id, 2, "approved", r);
  n = next(s.id, r);
  assert.deepEqual([n.action, n.actor], ["review_cumulative", "reviewer"]);

  verdict(s.id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" }, r);
  assert.equal(next(s.id, r).action, "close");

  save({ ...s, status: "done" }, r);
  assert.equal(next(s.id, r).action, "none");
});

test("blocked items ask the user; fast and research have their own shapes", (t) => {
  const r = root(t);
  const s = open(r, "fast", "Fix");
  assert.equal(next(s.id, r).action, "close");
  save({ ...s, status: "blocked", blocked_reason: "tests fail on main" }, r);
  assert.equal(next(s.id, r).action, "resolve_block");

  const q = open(r, "research", "How");
  assert.deepEqual([next(q.id, r).action, next(q.id, r).actor], ["write_artifact", "analyst"]);
  writeFileSync(join(r, "work", q.id, "report.md"), "# Report\n");
  assert.equal(next(q.id, r).action, "write_artifact", "the old report.md name is not read: no fallback");
  writeFileSync(join(r, "work", q.id, "research.md"), "# Report\n");
  assert.equal(next(q.id, r).action, "approve_phase");
});

test("an ambiguous source reference is the user's pick before the artifact is written, after a block", (t) => {
  const r = root(t);
  const s = open(r, "design", "Fees");
  const intake = (status: string) => `refs:\n  - ref: docs/fees.md\n    source: analysis\n    path: docs/fees.md\n    status: ${status}\n    candidates: [main, feat-fees]\nunmatched: []\n`;
  writeFileSync(join(r, "work", s.id, "sources.yaml"), intake("ambiguous"));
  const n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.detail], ["resolve_sources", "user", "1 reference(s) differ across worktrees"]);
  assert.deepEqual(n.options, [`[p] pick: picket source pick ${s.id} <ref> <label>`]);
  save({ ...s, status: "blocked", blocked_reason: "waiting" }, r);
  assert.equal(next(s.id, r).action, "resolve_block", "a block still comes first");
  save({ ...s, status: "open" }, r);
  writeFileSync(join(r, "work", s.id, "sources.yaml"), intake("resolved"));
  assert.equal(next(s.id, r).action, "write_artifact");
});

function design(r: string, id: WorkId, entries: string[]) {
  const front = entries.map((extra, i) => `  - n: ${i + 1}\n    files: [lib/p${i + 1}.mjs]\n${extra}`).join("");
  const body = entries.map((_, i) => `## Phase ${i + 1}: P${i + 1}\n\nt\n`).join("\n");
  writeFileSync(join(r, "work", id, "design.md"), `---\nlane: design\nphases:\n${front}---\n# Design\n\n${body}`);
}

test("a done phase the record marks security-sensitive names its own_gate in the result and detail", (t) => {
  const r = root(t);
  const s = open(r, "design", "Marked");
  design(r, s.id, ["    security: true\n", "    security: false\n"]);
  mark(s.id, 1, "done", r);
  const n = next(s.id, r);
  assert.equal(n.action, "approve_phase");
  assert.deepEqual(n.own_gate, { kind: "security_mark", reason: "is marked security-sensitive in the record" });
  assert.ok(n.detail.endsWith("; it is marked security-sensitive in the record"), n.detail);
});

test("an unmarked done phase has a null own_gate and the plain detail", (t) => {
  const r = root(t);
  const s = open(r, "design", "Plain");
  design(r, s.id, ["    security: false\n", "    security: false\n"]);
  mark(s.id, 1, "done", r);
  const n = next(s.id, r);
  assert.equal(n.own_gate, null);
  assert.equal(n.detail, "phase 1 of 2 is done and awaits your decision");
});

test("every action other than an order or design approve_phase carries own_gate: null", (t) => {
  const r = root(t);
  const s = open(r, "design", "Walk");
  const seen: Record<string, unknown> = {};
  const record = () => {
    const n = next(s.id, r);
    seen[n.action] = n.own_gate;
  };
  record();
  design(r, s.id, ["    security: true\n"]);
  record();
  mark(s.id, 1, "done", r);
  mark(s.id, 1, "approved", r);
  record();
  verdict(s.id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" }, r);
  record();
  const q = open(r, "research", "How");
  writeFileSync(join(r, "work", q.id, "research.md"), "# Report\n");
  const research = next(q.id, r);
  assert.deepEqual(seen, { write_artifact: null, implement_phase: null, review_cumulative: null, close: null });
  assert.deepEqual([research.action, research.own_gate], ["approve_phase", null]);
});

test("design lane inserts a checkpoint at the midpoint of a long plan", (t) => {
  const r = root(t);
  const s = open(r, "design", "Big");
  writeFileSync(join(r, "work", s.id, "design.md"), `---\nlane: design\n---\n# Design\n\n${[1, 2, 3, 4, 5, 6].map((n) => `## Phase ${n}: P${n}\n\nt\n`).join("\n")}`);
  for (const n of [1, 2, 3]) {
    mark(s.id, n, "done", r);
    mark(s.id, n, "approved", r);
  }
  const n = next(s.id, r);
  assert.deepEqual([n.action, n.actor, n.phase], ["review_checkpoint", "reviewer", 3]);
  mark(s.id, 3, "reviewed", r);
  assert.deepEqual([next(s.id, r).action, next(s.id, r).phase], ["implement_phase", 4]);
});

const LATER = "2099-01-01T00:00:00.000Z";

test("latest picks the item touched last, counting its verdicts, not only state.updated", (t) => {
  const r = root(t);
  const older = open(r, "order", "Older");
  const newer = open(r, "order", "Newer");
  assert.ok((readState(r, older.id).updated ?? "") <= (readState(r, newer.id).updated ?? ""));
  verdict(older.id, { ts: LATER, agent: "architect", verdict: "ARTIFACT WRITTEN" }, r);
  const n = latestItem(r);
  assert.deepEqual([n.id, n.since, n.by], [older.id, LATER, "architect"]);
});

test("latest skips done and abandoned items and answers a blocked one with its reason", (t) => {
  const r = root(t);
  const blocked = open(r, "order", "Blocked");
  save({ ...blocked, status: "blocked", blocked_reason: "phase 2 stalled" }, r);
  const done = open(r, "order", "Done");
  const abandoned = open(r, "order", "Gone");
  verdict(done.id, { ts: LATER, agent: "lead", verdict: "APPROVED" }, r);
  verdict(abandoned.id, { ts: LATER, agent: "lead", verdict: "APPROVED" }, r);
  save({ ...done, status: "done" }, r);
  save({ ...abandoned, status: "abandoned" }, r);
  const n = latestItem(r);
  assert.deepEqual([n.id, n.action, n.blocked_reason, n.by], [blocked.id, "resolve_block", "phase 2 stalled", null]);
});

test("latest after a developer's PHASE DONE asks the user and carries the phase counts", (t) => {
  const r = root(t);
  const s = open(r, "order", "Csv");
  artifact(r, s.id, "order.md", ["Module", "Route"]);
  mark(s.id, 1, "done", r);
  mark(s.id, 1, "approved", r);
  mark(s.id, 2, "done", r);
  verdict(s.id, { ts: LATER, agent: "developer", verdict: "PHASE DONE", phase: 2 }, r);
  const n = latestItem(r);
  assert.deepEqual(
    [n.action, n.actor, n.phase, n.by, n.since, n.phases_approved, n.phase_count, n.title, n.blocked_reason],
    ["approve_phase", "user", 2, "developer", LATER, 1, 2, "Csv", null],
  );
});

function stamped(r: string, title: string, session: string | null, ts?: string): WorkId {
  const s = open(r, "order", title, session);
  if (ts) verdict(s.id, { ts, agent: "architect", verdict: "ARTIFACT WRITTEN" }, r);
  return s.id;
}

test("latest with a session picks that session's newest item over a newer item of another (T-2.2)", (t) => {
  const r = root(t);
  const b = stamped(r, "B", "s2", "2098-01-01T00:00:00.000Z");
  stamped(r, "A", "s1", LATER);
  const n = latestItem(r, { session: "s2" });
  assert.deepEqual([n.id, n.session, n.other_session], [b, "s2", false]);
});

test("latest with no item of that session answers the newest and marks it another session's (T-2.3)", (t) => {
  const r = root(t);
  stamped(r, "A", "s1", "2098-01-01T00:00:00.000Z");
  const newest = stamped(r, "C", "s1", LATER);
  const n = latestItem(r, { session: "s2" });
  assert.deepEqual([n.id, n.session, n.other_session], [newest, "s1", true]);
  const { session, other_session, ...rest } = latestItem(r);
  assert.deepEqual([session, other_session], ["s1", false]);
  const { session: _s, other_session: _o, ...restWithSession } = n;
  assert.deepEqual(rest, restWithSession);
});

test("latest counts an unstamped item as another session's", (t) => {
  const r = root(t);
  const legacy = stamped(r, "Legacy", null, LATER);
  const n = latestItem(r, { session: "s2" });
  assert.deepEqual([n.id, n.session, n.other_session], [legacy, null, true]);
});

test("latest with no open item answers none", (t) => {
  const r = root(t);
  assert.deepEqual(latest(r), { id: null, action: "none", actor: null, phase: null, detail: "no open work item", options: [] });
});
