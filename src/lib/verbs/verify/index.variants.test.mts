import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { closureTests, declaredLists, type ListSeed } from "#test/variants.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { stateDir, statePath, STATE_FILES } from "../../shared/paths.mts";
import { verify } from "./index.mts";

const VALID_CHECK = ["      - covers: T-1.2", "        method: POST", "        path: /orders", "        status: 201"];

const httpItem = (fields: string[]) => ["      - covers: T-1.1", ...fields.map((field) => `        ${field}`)];

const MALFORMED_ITEMS: ListSeed[] = [
  { label: "method post", lines: httpItem(["method: post", "path: /orders", "status: 201"]) },
  { label: "path orders", lines: httpItem(["method: POST", "path: orders", "status: 201"]) },
  { label: 'status "201"', lines: httpItem(["method: POST", "path: /orders", 'status: "201"']) },
  { label: "status 999", lines: httpItem(["method: POST", "path: /orders", "status: 999"]) },
  { label: "no status", lines: httpItem(["method: POST", "path: /orders"]) },
  { label: "empty command", lines: httpItem(['command: ""', "exit_code: 0"]) },
  { label: 'exit_code "0"', lines: httpItem(["command: npm test", 'exit_code: "0"']) },
  { label: "scalar item", lines: ["      - POST /orders 201"] },
];

function verifyWithDriveBlock(driveBlock: string[], t: TestContext) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  const front = ["---", "lane: order", "phases:", "  - n: 1", "    files: []", ...driveBlock, "---"];
  writeArtifact(root, id, "order.md", [...front, "# O", "", "## Phase 1: Orders", "", "- **T-1.1** a", "- **T-1.2** b", ""].join("\n"));
  const row = { kind: "drive", command: "picket drive", source: "picket drive", work_id: id, phase: 1, hits: [{ method: "POST", path: "/orders", status: 201, ms: 2 }] };
  writeFileSync(statePath(root, STATE_FILES.driveLog), `${JSON.stringify(row)}\n`);
  return verify(root, id, 1, { runTests: false, env: process.env });
}

test("verify passes the valid check alone with its row logged, so a closed outcome comes from the malformed item (T-5.3)", (t) => {
  const report = verifyWithDriveBlock(["    drive:", ...VALID_CHECK], t);
  assert.equal(report.ok, true, JSON.stringify(report.results));
});

closureTests({
  guard: "verify",
  grammar: declaredLists(VALID_CHECK),
  seeds: MALFORMED_ITEMS,
  probes: [{ label: "drive: []", lines: ["    drive: []"] }],
  run: (input: ListSeed, t) => verifyWithDriveBlock(input.lines, t),
  closed: (report) => !report.ok,
});
