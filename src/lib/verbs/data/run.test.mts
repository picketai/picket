import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeExit } from "../../shared/action.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { fileDigest, recordApproval } from "../../shared/data/approvals.mts";
import { CONFIRMATION_WINDOW_MS, confirmRun, readConfirmations, sha256Hex, voidPending } from "../../shared/data/confirm.mts";
import type { RunPlan } from "../../shared/data/plan.mts";
import { statePath } from "../../shared/paths.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { FIXED_NOW, fixedContext } from "#test/context.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { renderRun, runSqlEntry, verb, type DataRunReport } from "./run.mts";

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

const SESSION = "s-run";
const APPROVED_AT = "2026-11-18T09:00:00.000Z";

type ConfirmOptions = { entry?: string; at?: Date; server?: string };

function sqlPath(root: string): string {
  return join(root, ".picket", "env", "data", "customer.sql");
}

function confirm(root: string, id: WorkId, { entry = "customer", at = new Date(FIXED_NOW), server = "sql01" }: ConfirmOptions = {}): string {
  const abs = sqlPath(root);
  const bytes = readFileSync(abs);
  const sha256 = sha256Hex(bytes);
  const plan: RunPlan = { item: id, entry, service: "orders-sql", variable: VARIABLE, path: "data/customer.sql", abs, sha256, target: { server, database: "orders_test" }, approval: { path: "data/customer.sql", sha256, at: APPROVED_AT, session: "s-1" } };
  const nonce = randomBytes(32).toString("hex");
  confirmRun(root, plan, bytes, SESSION, sha256Hex(nonce), at);
  return nonce;
}

function confirmed(root: string, id: WorkId, entry = "customer") {
  return { id, entry, confirmation: confirm(root, id, { entry }) };
}

function context(root: string, env: NodeJS.ProcessEnv = { [VARIABLE]: CONNECTION }, now: string = FIXED_NOW) {
  return fixedContext(root, { env, session: SESSION, now });
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
  const outcome = runSqlEntry(context(root), runner, confirmed(root, id));
  assert.equal(describeExit(outcome).code, 0);
  const [call] = calls;
  const at = call.indexOf("--profile");
  assert.deepEqual(call.slice(0, 3), ["compose", "-p", "picket-proj-481"]);
  assert.deepEqual(call.slice(at), ["--profile", "picket-data", "run", "--rm", "--no-deps", "-T", "-e", VARIABLE, "-v", `${statePath(root, `data/snapshots/${fileDigest(sqlPath(root))}.sql`)}:/picket/run.sql:ro`, "orders-sql"]);
  assert.ok(call.every((arg) => !arg.includes("s3cret") && !arg.includes(CONNECTION)), call.join(" "));
  assert.equal(renderRun(describeExit(outcome).json as DataRunReport), "ran data/customer.sql on server sql01, database orders_test through orders-sql: exit 0");
});

