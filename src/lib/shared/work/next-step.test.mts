import { test } from "node:test";
import assert from "node:assert/strict";
import { NEXT_ACTIONS, nextStep } from "./next-step.mts";
import { nextView } from "./next-view.mts";
import { instanceTag } from "./send.mts";
import type { ItemLayout } from "../repos.mts";
import { snapshotOf, type PhaseInput, type SnapshotInput } from "#test/snapshot.mts";

const SECURITY_PATHS = ["src/auth/"];

function step(partial: SnapshotInput): any {
  return nextStep(snapshotOf(partial), SECURITY_PATHS);
}

function numbered(count: number, marks: Partial<PhaseInput> = {}): PhaseInput[] {
  return Array.from({ length: count }, (_, i) => ({ n: i + 1, ...marks }));
}

test("a done or abandoned item has nothing next", () => {
  assert.deepEqual(step({ status: "done" }), { action: "none", actor: null, detail: "work item is done" });
  assert.deepEqual(step({ status: "abandoned" }), { action: "none", actor: null, detail: "work item is abandoned" });
});

const STALL_OPTIONS = ["[c] continue with a fresh developer", "[d] redesign", "[x] abandon"];
const BLOCK_OPTIONS = ["[c] continue", "[x] abandon"];

function row(verdict: string, scope: string | null = null) {
  return { ts: "2026-10-23T10:00:00.000Z", agent: "reviewer", verdict, phase: 2, scope, through: null };
}

function times(count: number, verdict: string, scope: string | null = null) {
  return Array.from({ length: count }, () => row(verdict, scope));
}

test("a blocked item asks the user to continue or abandon", () => {
  assert.deepEqual(step({ status: "blocked", blocked_reason: "PHASE STALLED on phase 1" }), { action: "resolve_block", actor: "user", detail: "PHASE STALLED on phase 1", options: BLOCK_OPTIONS });
});

test("a blocked order or design item whose newest block row is PHASE STALLED, or that drifted or answered a block three times, gets the stall options", () => {
  for (const lane of ["order", "design"] as const) {
    assert.deepEqual(step({ lane, status: "blocked", verdicts: [row("PHASE DONE"), row("PHASE STALLED")] }).options, STALL_OPTIONS);
    assert.deepEqual(step({ lane, status: "blocked", verdicts: [row("PHASE STALLED"), row("ALIGNED", "crosscheck")] }).options, STALL_OPTIONS);
    assert.deepEqual(step({ lane, status: "blocked", verdicts: times(3, "DRIFT DETECTED") }).options, STALL_OPTIONS);
    assert.deepEqual(step({ lane, status: "blocked", verdicts: [row("DRIFT DETECTED"), ...times(3, "AMENDED"), row("PHASE DONE")] }).options, STALL_OPTIONS);
  }
});

test("amendments made before any block do not count toward the stall", () => {
  const next = step({ lane: "order", status: "blocked", verdicts: [...times(3, "AMENDED"), row("DRIFT DETECTED")] });
  assert.equal(next.action, "resolve_block");
  assert.deepEqual(next.options, BLOCK_OPTIONS);
});

test("one drift, or a blocked fast or research item, gets only continue or abandon", () => {
  assert.deepEqual(step({ lane: "design", status: "blocked", verdicts: times(1, "DRIFT DETECTED") }).options, BLOCK_OPTIONS);
  assert.deepEqual(step({ lane: "fast", status: "blocked", verdicts: [row("PHASE STALLED")] }).options, BLOCK_OPTIONS);
  assert.deepEqual(step({ lane: "research", status: "blocked", verdicts: times(3, "AMENDED") }).options, BLOCK_OPTIONS);
});

