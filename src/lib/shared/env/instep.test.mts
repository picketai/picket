import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inStepFindings, locatedFindings, outOfStep, splitByChange } from "./instep.mts";
import { readModel, type EnvModel } from "./model.mts";
import { scanUmbrella } from "./scan.mts";
import type { Scan, ScannedService } from "./scan.mts";

const UMBRELLA = resolve("test/fixtures/env/umbrella");
const RECORDED = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8")) as Record<string, any>;

function model(change: (json: Record<string, any>) => void = () => {}): EnvModel {
  const json = structuredClone(RECORDED);
  change(json);
  return readModel(json);
}

function errors(m: EnvModel, root = UMBRELLA) {
  return inStepFindings(scanUmbrella(root), m, root).filter((f) => f.level === "error");
}

function copy(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-instep-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(UMBRELLA, root, { recursive: true });
  return root;
}

test("the fixture scan against the fixture model gives no error and pending lines for billing only (T-4.3)", () => {
  const findings = inStepFindings(scanUmbrella(UMBRELLA), model(), UMBRELLA);
  assert.deepEqual(errors(model()), []);
  assert.ok(findings.length > 0);
  assert.deepEqual([...new Set(findings.map((f) => `${f.rule} ${f.service} ${f.level}`))], ["E9 billing pending"]);
});

test("dropping the PAYMENTS_URL wiring row gives one E9 naming its file and key (T-4.3)", () => {
  const found = errors(model((json) => (json["x-picket"].wiring = [])));
  assert.deepEqual(found, [{ rule: "E9", service: "orders", level: "error", message: "services/orders/.env PAYMENTS_URL has no wiring row" }]);
});

test("removing PAYMENTS_URL from orders' environment gives one E9 naming the variable (T-4.3)", () => {
  const found = errors(model((json) => (json.services.orders.environment = {})));
  assert.deepEqual(found, [{ rule: "E9", service: "orders", level: "error", message: "variable PAYMENTS_URL for services/orders/.env PAYMENTS_URL is not in the environment of orders" }]);
});

test("a new services/stock package gives one E9 naming services/stock (T-4.3)", (t) => {
  const root = copy(t);
  mkdirSync(join(root, "services", "stock"));
  writeFileSync(join(root, "services", "stock", "package.json"), "{}");
  const found = errors(model(), root);
  assert.equal(found.length, 1);
  assert.equal(found[0].service, "stock");
  assert.match(found[0].message, /^services\/stock is not in the environment/);
  const gaps = outOfStep(scanUmbrella(root), model(), root);
  assert.deepEqual([gaps.services.map((s) => s.path), gaps.entries], [["services/stock"], []]);
});

test("splitByChange puts the services/stock finding under caused for a file in it and under other for another folder (T-9.5)", (t) => {
  const root = copy(t);
  mkdirSync(join(root, "services", "stock"));
  writeFileSync(join(root, "services", "stock", "package.json"), "{}");
  const errorsOnly = locatedFindings(scanUmbrella(root), model(), root).filter(({ finding }) => finding.level === "error");
  assert.deepEqual(errorsOnly.map(({ path }) => path), ["services/stock"]);
  const inStock = splitByChange(errorsOnly, ["services/stock/package.json"]);
  assert.deepEqual([inStock.caused.length, inStock.other.length], [1, 0]);
  const elsewhere = splitByChange(errorsOnly, ["services/orders/server.mjs"]);
  assert.deepEqual([elsewhere.caused.length, elsewhere.other.length], [0, 1]);
  assert.equal(splitByChange(errorsOnly, ["services"]).caused.length, 1, "a changed folder above the finding also causes it");
});

const ROOT_SERVICE: ScannedService = { id: "S1", path: "", name: "root", runtime: "node", linux: true, dockerfile: null, choices: ["write", "user", "shared", "ignore"], default: "write" };
const ROOT_ONLY: Scan = { fingerprint: "", services: [ROOT_SERVICE], entries: [] };

test("a root service is placed by a build whose context is the umbrella root, and unplaced without one (T-1.2)", () => {
  const builtAtRoot = model((json) => (json.services.orders.build.context = UMBRELLA));
  assert.deepEqual(inStepFindings(ROOT_ONLY, builtAtRoot, UMBRELLA).filter((f) => f.service === "root"), []);
  const builtElsewhere = inStepFindings(ROOT_ONLY, model(), UMBRELLA).filter((f) => f.service === "root");
  assert.deepEqual(builtElsewhere, [{ rule: "E9", service: "root", level: "error", message: " is not in the environment: add a service, or list it as shared, ignored or pending" }]);
});

test("a by: file row whose replaced file is missing is an error, and present it passes", (t) => {
  const root = copy(t);
  const row = { service: "orders", file: "services/orders/.env", key: "PAYMENTS_URL", by: "file", replaced: ".picket/env/config/orders/.env" };
  const withFileRow = model((json) => (json["x-picket"].wiring = [row]));
  assert.deepEqual(errors(withFileRow, root).map((f) => f.message), ["replaced file .picket/env/config/orders/.env for services/orders/.env is missing"]);
  mkdirSync(join(root, ".picket", "env", "config", "orders"), { recursive: true });
  writeFileSync(join(root, ".picket", "env", "config", "orders", ".env"), "PAYMENTS_URL=http://payments-mock:8080\n");
  assert.deepEqual(errors(withFileRow, root), []);
});

test("entries of a shared or ignored service need no wiring row; an unplaced service is an error until ignored", (t) => {
  const root = copy(t);
  mkdirSync(join(root, "tools", "gen"), { recursive: true });
  writeFileSync(join(root, "tools", "gen", "go.mod"), "module gen\n");
  assert.equal(errors(model(), root).length, 1);
  assert.deepEqual(errors(model((json) => (json["x-picket"].ignored = ["tools/gen"])), root), []);
  const noShared = errors(model((json) => (json["x-picket"].shared = {})));
  assert.deepEqual(noShared.map((f) => f.service).sort(), ["legacy", "legacy", "legacy"]);
});
