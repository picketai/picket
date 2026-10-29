import { test } from "node:test";
import assert from "node:assert/strict";
import { bareAgentName } from "./agent-name.mts";
import { instanceTag } from "./work/send.mts";

test("a tagged instance name, a fresh developer's number and a plugin type all read back as the role", () => {
  const tag = instanceTag("20261029-convert-architect-analyst-and-reviewer-item-b-de");
  assert.equal(bareAgentName(`${tag}-architect`), "architect");
  assert.equal(bareAgentName(`${tag}-cumulative-reviewer`), "reviewer");
  assert.equal(bareAgentName(`${tag}-developer-2`), "developer");
  assert.equal(bareAgentName("picket:reviewer"), "reviewer");
});
