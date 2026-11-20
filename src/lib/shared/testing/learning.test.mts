import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DefectEntry } from "../scenarios/defects.mts";
import { escapeCounts, writeLearning } from "./learning.mts";

function tempRoot(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-learning-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function fixedEntry(id: string, item: string, escaped: string, rootCause = `cause of ${id}`): DefectEntry {
  return { id, status: "fixed", opened: "2026-11-01", found_in: item, scenario: "none", expected: "x", actual: "y", evidence: "z", case: "C-03", root_cause: rootCause, escaped, fixed: "2026-11-02", fixed_in: item, reason: "fixed by this item" };
}

const TWO_ITEMS = [fixedEntry("DF-0004", "20261101-a", "unit test"), fixedEntry("DF-0009", "20261110-b", "unit test")];

test("a point escaped in two items is kept with its items and entries; two entries of one item are not (T-3.5)", () => {
  assert.deepEqual(escapeCounts(TWO_ITEMS), [{ point: "unit test", role: "developer", items: ["20261101-a", "20261110-b"], entries: TWO_ITEMS }]);
  assert.deepEqual(escapeCounts([fixedEntry("DF-0004", "20261101-a", "unit test"), fixedEntry("DF-0005", "20261101-a", "unit test")]), []);
});

test("not checkable earlier is counted with no role, and an entry with no escape point is not counted (T-3.5)", () => {
  const entries = [fixedEntry("DF-0001", "20261101-a", "none: not checkable earlier"), fixedEntry("DF-0002", "20261110-b", "none: not checkable earlier")];
  const { escaped: _, ...open } = fixedEntry("DF-0003", "20261111-c", "x");
  assert.deepEqual(escapeCounts([...entries, open]).map(({ point, role, items }) => ({ point, role, items })), [{ point: "none: not checkable earlier", role: null, items: ["20261101-a", "20261110-b"] }]);
});

test("the developer's memory file holds the frontmatter and one line per point, indexed once (T-3.6)", (t) => {
  const root = tempRoot(t);
  assert.deepEqual(writeLearning(root, escapeCounts(TWO_ITEMS)), [".claude/agent-memory/picket-developer/escaped-defects.md"]);
  const folder = join(root, ".claude", "agent-memory", "picket-developer");
  assert.equal(
    readFileSync(join(folder, "escaped-defects.md"), "utf8"),
    [
      "---",
      "name: escaped-defects",
      "description: defects that got past this role's check in two or more items, counted by picket close",
      "metadata:",
      "  type: feedback",
      "---",
      "",
      "- Defects escaped a unit test in 2 items: DF-0004 (20261101-a): cause of DF-0004; DF-0009 (20261110-b): cause of DF-0009.",
      "",
    ].join("\n"),
  );
  writeLearning(root, escapeCounts(TWO_ITEMS));
  assert.equal(readFileSync(join(folder, "MEMORY.md"), "utf8"), "- [Escaped defects](escaped-defects.md): defects that got past this role's check, counted by picket close\n");
});

test("a review row escape goes to the reviewer and not checkable earlier is written nowhere (T-3.6)", (t) => {
  const root = tempRoot(t);
  const entries = [fixedEntry("DF-0001", "20261101-a", "Ts4"), fixedEntry("DF-0002", "20261110-b", "Ts4"), fixedEntry("DF-0003", "20261101-a", "none: not checkable earlier"), fixedEntry("DF-0004", "20261110-b", "none: not checkable earlier")];
  assert.deepEqual(writeLearning(root, escapeCounts(entries)), [".claude/agent-memory/picket-reviewer/escaped-defects.md"]);
  assert.match(readFileSync(join(root, ".claude/agent-memory/picket-reviewer/escaped-defects.md"), "utf8"), /^- Defects escaped review row Ts4 in 2 items: /m);
  assert.equal(existsSync(join(root, ".claude/agent-memory/picket-developer")), false);
});