test("three cumulative rejections since the last approval stop the lane with the stall options", () => {
  const rejections = [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")];
  for (const lane of ["order", "design"] as const) {
    assert.deepEqual(step({ lane, phases: numbered(2, { done: true, approved: true }), verdicts: rejections }), {
      action: "resolve_rejections",
      actor: "user",
      detail: "3 cumulative reviews returned CHANGES REQUIRED since the last approval",
      options: STALL_OPTIONS,
    });
  }
});

test("a fresh PHASE DONE after the stop sends the item back to the cumulative review, and three more rejections stop it again", () => {
  const phases = numbered(2, { done: true, approved: true });
  const stopped = [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")];
  assert.equal(step({ phases, verdicts: [...stopped, row("PHASE DONE")] }).action, "review_cumulative");
  assert.equal(step({ phases, verdicts: [...stopped, row("PHASE DONE"), ...times(2, "CHANGES REQUIRED", "cumulative")] }).action, "fix_findings");
  const again = step({ phases, verdicts: [...stopped, row("PHASE DONE"), ...times(3, "CHANGES REQUIRED", "cumulative")] });
  assert.equal(again.action, "resolve_rejections");
  assert.equal(again.detail, "6 cumulative reviews returned CHANGES REQUIRED since the last approval");
});

test("rejections before the last approval, or of another scope, do not count toward the stop", () => {
  const phases = numbered(2, { done: true, approved: true });
  const before = [...times(2, "CHANGES REQUIRED", "cumulative"), row("approved"), row("CHANGES REQUIRED", "cumulative")];
  assert.equal(step({ phases, verdicts: before }).action, "fix_findings");
  assert.equal(step({ phases, verdicts: times(3, "CHANGES REQUIRED", "phase 2") }).action, "review_cumulative");
});

test("the actions end with fix_findings, amend, review_crosscheck, create_worktrees and approve_amendment, fifteen in all (T-6.6)", () => {
  assert.equal(NEXT_ACTIONS.length, 15);
  assert.deepEqual(NEXT_ACTIONS.slice(-5), ["fix_findings", "amend", "review_crosscheck", "create_worktrees", "approve_amendment"]);
});

const ORDERS_LAYOUT: ItemLayout = { nested: ["src/Orders"], worktrees: null, repos: [] };
const ORDERS_PHASE = { n: 1, entry: { n: 1, files: ["src/Orders/pricing.cs"] } };
const WORKTREE_OPTIONS = ["reply: <name> [from <ref>]", "[n] use the main checkouts"];

test("a plan touching a nested repo with no branch named stops at create_worktrees, offering the ticket key (T-6.1)", () => {
  const stop = step({ source: "RMS-12", layout: ORDERS_LAYOUT, phases: [ORDERS_PHASE, { n: 2 }] });
  assert.deepEqual(stop, {
    action: "create_worktrees",
    actor: "user",
    phase: 1,
    detail: "the plan touches src/Orders; name the branch for their worktrees before phase 1",
    options: ["[y] create RMS-12", ...WORKTREE_OPTIONS],
  });
  assert.deepEqual(step({ source: "story.md", layout: ORDERS_LAYOUT, phases: [ORDERS_PHASE] }).options, WORKTREE_OPTIONS);
});

test("no nested repo, no nested path, a recorded branch, or worktrees: none goes straight to implement_phase (T-6.2)", () => {
  const plain = { layout: ORDERS_LAYOUT, phases: [ORDERS_PHASE] };
  assert.equal(step({ ...plain, layout: { nested: [], worktrees: null, repos: [] } }).action, "implement_phase");
  assert.equal(step({ ...plain, phases: [{ n: 1, entry: { n: 1, files: ["README.md"] } }] }).action, "implement_phase");
  assert.equal(step({ ...plain, branch: "RMS-12" }).action, "implement_phase");
  assert.equal(step({ ...plain, layout: { ...ORDERS_LAYOUT, worktrees: "none" } }).action, "implement_phase");
});

const AMEND_LINE = "AMENDMENT NEEDED: D-002 the port moved";

function amending(verdict: string, scope: string | null = null) {
  return { ...row(verdict, scope), amend: AMEND_LINE };
}

test("an open cumulative rejection sends the developer to fix its findings until a PHASE DONE answers it", () => {
  const phases = numbered(3, { done: true, approved: true });
  const rejected = [row("approved"), row("CHANGES REQUIRED", "cumulative")];
  assert.deepEqual(step({ phases, verdicts: rejected }), { action: "fix_findings", actor: "developer", phase: 3, review: "cumulative", detail: "the cumulative review returned CHANGES REQUIRED; fix its findings" });
  assert.equal(step({ phases, verdicts: [...rejected, { ...row("PHASE DONE"), agent: "developer" }] }).action, "review_cumulative");
});

test("a third cumulative rejection since the last approval still stops with the stall options", () => {
  const next = step({ phases: numbered(2, { done: true, approved: true }), verdicts: [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")] });
  assert.equal(next.action, "resolve_rejections");
  assert.deepEqual(next.options, STALL_OPTIONS);
});

test("a pending phase or drift amendment goes to the architect with no reword grant, and a cumulative one stops at approve_amendment", () => {
  const amend = { action: "amend", actor: "architect", detail: AMEND_LINE };
  assert.deepEqual(step({ lane: "design", phases: numbered(2), verdicts: [amending("CHANGES REQUIRED", "phase 1")] }), amend);
  assert.deepEqual(step({ lane: "design", status: "blocked", blocked_reason: AMEND_LINE, phases: numbered(2), verdicts: [amending("DRIFT DETECTED", "crosscheck")] }), amend);
  const approved = numbered(2, { done: true, approved: true });
  assert.equal(step({ lane: "design", phases: approved, verdicts: [row("approved"), amending("CHANGES REQUIRED", "cumulative")] }).action, "approve_amendment");
});

test("an ungated AMENDED after a cumulative amendment line still stops at approve_amendment, and a drift-blocked design item is cross-checked again", () => {
  const amended = { ...row("AMENDED"), agent: "architect" };
  const approved = numbered(2, { done: true, approved: true });
  assert.equal(step({ lane: "design", phases: approved, verdicts: [row("approved"), amending("CHANGES REQUIRED", "cumulative"), amended] }).action, "approve_amendment");
  const blocked = step({ lane: "design", status: "blocked", blocked_reason: AMEND_LINE, phases: numbered(2), verdicts: [amending("DRIFT DETECTED", "crosscheck"), amended] });
  assert.equal(blocked.action, "review_crosscheck");
});

const PLUGIN_DRIFT_LINE = "AMENDMENT NEEDED: D-003 contradicts SDR-00002 D-003 (ratified).";
const PLUGIN_RECORD = ["## Decisions", "", "### D-001 (r2): One", "### D-003 (r2): Three", "", "## Revision log", "", "- 2026-11-07: D-001 (r2): before the cross-check", "- 2026-11-07: D-003 (r2): answers the drift", ""].join("\n");
const PLUGIN_ROWS = [
  { ts: "2026-11-07T22:15:58.504Z", agent: "architect", verdict: "ARTIFACT WRITTEN", phase: 1, scope: null },
  { ts: "2026-11-07T22:19:01.858Z", agent: "architect", verdict: "AMENDED", phase: 1, scope: null },
  { ts: "2026-11-07T22:19:29.409Z", agent: "architect", verdict: "AMENDED", phase: 1, scope: null },
  { ts: "2026-11-07T22:20:04.927Z", agent: "reviewer", verdict: "DRIFT DETECTED", phase: 1, scope: "crosscheck", amend: PLUGIN_DRIFT_LINE },
  { ts: "2026-11-07T22:20:48.523Z", agent: "developer", verdict: "PHASE STALLED", phase: 1, scope: null },
  { ts: "2026-11-07T22:21:41.563Z", agent: "architect", verdict: "AMENDED", phase: 1, scope: null },
  { ts: "2026-11-07T22:22:13.624Z", agent: "reviewer", verdict: "ALIGNED", phase: 1, scope: "crosscheck" },
];

function pluginReplay(rowCount: number): SnapshotInput {
  const artifact = { path: "/probe/work/20261023-probe/design.md", expected: "design.md" as const, body: PLUGIN_RECORD };
  return { lane: "design", status: "blocked", blocked_reason: PLUGIN_DRIFT_LINE, phases: numbered(4), artifact, verdicts: PLUGIN_ROWS.slice(0, rowCount) };
}

test("the plugin-only replay serves the drift's amendment before the developer's stall (T-1.1)", () => {
  assert.deepEqual(step(pluginReplay(5)), { action: "amend", actor: "architect", detail: PLUGIN_DRIFT_LINE });
});

test("the plugin-only replay re-checks after the amendment, then offers the stall options once aligned (T-1.2)", () => {
  assert.deepEqual(step(pluginReplay(6)), { action: "review_crosscheck", actor: "reviewer", detail: "the design record was amended after a drift; the cross-check runs again", delta: ["D-001", "D-003"] });
  assert.deepEqual(step(pluginReplay(7)), { action: "resolve_block", actor: "user", detail: PLUGIN_DRIFT_LINE, options: STALL_OPTIONS });
});

const AMENDED_RECORD = ["## Decisions", "", "### D-001 (r2): One", "### D-003 (r2): Three", "", "## Revision log", "", "- 2026-10-28: D-001 (r2): earlier", "- 2026-10-29: D-003 (r2): after the drift", ""].join("\n");

function amendedAfterDrift(lane: "design" | "order", later: object[] = []): SnapshotInput {
  const drift = { ...amending("DRIFT DETECTED", "crosscheck"), ts: "2026-10-29T09:00:00.000Z", session: "S" };
  const amended = { ...row("AMENDED"), agent: "architect", ts: "2026-10-29T09:30:00.000Z" };
  return { lane, phases: numbered(2), artifact: { path: `/probe/work/20261023-probe/${lane}.md`, expected: `${lane}.md`, body: AMENDED_RECORD }, verdicts: [drift, amended, ...later] };
}

test("an amended drift sends the reviewer instance to re-check the decisions revised since the drift's day", () => {
  const snap = snapshotOf(amendedAfterDrift("design"));
  const next = nextStep(snap, SECURITY_PATHS);
  assert.deepEqual(next, { action: "review_crosscheck", actor: "reviewer", detail: "the design record was amended after a drift; the cross-check runs again", delta: ["D-003"] });
  const view = nextView(snap, next, "S");
  assert.deepEqual(view.send, [
    { tool: "SendMessage", to: `${instanceTag("20261023-probe")}-reviewer`, type: "picket:reviewer", message: "work: 20261023-probe\nscope: crosscheck\nartifact: work/20261023-probe/design.md\ndelta: D-003" },
  ]);
});

test("a later ALIGNED cross-check ends the re-check, and an order item never gets one", () => {
  const aligned = { ...row("ALIGNED", "crosscheck"), ts: "2026-10-29T10:00:00.000Z" };
  assert.equal(step(amendedAfterDrift("design", [aligned])).action, "implement_phase");
  assert.equal(step(amendedAfterDrift("order")).action, "implement_phase");
});

test("a third AMENDED leaves the item blocked with the stall options", () => {
  const verdicts = [amending("DRIFT DETECTED", "crosscheck"), ...times(3, "AMENDED")];
  const next = step({ lane: "design", status: "blocked", blocked_reason: AMEND_LINE, phases: numbered(2), verdicts });
  assert.equal(next.action, "resolve_block");
  assert.deepEqual(next.options, STALL_OPTIONS);
});

test("a third drift with an amendment pending is a stall the user decides", () => {
  const verdicts = [...times(2, "DRIFT DETECTED", "crosscheck"), amending("DRIFT DETECTED", "crosscheck")];
  const next = step({ lane: "design", status: "blocked", blocked_reason: AMEND_LINE, phases: numbered(2), verdicts });
  assert.equal(next.action, "resolve_block");
  assert.deepEqual(next.options, STALL_OPTIONS);
});

test("a fresh developer after three cumulative rejections ends the stop and fixes the findings; without one the stop holds", () => {
  const phases = numbered(2, { done: true, approved: true });
  const rejections = [row("approved"), ...times(3, "CHANGES REQUIRED", "cumulative")];
  const fresh = { ts: "2026-10-23T11:00:00.000Z", action: "resolve_rejections", phase: null, reply: "c", fresh: true } as const;
  assert.equal(step({ phases, verdicts: rejections, replies: [fresh] }).action, "fix_findings");
  assert.equal(step({ phases, verdicts: rejections }).action, "resolve_rejections");
  const older = { ...fresh, ts: "2026-10-23T09:00:00.000Z" };
  assert.equal(step({ phases, verdicts: rejections, replies: [older] }).action, "resolve_rejections");
});

test("a fast or research item never stops on cumulative rejections", () => {
  const verdicts = times(3, "CHANGES REQUIRED", "cumulative");
  assert.equal(step({ lane: "fast", verdicts }).action, "close");
  assert.equal(step({ lane: "research", verdicts }).action, "approve_phase");
});

test("an ambiguous story reference asks the user to pick a version", () => {
  const next = step({ ambiguousRefs: [{ ref: "api:src/a.ts", source: "api", path: "src/a.ts", status: "ambiguous", candidates: ["main", "dev"] }] });
  assert.deepEqual(next, { action: "resolve_sources", actor: "user", detail: "1 reference(s) differ across worktrees", options: ["[p] pick: picket source pick 20261023-probe <ref> <label>"] });
});

test("a fast item is closed by the lead", () => {
  assert.deepEqual(step({ lane: "fast" }), { action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" });
});

test("a missing artifact is written by the architect, or the analyst for research", () => {
  assert.deepEqual(step({ lane: "order", artifact: null }), { action: "write_artifact", actor: "architect", detail: "order.md does not exist yet" });
  assert.deepEqual(step({ lane: "research", artifact: null }), { action: "write_artifact", actor: "analyst", detail: "research.md does not exist yet" });
});

test("an artifact with no phase headings goes back to the architect", () => {
  assert.deepEqual(step({ lane: "order" }), { action: "write_artifact", actor: "architect", detail: '/probe/work/20261023-probe/order.md has no "## Phase N" headings' });
});

test("a written research report awaits the user's decision on phase 1, publish included", () => {
  assert.deepEqual(step({ lane: "research", title: "Pricing rules" }), {
    action: "approve_phase",
    actor: "user",
    phase: 1,
    detail: "report written; accept or ask for a deeper pass",
    options: ["[a] accept", "[p] accept and publish to artifacts/reports/pricing-rules.md", "[d] deeper pass", "[x] reject: <why>"],
  });
});

test("a research title with no word left for a report name offers no publish", () => {
  assert.deepEqual(step({ lane: "research", title: "Of the" }).options, ["[a] accept", "[d] deeper pass", "[x] reject: <why>"]);
});

test("every phase approved and none reviewed asks for the cumulative review", () => {
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true }) }), { action: "review_cumulative", actor: "reviewer", phase: 2, detail: "all phases approved; one cumulative review remains" });
});

test("every phase reviewed, or a cumulative APPROVED row, lets the lead close", () => {
  const close = { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true, reviewed: true }) }), close);
  const cumulative = { ts: "2026-10-23T10:00:00.000Z", agent: "reviewer", verdict: "APPROVED", phase: 2, scope: "cumulative", through: null };
  assert.deepEqual(step({ phases: numbered(2, { done: true, approved: true }), verdicts: [cumulative] }), close);
});

