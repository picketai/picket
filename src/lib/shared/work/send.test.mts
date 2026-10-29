import { test } from "node:test";
import assert from "node:assert/strict";
import type { NextStep } from "./next-step.mts";
import { sendsFor } from "./send.mts";
import { snapshotOf, type SnapshotInput } from "#test/snapshot.mts";

const ID = "20261023-probe";
const S = "session-s";

function sends(input: SnapshotInput, step: NextStep, session: string | null = S, files: string[] = []) {
  return sendsFor(snapshotOf(input), step, session, (name) => files.includes(name));
}

function verdictRow(agent: string, verdict: string, scope: string | null, session?: string) {
  return { ts: "2026-10-23T10:00:00.000Z", agent, verdict, phase: 1, scope, through: null, ...(session ? { session } : {}) };
}

const implement = (phase: number): NextStep => ({ action: "implement_phase", actor: "developer", phase, detail: "d" });

test("the architect gets the request, and the preflight and sources lines only when those files exist", () => {
  const write: NextStep = { action: "write_artifact", actor: "architect", detail: "d" };
  assert.deepEqual(sends({ lane: "order", artifact: null }, write, S, ["preflight.txt", "sources.yaml"]), [
    { tool: "Agent", to: "architect", type: "picket:architect", message: `work: ${ID}\nlane: order\nrequest: work/${ID}/request.md\npreflight: work/${ID}/preflight.txt\nsources: work/${ID}/sources.yaml` },
  ]);
  assert.equal(sends({ lane: "order", artifact: null }, write)[0].message, `work: ${ID}\nlane: order\nrequest: work/${ID}/request.md`);
});

test("a research item's artifact goes to the analyst for the outline pass", () => {
  const write: NextStep = { action: "write_artifact", actor: "analyst", detail: "d" };
  assert.deepEqual(sends({ lane: "research", artifact: null }, write), [{ tool: "Agent", to: "analyst", type: "picket:analyst", message: `work: ${ID}\nrequest: work/${ID}/request.md\npass: outline` }]);
});

test("a developer with no row in this session is spawned with the artifact; one with a row is continued without it", () => {
  const phases = [{ n: 1 }];
  assert.deepEqual(sends({ phases }, implement(1)), [{ tool: "Agent", to: "developer", type: "picket:developer", message: `work: ${ID}\nphase: 1\nartifact: work/${ID}/order.md` }]);
  const live = sends({ phases, verdicts: [verdictRow("developer", "PHASE DONE", null, S)] }, implement(1));
  assert.deepEqual(live, [{ tool: "SendMessage", to: "developer", type: "picket:developer", message: `work: ${ID}\nphase: 1` }]);
  assert.equal(sends({ phases, verdicts: [verdictRow("developer", "PHASE DONE", null, "other")] }, implement(1))[0].tool, "Agent");
  assert.equal(sends({ phases, verdicts: [verdictRow("developer", "PHASE DONE", null, S)] }, implement(1), null)[0].tool, "Agent");
});

test("a run grant that reaches the phase is named in the developer's message", () => {
  const [developer] = sends({ phases: [{ n: 1, done: true, approved: true }, { n: 2 }, { n: 3 }], run_through: 3 }, implement(2));
  assert.equal(developer.message.split("\n").at(-1), "run through 3");
});

test("a design item's first phase also spawns the cross-check until any cross-check row exists", () => {
  const phases = [{ n: 1 }, { n: 2 }];
  const both = sends({ lane: "design", phases }, implement(1));
  assert.deepEqual(both.map((s) => s.to), ["developer", "reviewer"]);
  assert.deepEqual(both[1], { tool: "Agent", to: "reviewer", type: "picket:reviewer", message: `work: ${ID}\nscope: crosscheck\nartifact: work/${ID}/design.md` });
  const checked = sends({ lane: "design", phases, verdicts: [verdictRow("reviewer", "ALIGNED", "crosscheck", "other")] }, implement(1));
  assert.deepEqual(checked.map((s) => s.to), ["developer"]);
});

test("the first cumulative review is a fresh opus reviewer after a mutation run; a later one continues it", () => {
  const phases = [{ n: 1, done: true, approved: true }];
  const review: NextStep = { action: "review_cumulative", actor: "reviewer", phase: 1, detail: "d" };
  assert.deepEqual(sends({ phases }, review), [
    {
      tool: "Agent",
      to: "cumulative-reviewer",
      type: "picket:reviewer",
      model: "opus",
      first: [`picket mutate ${ID}`, `picket summary ${ID} --save`],
      message: `You are reviewing a change you did not write. You have no context beyond what is below.\nwork: ${ID}\nscope: cumulative\nsummary: work/${ID}/summary.json`,
    },
  ]);
  const [again] = sends({ phases, verdicts: [verdictRow("reviewer", "CHANGES REQUIRED", "cumulative", S), verdictRow("developer", "PHASE DONE", null, S)] }, review);
  assert.equal(again.tool, "SendMessage");
  assert.deepEqual(again.first, [`picket summary ${ID} --save`]);
  assert.equal(again.message, `work: ${ID}\nscope: cumulative\nsummary: work/${ID}/summary.json`);
});

test("checkpoint, findings and amendment sends carry their lines; user, lead and none steps send nothing", () => {
  const phases = [{ n: 1, done: true, approved: true }];
  assert.deepEqual(sends({ lane: "design", phases }, { action: "review_checkpoint", actor: "reviewer", phase: 3, detail: "d" }), [
    { tool: "Agent", to: "reviewer", type: "picket:reviewer", first: [`picket summary ${ID} --save`], message: `work: ${ID}\nscope: checkpoint\nphase: 3\nsummary: work/${ID}/summary.json` },
  ]);
  assert.deepEqual(sends({ phases }, { action: "fix_findings", actor: "developer", phase: 1, detail: "d" }), [
    { tool: "Agent", to: "developer", type: "picket:developer", message: `work: ${ID}\nreview: work/${ID}/reviews/cumulative.md` },
  ]);
  assert.deepEqual(sends({ phases }, { action: "amend", actor: "architect", detail: "AMENDMENT NEEDED: D-002 x" }), [
    { tool: "Agent", to: "architect", type: "picket:architect", message: `work: ${ID}\namend: AMENDMENT NEEDED: D-002 x` },
  ]);
  const silent: NextStep[] = [
    { action: "approve_phase", actor: "user", phase: 1, detail: "d", options: [] },
    { action: "resolve_block", actor: "user", detail: "d", options: [] },
    { action: "close", actor: "lead", detail: "d" },
    { action: "none", actor: null, detail: "d" },
  ];
  for (const step of silent) assert.deepEqual(sends({ phases }, step), [], step.action);
});
