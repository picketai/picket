import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArtifact } from "./artifact.mts";
import { correctCheckPath, withRevisionLine } from "./check-correction.mts";

const RECORD = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [src/a.ts]",
  "    drive:",
  "      - covers: T-1.1",
  "        method: GET",
  "        path: /orders",
  "        status: 200",
  "    security: false",
  "  - n: 2",
  "    files: [src/b.ts]",
  "    drive:",
  "      - covers: T-2.1",
  "        method: POST",
  "        path: /orders",
  "        status: 201",
  "        contains: [pending]",
  "      - path: /orders",
  "        covers: T-2.2",
  "        method: GET",
  "        status: 200",
  "    security: false",
  "---",
  "# D",
  "",
  "## Phase 1: A",
  "",
  "## Phase 2: B",
  "",
  "## Revision log",
  "",
].join("\n");

type DriveList = Record<string, unknown>[];

function driveOf(text: string, phase: number): DriveList {
  return parseArtifact(text).phases.find((entry) => entry.n === phase)?.entry?.drive as DriveList;
}

function changedLines(before: string, after: string): number[] {
  const old = before.split("\n");
  return after.split("\n").flatMap((line, at) => (line === old[at] ? [] : [at]));
}

test("correctCheckPath rewrites only the check at the index, among checks with the same path (T-6.1)", () => {
  const corrected = correctCheckPath(RECORD, 2, 0, "/api/orders");
  const expected = structuredClone(parseArtifact(RECORD).front) as { phases: { drive: DriveList }[] };
  expected.phases[1].drive[0].path = "/api/orders";
  assert.deepEqual(parseArtifact(corrected).front, expected);
  assert.deepEqual(changedLines(RECORD, corrected), [16]);
  assert.equal(corrected.split("\n").length, RECORD.split("\n").length);
});

test("correctCheckPath finds a path written on the item's dash line (T-6.1)", () => {
  const corrected = correctCheckPath(RECORD, 2, 1, "/api/orders");
  assert.equal(driveOf(corrected, 2)[1].path, "/api/orders");
  assert.equal(driveOf(corrected, 2)[0].path, "/orders");
  assert.equal(driveOf(corrected, 1)[0].path, "/orders");
  assert.deepEqual(changedLines(RECORD, corrected), [19]);
});

test("a path holding # or ': ' reads back exactly as written (T-6.2)", () => {
  for (const path of ["/orders#top", "/orders/a: b", '/say/"hi"\\there', "/orders, all"]) {
    assert.equal(driveOf(correctCheckPath(RECORD, 2, 0, path), 2)[0].path, path, path);
  }
});

test("correctCheckPath leaves the text as it is for a phase or index that holds no check", () => {
  assert.equal(correctCheckPath(RECORD, 3, 0, "/x"), RECORD);
  assert.equal(correctCheckPath(RECORD, 1, 1, "/x"), RECORD);
});

test("withRevisionLine appends after the last line of the revision log", () => {
  const once = withRevisionLine(RECORD, "- 2026-11-13: one");
  assert.ok(once.endsWith("## Revision log\n\n- 2026-11-13: one\n"), once);
  assert.ok(withRevisionLine(once, "- 2026-11-13: two").endsWith("## Revision log\n\n- 2026-11-13: one\n- 2026-11-13: two\n"));
});

test("withRevisionLine places the line before a section that follows the log", () => {
  const text = "# D\n\n## Revision log\n\n- 2026-11-01: a\n\n## Notes\n\nx\n";
  assert.equal(withRevisionLine(text, "- 2026-11-13: b"), "# D\n\n## Revision log\n\n- 2026-11-01: a\n- 2026-11-13: b\n\n## Notes\n\nx\n");
});

test("withRevisionLine adds the log when the record has none", () => {
  assert.equal(withRevisionLine("# D\n", "- 2026-11-13: b"), "# D\n\n## Revision log\n\n- 2026-11-13: b\n");
});