test("phase 4 of a six-phase design starts with a checkpoint on phase 3", () => {
  const phases = numbered(6).map((p) => (p.n <= 3 ? { ...p, done: true, approved: true } : p));
  assert.deepEqual(step({ lane: "design", phases }), { action: "review_checkpoint", actor: "reviewer", phase: 3, detail: "mid-plan checkpoint before phase 4" });
});

function checkpointed(marks: Partial<PhaseInput> = {}): PhaseInput[] {
  return numbered(6).map((p) => (p.n <= 3 ? { ...p, done: true, approved: true, ...(p.n === 3 ? marks : {}) } : p));
}

const CHECKPOINT_REJECTION = row("CHANGES REQUIRED", "checkpoint");
const DEVELOPER_DONE = { ...row("PHASE DONE"), agent: "developer" };

test("a checkpoint CHANGES REQUIRED sends the developer to fix its findings on the checkpoint phase (T-1.1)", () => {
  assert.deepEqual(step({ lane: "design", phases: checkpointed(), verdicts: [CHECKPOINT_REJECTION] }), {
    action: "fix_findings",
    actor: "developer",
    phase: 3,
    review: "checkpoint",
    detail: "the checkpoint review returned CHANGES REQUIRED; fix its findings",
  });
});

test("a PHASE DONE after the checkpoint rejection sends the item back to the checkpoint review (T-1.2)", () => {
  assert.deepEqual(step({ lane: "design", phases: checkpointed(), verdicts: [CHECKPOINT_REJECTION, DEVELOPER_DONE] }), {
    action: "review_checkpoint",
    actor: "reviewer",
    phase: 3,
    detail: "mid-plan checkpoint before phase 4",
  });
});

