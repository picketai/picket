import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readModel, type EnvModel, type EnvService } from "./model.mts";
import { hasError, staticFindings } from "./rules.mts";

const RECORDED = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8")) as unknown;
const PINNED = "busybox:1.36@sha256:73aaf090f3d85aa34ee199857f03fa3a95c8ede2ffd4cc2cdb5b94e566b11662";

function fixture(): EnvModel {
  return readModel(RECORDED);
}

function changed(name: string, change: (service: EnvService) => EnvService): EnvModel {
  const model = fixture();
  return { ...model, services: model.services.map((s) => (s.name === name ? change(s) : s)) };
}

function ruleAndService(model: EnvModel): string[] {
  return staticFindings(model).map((f) => `${f.rule} ${f.service} ${f.level}`);
}

test("the fixture model gives no finding (T-2.2)", () => {
  assert.deepEqual(staticFindings(fixture()), []);
});

test("E1: a service without the role label is one finding", () => {
  assert.deepEqual(ruleAndService(changed("cache", (s) => ({ ...s, role: null }))), ["E1 cache error"]);
});

test("E2: an app with an image and no build is one finding", () => {
  assert.deepEqual(ruleAndService(changed("orders", (s) => ({ ...s, build: null, image: PINNED }))), ["E2 orders error"]);
});

test("E3: a mock without a healthcheck is one finding, and so is a disabled one", () => {
  assert.deepEqual(ruleAndService(changed("payments-mock", (s) => ({ ...s, healthcheck: null }))), ["E3 payments-mock error"]);
  assert.deepEqual(ruleAndService(changed("cache", (s) => ({ ...s, healthcheck: { test: ["CMD", "true"], disable: true } }))), ["E3 cache error"]);
});

test("E4: a published host port is one finding", () => {
  const model = changed("orders", (s) => ({ ...s, ports: [{ target: 8080, published: "8080" }] }));
  assert.deepEqual(staticFindings(model), [{ rule: "E4", service: "orders", level: "error", message: "port 8080 is published on host port 8080: leave the host port to the engine" }]);
});

test("E5: an unnamed volume and a writable bind are two findings", () => {
  const volumes = [
    { type: "volume", source: null, target: "/cache", read_only: false },
    { type: "bind", source: "/umbrella/data", target: "/seed", read_only: false },
    { type: "bind", source: "/umbrella/conf", target: "/conf", read_only: true },
  ];
  assert.deepEqual(ruleAndService(changed("orders", (s) => ({ ...s, volumes }))), ["E5 orders error", "E5 orders error"]);
});

test("E6: an image without a digest is one finding", () => {
  const model = changed("cache", (s) => ({ ...s, image: "busybox:1.36" }));
  assert.deepEqual(staticFindings(model), [{ rule: "E6", service: "cache", level: "error", message: "image busybox:1.36 is not pinned by digest (@sha256:)" }]);
});

test("E7: a data service outside the picket-data profile is one finding", () => {
  assert.deepEqual(ruleAndService(changed("billing-db-client", (s) => ({ ...s, profiles: [] }))), ["E7 billing-db-client error"]);
});

test("E8: an unknown x-picket key is one finding; a missing block, a wrong version and a bad address each are", () => {
  const model = fixture();
  const picket = model.picket;
  assert.ok(picket);
  assert.deepEqual(staticFindings({ ...model, picket: { ...picket, unknown_keys: ["extras"] } }), [{ rule: "E8", service: null, level: "error", message: "x-picket.extras is not a known key" }]);
  assert.deepEqual(ruleAndService({ ...model, picket: null }), ["E8 null error"]);
  assert.deepEqual(ruleAndService({ ...model, picket: { ...picket, version: 2 } }), ["E8 null error"]);
  assert.deepEqual(ruleAndService({ ...model, picket: { ...picket, shared: { legacy: { address: "db01.corp:1433" } } } }), ["E8 null error"]);
});

test("hasError holds for any error finding and not for pending lines alone", () => {
  assert.equal(hasError(staticFindings(changed("cache", (s) => ({ ...s, image: "busybox:1.36", role: null })))), true);
  assert.equal(hasError([{ rule: "E9", service: "billing", level: "pending", message: "Dockerfile" }]), false);
  assert.equal(hasError([]), false);
});
