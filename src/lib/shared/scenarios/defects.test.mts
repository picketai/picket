import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintMatches, parseScenario, writeScenario, type Card } from "./format.mts";
import { ageDays, DEFECT_DIR, labelCard, nextDefectId, readDefects, writeDefect, type DefectEntry } from "./defects.mts";

function tempRoot(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-defects-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

const OPEN: DefectEntry = {
  id: "DF-0001",
  status: "open",
  opened: "2026-10-10",
  found_in: "20261010-orders",
  scenario: "S-0002",
  expected: "an order is created: then read back",
  actual: "step 2: expected status 200, got 500",
  evidence: "run 2026-10-10T09:00:00.000Z-0001 on orders 1a2b3c4, web 0f0f0f0",
};

const EVERY_FIELD: DefectEntry = {
  ...OPEN,
  id: "DF-0002",
  status: "fixed",
  scenario: "none",
  case: "C-03",
  root_cause: "the total skipped the discount, # and all",
  escaped: "none: not checkable earlier",
  fixed: "2026-11-20",
  fixed_in: "20261120-cart",
  reason: "fixed by this item",
  range: "orders 1a2b3c4..5d6e7f8",
};

const CARD: Card = { header: { id: "S-0002", kind: "smoke", covers: [], intent: "health", status: "active", format: 1 }, steps: [{ word: "request", line: 1, method: "GET", target: "{orders}/health", headers: [], body: null }] };

test("an entry written with every field reads back equal, sorted by id (T-1.2)", (t) => {
  const root = tempRoot(t);
  assert.equal(writeDefect(root, EVERY_FIELD), ".picket/env/scenarios/defects/DF-0002.md");
  writeDefect(root, OPEN);
  assert.deepEqual(readDefects(root), [OPEN, EVERY_FIELD]);
});

test("a file that does not parse or misses a field is skipped", (t) => {
  const root = tempRoot(t);
  writeDefect(root, OPEN);
  writeFileSync(join(root, DEFECT_DIR, "DF-0002.md"), "---\nid: DF-0002\nstatus: open\n---\n");
  writeFileSync(join(root, DEFECT_DIR, "DF-0003.md"), "---\nid: [unclosed\n---\n");
  assert.deepEqual(readDefects(root), [OPEN]);
});

test("the next id follows the highest file number with four digits (T-1.2)", (t) => {
  const root = tempRoot(t);
  assert.equal(nextDefectId(root), "DF-0001");
  writeDefect(root, OPEN);
  writeDefect(root, { ...OPEN, id: "DF-0002" });
  assert.equal(nextDefectId(root), "DF-0003");
});

test("the age is whole UTC days since the opening date (T-1.2)", () => {
  assert.equal(ageDays("2026-10-10", new Date("2026-11-20T09:00:00Z")), 41);
  assert.equal(ageDays("2026-11-20", new Date("2026-11-20T23:59:00Z")), 0);
});

test("labelling a card sets, replaces and removes the labels and keeps it signed", () => {
  const text = writeScenario(CARD);
  const known = labelCard(text, { known: "DF-0001" });
  assert.ok(fingerprintMatches(known));
  assert.deepEqual(parseScenario(known).card?.header, { ...CARD.header, known: "DF-0001" });
  const fixed = labelCard(known, { known: null, defect: "DF-0001" });
  assert.ok(fingerprintMatches(fixed));
  assert.deepEqual(parseScenario(fixed).card?.header, { ...CARD.header, defect: "DF-0001" });
  assert.equal(labelCard("not a card\n", { known: "DF-0001" }), "not a card\n");
});

test("an entry file is a frontmatter block with no body", (t) => {
  const root = tempRoot(t);
  const text = readFileSync(join(root, writeDefect(root, OPEN)), "utf8");
  assert.ok(text.startsWith("---\nid: DF-0001\nstatus: open\n"), text);
  assert.ok(text.endsWith("\n---\n"), text);
});
