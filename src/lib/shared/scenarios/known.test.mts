import { test } from "node:test";
import assert from "node:assert/strict";
import type { ResultRow, RunRow, ScenarioOutcome } from "./results.mts";
import { commitRange, lastFailing, maskedBy, namesDefect, stoppedFailing } from "./known.mts";

const CARD = ".picket/env/scenarios/S-0002.md";
const MOCK = ".picket/env/mocks/payments-mock.yaml";

function row(run: string, outcome: ScenarioOutcome, versions: Record<string, string> = {}): ResultRow {
  return { type: "result", run, scenario: "S-0002", fingerprint: "sha256:f", key: "k", versions, outcome, attempts: 1, unstable: false, class: "passed", detail: "" };
}

function runRow(run: string, mode: RunRow["mode"]): RunRow {
  return { type: "run", run, item: "20261120-x", mode, key: "k", versions: {} };
}

test("a passed base row means fixed outside this item with the commit range, even when something is masked (T-2.1)", () => {
  const stopped = stoppedFailing({ base: row("b", "passed", { orders: "5d6e7f8" }), lastFailing: row("f", "failed", { orders: "1a2b3c4" }), masked: [MOCK], named: true, changes: [MOCK] });
  assert.deepEqual(stopped, { class: "fixed outside this item", detail: "orders 1a2b3c4..5d6e7f8" });
  assert.deepEqual(stoppedFailing({ base: row("b", "passed"), lastFailing: null, masked: [], named: false, changes: [] }), { class: "fixed outside this item", detail: "no failing run recorded" });
});

test("a failed base row with a mock changed is possibly masked even when the item names the defect (T-2.1)", () => {
  assert.deepEqual(stoppedFailing({ base: row("b", "failed"), lastFailing: null, masked: [MOCK], named: true, changes: [MOCK, "src/orders/cart.ts"] }), { class: "possibly masked", detail: `changed: ${MOCK}` });
});

test("a failed base row, nothing masked and the defect named is fixed by this item (T-2.1)", () => {
  assert.deepEqual(stoppedFailing({ base: row("b", "failed"), lastFailing: null, masked: [], named: true, changes: ["src/orders/cart.ts"] }), { class: "fixed by this item", detail: "" });
});

test("otherwise the pass is a side effect naming the changed files, and a missing base row says so (T-2.1)", () => {
  assert.deepEqual(stoppedFailing({ base: null, lastFailing: null, masked: [], named: false, changes: ["src/orders/cart.ts"] }), { class: "side effect", detail: "no base result; changed: src/orders/cart.ts" });
  assert.deepEqual(stoppedFailing({ base: row("b", "failed"), lastFailing: null, masked: [], named: false, changes: [] }), { class: "side effect", detail: "changed: nothing" });
  assert.deepEqual(stoppedFailing({ base: null, lastFailing: null, masked: [], named: true, changes: [] }), { class: "side effect", detail: "no base result; changed: nothing" });
});

test("the commit range names each app in both whose commit moved, without the tag suffix (T-2.2)", () => {
  assert.equal(commitRange({ orders: "1a2b3c4" }, { orders: "5d6e7f8-t9a8b7c6", web: "0f0f0f0" }), "orders 1a2b3c4..5d6e7f8");
  assert.equal(commitRange({ orders: "1a2b3c4-t1111111" }, { orders: "1a2b3c4-t2222222" }), "no app commit changed");
  assert.equal(commitRange({ orders: "1a2b3c4", web: "0f0f0f0" }, { orders: "5d6e7f8", web: "1f1f1f1" }), "orders 1a2b3c4..5d6e7f8, web 0f0f0f0..1f1f1f1");
});

test("the defect id is found only as a whole word (T-2.3)", () => {
  assert.equal(namesDefect(["fixes DF-0001."], "DF-0001"), true);
  assert.equal(namesDefect(["see DF-00012"], "DF-0001"), false);
  assert.equal(namesDefect(["nothing here", "and DF-0001 there"], "DF-0001"), true);
});

test("masked files are mock and catalog changes and the card itself (T-2.3)", () => {
  const changes = [".picket/env/catalog/customer.md", CARD, "src/orders/cart.ts", ".picket/env/scenarios/S-0003.md"];
  assert.deepEqual(maskedBy(changes, CARD), [".picket/env/catalog/customer.md", CARD]);
});

test("the last failing row is the newest failed row of the scenario in a full, affected or base run", () => {
  const rows = [runRow("r1", "full"), row("r1", "failed", { orders: "a" }), runRow("r2", "base"), row("r2", "failed", { orders: "b" }), runRow("r3", "only"), row("r3", "failed", { orders: "c" }), runRow("r4", "full"), row("r4", "passed")];
  assert.deepEqual(lastFailing(rows, "S-0002")?.versions, { orders: "b" });
  assert.equal(lastFailing(rows, "S-0009"), null);
});