test("the run row names the item, entry, file, digest, server, database, status, confirmation and approval time and holds no part of the connection (T-8.5, T-4.7)", (t) => {
  const { root, id } = project(t);
  runSqlEntry(context(root), engine().runner, confirmed(root, id));
  const text = readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8");
  const row = JSON.parse(text);
  assert.deepEqual(row, { at: "2026-10-23T10:00:00.000Z", item: id, entry: "customer", path: "data/customer.sql", sha256: fileDigest(sqlPath(root)), server: "sql01", database: "orders_test", status: 0, confirmation: readConfirmations(root)[0].id, approved_at: APPROVED_AT });
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
  runSqlEntry(context(root), rewriting, confirmed(root, id));
  const row = JSON.parse(readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8"));
  assert.equal(row.sha256, approved);
  assert.notEqual(row.sha256, fileDigest(sql));
});

test("a client failure prints the exit status and a cause with the connection masked (T-8.4)", (t) => {
  const { root, id } = project(t);
  const outcome = runSqlEntry(context(root), engine(1, `Sqlcmd: Error: login failed for '${CONNECTION}' (password s3cret)`).runner, confirmed(root, id));
  assert.equal(describeExit(outcome).code, 2);
  const text = renderRun(describeExit(outcome).json as DataRunReport);
  assert.equal(text.split("\n")[0], "ran data/customer.sql on server sql01, database orders_test through orders-sql: exit 1");
  assert.ok(text.includes("***") && !text.includes("s3cret"), text);
});

test("data run refuses a file never approved or changed since approval, an unset or empty variable, a find entry and a done item (T-8.2)", (t) => {
  const unapproved = project(t, { approve: false });
  assert.equal(refusal(() => runSqlEntry(context(unapproved.root), engine().runner, confirmed(unapproved.root, unapproved.id))), "data/customer.sql is not approved; the user reads it with picket data show data/customer.sql and approves it");
  const changed = project(t);
  writeFileSync(join(changed.root, ".picket", "env", "data", "customer.sql"), SQL.replace("seed", "seeds"));
  assert.equal(refusal(() => runSqlEntry(context(changed.root), engine().runner, confirmed(changed.root, changed.id))), "data/customer.sql changed since approval; the user reads it again with picket data show data/customer.sql");
  const { root, id } = project(t);
  for (const env of [{}, { [VARIABLE]: "" }]) {
    const message = refusal(() => runSqlEntry(context(root, env), engine().runner, confirmed(root, id)));
    assert.equal(message, `${VARIABLE} is unset; set it to the connection string in the shell that starts Claude Code. Picket never stores it`);
  }
  assert.equal(refusal(() => runSqlEntry(context(root), engine().runner, confirmed(root, id, "open-order"))), "open-order is a find entry; only a sql entry has a file to run");
  writeState(root, { ...readState(root, id), status: "done" }, new Date("2026-11-18T10:00:00Z"));
  const { runner, calls } = engine();
  assert.equal(refusal(() => runSqlEntry(context(root), runner, confirmed(root, id))), `${id} is done; data run runs only for an open or blocked item`);
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
    const message = refusal(() => runSqlEntry(context(root, { [VARIABLE]: connection }), runner, confirmed(root, id)));
    assert.equal(message, `orders-sql may reach only the targets data_targets.orders-sql in .picket/config.json lists, and it does not list server ${server}, database ${database}. Check them, then add {"server":"${server}","database":"${database}"} to that list`);
    assert.ok(!message.includes("s3cret") && !message.includes("User Id"), message);
    assert.deepEqual(calls, []);
  }
});

test("a connection that does not name one server and one database is refused before compose (T-1.4)", (t) => {
  const { root, id } = project(t);
  const { runner, calls } = engine();
  const message = refusal(() => runSqlEntry(context(root, { [VARIABLE]: "Server=sql01;Database=orders_test;Data Source=prod01;Password=s3cret" }), runner, confirmed(root, id)));
  assert.equal(message, `${VARIABLE} does not name one server and one database: it names the server more than once (server, data source, address, addr, network address, host, failover partner, failover_partner)`);
  assert.deepEqual(calls, []);
});

test("a project with no data_targets refuses every run before compose", (t) => {
  const { root, id } = project(t);
  writeConfig(root, { version: 1 });
  const { runner, calls } = engine();
  assert.match(refusal(() => runSqlEntry(context(root), runner, confirmed(root, id))), /^orders-sql may reach only the targets data_targets\.orders-sql/);
  assert.deepEqual(calls, []);
});

