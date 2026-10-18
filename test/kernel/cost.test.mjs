import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { statePath, STATE_FILES } from "../../core/lib/paths.mjs";
import { rowCosts, summarize } from "../../core/lib/cost.mjs";

const BIN = resolve("core/bin/picket.mjs");

const stop = (session, agent, session_cost_usd, work_id = "w1") => ({ v: 2, session, event: "stop", agent, work_id, duration_ms: 1000, session_cost_usd, tool_calls: 3 });
const escalation = (session, outcome, key, extra = {}) => ({ v: 2, session, event: "escalation", outcome, why: null, key, command: `git push origin ${key}`, reason: "you asked", agent: "developer", work_id: "w1", ...extra });

const ROWS = [stop("s1", "main", 0.5), escalation("s1", "ask", "a"), escalation("s1", "ran", "a"), stop("s1", "developer", 1), escalation("s1", "denied", "b", { why: "mode" })];

function assertCosts(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) => (expected[i] === null ? assert.equal(value, null) : assert.ok(Math.abs(value - expected[i]) < 1e-9, `${i}: ${value} vs ${expected[i]}`)));
}

function costLine(rows) {
  const root = mkdtempSync(join(tmpdir(), "picket-cost-"));
  try {
    const ledger = statePath(root, STATE_FILES.ledger);
    mkdirSync(dirname(ledger), { recursive: true });
    writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const { CLAUDE_PROJECT_DIR, ...env } = process.env;
    return spawnSync("node", [BIN, "cost", "--root", root, "--human"], { encoding: "utf8", env }).stdout;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("rowCosts gives each row its session's spend since the previous snapshot (T-1.4)", () => {
  const rows = [0.4, 0.4, 1.1, 0.3].map((c) => stop("s1", "main", c));
  assertCosts(rowCosts(rows), [0.4, 0, 0.7, 0.3]);
});

test("rowCosts gives a row without a snapshot null and keeps the previous snapshot for the next row (T-1.4)", () => {
  const rows = [stop("s1", "main", 0.4), stop("s1", "main", 1.1), stop("s1", "main", null), stop("s1", "main", 1.5), stop("s2", "main", 0.2)];
  assertCosts(rowCosts(rows), [0.4, 0.7, null, 0.4, 0.2]);
});

test("rowCosts leaves rows that are not turns at null", () => {
  assertCosts(rowCosts([escalation("s1", "ask", "a"), stop("s1", "main", 0.4)]), [null, 0.4]);
});

test("a work item's cost is the sum of its rows' deltas, earlier rows of the session in another item included (T-1.5)", () => {
  const rows = [stop("s1", "main", 0.4, "w1"), stop("s1", "developer", 1, "w1"), stop("s1", "main", 1.25, "w2"), stop("s1", "developer", 2, "w2")];
  assert.ok(Math.abs(summarize(rows, { work_id: "w2" }).cost_usd - 1) < 1e-9);
  assert.ok(Math.abs(summarize(rows, { work_id: "w1" }).cost_usd - 1) < 1e-9);
});

test("cost is null overall and per agent when no scoped row carries a snapshot", () => {
  const summary = summarize([stop("s1", "main", null), stop("s1", "developer", undefined)]);
  assert.equal(summary.cost_usd, null);
  assert.equal(summary.by_agent.main.cost_usd, null);
});

test("picket cost --human prints $- without snapshots and the last snapshot of one session (T-1.6)", () => {
  assert.match(costLine([stop("s1", "main", null), stop("s1", "developer", null)]), /^2 turns · \$- · cache - · /);
  assert.match(costLine([stop("s1", "main", 0.4), stop("s1", "developer", 1.1)]), /^2 turns · \$1\.10 · /);
});

test("turns count stop, subagent_stop and gate rows only, and escalations are summarized beside them", () => {
  const summary = summarize(ROWS);
  assert.equal(summary.turns, 2);
  assert.equal(summary.rows, 2);
  assert.equal(summary.cost_usd, 1);
  assert.deepEqual({ main: summary.by_agent.main.cost_usd, developer: summary.by_agent.developer.cost_usd }, { main: 0.5, developer: 0.5 });
  assert.deepEqual(Object.keys(summary.by_agent).sort(), ["developer", "main"]);
  assert.deepEqual({ ...summary.escalations, recent: summary.escalations.recent.length }, { asked: 1, ran: 1, not_run: 0, denied: 1, recent: 3 });
});

test("an ask with no later ran row for its session and key counts as not run, and recent keeps the last five", () => {
  const rows = [escalation("s1", "ask", "a"), escalation("s2", "ran", "a"), escalation("s1", "ask", "b"), escalation("s1", "ran", "b"), ...[1, 2, 3].map((n) => escalation("s1", "denied", `d${n}`))];
  const { escalations } = summarize(rows);
  assert.equal(escalations.asked, 2);
  assert.equal(escalations.not_run, 1);
  assert.deepEqual(escalations.recent.map((r) => r.key), ["b", "b", "d1", "d2", "d3"]);
});

test("picket cost --human prints the escalations segment after the turn counts", () => {
  const out = costLine(ROWS);
  assert.match(out, /^2 turns · \$1\.00 · /);
  assert.match(out, / · escalations 1 asked, 1 ran, 0 not run, 1 denied$/m);
});