test("a reviewed checkpoint phase lets phase 4 start, rejection row or not (T-1.3)", () => {
  const phases = checkpointed({ reviewed: true });
  for (const verdicts of [[CHECKPOINT_REJECTION], []]) {
    const { action, phase } = step({ lane: "design", phases, verdicts });
    assert.deepEqual([action, phase], ["implement_phase", 4]);
  }
});

test("the first unfinished phase goes to the developer", () => {
  const phases = [{ n: 1, done: true, approved: true }, { n: 2 }, { n: 3 }];
  assert.deepEqual(step({ phases }), { action: "implement_phase", actor: "developer", phase: 2, detail: "phase 2 of 3: Phase 2" });
});

test("a done phase awaits approval, with a run offer only when later phases remain", () => {
  assert.deepEqual(step({ phases: [{ n: 1, done: true }, { n: 2 }, { n: 3 }] }), {
    action: "approve_phase",
    actor: "user",
    phase: 1,
    detail: "phase 1 of 3 is done and awaits your decision",
    options: ["[a] approve", "[r] run through 3", "[x] reject: <why>"],
    own_gate: null,
  });
  const last = step({ phases: [{ n: 1, done: true, approved: true }, { n: 2, done: true }] });
  assert.deepEqual(last.options, ["[a] approve", "[x] reject: <why>"]);
});

