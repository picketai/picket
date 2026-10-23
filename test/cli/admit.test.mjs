import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

test("picket admit --human names the skill for a diagnosis request (T-2.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const r = runCli(root, ["admit", "--text", "debug the flaky invoice test", "--human", "--root", root]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout.trim(), /^lane: none · skill: picket:debugging \(asks for a diagnosis/);
});
