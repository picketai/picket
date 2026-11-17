import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { SavedScenario } from "../scenarios/files.mts";
import { readSnapshot } from "../work/snapshot.mts";
import type { WorkId } from "../work/files.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { compileBrief } from "./brief.mts";
import { testFacts } from "./facts.mts";
import { appendTestRow } from "./results.mts";

const TOUCHED = "services/orders/server.mjs";
const DESIGN = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  `    files: [${TOUCHED}]`,
  "    drive: true",
  "  - n: 2",
  "    files: [services/orders/routes.mjs]",
  "    drive:",
  "      - covers: T-2.1",
  "        method: POST",
  "        path: /orders",
  "        status: 201",
  "        contains: [id]",
  "        service: orders",
  "---",
  "# Design: Orders",
  "",
  "## Phase 1: Server",
  "",
  "**Touch set:**",
  `- \`${TOUCHED}\`: the server`,
  "",
  "## Phase 2: Orders",
  "",
  "**Touch set:**",
  "- `services/orders/routes.mjs`: the route",
  "",
  "**Done when:**",
  "- **T-2.1** placing an order answers 201 with its id",
  "",
].join("\n");

function scenario(id: string, status: "active" | "deprecated" = "active"): SavedScenario {
  const header = { id, kind: "normal" as const, covers: ["20261101-orders/T-1.1"], intent: "an order is placed and read back", status, format: 1 as const };
  return { path: `.picket/env/scenarios/${id}.md`, id, card: { header, steps: [] }, problems: [], fingerprint: "sha256:f", byHand: false };
}

function designItem(t: TestContext): { root: string; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", DESIGN);
  return { root, id };
}

test("the brief carries the criterion text, the check, the saved scenario and the cap, and no plan path (T-2.2)", (t) => {
  const { root, id } = designItem(t);
  const snap = readSnapshot(root, id);
  const text = compileBrief(snap, testFacts(root, snap), [scenario("S-0002"), scenario("S-0003", "deprecated")], { request: "Let customers place orders.", story: null });
  assert.ok(text.startsWith(`# Test brief: ${id} · round 1\n`));
  assert.ok(text.includes("\nT-2.1: placing an order answers 201 with its id\n"));
  assert.ok(text.includes('\nT-2.1 POST /orders on orders: 201, contains "id"\n'));
  assert.ok(text.includes("\nS-0002 normal 20261101-orders/T-1.1: an order is placed and read back\n"));
  assert.ok(!text.includes("S-0003"));
  assert.ok(text.includes("\ncases per round: at most 6\n"));
  assert.ok(text.includes("\nquestions: 0 of 3 asked\n"));
  assert.ok(text.includes("\nLet customers place orders.\n"));
  for (const path of [TOUCHED, "services/orders/routes.mjs", "design.md"]) assert.ok(!text.includes(path), path);
});

test("the brief has exactly its eight sections, in order", (t) => {
  const { root, id } = designItem(t);
  const snap = readSnapshot(root, id);
  const text = compileBrief(snap, testFacts(root, snap), [], { request: null, story: null });
  const headings = text.split("\n").filter((line) => line.startsWith("#"));
  assert.deepEqual(headings, [`# Test brief: ${id} · round 1`, "## Request", "## Criteria", "## Approved checks", "## Environment", "## Saved scenarios", "## Earlier rounds", "## Limits"]);
});

test("the brief lists the previous round's cases and the questions asked so far", (t) => {
  const { root, id } = designItem(t);
  const now = new Date("2026-11-17T10:00:00.000Z");
  appendTestRow(root, id, { round: 1, type: "case", case: "C-01", criterion: "T-2.1", kind: "boundary", intent: "x", steps: "", outcome: "failed", attempts: 2, unstable: false, detail: "", mocks: [] }, now);
  appendTestRow(root, id, { round: 1, type: "question", criterion: "T-2.1", question: "q", choices: ["a", "b"], default: null, basis: null }, now);
  const snap = readSnapshot(root, id);
  const facts = { ...testFacts(root, snap), round: 2 };
  const text = compileBrief(snap, facts, [], { request: null, story: null });
  assert.ok(text.includes("\nC-01 T-2.1 boundary failed\n"));
  assert.ok(text.includes("\nquestions: 1 of 3 asked\n"));
});
