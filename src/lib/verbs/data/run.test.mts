import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeExit } from "../../shared/action.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { fileDigest, recordApproval } from "../../shared/data/approvals.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";
import { renderRun, runSqlEntry, type DataRunReport } from "./run.mts";

const CONNECTION = "Server=sql01;Database=orders_test;User Id=qa;Password=s3cret";
const VARIABLE = "PICKET_DATA_ORDERS_SQL";
const SQL = "insert into customers (name) values ('PKT-seed');\n";
const SQL_ENTRY = "---\nkind: sql\nneed: a customer with orders\nfile: data/customer.sql\nservice: orders-sql\nformat: 1\n---\nrequest GET {orders}/customers?name=PKT-seed\ncapture id json 0.id\n";
const FIND_ENTRY = "---\nkind: find\nneed: an open order\nformat: 1\n---\nrequest GET {orders}/orders\ncapture id json 0.id\n";

type Engine = { runner: EngineRunner; calls: string[][] };

function engine(status = 0, stderr = ""): Engine {
  const calls: string[][] = [];
  const runner: EngineRunner = (program, args) => {
    if (program !== "docker") return { status: 1, stdout: "", stderr: "" };
    const call = args.join(" ");
    if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux","MemTotal":17179869184}', stderr: "" };
    if (call === "compose version --format json") return { status: 0, stdout: '{"version":"v2.29.1"}', stderr: "" };
    calls.push(args);
    return { status, stdout: "", stderr };
  };
  return { runner, calls };
}

const DECLARED = { "orders-sql": [{ server: "sql01", database: "orders_test" }] };

function project(t: TestContext, { approve = true }: { approve?: boolean } = {}): { root: string; id: WorkId } {
  const root = withProject(t);
  writeConfig(root, { version: 1, data_targets: DECLARED });
  const env = join(root, ".picket", "env");
  mkdirSync(join(env, "data"), { recursive: true });
  mkdirSync(join(env, "catalog"), { recursive: true });
  writeFileSync(join(env, "compose.yaml"), "services: {}\n");
  writeFileSync(join(env, "data", "customer.sql"), SQL);
  writeFileSync(join(env, "catalog", "customer.md"), SQL_ENTRY);
  writeFileSync(join(env, "catalog", "open-order.md"), FIND_ENTRY);
  if (approve) recordApproval(root, "data/customer.sql", fileDigest(join(env, "data", "customer.sql")), "s-1", new Date("2026-11-18T09:00:00Z"));
  const { id } = openItem(root, { lane: "design", title: "Orders", source: "PROJ-481" });
  return { root, id };
}

