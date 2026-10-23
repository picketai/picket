import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
