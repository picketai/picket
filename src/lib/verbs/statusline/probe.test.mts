import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { liveProbe } from "./probe.mts";
import { withProject } from "#test/project.mts";

test("liveProbe reuses git state for 5 seconds and the skill while the transcript size holds (T-1.7)", (t) => {
  const root = withProject(t, { picket: false });
  const cacheDir = join(root, "cache");
  const transcript = join(root, "transcript.jsonl");
  writeFileSync(transcript, "{}\n");
  const calls = { git: 0, skill: 0 };
  const probeAt = (now: number) =>
    liveProbe({
      cacheDir,
      now,
      readGit: () => {
        calls.git++;
        return { branch: "main", state: "clean" };
      },
      readSkill: () => {
        calls.skill++;
        return "picket:ordering";
      },
    });
  const start = Date.UTC(2026, 9, 17, 12, 0, 0);
  assert.deepEqual(probeAt(start).git(root), { branch: "main", state: "clean" });
  assert.deepEqual(probeAt(start + 4_000).git(root), { branch: "main", state: "clean" });
  assert.equal(calls.git, 1);
  probeAt(start + 6_000).git(root);
  assert.equal(calls.git, 2);
  assert.equal(probeAt(start).skill(transcript), "picket:ordering");
  assert.equal(probeAt(start + 60_000).skill(transcript), "picket:ordering");
  assert.equal(calls.skill, 1);
  appendFileSync(transcript, "{}\n");
  probeAt(start + 61_000).skill(transcript);
  assert.equal(calls.skill, 2);
});
