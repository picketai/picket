import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendComment } from "./approvals.mts";
import { openItem, withProject } from "#test/project.mts";

test("appendComment records the path relative to the root when run from a subfolder", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "fast", title: "Comment" });
  const entry = appendComment(root, s.id, { path: "a.ts", text: "t" }, { cwd: join(root, "src"), now: new Date("2026-10-23T10:00:00Z") });
  assert.equal(entry.path, "src/a.ts");
  assert.match(readFileSync(join(root, "work", s.id, "comments.jsonl"), "utf8"), /"path":"src\/a\.ts"/);
});
