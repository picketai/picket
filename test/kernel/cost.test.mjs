import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { statePath, STATE_FILES } from "../../core/lib/paths.mjs";
import { summarize } from "../../core/lib/cost.mjs";

const BIN = resolve("core/bin/picket.mjs");

const stop = (session, agent) => ({ v: 2, session, event: "stop", agent, work_id: "w1", duration_ms: 1000, cost_usd: 0.5, tool_calls: 3 });
const escalation = (session, outcome, key, extra = {}) => ({ v: 2, session, event: "escalation", outcome, why: null, key, command: `git push origin ${key}`, reason: "you asked", agent: "developer", work_id: "w1", ...extra });

const ROWS = [stop("s1", "main"), escalation("s1", "ask", "a"), escalation("s1", "ran", "a"), stop("s1", "developer"), escalation("s1", "denied", "b", { why: "mode" })];

test("turns count stop, subagent_stop and gate rows only, and escalations are summarized beside them", () => {
  const summary = summarize(ROWS);
  assert.equal(summary.turns, 2);
  assert.equal(summary.rows, 2);
  assert.equal(summary.cost_usd, 1);
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
  const root = mkdtempSync(join(tmpdir(), "picket-cost-"));
  try {
    const ledger = statePath(root, STATE_FILES.ledger);
    mkdirSync(dirname(ledger), { recursive: true });
    writeFileSync(ledger, ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const { CLAUDE_PROJECT_DIR, ...env } = process.env;
    const out = spawnSync("node", [BIN, "cost", "--root", root, "--human"], { encoding: "utf8", env }).stdout;
    assert.match(out, /^2 turns · \$1\.00 · /);
    assert.match(out, / · escalations 1 asked, 1 ran, 0 not run, 1 denied$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
