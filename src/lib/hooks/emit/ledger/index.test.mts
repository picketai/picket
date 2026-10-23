import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { emitLedger as ledgerHandler } from "./index.mts";
import { sessionCostPath, statePath, STATE_FILES } from "../../../shared/paths.mts";
import { hookContext } from "#test/context.mts";
import { assistantText as assistant, looseHandler, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const emitLedger = looseHandler(ledgerHandler);

function ledger(root: string): any[] {
  return readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("emitLedger called directly appends one v2 row to the ledger (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const tp = transcript(root, [user("hello"), assistant("Done.")]);
  assert.equal(emitLedger({ hook_event_name: "Stop", session_id: "s1", transcript_path: tp, cwd: root }, hookContext(root)), null);
  const rows = ledger(root);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].v, 2);
  assert.equal(rows[0].session, "s1");
});

test("emitLedger stores the session's cost snapshot as session_cost_usd and writes no cost_usd (T-1.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const tp = transcript(root, [user("hello"), assistant("Done.")]);
  mkdirSync(statePath(root, STATE_FILES.sessions), { recursive: true });
  writeFileSync(sessionCostPath(root, "s1") ?? "", JSON.stringify({ session: "s1", cost_usd: 2.5, ts: "2026-10-18T07:00:00Z" }));
  for (const session_id of ["s1", "s2"]) emitLedger({ hook_event_name: "Stop", session_id, transcript_path: tp, cwd: root }, hookContext(root));
  const rows = ledger(root);
  assert.deepEqual(rows.map((r) => r.session_cost_usd), [2.5, null]);
  for (const key of ["cost_usd", "lines_added", "bounces", "blocks"]) assert.ok(rows.every((r) => !(key in r)), key);
});