test("a done phase on a security path names its own gate in the detail", () => {
  const next = step({ lane: "design", phases: [{ n: 1, done: true, touchSet: ["src/auth/token.ts"] }] });
  assert.equal(next.own_gate?.kind, "security_path");
  assert.match(next.detail, /; it touches a security path \(src\/auth\/token\.ts\)$/);
});

test("a done irreversible phase offers only the confirm and reject options, on a security path too", () => {
  const irreversible = ["[i] confirm the irreversible step", "[x] reject: <why>"];
  const plain = step({ lane: "design", phases: [{ n: 1, done: true, irreversible: true }, { n: 2 }] });
  assert.deepEqual(plain.options, irreversible);
  assert.equal(plain.own_gate?.kind, "irreversible");
  const secure = step({ lane: "design", phases: [{ n: 1, done: true, irreversible: true, touchSet: ["src/auth/token.ts"] }, { n: 2 }] });
  assert.deepEqual(secure.options, irreversible);
  assert.equal(secure.own_gate?.kind, "security_path");
});

test("nextView prints today's keys in order and adds warnings only when the snapshot has some", () => {
  const clean = snapshotOf({ phases: [{ n: 1 }] });
  const view = nextView(clean, nextStep(clean, SECURITY_PATHS));
  assert.deepEqual(Object.keys(view), ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail", "send"]);
  const send = [{ tool: "Agent", to: `${instanceTag("20261023-probe")}-developer`, type: "picket:developer", message: "work: 20261023-probe\nphase: 1\nartifact: work/20261023-probe/order.md" }];
  assert.deepEqual(view, { id: "20261023-probe", lane: "order", status: "open", phase: 1, options: [], own_gate: null, action: "implement_phase", actor: "developer", detail: "phase 1 of 1: Phase 1", send });
  const warned = snapshotOf({ phases: [{ n: 1 }], warnings: ["verdicts.jsonl: 1 unreadable line skipped"] });
  assert.deepEqual(nextView(warned, nextStep(warned, SECURITY_PATHS)).warnings, ["verdicts.jsonl: 1 unreadable line skipped"]);
});

const PLAN_AMEND = "AMENDMENT NEEDED: T-2.7 the criterion names the wrong file";
const PLAN_ONLY = { ts: "2026-10-23T10:00:00.000Z", agent: "reviewer", verdict: "CHANGES REQUIRED", phase: 2, scope: "cumulative", through: null, amend: PLAN_AMEND, plan_only: true as const };
const APPROVED_PHASES = numbered(2, { done: true, approved: true });

function gateReply(reply: "a" | "f") {
  return { ts: "2026-10-23T11:00:00.000Z", action: "approve_amendment", phase: null, reply, choice: reply === "a" ? "amend" : "fix" } as const;
}

function laterRow(agent: string, verdict: string) {
  return { ts: "2026-10-23T12:00:00.000Z", agent, verdict, phase: 2, scope: null, through: null };
}

test("a plan-only cumulative rejection with no reply stops at approve_amendment, naming the amend line and the saved review (T-2.2)", () => {
  assert.deepEqual(step({ phases: APPROVED_PHASES, verdicts: [row("approved"), PLAN_ONLY] }), {
    action: "approve_amendment",
    actor: "user",
    detail: `the cumulative review found only plan wording: ${PLAN_AMEND}; review: work/20261023-probe/reviews/cumulative.md`,
    options: ["[a] amend order.md, approved phases included", "[f] fix the code instead"],
  });
  assert.equal(step({ lane: "design", phases: APPROVED_PHASES, verdicts: [PLAN_ONLY] }).options[0], "[a] amend design.md, approved phases included");
});

test("after a, the architect amends with a reword grant until AMENDED, then the cumulative review runs with only the summary first (T-2.4)", () => {
  const replied = { phases: APPROVED_PHASES, replies: [gateReply("a")] };
  assert.deepEqual(step({ ...replied, verdicts: [PLAN_ONLY] }), { action: "amend", actor: "architect", detail: PLAN_AMEND, reword: true });
  const amended = snapshotOf({ ...replied, verdicts: [PLAN_ONLY, laterRow("architect", "AMENDED")] });
  const next = nextStep(amended, SECURITY_PATHS);
  assert.deepEqual([next.action, next.actor], ["review_cumulative", "reviewer"]);
  assert.deepEqual(nextView(amended, next, null).send.map((s) => s.first), [["picket summary 20261023-probe --save"]]);
});

test("after f, the developer fixes the findings until PHASE DONE, then the cumulative review runs, never an amend (T-2.5)", () => {
  const replied = { phases: APPROVED_PHASES, replies: [gateReply("f")] };
  const fixing = step({ ...replied, verdicts: [PLAN_ONLY] });
  assert.deepEqual([fixing.action, fixing.actor, fixing.review], ["fix_findings", "developer", "cumulative"]);
  assert.equal(step({ ...replied, verdicts: [PLAN_ONLY, laterRow("developer", "PHASE DONE")] }).action, "review_cumulative");
});

test("after f and a PHASE DONE, a plain cumulative rejection goes to the developer, never to the declined amendment (T-2.5)", () => {
  const plain = { ...laterRow("reviewer", "CHANGES REQUIRED"), ts: "2026-10-23T13:00:00.000Z", scope: "cumulative" };
  const next = step({ phases: APPROVED_PHASES, replies: [gateReply("f")], verdicts: [PLAN_ONLY, laterRow("developer", "PHASE DONE"), plain] });
  assert.deepEqual([next.action, next.actor, next.review], ["fix_findings", "developer", "cumulative"]);
});

test("a gate reply older than the plan-only rejection does not answer it", () => {
  const older = { ...gateReply("a"), ts: "2026-10-23T09:00:00.000Z" };
  assert.equal(step({ phases: APPROVED_PHASES, verdicts: [PLAN_ONLY], replies: [older] }).action, "approve_amendment");
});

const MIXED = { ts: PLAN_ONLY.ts, agent: "reviewer", verdict: "CHANGES REQUIRED", phase: 2, scope: "cumulative", through: null, amend: PLAN_AMEND };

function latest(agent: string, verdict: string) {
  return { ...laterRow(agent, verdict), ts: "2026-10-23T13:00:00.000Z" };
}

test("a mixed cumulative rejection with no reply stops at approve_amendment, naming plan wording and code findings (T-1.1)", () => {
  assert.deepEqual(step({ phases: APPROVED_PHASES, verdicts: [row("approved"), MIXED] }), {
    action: "approve_amendment",
    actor: "user",
    detail: `the cumulative review found plan wording and code findings: ${PLAN_AMEND}; review: work/20261023-probe/reviews/cumulative.md`,
    options: ["[a] amend order.md, approved phases included", "[f] fix the code instead"],
  });
});

test("after a on a mixed rejection, the architect amends with a reword grant, then the developer fixes the code, then the cumulative review runs (T-1.2)", () => {
  const replied = { phases: APPROVED_PHASES, replies: [gateReply("a")] };
  assert.deepEqual(step({ ...replied, verdicts: [MIXED] }), { action: "amend", actor: "architect", detail: PLAN_AMEND, reword: true });
  assert.deepEqual(step({ ...replied, verdicts: [MIXED, laterRow("architect", "AMENDED")] }), {
    action: "fix_findings",
    actor: "developer",
    phase: 2,
    review: "cumulative",
    detail: "the plan wording was amended; fix the cumulative review's code findings",
  });
  assert.deepEqual(step({ ...replied, verdicts: [MIXED, laterRow("architect", "AMENDED"), latest("developer", "PHASE DONE")] }), {
    action: "review_cumulative",
    actor: "reviewer",
    phase: 2,
    detail: "the plan wording was amended and the code findings fixed; the cumulative review runs again",
  });
});

const RECORD = "a".repeat(64);
const recorded = <T extends object>(row: T, record = RECORD) => ({ ...row, record });

function gateReplyAt(reply: "a" | "f", ts: string) {
  return { ...gateReply(reply), ts };
}

test("after a, an AMENDED with the review's record reopens the gate, and a newer reply decides again (T-2.3)", () => {
  const unchanged = `the architect returned AMENDED but design.md is unchanged: ${PLAN_AMEND}; review: work/20261023-probe/reviews/cumulative.md`;
  for (const review of [PLAN_ONLY, MIXED]) {
    const verdicts = [recorded(review), recorded(laterRow("architect", "AMENDED"))];
    const base = { lane: "design" as const, phases: APPROVED_PHASES, verdicts };
    assert.deepEqual(step({ ...base, replies: [gateReply("a")] }), {
      action: "approve_amendment",
      actor: "user",
      detail: unchanged,
      options: ["[a] amend design.md, approved phases included", "[f] fix the code instead"],
    });
    const again = [gateReply("a"), gateReplyAt("a", "2026-10-23T12:30:00.000Z")];
    assert.deepEqual(step({ ...base, replies: again }), { action: "amend", actor: "architect", detail: PLAN_AMEND, reword: true });
    const fixing = step({ ...base, replies: [gateReply("a"), gateReplyAt("f", "2026-10-23T12:30:00.000Z")] });
    assert.deepEqual([fixing.action, fixing.actor, fixing.review], ["fix_findings", "developer", "cumulative"]);
  }
});

test("after a, an AMENDED with a different record counts: plan-only goes to the review, mixed to the developer (T-2.4)", () => {
  const changed = (review: object) => step({ lane: "design", phases: APPROVED_PHASES, replies: [gateReply("a")], verdicts: [recorded(review), recorded(laterRow("architect", "AMENDED"), "b".repeat(64))] });
  assert.equal(changed(PLAN_ONLY).action, "review_cumulative");
  assert.equal(changed(MIXED).action, "fix_findings");
});

test("a drift-blocked design item still re-checks after an AMENDED with the drift's record (T-2.4)", () => {
  const verdicts = [recorded(amending("DRIFT DETECTED", "crosscheck")), recorded({ ...row("AMENDED"), agent: "architect" })];
  assert.equal(step({ lane: "design", status: "blocked", blocked_reason: AMEND_LINE, phases: numbered(2), verdicts }).action, "review_crosscheck");
});

test("after f on a mixed rejection, the developer fixes until PHASE DONE, and a later plain rejection goes to the developer, never an amend (T-1.3)", () => {
  const replied = { phases: APPROVED_PHASES, replies: [gateReply("f")] };
  const fixing = step({ ...replied, verdicts: [MIXED] });
  assert.deepEqual([fixing.action, fixing.actor, fixing.review], ["fix_findings", "developer", "cumulative"]);
  const fixed = [MIXED, laterRow("developer", "PHASE DONE")];
  assert.equal(step({ ...replied, verdicts: fixed }).action, "review_cumulative");
  const plain = { ...latest("reviewer", "CHANGES REQUIRED"), scope: "cumulative" };
  const next = step({ ...replied, verdicts: [...fixed, plain] });
  assert.deepEqual([next.action, next.actor, next.review], ["fix_findings", "developer", "cumulative"]);
});
