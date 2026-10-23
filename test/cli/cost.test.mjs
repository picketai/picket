import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const stop = (session, agent, session_cost_usd, work_id = "w1") => ({ v: 2, session, event: "stop", agent, work_id, duration_ms: 1000, session_cost_usd, tool_calls: 3 });
const escalation = (session, outcome, key, extra = {}) => ({ v: 2, session, event: "escalation", outcome, why: null, key, command: `git push origin ${key}`, reason: "you asked", agent: "developer", work_id: "w1", ...extra });

const ROWS = [stop("s1", "main", 0.5), escalation("s1", "ask", "a"), escalation("s1", "ran", "a"), stop("s1", "developer", 1), escalation("s1", "denied", "b", { why: "mode" })];

function costRun(t, rows, args = ["--human"]) {
  const root = withProject(t, { picket: false });
  const ledger = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(ledger), { recursive: true });
  writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const { CLAUDE_PROJECT_DIR, ...env } = process.env;
  return runCli(process.cwd(), ["cost", "--root", root, ...args], { env });
}

const costLine = (t, rows) => costRun(t, rows).stdout;

test("picket cost --human prints $- without snapshots and the last snapshot of one session (T-1.6)", (t) => {
  assert.match(costLine(t, [stop("s1", "main", null), stop("s1", "developer", null)]), /^2 turns · \$- · cache - · /);
  assert.match(costLine(t, [stop("s1", "main", 0.4), stop("s1", "developer", 1.1)]), /^2 turns · \$1\.10 · /);
});

test("picket cost --session with no value exits 1 naming the flag (T-4.2)", (t) => {
  const r = costRun(t, [stop("s-1", "main", 0.4)], ["--session"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--session/);
});

test("picket cost --session s-1 counts only that session's turns (T-4.2)", (t) => {
  const r = costRun(t, [stop("s-1", "main", 0.4), stop("s-2", "main", 0.9), stop("s-1", "developer", 1)], ["--session", "s-1"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).rows, 2);
});

test("picket cost --human prints the escalations segment after the turn counts", (t) => {
  const out = costLine(t, ROWS);
  assert.match(out, /^2 turns · \$1\.00 · /);
  assert.match(out, / · escalations 1 asked, 1 ran, 0 not run, 1 denied$/m);
});