function context(root: string, env: NodeJS.ProcessEnv = { [VARIABLE]: CONNECTION }) {
  return fixedContext(root, { env });
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

test("an approved file runs through the data service with the variable passed by name only (T-8.1)", (t) => {
  const { root, id } = project(t);
  const { runner, calls } = engine();
  const outcome = runSqlEntry(context(root), runner, { id, entry: "customer" });
  assert.equal(describeExit(outcome).code, 0);
  const [call] = calls;
  const at = call.indexOf("--profile");
  assert.deepEqual(call.slice(0, 3), ["compose", "-p", "picket-proj-481"]);
  assert.deepEqual(call.slice(at), ["--profile", "picket-data", "run", "--rm", "--no-deps", "-T", "-e", VARIABLE, "-v", `${join(root, ".picket", "env", "data", "customer.sql")}:/picket/run.sql:ro`, "orders-sql"]);
  assert.ok(call.every((arg) => !arg.includes("s3cret") && !arg.includes(CONNECTION)), call.join(" "));
  assert.equal(renderRun(describeExit(outcome).json as DataRunReport), "ran data/customer.sql on server sql01, database orders_test through orders-sql: exit 0");
});

test("the run row names the item, entry, file, digest, server, database and status and holds no part of the connection (T-8.5)", (t) => {
  const { root, id } = project(t);
  runSqlEntry(context(root), engine().runner, { id, entry: "customer" });
  const text = readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8");
  assert.deepEqual(JSON.parse(text), { at: "2026-10-23T10:00:00.000Z", item: id, entry: "customer", path: "data/customer.sql", sha256: fileDigest(join(root, ".picket", "env", "data", "customer.sql")), server: "sql01", database: "orders_test", status: 0 });
  for (const part of ["s3cret", "User Id", "qa;"]) assert.ok(!text.includes(part), part);
});

test("the run row records the digest the approval check compared, not the bytes after the run (T-3.1)", (t) => {
  const { root, id } = project(t);
  const sql = join(root, ".picket", "env", "data", "customer.sql");
  const approved = fileDigest(sql);
  const { runner } = engine();
  const rewriting: EngineRunner = (program, args) => {
    if (args.includes("--profile")) writeFileSync(sql, SQL.replace("seed", "rewritten"));
    return runner(program, args);
  };
  runSqlEntry(context(root), rewriting, { id, entry: "customer" });
  const row = JSON.parse(readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8"));
  assert.equal(row.sha256, approved);
  assert.notEqual(row.sha256, fileDigest(sql));
});

test("a client failure prints the exit status and a cause with the connection masked (T-8.4)", (t) => {
  const { root, id } = project(t);
  const outcome = runSqlEntry(context(root), engine(1, `Sqlcmd: Error: login failed for '${CONNECTION}' (password s3cret)`).runner, { id, entry: "customer" });
  assert.equal(describeExit(outcome).code, 2);
  const text = renderRun(describeExit(outcome).json as DataRunReport);
  assert.equal(text.split("\n")[0], "ran data/customer.sql on server sql01, database orders_test through orders-sql: exit 1");
  assert.ok(text.includes("***") && !text.includes("s3cret"), text);
});

test("data run refuses a file never approved or changed since approval, an unset or empty variable, a find entry and a done item (T-8.2)", (t) => {
  const unapproved = project(t, { approve: false });
  assert.equal(refusal(() => runSqlEntry(context(unapproved.root), engine().runner, { id: unapproved.id, entry: "customer" })), "data/customer.sql is not approved; the user reads it with picket data show data/customer.sql and approves it");
  const changed = project(t);
  writeFileSync(join(changed.root, ".picket", "env", "data", "customer.sql"), SQL.replace("seed", "seeds"));
  assert.equal(refusal(() => runSqlEntry(context(changed.root), engine().runner, { id: changed.id, entry: "customer" })), "data/customer.sql changed since approval; the user reads it again with picket data show data/customer.sql");
  const { root, id } = project(t);
  for (const env of [{}, { [VARIABLE]: "" }]) {
    const message = refusal(() => runSqlEntry(context(root, env), engine().runner, { id, entry: "customer" }));
    assert.equal(message, `${VARIABLE} is unset; set it to the connection string in the shell that starts Claude Code. Picket never stores it`);
  }
  assert.equal(refusal(() => runSqlEntry(context(root), engine().runner, { id, entry: "open-order" })), "open-order is a find entry; only a sql entry has a file to run");
  writeState(root, { ...readState(root, id), status: "done" }, new Date("2026-11-18T10:00:00Z"));
  const { runner, calls } = engine();
  assert.equal(refusal(() => runSqlEntry(context(root), runner, { id, entry: "customer" })), `${id} is done; data run runs only for an open or blocked item`);
  assert.deepEqual(calls, []);
});

test("a connection to a server or database its service does not declare is refused before compose, naming the service and the pair (T-1.4)", (t) => {
  const { root, id } = project(t);
  const undeclared = [
    ["Server=sql01;Database=orders_live;User Id=qa;Password=s3cret", "sql01", "orders_live"],
    ["Server=SQL01;Database=orders_test;User Id=qa;Password=s3cret", "SQL01", "orders_test"],
  ];
  for (const [connection, server, database] of undeclared) {
    const { runner, calls } = engine();
    const message = refusal(() => runSqlEntry(context(root, { [VARIABLE]: connection }), runner, { id, entry: "customer" }));
    assert.equal(message, `orders-sql may reach only the targets data_targets.orders-sql in .picket/config.json lists, and it does not list server ${server}, database ${database}. Check them, then add {"server":"${server}","database":"${database}"} to that list`);
    assert.ok(!message.includes("s3cret") && !message.includes("User Id"), message);
    assert.deepEqual(calls, []);
  }
});

test("a connection that does not name one server and one database is refused before compose (T-1.4)", (t) => {
  const { root, id } = project(t);
  const { runner, calls } = engine();
  const message = refusal(() => runSqlEntry(context(root, { [VARIABLE]: "Server=sql01;Database=orders_test;Data Source=prod01;Password=s3cret" }), runner, { id, entry: "customer" }));
  assert.equal(message, `${VARIABLE} does not name one server and one database: it names the server more than once (server, data source, address, addr, host)`);
  assert.deepEqual(calls, []);
});

test("a project with no data_targets refuses every run before compose", (t) => {
  const { root, id } = project(t);
  writeConfig(root, { version: 1 });
  const { runner, calls } = engine();
  assert.match(refusal(() => runSqlEntry(context(root), runner, { id, entry: "customer" })), /^orders-sql may reach only the targets data_targets\.orders-sql/);
  assert.deepEqual(calls, []);
});

test("a declared target with an approved file calls compose once and the run row holds that pair (T-1.5)", (t) => {
  const { root, id } = project(t);
  const { runner, calls } = engine();
  const outcome = runSqlEntry(context(root), runner, { id, entry: "customer" });
  assert.equal(describeExit(outcome).code, 0);
  assert.equal(calls.length, 1);
  const row = JSON.parse(readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8"));
  assert.deepEqual([row.server, row.database], ["sql01", "orders_test"]);
});
