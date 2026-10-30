import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep, type NextStep } from "./next-step.mts";
import type { ReplyRow } from "./replies.mts";
import { instanceTag, sendsFor } from "./send.mts";
import type { ItemLayout } from "../repos.mts";
import { snapshotOf, type SnapshotInput } from "#test/snapshot.mts";

const ID = "20261023-probe";
const S = "session-s";
const TAG = instanceTag(ID);
const named = (role: string) => `${TAG}-${role}`;

function sends(input: SnapshotInput, step: NextStep, session: string | null = S, files: string[] = []) {
  return sendsFor(snapshotOf(input), step, session, (name) => files.includes(name));
}

function verdictRow(agent: string, verdict: string, scope: string | null, session?: string, ts = "2026-10-23T10:00:00.000Z") {
  return { ts, agent, verdict, phase: 1, scope, through: null, ...(session ? { session } : {}) };
}

function freshReply(ts: string): ReplyRow {
  return { ts, session: S, action: "resolve_block", phase: 1, reply: "c", fresh: true };
}

const implement = (phase: number): NextStep => ({ action: "implement_phase", actor: "developer", phase, detail: "d" });

test("instanceTag is four letters from a to p, stable per id and different across this session's items", () => {
  assert.match(TAG, /^[a-p]{4}$/);
  assert.equal(instanceTag(ID), TAG);
  const itemA = instanceTag("20261029-convert-the-developer-agent-item-a");
  const itemB = instanceTag("20261029-convert-architect-analyst-and-reviewer-item-b-de");
  assert.match(itemA, /^[a-p]{4}$/);
  assert.notEqual(itemA, itemB);
});

test("every send row addresses its instance by the item's tag and the role", () => {
  const approved = [{ n: 1, done: true, approved: true }];
  const rows: [SnapshotInput, NextStep, string][] = [
    [{ lane: "order", artifact: null }, { action: "write_artifact", actor: "architect", detail: "d" }, "architect"],
    [{ lane: "research", artifact: null }, { action: "write_artifact", actor: "analyst", detail: "d" }, "analyst"],
    [{ phases: [{ n: 1 }] }, implement(1), "developer"],
    [{ lane: "design", phases: approved }, { action: "review_checkpoint", actor: "reviewer", phase: 1, detail: "d" }, "reviewer"],
    [{ phases: approved }, { action: "review_cumulative", actor: "reviewer", phase: 1, detail: "d" }, "cumulative-reviewer"],
    [{ phases: approved }, { action: "fix_findings", actor: "developer", phase: 1, detail: "d" }, "developer"],
    [{ phases: approved }, { action: "amend", actor: "architect", detail: "AMENDMENT NEEDED: D-001 x" }, "architect"],
  ];
  for (const [input, step, role] of rows) assert.deepEqual(sends(input, step).map((s) => s.to), [named(role)], step.action);
});

test("an item with no rows of its own spawns its developer, whatever another item's rows hold", () => {
  const otherItem = sendsFor(snapshotOf({ id: "20261023-other", phases: [{ n: 1 }], verdicts: [verdictRow("developer", "PHASE DONE", null, S)] }), implement(1), S);
  assert.deepEqual([otherItem[0].tool, otherItem[0].to], ["SendMessage", `${instanceTag("20261023-other")}-developer`]);
  const [own] = sends({ phases: [{ n: 1 }] }, implement(1));
  assert.deepEqual([own.tool, own.to], ["Agent", named("developer")]);
});

test("the architect gets the request, and the preflight and sources lines only when those files exist", () => {
  const write: NextStep = { action: "write_artifact", actor: "architect", detail: "d" };
  assert.deepEqual(sends({ lane: "order", artifact: null }, write, S, ["preflight.txt", "sources.yaml"]), [
    { tool: "Agent", to: named("architect"), type: "picket:architect", message: `work: ${ID}\nlane: order\nrequest: work/${ID}/request.md\npreflight: work/${ID}/preflight.txt\nsources: work/${ID}/sources.yaml` },
  ]);
  assert.equal(sends({ lane: "order", artifact: null }, write)[0].message, `work: ${ID}\nlane: order\nrequest: work/${ID}/request.md`);
});

test("a research item's artifact goes to the analyst for the outline pass", () => {
  const write: NextStep = { action: "write_artifact", actor: "analyst", detail: "d" };
  assert.deepEqual(sends({ lane: "research", artifact: null }, write), [{ tool: "Agent", to: named("analyst"), type: "picket:analyst", message: `work: ${ID}\nrequest: work/${ID}/request.md\npass: outline` }]);
});

