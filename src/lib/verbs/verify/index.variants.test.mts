import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { closureTests, declaredLists, loadGuard, tableRows, type ListSeed } from "#test/variants.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { stateDir, statePath, STATE_FILES } from "../../shared/paths.mts";
import { verify } from "./index.mts";

const VALID_CHECK = ["      - covers: T-1.2", "        method: POST", "        path: /orders", "        status: 201"];

const httpItem = (fields: string[]) => ["      - covers: T-1.1", ...fields.map((field) => `        ${field}`)];

type MalformedItem = ListSeed & { field: string | null };

const HTTP_FIELDS = ["method: POST", "path: /orders", "status: 201"];

const MALFORMED_ITEMS: MalformedItem[] = [
  { field: "method", label: "method post", lines: httpItem(["method: post", "path: /orders", "status: 201"]) },
  { field: "path", label: "path orders", lines: httpItem(["method: POST", "path: orders", "status: 201"]) },
  { field: "status", label: 'status "201"', lines: httpItem(["method: POST", "path: /orders", 'status: "201"']) },
  { field: "status", label: "status 999", lines: httpItem(["method: POST", "path: /orders", "status: 999"]) },
  { field: "status", label: "no status", lines: httpItem(["method: POST", "path: /orders"]) },
  { field: "command", label: "empty command", lines: httpItem(['command: ""', "exit_code: 0"]) },
  { field: "exit_code", label: 'exit_code "0"', lines: httpItem(["command: npm test", 'exit_code: "0"']) },
  { field: null, label: "scalar item", lines: ["      - POST /orders 201"] },
  { field: "covers", label: "covers T-2.1", lines: ["      - covers: T-2.1", ...HTTP_FIELDS.map((field) => `        ${field}`)] },
  { field: "contains", label: "contains 5", lines: httpItem([...HTTP_FIELDS, "contains: 5"]) },
  { field: "service", label: "service Orders!", lines: httpItem([...HTTP_FIELDS, "service: Orders!"]) },
  { field: "replaces", label: "replaces S-1", lines: httpItem([...HTTP_FIELDS, "replaces: S-1"]) },
  { field: "command", label: "command 5", lines: httpItem(["command: 5", "exit_code: 0"]) },
];

const itemsKeyedBy = (field: string): ListSeed[] => MALFORMED_ITEMS.filter((item) => item.field === field);

const declaredChecks = await loadGuard(() => import("../../shared/work/declared-checks.mts"), "src/lib/shared/work/declared-checks.mts");

const keyRows = (table: string) => ({ table: tableRows<string>(declaredChecks, table), key: (field: string) => field, seedsOf: itemsKeyedBy });

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
  rows: [keyRows("HTTP_KEYS"), keyRows("RUN_KEYS")],
  run: (input: ListSeed, t) => verifyWithDriveBlock(input.lines, t),
  closed: (report) => !report.ok,
});