test("a declared target with an approved file calls compose once and the run row holds that pair (T-1.5)", (t) => {
  const { root, id } = project(t);
  const { runner, calls } = engine();
  const outcome = runSqlEntry(context(root), runner, confirmed(root, id));
  assert.equal(describeExit(outcome).code, 0);
  assert.equal(calls.length, 1);
  const row = JSON.parse(readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8"));
  assert.deepEqual([row.server, row.database], ["sql01", "orders_test"]);
});

function later(ms: number): string {
  return new Date(Date.parse(FIXED_NOW) + ms).toISOString();
}

test("a run with no confirmation, one that hashes to no row, or no session is refused naming the marked form, before compose (T-4.1)", (t) => {
  const { root, id } = project(t);
  confirm(root, id);
  const { runner, calls } = engine();
  const attempts = [
    () => runSqlEntry(context(root), runner, { id, entry: "customer", confirmation: null }),
    () => runSqlEntry(context(root), runner, { id, entry: "customer", confirmation: randomBytes(32).toString("hex") }),
    () => runSqlEntry(fixedContext(root, { env: { [VARIABLE]: CONNECTION }, session: null }), runner, confirmed(root, id)),
  ];
  for (const attempt of attempts) assert.match(refusal(attempt), /^no permission dialog confirmed this run\. The lead runs it as PICKET_ESCALATE="<why>" picket data run <id> <entry> in the default, acceptEdits or auto mode/);
  assert.deepEqual(calls, []);
});

test("a confirmation a later command voided is refused naming the void, before compose (T-4.2)", (t) => {
  const { root, id } = project(t);
  const input = confirmed(root, id);
  voidPending(root, SESSION, new Date(later(1000)));
  const { runner, calls } = engine();
  assert.match(refusal(() => runSqlEntry(context(root), runner, input)), /^the confirmation \S+ was voided at 2026-10-23T10:00:01\.000Z, because a later command of this session ran before it; ask again$/);
  assert.deepEqual(calls, []);
});

test("a confirmation runs once inside the window, its taken row written before compose, and is refused past the window or a second time (T-4.3)", (t) => {
  const { root, id } = project(t);
  const stale = confirmed(root, id);
  const { runner, calls } = engine();
  assert.match(refusal(() => runSqlEntry(context(root, undefined, later(CONFIRMATION_WINDOW_MS + 1)), runner, stale)), /is older than 10 minutes; ask again$/);
  assert.deepEqual(calls, []);
  const fresh = confirmed(root, id);
  const takenAtCompose: unknown[] = [];
  const watching: EngineRunner = (program, args) => {
    if (args.includes("--profile")) takenAtCompose.push(...readConfirmations(root).filter((row) => "taken_at" in row));
    return runner(program, args);
  };
  assert.equal(describeExit(runSqlEntry(context(root, undefined, later(CONFIRMATION_WINDOW_MS)), watching, fresh)).code, 0);
  assert.deepEqual(takenAtCompose, [{ id: readConfirmations(root)[1].id, taken_at: later(CONFIRMATION_WINDOW_MS) }]);
  assert.match(refusal(() => runSqlEntry(context(root, undefined, later(CONFIRMATION_WINDOW_MS)), runner, fresh)), /was already taken at .*; each dialog runs once, so ask again$/);
  assert.equal(calls.length, 1);
});

test("a file rewritten after the dialog still runs the confirmed snapshot, and the row keeps the confirmed digest (T-4.4)", (t) => {
  const { root, id } = project(t);
  const confirmedDigest = fileDigest(sqlPath(root));
  const input = confirmed(root, id);
  writeFileSync(sqlPath(root), SQL.replace("seed", "rewritten"));
  const { runner, calls } = engine();
  assert.equal(describeExit(runSqlEntry(context(root), runner, input)).code, 0);
  assert.ok(calls[0].includes(`${statePath(root, `data/snapshots/${confirmedDigest}.sql`)}:/picket/run.sql:ro`), calls[0].join(" "));
  assert.equal(JSON.parse(readFileSync(join(root, ".picket", "state", "data", "runs.jsonl"), "utf8")).sha256, confirmedDigest);
});

test("a snapshot whose bytes no longer match the confirmed digest is refused before compose (T-4.5)", (t) => {
  const { root, id } = project(t);
  const input = confirmed(root, id);
  writeFileSync(statePath(root, `data/snapshots/${fileDigest(sqlPath(root))}.sql`), "drop table customers;\n");
  const { runner, calls } = engine();
  assert.equal(refusal(() => runSqlEntry(context(root), runner, input)), `the snapshot of data/customer.sql no longer matches the confirmed digest ${fileDigest(sqlPath(root))}; ask again`);
  assert.deepEqual(calls, []);
});

test("a connection that now reads another declared pair than the dialog confirmed is refused naming both pairs, before compose (T-4.6)", (t) => {
  const { root, id } = project(t);
  writeConfig(root, { version: 1, data_targets: { "orders-sql": [{ server: "sql01", database: "orders_test" }, { server: "sql02", database: "orders_test" }] } });
  const input = confirmed(root, id);
  const { runner, calls } = engine();
  const message = refusal(() => runSqlEntry(context(root, { [VARIABLE]: "Server=sql02;Database=orders_test;Password=s3cret" }), runner, input));
  assert.equal(message, "the connection now reads server sql02, database orders_test, but the dialog confirmed server sql01, database orders_test; ask again");
  assert.deepEqual(calls, []);
});

test("data run reads an optional --confirmation of 64 lowercase hex characters and refuses any other value", () => {
  const nonce = "0f".repeat(32);
  assert.deepEqual(verb.parse(parseArgs(["20261119-x", "customer"])), { id: "20261119-x", entry: "customer", confirmation: null });
  assert.deepEqual(verb.parse(parseArgs(["20261119-x", "customer", "--confirmation", nonce])), { id: "20261119-x", entry: "customer", confirmation: nonce });
  for (const value of [nonce.toUpperCase(), nonce.slice(1)]) {
    assert.throws(() => verb.parse(parseArgs(["20261119-x", "customer", "--confirmation", value])), (err) => err instanceof UsageError && err.message === "--confirmation needs 64 lowercase hex characters");
  }
});
