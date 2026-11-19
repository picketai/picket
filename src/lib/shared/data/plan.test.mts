import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openItem, withProject, writeConfig } from "#test/project.mts";
import { readState, writeState } from "../work/state.mts";
import type { WorkId } from "../work/files.mts";
import { fileDigest, recordApproval } from "./approvals.mts";
import { planRun } from "./plan.mts";

const VARIABLE = "PICKET_DATA_ORDERS_SQL";
const CONNECTION = "Server=sql01;Database=orders_test;User Id=qa;Password=s3cret";
const DECLARED = { version: 1, data_targets: { "orders-sql": [{ server: "sql01", database: "orders_test" }] } };
const SQL = "insert into customers (name) values ('PKT-seed');\n";
const APPROVED_AT = new Date("2026-11-18T09:00:00Z");

function sqlEntry(file: string): string {
  return `---\nkind: sql\nneed: a customer with orders\nfile: ${file}\nservice: orders-sql\nformat: 1\n---\nrequest GET {orders}/customers?name=PKT-seed\ncapture id json 0.id\n`;
}

function project(t: TestContext): { root: string; id: WorkId; sql: string } {
  const root = withProject(t);
  const env = join(root, ".picket", "env");
  mkdirSync(join(env, "data"), { recursive: true });
  mkdirSync(join(env, "catalog"), { recursive: true });
  writeFileSync(join(env, "data", "customer.sql"), SQL);
  writeFileSync(join(env, "outside.sql"), SQL);
  writeFileSync(join(env, "catalog", "customer.md"), sqlEntry("data/customer.sql"));
  writeFileSync(join(env, "catalog", "outside.md"), sqlEntry("outside.sql"));
  writeFileSync(join(env, "catalog", "open-order.md"), "---\nkind: find\nneed: an open order\nformat: 1\n---\nrequest GET {orders}/orders\ncapture id json 0.id\n");
  const { id } = openItem(root, { lane: "design", title: "Orders", source: "PROJ-481" });
  return { root, id, sql: join(env, "data", "customer.sql") };
}

function refusal(run: () => unknown): string {
  try {
    run();
  } catch (err) {
    assert.ok(err instanceof Error, String(err));
    return err.message;
  }
  assert.fail("not refused");
}

function approve(root: string, sql: string): void {
  recordApproval(root, "data/customer.sql", fileDigest(sql), "s-1", APPROVED_AT);
}

test("an entry that is missing, not sql, or names a file outside data/ is refused first", (t) => {
  const { root, id } = project(t);
  const env = { [VARIABLE]: CONNECTION };
  writeConfig(root, DECLARED);
  assert.equal(refusal(() => planRun(root, env, id, "nothing")), "no catalog entry nothing");
  assert.equal(refusal(() => planRun(root, env, id, "open-order")), "open-order is a find entry; only a sql entry has a file to run");
  assert.equal(refusal(() => planRun(root, env, id, "outside")), "outside.sql is not a file under .picket/env/data/; name it from .picket/env/, such as data/customer.sql");
});

test("with every check failing, the plan refuses in order: approval, variable, reading, declared pair, item status", (t) => {
  const { root, id, sql } = project(t);
  writeState(root, { ...readState(root, id), status: "done" }, new Date("2026-11-18T10:00:00Z"));
  assert.equal(refusal(() => planRun(root, {}, id, "customer")), "data/customer.sql is not approved; the user reads it with picket data show data/customer.sql and approves it");
  approve(root, sql);
  assert.equal(refusal(() => planRun(root, {}, id, "customer")), `${VARIABLE} is unset; set it to the connection string in the shell that starts Claude Code. Picket never stores it`);
  assert.equal(refusal(() => planRun(root, { [VARIABLE]: "orders" }, id, "customer")), `${VARIABLE} does not name one server and one database: it is neither a URL (scheme://host/database) nor key=value pairs separated by ;`);
  assert.match(refusal(() => planRun(root, { [VARIABLE]: CONNECTION }, id, "customer")), /^orders-sql may reach only the targets data_targets\.orders-sql .* server sql01, database orders_test\./);
  writeConfig(root, DECLARED);
  assert.equal(refusal(() => planRun(root, { [VARIABLE]: CONNECTION }, id, "customer")), `${id} is done; data run runs only for an open or blocked item`);
});

test("a file changed since its approval is refused before the variable is read", (t) => {
  const { root, id, sql } = project(t);
  approve(root, sql);
  writeFileSync(sql, SQL.replace("seed", "seeds"));
  assert.equal(refusal(() => planRun(root, {}, id, "customer")), "data/customer.sql changed since approval; the user reads it again with picket data show data/customer.sql");
});

test("a plan that passes names the item, entry, service, variable, file, digest, declared pair and approval, never the connection", (t) => {
  const { root, id, sql } = project(t);
  approve(root, sql);
  writeConfig(root, DECLARED);
  const plan = planRun(root, { [VARIABLE]: CONNECTION }, id, "customer");
  assert.deepEqual(plan, {
    item: id,
    entry: "customer",
    service: "orders-sql",
    variable: VARIABLE,
    path: "data/customer.sql",
    abs: sql,
    sha256: fileDigest(sql),
    target: { server: "sql01", database: "orders_test" },
    approval: { path: "data/customer.sql", sha256: fileDigest(sql), at: "2026-11-18T09:00:00.000Z", session: "s-1" },
  });
  assert.ok(!JSON.stringify(plan).includes("s3cret"));
});
