import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const usage = (input_tokens, output_tokens = 0) => ({ input_tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens });
const stop = (session, agent, tokens = null, work_id = "w1") => ({ v: 2, session, event: "stop", agent, work_id, phase: 1, duration_ms: 1000, usage: tokens, tool_calls: 3 });
const escalation = (session, outcome, key, extra = {}) => ({ v: 2, session, event: "escalation", outcome, why: null, key, command: `git push origin ${key}`, reason: "you asked", agent: "developer", work_id: "w1", ...extra });

const ROWS = [stop("s1", "main", usage(500)), escalation("s1", "ask", "a"), escalation("s1", "ran", "a"), stop("s1", "developer", usage(1000, 500)), escalation("s1", "denied", "b", { why: "mode" })];

function costRun(t, rows, args = ["--human"]) {
  const root = withProject(t, { picket: false });
  const ledger = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(ledger), { recursive: true });
  writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const { CLAUDE_PROJECT_DIR, ...env } = process.env;
  return runCli(process.cwd(), ["cost", "--root", root, ...args], { env });
}

const costLine = (t, rows) => costRun(t, rows).stdout;

test("picket cost --human prints the token total where dollars stood and no $ (T-1.5)", (t) => {
  const out = costLine(t, ROWS);
  assert.match(out, /^2 turns · 2\.0k tokens · cache 0% · /);
  assert.ok(!out.includes("$"), out);
  assert.match(costLine(t, [stop("s1", "main"), stop("s1", "developer")]), /^2 turns · 0 tokens · /);
});

test("picket cost prints JSON with by_work and no cost_usd", (t) => {
  const r = costRun(t, ROWS, []);
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(r.stdout);
  assert.deepEqual(summary.by_work, { w1: { tokens: 2000, by_phase: { "1": 2000 } } });
  assert.ok(!r.stdout.includes("cost_usd"));
});

test("picket cost --session with no value exits 1 naming the flag (T-4.2)", (t) => {
  const r = costRun(t, [stop("s-1", "main")], ["--session"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--session/);
});

test("picket cost --session s-1 counts only that session's turns (T-4.2)", (t) => {
  const r = costRun(t, [stop("s-1", "main"), stop("s-2", "main"), stop("s-1", "developer")], ["--session", "s-1"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).rows, 2);
});

test("picket cost --human prints the escalations segment after the turn counts", (t) => {
  assert.match(costLine(t, ROWS), / · escalations 1 asked, 1 ran, 0 not run, 1 denied$/m);
});
