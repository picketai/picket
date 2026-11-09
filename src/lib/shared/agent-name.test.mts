import { test } from "node:test";
import assert from "node:assert/strict";
import { bareAgentName, picketRole } from "./agent-name.mts";
import { instanceTag } from "./work/send.mts";

test("a tagged instance name, a fresh developer's number and a plugin type all read back as the role", () => {
  const tag = instanceTag("20261029-convert-architect-analyst-and-reviewer-item-b-de");
  assert.equal(bareAgentName(`${tag}-architect`), "architect");
  assert.equal(bareAgentName(`${tag}-cumulative-reviewer`), "reviewer");
  assert.equal(bareAgentName(`${tag}-developer-2`), "developer");
  assert.equal(bareAgentName("picket:reviewer"), "reviewer");
});

test("picketRole names the role of a plugin type and of a teammate instance name", () => {
  assert.equal(picketRole("picket:reviewer"), "reviewer");
  assert.equal(picketRole("bfoi-reviewer"), "reviewer");
  assert.equal(picketRole("bfoi-cumulative-reviewer"), "reviewer");
  assert.equal(picketRole("bfoi-developer-2"), "developer");
  assert.equal(picketRole("picket:architect"), "architect");
  assert.equal(picketRole("analyst"), "analyst");
});

test("picketRole is null for an agent that is not one of picket's four", () => {
  assert.equal(picketRole("Explore"), null);
  assert.equal(picketRole("general-purpose"), null);
  assert.equal(picketRole(""), null);
  assert.equal(picketRole(undefined), null);
});