test("a brief adds purpose, in scope and out of scope after the request for the analyst and the architect", () => {
  const brief = { purpose: "bill late fees", in_scope: "the fees module", out_of_scope: "refunds" };
  const lines = "purpose: bill late fees\nin scope: the fees module\nout of scope: refunds";
  const analyst = sends({ lane: "research", artifact: null, brief }, { action: "write_artifact", actor: "analyst", detail: "d" });
  assert.equal(analyst[0].message, `work: ${ID}\nrequest: work/${ID}/request.md\n${lines}\npass: outline`);
  const architect = sends({ lane: "order", artifact: null, brief }, { action: "write_artifact", actor: "architect", detail: "d" }, S, ["preflight.txt"]);
  assert.equal(architect[0].message, `work: ${ID}\nlane: order\nrequest: work/${ID}/request.md\n${lines}\npreflight: work/${ID}/preflight.txt`);
});

test("the analyst is continued only by an analyst row of this session, never by another agent's", () => {
  const write: NextStep = { action: "write_artifact", actor: "analyst", detail: "d" };
  const research = { lane: "research", artifact: null } as const;
  assert.equal(sends({ ...research, verdicts: [verdictRow("architect", "ARTIFACT WRITTEN", null, S)] }, write)[0].tool, "Agent");
  assert.equal(sends({ ...research, verdicts: [verdictRow("analyst", "REPORT WRITTEN", null, S)] }, write)[0].tool, "SendMessage");
});

test("a developer with no row in this session is spawned with the artifact; one with a row is continued without it", () => {
  const phases = [{ n: 1 }];
  assert.deepEqual(sends({ phases }, implement(1)), [{ tool: "Agent", to: named("developer"), type: "picket:developer", message: `work: ${ID}\nphase: 1\nartifact: work/${ID}/order.md` }]);
  const live = sends({ phases, verdicts: [verdictRow("developer", "PHASE DONE", null, S)] }, implement(1));
  assert.deepEqual(live, [{ tool: "SendMessage", to: named("developer"), type: "picket:developer", message: `work: ${ID}\nphase: 1` }]);
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
  assert.deepEqual(both.map((s) => s.to), [named("developer"), named("reviewer")]);
  assert.deepEqual(both[1], { tool: "Agent", to: named("reviewer"), type: "picket:reviewer", message: `work: ${ID}\nscope: crosscheck\nartifact: work/${ID}/design.md` });
  const checked = sends({ lane: "design", phases, verdicts: [verdictRow("reviewer", "ALIGNED", "crosscheck", "other")] }, implement(1));
  assert.deepEqual(checked.map((s) => s.to), [named("developer")]);
});

test("a re-check after an amendment names the delta, and leaves the line out for a full pass when no id was found", () => {
  const recheck = (delta: string[]): NextStep => ({ action: "review_crosscheck", actor: "reviewer", detail: "d", delta });
  const design: SnapshotInput = { lane: "design", phases: [{ n: 1 }], verdicts: [verdictRow("reviewer", "DRIFT DETECTED", "crosscheck", S)] };
  assert.deepEqual(sends(design, recheck(["D-002", "D-004"])), [
    { tool: "SendMessage", to: named("reviewer"), type: "picket:reviewer", message: `work: ${ID}\nscope: crosscheck\nartifact: work/${ID}/design.md\ndelta: D-002, D-004` },
  ]);
  assert.equal(sends(design, recheck([]))[0].message, `work: ${ID}\nscope: crosscheck\nartifact: work/${ID}/design.md`);
});

