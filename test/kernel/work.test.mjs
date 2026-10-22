import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork, deriveState, listOpenWork, listWork, newId, readState, setMarker, appendVerdict, writeState } from "../../dist/lib/shared/work/work.mjs";

const BIN = resolve("dist/bin/picket.mjs");

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "harness-work-"));
  mkdirSync(join(root, ".claude"));
  return root;
}

test("newId is date plus slug", () => {
  assert.equal(newId("Add GET /invoices/:id/summary!", new Date("2026-09-07T10:00:00Z")), "20260907-add-get-invoices-id-summary");
});

test("create, read, list", () => {
  const root = tempRoot();
  const s = createWork({ lane: "order", title: "Summary endpoint", root, now: new Date("2026-09-07T10:00:00Z") });
  assert.equal(s.id, "20260907-summary-endpoint");
  assert.equal(readState(s.id, root).status, "open");
  assert.deepEqual(listWork(root), [s.id]);
  assert.throws(() => createWork({ lane: "order", title: "Summary endpoint", root, now: new Date("2026-09-07T10:00:00Z") }), /already exists/);
  assert.throws(() => createWork({ lane: "huge", title: "x", root }), /lane must be/);
  rmSync(root, { recursive: true, force: true });
});

test("listOpenWork keeps open and blocked ids in listWork order (T-4.1)", () => {
  const root = tempRoot();
  const now = new Date("2026-10-06T10:00:00Z");
  const withStatus = (title, status) => {
    const s = createWork({ lane: "order", title, root, now });
    if (status !== "open") writeState({ ...readState(s.id, root), status, ...(status === "blocked" ? { blocked_reason: "waiting" } : {}) }, root);
    return s.id;
  };
  const abandoned = withStatus("A abandoned", "abandoned");
  const blocked = withStatus("B blocked", "blocked");
  const done = withStatus("C done", "done");
  const open = withStatus("D open", "open");
  assert.deepEqual(listWork(root), [abandoned, blocked, done, open]);
  assert.deepEqual(listOpenWork(root), [blocked, open]);
  rmSync(root, { recursive: true, force: true });
});

test("harness new saves --text and --request byte for byte as request.md, and nothing without them (T-1.5)", () => {
  const root = tempRoot();
  const text = 'Add a "fee" rule\nline two, with a trailing space ';
  const run = (...args) => JSON.parse(execFileSync("node", [BIN, "open", "--lane", "order", ...args, "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } }));
  const a = run("--title", "With text", "--text", text);
  assert.equal(readFileSync(join(root, "work", a.id, "request.md"), "utf8"), text);
  const file = join(root, "req.txt");
  writeFileSync(file, "from a file\r\nkept CRLF\r\n");
  const b = run("--title", "With file", "--request", file);
  assert.deepEqual(readFileSync(join(root, "work", b.id, "request.md")), readFileSync(file));
  const c = run("--title", "Without");
  assert.equal(existsSync(join(root, "work", c.id, "request.md")), false);
  rmSync(root, { recursive: true, force: true });
});

function envWithSession(session) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  if (session !== undefined) env.CLAUDE_CODE_SESSION_ID = session;
  return env;
}

test("picket open stamps the session from CLAUDE_CODE_SESSION_ID and writes no session line without it (T-2.1)", () => {
  const root = tempRoot();
  try {
    const create = (title, session) => JSON.parse(execFileSync("node", [BIN, "open", "--lane", "fast", "--title", title, "--root", root], { encoding: "utf8", env: { ...envWithSession(session), CLAUDE_PROJECT_DIR: root } })).id;
    const stamped = create("Stamped", "s1");
    assert.match(readFileSync(join(root, "work", stamped, "state.yaml"), "utf8"), /^session: s1$/m);
    const unstamped = create("Unstamped", undefined);
    assert.doesNotMatch(readFileSync(join(root, "work", unstamped, "state.yaml"), "utf8"), /^session:/m);
    assert.equal(readState(unstamped, root).session, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("createWork writes a non-empty session and ignores an empty one", () => {
  const root = tempRoot();
  try {
    assert.equal(readState(createWork({ lane: "fast", title: "A", session: "s1", root }).id, root).session, "s1");
    assert.equal(readState(createWork({ lane: "fast", title: "B", session: "", root }).id, root).session, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state validation refuses unknown fields and blocked without reason", () => {
  const root = tempRoot();
  const s = createWork({ lane: "fast", title: "Fix", root });
  assert.throws(() => writeState({ ...s, status: "blocked" }, root), /blocked without blocked_reason/);
  assert.throws(() => writeState({ ...s, bogus: 1 }, root), /unknown field bogus/);
  rmSync(root, { recursive: true, force: true });
});

test("deriveState reads phases from the artifact and markers from disk", () => {
  const root = tempRoot();
  const s = createWork({ lane: "order", title: "Csv", root });
  writeFileSync(
    join(root, "work", s.id, "order.md"),
    `---\nlane: order\nphases:\n  - n: 1\n    files: [src/http/csv.ts]\n  - n: 2\n    files: [src/http/handlers.ts]\n---\n# Order\n\n## Phase 1: CSV module\n\ntext\n\n## Phase 2: Route\n\ntext\n`,
  );
  let d = deriveState(s.id, root);
  assert.equal(d.phase_count, 2);
  assert.equal(d.current_phase, 1);
  assert.deepEqual(d.phases.map((p) => p.title), ["CSV module", "Route"]);
  setMarker(s.id, 1, "done", root);
  setMarker(s.id, 1, "approved", root);
  appendVerdict(s.id, { agent: "reviewer", verdict: "APPROVED", phase: 1 }, root);
  d = deriveState(s.id, root);
  assert.equal(d.phases_approved, 1);
  assert.equal(d.current_phase, 2);
  assert.equal(d.last_verdict.verdict, "APPROVED");
  rmSync(root, { recursive: true, force: true });
});
