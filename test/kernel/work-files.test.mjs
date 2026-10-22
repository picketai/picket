import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { UsageError } from "../../dist/lib/action.mjs";
import { MARKERS, WORK_FILES, phaseMarker, workDir, workFile, workId, workRel } from "../../dist/lib/work-files.mjs";

const root = resolve("some-root");

test("workId returns a well-formed id as it is (T-1.3)", () => {
  assert.equal(workId("20261022-x"), "20261022-x");
});

test("workId refuses a path, a too-short id and other malformed text with a UsageError (T-1.3)", () => {
  for (const text of ["../etc", "ab", "", "-abc", "Abc", "a/b/c", "a".repeat(82)]) {
    assert.throws(() => workId(text), UsageError, text);
  }
});

test("work item paths sit under work/<id> (T-1.3)", () => {
  const id = workId("20261022-x");
  assert.equal(workDir(root, id), join(root, "work", id));
  assert.equal(workFile(root, id, "state.yaml"), join(root, "work", id, "state.yaml"));
  assert.equal(phaseMarker(root, id, 2, "approved"), join(root, "work", id, "phases", "2.approved"));
  assert.equal(phaseMarker(root, id, 1, "block.md"), join(root, "work", id, "phases", "1.block.md"));
  assert.equal(workRel(id), `work/${id}/`);
});

test("the closed lists hold the work item files and phase markers", () => {
  assert.equal(WORK_FILES.length, 13);
  assert.equal(new Set(WORK_FILES).size, 13);
  assert.deepEqual([...MARKERS], ["done", "approved", "reviewed", "block.md"]);
});
