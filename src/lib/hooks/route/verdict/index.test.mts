import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reviewClasses, routeVerdict as verdictHandler } from "./index.mts";
import { statePath, stateRel } from "../../../shared/paths.mts";
import { hookContext } from "#test/context.mts";
import { assistantText as assistant, looseHandler, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

const routeVerdict = looseHandler(verdictHandler);

test("routeVerdict on a pull request review keeps the block and names its state path (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const block = "## Review: pr-412 · pr\n\nApproved.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const tp = transcript(root, [user("scope: pr"), assistant(block)]);
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, hookContext(root));
  assert.ok(out.hookSpecificOutput.additionalContext.includes(stateRel("pr-412.review.md")));
  assert.equal(existsSync(statePath(root, "pr-412.review.md")), true);
  assert.equal(existsSync(join(root, "work", "pr-412", "reviews")), false);
  assert.equal(routeVerdict({ stop_hook_active: true }, hookContext(root)), null);
});

test("routeVerdict on a developer PHASE DONE stamps the item with the event's session (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Claimed", session: "s1" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  const block = `## Phase 1 of ${s.id}: A\n\nA works.\n\nFiles: a.mjs\nTests: passed\nLint: none detected\nVerified: no drivable surface: test\nDecisions: none\nComments: none\nCommit: feat: a\n\nPHASE DONE`;
  const tp = transcript(root, [user(`work: ${s.id}\nphase: 1`), assistant(block)]);
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, hookContext(root));
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(readFileSync(join(root, "work", s.id, "state.yaml"), "utf8"), /^session: s3$/m);
});

function designItem(root: string) {
  const s = openItem(root, { lane: "design", title: "Reviewed" });
  writeFileSync(join(root, "work", s.id, "design.md"), "---\nlane: design\n---\n# D\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  return s.id;
}

function reviewBlock(id: string, scope: string, body: string, verdict: string): string {
  return `Reading the diff first.\n## Review: ${id} · ${scope}\n\n${body}\n\nAlignment: PASS\nFindings: clean\n\n${verdict}`;
}

function routeReview(root: string, id: string, block: string, session = "s1") {
  const tp = transcript(root, [user(`work: ${id}`), assistant(block)]);
  return routeVerdict({ hook_event_name: "SubagentStop", session_id: session, transcript_path: tp, cwd: root, agent_type: "picket:reviewer" }, hookContext(root));
}

function verdictRows(root: string, id: string) {
  return readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("routeVerdict saves each reviewer block under reviews/, from its heading to its verdict", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const files = { crosscheck: "crosscheck.md", "phase 2": "phase-2.md", checkpoint: "checkpoint.md", cumulative: "cumulative.md" };
  for (const scope of Object.keys(files)) routeReview(root, id, reviewBlock(id, scope, `Scope ${scope}.`, scope === "crosscheck" ? "ALIGNED" : "APPROVED"));
  for (const [scope, file] of Object.entries(files)) {
    const saved = readFileSync(join(root, "work", id, "reviews", file), "utf8");
    assert.ok(saved.startsWith(`## Review: ${id} · ${scope}\n`), saved);
    assert.match(saved, scope === "crosscheck" ? /\nALIGNED\n$/ : /\nAPPROVED\n$/);
  }
  assert.equal(verdictRows(root, id).at(-1).session, "s1");
});

test("a second cumulative review replaces the first saved one", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  routeReview(root, id, reviewBlock(id, "cumulative", "First pass.", "CHANGES REQUIRED"));
  routeReview(root, id, reviewBlock(id, "cumulative", "Second pass.", "APPROVED"));
  assert.deepEqual(readdirSync(join(root, "work", id, "reviews")), ["cumulative.md"]);
  assert.match(readFileSync(join(root, "work", id, "reviews", "cumulative.md"), "utf8"), /Second pass\./);
});

test("an AMENDMENT NEEDED line lands on the row, and on a drift also as the blocked reason", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const line = "AMENDMENT NEEDED: D-002 the port moved";
  routeReview(root, id, reviewBlock(id, "cumulative", `Drifted.\n${line}`, "CHANGES REQUIRED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  routeReview(root, id, reviewBlock(id, "crosscheck", `Drifted.\n${line}`, "DRIFT DETECTED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  assert.match(readFileSync(join(root, "work", id, "state.yaml"), "utf8"), /^blocked_reason: .*D-002 the port moved/m);
});

test("an architect AMENDED block quoting the amendment line carries no amend, so next leaves amend", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const line = "AMENDMENT NEEDED: D-002 x";
  routeReview(root, id, reviewBlock(id, "phase 1", `Drifted.\n${line}`, "CHANGES REQUIRED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  const amended = `## Amendment: ${id}\n\nD-002 revised.\n\nRevision: D-002 (r2) answers:\n${line}\n\nAMENDED`;
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: transcript(root, [user(`work: ${id}`), assistant(amended)]), cwd: root, agent_type: "picket:architect" }, hookContext(root));
  const row = verdictRows(root, id).at(-1);
  assert.equal(row.verdict, "AMENDED");
  assert.equal("amend" in row, false);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Next: amend\b/);
});

test("routeVerdict stores a reviewer's Classes on a CHANGES REQUIRED entry and nothing for none (T-9.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Classed" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  const review = (classes: string, verdict: string) => `## Review: ${s.id} · cumulative\n\nOne gap.\n\nAlignment: PASS\nFindings: 0 critical, 2 major, 0 minor\n- [Major] a.mjs:1 — x. y. z.\n${classes}\n\n${verdict}`;
  const routeBlock = (block: string, session: string) => routeVerdict({ hook_event_name: "SubagentStop", session_id: session, transcript_path: transcript(root, [user(`work: ${s.id}\nscope: cumulative`), assistant(block)]), cwd: root, agent_type: "picket:reviewer" }, hookContext(root));
  routeBlock(review("Classes: Ts4, Cm1", "CHANGES REQUIRED"), "s1");
  routeBlock(review("Classes: none", "CHANGES REQUIRED"), "s2");
  routeBlock(review("", "CHANGES REQUIRED"), "s3");
  const entries = readFileSync(join(root, "work", s.id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(entries.map((e) => e.classes ?? null), [["Ts4", "Cm1"], null, null]);
  assert.deepEqual(reviewClasses("Classes: Ts4,Cm1 Ts4, and more"), ["Ts4", "Cm1"]);
});
