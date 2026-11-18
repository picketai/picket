import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnvModel, EnvService } from "../env/model.mts";
import type { SavedScenario } from "../scenarios/files.mts";
import { parseScenario } from "../scenarios/format.mts";
import { entryFindings, listEntries, parseEntry } from "./entry.mts";

const CREATE = "---\nkind: create\nneed: a customer of its own\nformat: 1\n---\nrequest POST {orders}/customers\n  body {\"name\":\"PKT-{run}-c\"}\nexpect status 201\ncapture id json id\n";
const FIND = "---\nkind: find\nneed: an open order\nformat: 1\n---\nrequest GET {orders}/orders?state=open\nexpect status 200\ncapture id json 0.id\n";
const FIXED = "---\nkind: fixed\nneed: the demo tenant\nhow: made by hand in the admin screen\nformat: 1\n---\nrequest GET {orders}/tenants/demo\ncapture tenant json id\n";
const USER = "---\nkind: user\nneed: a buyer account\nrole: buyer\nfields: [name, password]\nformat: 1\n---\n";
const SQL = "---\nkind: sql\nneed: a customer with ten orders\nfile: data/customer.sql\nservice: orders-sql\nformat: 1\n---\nrequest GET {orders}/customers?orders=10\ncapture id json 0.id\n";

test("one entry of each kind reads its header, steps and captures (T-5.1)", () => {
  const create = parseEntry(CREATE, "customer");
  assert.deepEqual(create.problems, []);
  assert.deepEqual(
    { ...create.entry, steps: create.entry?.steps.map((step) => step.word) },
    { name: "customer", kind: "create", need: "a customer of its own", how: null, file: null, service: null, role: null, fields: [], steps: ["request", "expect", "capture"], captures: ["id"] },
  );
  const find = parseEntry(FIND, "open-order").entry;
  assert.deepEqual([find?.kind, find?.need, find?.captures, find?.steps.length], ["find", "an open order", ["id"], 3]);
  const fixed = parseEntry(FIXED, "demo-tenant").entry;
  assert.deepEqual([fixed?.kind, fixed?.how, fixed?.captures], ["fixed", "made by hand in the admin screen", ["tenant"]]);
  const user = parseEntry(USER, "buyer").entry;
  assert.deepEqual([user?.kind, user?.role, user?.fields, user?.steps, user?.captures], ["user", "buyer", ["name", "password"], [], []]);
  const sql = parseEntry(SQL, "busy-customer").entry;
  assert.deepEqual([sql?.kind, sql?.file, sql?.service, sql?.captures], ["sql", "data/customer.sql", "orders-sql", ["id"]]);
});

const POST_STEP = "request POST {orders}/orders\nexpect status 201\ncapture id json id\n";

const PROBLEM_CASES: [string, string, string, string][] = [
  ["a find entry with a POST", FIND.replace(/---\nrequest[\s\S]*$/, `---\n${POST_STEP}`), "open-order", "step 1: a find entry sends only GET requests, not POST"],
  ["a fixed entry with a POST", FIXED.replace(/---\nrequest[\s\S]*$/, `---\n${POST_STEP}`), "demo-tenant", "step 1: a fixed entry sends only GET requests, not POST"],
  ["a sql entry with a POST", SQL.replace(/---\nrequest[\s\S]*$/, `---\n${POST_STEP}`), "busy-customer", "step 1: a sql entry sends only GET requests, not POST"],
  ["a create entry with no changing request holding PKT-{run}", CREATE.replace("PKT-{run}-c", "fixed-name"), "customer", "a create entry sends a POST, PUT or PATCH whose target or body holds PKT-{run}"],
  ["an entry with no capture", FIND.replace("capture id json 0.id\n", ""), "open-order", "an entry captures at least one value"],
  ["a user entry with steps", `${USER}request GET {orders}/me\n`, "buyer", "a user entry has no steps: its values come from the PICKET_USER_ variables"],
  ["a step holding {data:", FIND.replace("orders?state=open", "orders?customer={data:customer.id}"), "open-order", "step 1: an entry takes no {data:...} value"],
  ["an unknown kind", FIND.replace("kind: find", "kind: borrow"), "open-order", "header: kind must be one of create, find, fixed, user, sql"],
  ["the name Open_Order", FIND, "Open_Order", "name: Open_Order must be lowercase letters, digits and -, starting with a letter"],
];

for (const [name, text, entryName, problem] of PROBLEM_CASES) {
  test(`${name} is one named problem and no entry (T-5.2)`, () => {
    assert.deepEqual(parseEntry(text, entryName), { entry: null, problems: [problem] });
  });
}

