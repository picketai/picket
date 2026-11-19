import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry, type CatalogEntry } from "../catalog/entry.mts";
import { isDeclared, targetFindings, type DataTargets } from "./targets.mts";

const TARGETS: DataTargets = { "orders-sql": [{ server: "sql01", database: "orders_test" }] };
const UNDECLARED = "picket data run refuses it until data_targets in .picket/config.json lists its server and database";

function sqlEntry(name: string, service: string): CatalogEntry {
  const text = `---\nkind: sql\nneed: a customer\nfile: data/${name}.sql\nservice: ${service}\nformat: 1\n---\nrequest GET {orders}/customers\ncapture id json 0.id\n`;
  const { entry, problems } = parseEntry(text, name);
  assert.ok(entry, problems.join("; "));
  return entry;
}

function findEntry(name: string): CatalogEntry {
  const { entry, problems } = parseEntry("---\nkind: find\nneed: an open order\nformat: 1\n---\nrequest GET {orders}/orders\ncapture id json 0.id\n", name);
  assert.ok(entry, problems.join("; "));
  return entry;
}

test("a target is declared only when both server and database equal a listed pair exactly", () => {
  assert.equal(isDeclared(TARGETS, "orders-sql", { server: "sql01", database: "orders_test" }), true);
  assert.equal(isDeclared(TARGETS, "orders-sql", { server: "SQL01", database: "orders_test" }), false);
  assert.equal(isDeclared(TARGETS, "orders-sql", { server: "sql01", database: "orders_live" }), false);
  assert.equal(isDeclared(TARGETS, "billing-sql", { server: "sql01", database: "orders_test" }), false);
});

test("a service name that is an object property declares nothing", () => {
  for (const service of ["constructor", "__proto__", "toString"]) assert.equal(isDeclared(TARGETS, service, { server: "sql01", database: "orders_test" }), false, service);
});

test("each sql entry service without a declared target gives one E14 error, once per service", () => {
  const entries = [sqlEntry("customer", "billing-sql"), sqlEntry("invoice", "billing-sql"), sqlEntry("order", "orders-sql"), findEntry("open-order")];
  assert.deepEqual(targetFindings(entries, TARGETS), [{ rule: "E14", service: "billing-sql", level: "error", message: UNDECLARED }]);
});

test("no E14 finding when every sql entry service declares a target, or when there is no sql entry", () => {
  assert.deepEqual(targetFindings([sqlEntry("order", "orders-sql")], TARGETS), []);
  assert.deepEqual(targetFindings([findEntry("open-order")], {}), []);
});
