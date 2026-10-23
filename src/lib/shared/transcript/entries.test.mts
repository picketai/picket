import { test } from "node:test";
import assert from "node:assert/strict";
import { latestHints, spawnHints } from "./entries.mts";
import { assistantText, userEntry, writeTranscript } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const ID = "20261006-csv";
const continuation = `The coordinator sent a message while you were working:\nCheckpoint review of phases 1 to 4.\n\nwork: ${ID}\nscope: checkpoint\nphase: 4`;

test("latestHints reads the continuation, spawnHints keeps the spawn message (T-2.1, T-2.2)", (t) => {
  const root = withProject(t, { picket: false });
  const path = writeTranscript(root, [userEntry(`work: ${ID}\nscope: crosscheck`), assistantText("ALIGNED"), userEntry(continuation)]);
  assert.deepEqual(latestHints(path), { work_id: ID, phase: 4, lane: null, scope: "checkpoint" });
  assert.deepEqual(spawnHints(path), { work_id: ID, phase: null, lane: null, scope: "crosscheck" });
});

test("latestHints skips a later message without a work line (T-2.3)", (t) => {
  const root = withProject(t, { picket: false });
  const skillBody = "Review the phase named by `phase: <n>`.\nscope: checkpoint\nphase: 9";
  const path = writeTranscript(root, [userEntry(`work: ${ID}\nscope: crosscheck`), userEntry(continuation), userEntry(skillBody)]);
  assert.deepEqual(latestHints(path), { work_id: ID, phase: 4, lane: null, scope: "checkpoint" });
});
