import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emitLedger as ledgerHandler } from "./index.mts";
import { statePath, STATE_FILES } from "../../../shared/paths.mts";
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

test("emitLedger writes a turn row with no cost field of any kind", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const tp = transcript(root, [user("hello"), assistant("Done.")]);
  emitLedger({ hook_event_name: "Stop", session_id: "s1", transcript_path: tp, cwd: root }, hookContext(root));
  const [row] = ledger(root);
  assert.equal(row.event, "stop");
  for (const key of ["session_cost_usd", "cost_usd", "lines_added", "bounces", "blocks"]) assert.equal(key in row, false, key);
});
