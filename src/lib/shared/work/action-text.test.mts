import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTION_TEXT, NEXT_ACTIONS, isNextAction, type Voice } from "./action-text.mts";

const STEP = { actor: "developer", phase: 2, lane: "order", detail: "d" };
const VOICES: Voice[] = ["user", "observer"];

test("every next action has a line in both voices, with no missing value in it", () => {
  for (const action of NEXT_ACTIONS) {
    for (const voice of VOICES) {
      const line = ACTION_TEXT[action](STEP, voice);
      assert.ok(line.trim().length > 0, `${action} ${voice}`);
      assert.doesNotMatch(line, /undefined|null/, `${action} ${voice}: ${line}`);
    }
  }
});

test("a user gate reads as the user's ask in their own session and as a wait elsewhere", () => {
  assert.equal(ACTION_TEXT.approve_phase(STEP, "user"), "you approve phase 2");
  assert.equal(ACTION_TEXT.approve_phase(STEP, "observer"), "waits for approval of phase 2");
  assert.equal(ACTION_TEXT.implement_phase(STEP, "observer"), "developer implements phase 2");
  assert.equal(ACTION_TEXT.write_artifact({ ...STEP, actor: "architect" }, "user"), "architect writes order.md");
});

test("fixing findings reads the same for a checkpoint and a cumulative review, in both voices", () => {
  for (const voice of VOICES) assert.equal(ACTION_TEXT.fix_findings(STEP, voice), "developer fixes the review findings");
});

test("isNextAction accepts the listed actions and nothing else", () => {
  assert.ok(NEXT_ACTIONS.every(isNextAction));
  assert.equal(isNextAction("frobnicate"), false);
});
