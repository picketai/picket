import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { assistantEntry as assistant, hookProject, ledgerRows, runHookBundle, toolUse as tool, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";

function run(payload, root) {
  const r = runHookBundle("emit.ledger", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("emit.ledger attributes a Stop without an agent id to the lead, not to the agent it spawned", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user("build it"), assistant([tool("Agent", { subagent_type: "architect", description: "Write the order" })]), assistant([{ type: "text", text: `▶ ${id} · phase 1/1 done\n[a] approve · [x] reject: <why>` }])]);
  run({ hook_event_name: "Stop", session_id: "s2", transcript_path: tp, cwd: root }, root);
  const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.at(-1).agent, "lead");
  assert.equal(rows.at(-1).event, "gate");
});

test("emit.ledger classifies the irreversible confirm as gate kind irreversible and the fresh-developer continue as stall", (t) => {
  const { root, id } = hookProject(t);
  const gateTurn = (options) => transcript(root, [user("go on"), assistant([{ type: "text", text: `▶ ${id} · phase 1/2 done\n\n${options}` }])]);
  run({ hook_event_name: "Stop", session_id: "s3", transcript_path: gateTurn("[i] confirm the irreversible step   [x] reject: <why>"), cwd: root }, root);
  run({ hook_event_name: "Stop", session_id: "s3", transcript_path: gateTurn("[c] continue with a fresh developer   [d] redesign   [x] abandon"), cwd: root }, root);
  assert.deepEqual(ledgerRows(root).map((row) => [row.event, row.gate_kind]), [["gate", "irreversible"], ["gate", "stall"]]);
});

test("emit.ledger records picket-prefixed agents under their bare names", (t) => {
  const { root, id } = hookProject(t);
  const ledger = () => readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const own = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "ok" }])]);
  run({ hook_event_name: "SubagentStop", session_id: "s8", transcript_path: own, agent_transcript_path: own, cwd: root, agent_type: "picket:developer" }, root);
  assert.equal(ledger().at(-1).agent, "developer");

  const spawning = transcript(root, [user("build it"), assistant([tool("Agent", { subagent_type: "picket:architect", description: "Write the order" })])]);
  run({ hook_event_name: "SubagentStop", session_id: "s8", transcript_path: spawning, agent_transcript_path: spawning, cwd: root }, root);
  assert.equal(ledger().at(-1).agent, "architect");
});

test("emit.ledger writes a null session for a Stop event without one, and the id when it has one", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "ok" }])]);
  run({ hook_event_name: "Stop", transcript_path: tp, cwd: root }, root);
  run({ hook_event_name: "Stop", session_id: "s2", transcript_path: tp, cwd: root }, root);
  assert.deepEqual(ledgerRows(root).map((row) => row.session), [null, "s2"]);
});