test("the first cumulative review is a fresh opus reviewer after a mutation run; a later one continues it", () => {
  const phases = [{ n: 1, done: true, approved: true }];
  const review: NextStep = { action: "review_cumulative", actor: "reviewer", phase: 1, detail: "d" };
  assert.deepEqual(sends({ phases }, review), [
    {
      tool: "Agent",
      to: named("cumulative-reviewer"),
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
    { tool: "Agent", to: named("reviewer"), type: "picket:reviewer", first: [`picket summary ${ID} --save`], message: `work: ${ID}\nscope: checkpoint\nphase: 3\nsummary: work/${ID}/summary.json` },
  ]);
  assert.deepEqual(sends({ phases }, { action: "fix_findings", actor: "developer", phase: 1, detail: "d" }), [
    { tool: "Agent", to: named("developer"), type: "picket:developer", message: `work: ${ID}\nreview: work/${ID}/reviews/cumulative.md\nartifact: work/${ID}/order.md` },
  ]);
  const continued = sends({ phases, verdicts: [verdictRow("developer", "PHASE DONE", null, S)] }, { action: "fix_findings", actor: "developer", phase: 1, detail: "d" });
  assert.equal(continued[0].message, `work: ${ID}\nreview: work/${ID}/reviews/cumulative.md`);
  assert.deepEqual(sends({ phases }, { action: "amend", actor: "architect", detail: "AMENDMENT NEEDED: D-002 x" }), [
    { tool: "Agent", to: named("architect"), type: "picket:architect", message: `work: ${ID}\namend: AMENDMENT NEEDED: D-002 x` },
  ]);
  const silent: NextStep[] = [
    { action: "approve_phase", actor: "user", phase: 1, detail: "d", options: [] },
    { action: "resolve_block", actor: "user", detail: "d", options: [] },
    { action: "close", actor: "lead", detail: "d" },
    { action: "none", actor: null, detail: "d" },
  ];
  for (const step of silent) assert.deepEqual(sends({ phases }, step), [], step.action);
});

test("each fresh developer reply names the next instance, developer-2 first, spawned with the artifact", () => {
  const phases = [{ n: 1 }];
  assert.equal(sends({ phases }, implement(1))[0].to, named("developer"));
  const [second] = sends({ phases, replies: [freshReply("2026-10-23T11:00:00.000Z")] }, implement(1));
  assert.deepEqual([second.to, second.tool], [named("developer-2"), "Agent"]);
  assert.match(second.message, /^artifact: /m);
  const third = sends({ phases, replies: [freshReply("2026-10-23T11:00:00.000Z"), freshReply("2026-10-23T12:00:00.000Z")] }, implement(1));
  assert.equal(third[0].to, named("developer-3"));
});

test("after three cumulative rejections and a fresh reply, developer-2 is spawned to fix the findings with the review and the artifact", () => {
  const input: SnapshotInput = {
    phases: [{ n: 1, done: true, approved: true }],
    verdicts: Array.from({ length: 3 }, () => verdictRow("reviewer", "CHANGES REQUIRED", "cumulative", S)),
    replies: [freshReply("2026-10-23T11:00:00.000Z")],
  };
  const snap = snapshotOf(input);
  const step = nextStep(snap, []);
  assert.equal(step.action, "fix_findings");
  assert.deepEqual(sendsFor(snap, step, S), [
    { tool: "Agent", to: named("developer-2"), type: "picket:developer", message: `work: ${ID}\nreview: work/${ID}/reviews/cumulative.md\nartifact: work/${ID}/order.md` },
  ]);
});

test("a fresh developer is continued only by a developer row of this session after the fresh reply", () => {
  const phases = [{ n: 1 }];
  const replies = [freshReply("2026-10-23T11:00:00.000Z")];
  const before = verdictRow("developer", "PHASE STALLED", null, S, "2026-10-23T10:30:00.000Z");
  const after = verdictRow("developer", "PHASE DONE", null, S, "2026-10-23T11:30:00.000Z");
  assert.equal(sends({ phases, replies, verdicts: [before] }, implement(1))[0].tool, "Agent");
  assert.equal(sends({ phases, replies, verdicts: [before, after] }, implement(1))[0].tool, "SendMessage");
});

const ORDERS_LAYOUT: ItemLayout = { nested: ["src/Orders"], worktrees: null, repos: [] };
const ORDERS_PHASES = [{ n: 1, done: true, approved: true, entry: { n: 1, files: ["src/Orders/pricing.cs"] } }, { n: 2 }];
const WORKTREES_LINE = `worktrees: picket worktree ${ID}`;
const fixFindings: NextStep = { action: "fix_findings", actor: "developer", phase: 2, detail: "d" };

test("a branch over a plan touching a nested repo sends the worktrees line at phase 1, later phases and fix_findings (T-7.1)", () => {
  const item = { branch: "RMS-12", layout: ORDERS_LAYOUT, phases: ORDERS_PHASES };
  assert.equal(sends({ ...item, phases: [{ ...ORDERS_PHASES[0], done: false, approved: false }] }, implement(1))[0].message, `work: ${ID}\nphase: 1\n${WORKTREES_LINE}\nartifact: work/${ID}/order.md`);
  assert.equal(sends(item, implement(2))[0].message, `work: ${ID}\nphase: 2\n${WORKTREES_LINE}\nartifact: work/${ID}/order.md`);
  assert.equal(sends(item, fixFindings)[0].message, `work: ${ID}\nreview: work/${ID}/reviews/cumulative.md\n${WORKTREES_LINE}\nartifact: work/${ID}/order.md`);
});

test("no worktrees line without a branch, with worktrees: none, or with no nested path in the plan (T-7.2)", () => {
  const item = { branch: "RMS-12", layout: ORDERS_LAYOUT, phases: ORDERS_PHASES };
  const carriesLine = (input: SnapshotInput) => sends(input, implement(2))[0].message.includes("worktrees:");
  assert.equal(carriesLine(item), true);
  assert.equal(carriesLine({ ...item, branch: undefined }), false);
  assert.equal(carriesLine({ ...item, layout: { ...ORDERS_LAYOUT, worktrees: "none" } }), false);
  assert.equal(carriesLine({ ...item, phases: [{ n: 1, done: true, approved: true, entry: { n: 1, files: ["README.md"] } }, { n: 2 }] }), false);
});
