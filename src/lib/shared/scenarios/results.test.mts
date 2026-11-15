import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRows, lastKnown, latestRun, readResults, type ResultRow, type RunMode, type RunRow } from "./results.mts";

function scratch(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-results-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function run(id: string, mode: RunMode, item = "20261115-orders"): RunRow {
  return { type: "run", run: id, item, mode, key: "k1", versions: { orders: "4f2a91c" } };
}

function result(id: string, overrides: Partial<ResultRow> = {}): ResultRow {
  return { type: "result", run: id, scenario: "S-0001", fingerprint: "sha256:f1", key: "k1", versions: { orders: "4f2a91c" }, outcome: "passed", attempts: 1, unstable: false, class: "passed", detail: "", ...overrides };
}

test("a result row written and read back has exactly D-004's keys (T-3.7)", (t) => {
  const root = scratch(t);
  appendRows(root, [run("r1", "full"), result("r1")]);
  const rows = readResults(root);
  assert.deepEqual(rows, [run("r1", "full"), result("r1")]);
  assert.deepEqual(Object.keys(rows[1]).sort(), ["attempts", "class", "detail", "fingerprint", "key", "outcome", "run", "scenario", "type", "unstable", "versions"]);
});

test("reading a project with no results gives no rows", (t) => {
  assert.deepEqual(readResults(scratch(t)), []);
});

test("the last known result is the latest matching full, affected or base row (T-3.4)", () => {
  const rows = [
    run("r1", "base"),
    result("r1", { outcome: "passed" }),
    run("r2", "affected"),
    result("r2", { outcome: "failed", class: "new failure" }),
    run("r3", "full"),
    result("r3", { fingerprint: "sha256:other" }),
    result("r3", { key: "k2" }),
    run("r4", "only"),
    result("r4", { outcome: "passed" }),
  ];
  assert.deepEqual(lastKnown(rows, "S-0001", "sha256:f1", "k1"), result("r2", { outcome: "failed", class: "new failure" }));
  assert.deepEqual(lastKnown(rows.slice(0, 2), "S-0001", "sha256:f1", "k1"), result("r1"));
  assert.equal(lastKnown(rows, "S-0002", "sha256:f1", "k1"), null);
  assert.equal(lastKnown([run("r4", "only"), result("r4")], "S-0001", "sha256:f1", "k1"), null);
});

test("the latest run of an item is filtered by mode and ignores other items", () => {
  const rows = [run("r1", "full"), run("r2", "only"), run("r3", "full", "20261115-other"), result("r1")];
  assert.deepEqual(latestRun(rows, "20261115-orders", ["full"]), run("r1", "full"));
  assert.deepEqual(latestRun(rows, "20261115-orders", ["full", "only"]), run("r2", "only"));
  assert.equal(latestRun(rows, "20261115-orders", ["affected"]), null);
});