function service(name: string, role: string): EnvService {
  return { name, role, build: null, image: null, healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {} };
}

const MODEL: EnvModel = { name: "shop", services: [service("orders", "app"), service("orders-sql", "data"), service("cache", "dependency")], picket: null };

function project(t: TestContext, entries: Record<string, string>, data: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "picket-catalog-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".picket", "env", "catalog"), { recursive: true });
  mkdirSync(join(root, ".picket", "env", "data"), { recursive: true });
  for (const [name, text] of Object.entries(entries)) writeFileSync(join(root, ".picket", "env", "catalog", name), text);
  for (const [name, text] of Object.entries(data)) writeFileSync(join(root, ".picket", "env", "data", name), text);
  return root;
}

function messages(root: string, scenarios: SavedScenario[] = [], env: NodeJS.ProcessEnv = {}): string[] {
  return entryFindings(root, MODEL, scenarios, env, "E13").map((finding) => `${finding.rule} ${finding.level} ${finding.service}: ${finding.message}`);
}

test("a sql entry whose file leaves data/, is absolute or is missing, or whose service is no data service, is E13 (T-5.3)", (t) => {
  const root = project(t, {
    "outside.md": SQL.replace("data/customer.sql", "../compose.yaml"),
    "absolute.md": SQL.replace("data/customer.sql", "/etc/hosts"),
    "missing.md": SQL,
    "dependency.md": SQL.replace("orders-sql", "cache"),
  });
  assert.deepEqual(messages(root), [
    "E13 error absolute: file /etc/hosts must be a file under .picket/env/data/, written as data/<name>.sql",
    "E13 error dependency: file data/customer.sql does not exist under .picket/env/",
    "E13 error dependency: service cache has role dependency; a sql entry runs through a data service",
    "E13 error missing: file data/customer.sql does not exist under .picket/env/",
    "E13 error outside: file ../compose.yaml must be a file under .picket/env/data/, written as data/<name>.sql",
  ]);
});

test("a sql entry with its file under data/ and a data service has no finding", (t) => {
  const root = project(t, { "busy-customer.md": SQL }, { "customer.sql": "insert into customers values (1);\n" });
  assert.deepEqual(messages(root), []);
});

function scenario(id: string, steps: string): SavedScenario {
  const { card, problems } = parseScenario(`---\nid: ${id}\nkind: normal\ncovers: []\nintent: x\nformat: 1\n---\n${steps}`);
  assert.deepEqual(problems, []);
  return { path: `.picket/env/scenarios/${id}.md`, id, card, problems: [], fingerprint: "", byHand: false };
}

test("a scenario naming a capture the entry lacks, or no entry, is E13; an unset test user field is pending, named by its variable (T-5.4)", (t) => {
  const root = project(t, { "customer.md": CREATE, "buyer.md": USER });
  const scenarios = [scenario("S-0002", "request PUT {orders}/customers/{data:customer.ref}\n  body {\"id\":\"{data:customer.id}\",\"t\":\"{data:tenant.id}\"}\n")];
  assert.deepEqual(messages(root, scenarios, { PICKET_USER_BUYER_NAME: "qa-buyer", PICKET_USER_BUYER_PASSWORD: "" }), [
    "E13 pending buyer: PICKET_USER_BUYER_PASSWORD is unset; set it in the shell that starts Claude Code",
    "E13 error S-0002: {data:customer.ref}: customer captures only id",
    "E13 error S-0002: {data:tenant.id} names no catalog entry tenant",
  ]);
  assert.ok(!messages(root, scenarios, { PICKET_USER_BUYER_NAME: "qa-buyer", PICKET_USER_BUYER_PASSWORD: "s3cret-value" }).some((line) => line.includes("s3cret-value") || line.includes("pending")));
});

test("entry steps are checked by the scenario rules against the environment's services", (t) => {
  const root = project(t, { "open-order.md": FIND.replace("{orders}", "{stock}") });
  assert.deepEqual(messages(root), ["E13 error open-order: rule 1: step 1 names {stock}, which is no service of the environment"]);
});

test("listEntries reads one entry per .md file in name order and nothing without the folder", (t) => {
  const root = project(t, { "open-order.md": FIND, "customer.md": CREATE, "notes.txt": "x" });
  assert.deepEqual(listEntries(root).map(({ name, path, problems }) => ({ name, path, problems })), [
    { name: "customer", path: ".picket/env/catalog/customer.md", problems: [] },
    { name: "open-order", path: ".picket/env/catalog/open-order.md", problems: [] },
  ]);
  const empty = mkdtempSync(join(tmpdir(), "picket-catalog-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.deepEqual(listEntries(empty), []);
});
