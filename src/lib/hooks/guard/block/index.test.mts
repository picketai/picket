import { test } from "node:test";
import assert from "node:assert/strict";
import { guardBlock } from "./index.mts";

function stop(agent: string, text: string) {
  const event = { hook_event_name: "SubagentStop", agent_type: agent, last_assistant_message: text } as Parameters<typeof guardBlock>[0];
  return guardBlock(event);
}

const testBlock = (last: string) => `## Test: 20261117-x · round 1\n\nT-2.1 has a passed case.\n\nReport: work/20261117-x/test.md\n\n${last}`;

test("a tester turn ending PHASE DONE is bounced naming the tester's three tokens (T-5.6)", () => {
  const out = stop("abcd-tester", testBlock("PHASE DONE"));
  assert.equal(out?.decision, "block");
  assert.match(out?.reason ?? "", /\(APPROVED, CHANGES REQUIRED, DRIFT DETECTED\)/);
});

test("a tester turn ending each of its tokens passes", () => {
  for (const token of ["APPROVED", "CHANGES REQUIRED", "DRIFT DETECTED"]) assert.equal(stop("abcd-tester", testBlock(token)), null, token);
});

test("a tester turn with no block is bounced naming the tester's tokens", () => {
  assert.match(stop("abcd-tester", "I ran the cases.")?.reason ?? "", /APPROVED, CHANGES REQUIRED, DRIFT DETECTED/);
});

test("a developer phase block ending a reviewer token is bounced naming the developer's tokens", () => {
  const block = "## Phase 1 of 20261117-x: A\n\nDone.\n\nFiles: a.ts\n\nAPPROVED";
  assert.match(stop("abcd-developer", block)?.reason ?? "", /\(PHASE DONE or PHASE STALLED\)/);
});
