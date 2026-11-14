import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readModel, type EnvService } from "./model.mts";

const RECORDED = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8")) as unknown;
const BUSYBOX = "busybox:1.36@sha256:73aaf090f3d85aa34ee199857f03fa3a95c8ede2ffd4cc2cdb5b94e566b11662";

function service(name: string): EnvService {
  const found = readModel(RECORDED).services.find((s) => s.name === name);
  assert.ok(found, name);
  return found;
}

test("the recorded model reads into five services with their roles (T-2.1)", () => {
  const model = readModel(RECORDED);
  assert.equal(model.name, "env");
  assert.deepEqual(
    model.services.map((s) => [s.name, s.role]),
    [
      ["billing-db-client", "data"],
      ["cache", "dependency"],
      ["orders", "app"],
      ["orders-seed", "seed"],
      ["payments-mock", "mock"],
    ],
  );
});

test("orders is built, unpublished on 8080, with a named volume and no profile (T-2.1)", () => {
  const orders = service("orders");
  assert.deepEqual(orders.build, { context: "/umbrella/services/orders", dockerfile: "../../.picket/env/docker/orders/Dockerfile" });
  assert.equal(orders.image, null);
  assert.deepEqual(orders.ports, [{ target: 8080, published: null }]);
  assert.deepEqual(orders.volumes, [{ type: "volume", source: "orders-data", target: "/data", read_only: false }]);
  assert.deepEqual(orders.profiles, []);
  assert.deepEqual(orders.environment, { PAYMENTS_URL: "http://payments-mock:8080" });
  assert.deepEqual(orders.healthcheck, { test: ["CMD", "wget", "-q", "-O", "-", "http://127.0.0.1:8080/health"], disable: false });
});

test("the image services carry digests, and only the data client has the picket-data profile (T-2.1)", () => {
  for (const name of ["payments-mock", "cache", "orders-seed", "billing-db-client"]) {
    const s = service(name);
    assert.equal(s.build, null, name);
    assert.match(s.image ?? "", /@sha256:[0-9a-f]{64}$/, name);
  }
  assert.equal(service("payments-mock").image, BUSYBOX);
  assert.deepEqual(service("payments-mock").ports, [{ target: 8080, published: null }]);
  assert.deepEqual(service("cache").ports, []);
  assert.deepEqual(service("orders-seed").volumes, [{ type: "volume", source: "orders-data", target: "/data", read_only: false }]);
  assert.deepEqual(service("cache").volumes, []);
  assert.deepEqual(service("billing-db-client").profiles, ["picket-data"]);
  assert.deepEqual(service("cache").profiles, []);
  assert.equal(service("orders-seed").healthcheck, null);
});

test("the x-picket block reads its shared entry and has no unknown key (T-2.1)", () => {
  assert.deepEqual(readModel(RECORDED).picket, { version: 1, shared: { legacy: { address: "PICKET_SHARED_LEGACY" } }, wiring: [], ignored: [], pending: [], unknown_keys: [] });
});

test("a model without x-picket reads picket as null and a service without labels has no role", () => {
  const model = readModel({ name: "bare", services: { web: { image: "nginx" } } });
  assert.equal(model.picket, null);
  assert.deepEqual(model.services, [{ name: "web", role: null, build: null, image: "nginx", healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {} }]);
});

test("x-picket keys outside the closed list are reported, and rows read with nulls for absent fields", () => {
  const block = readModel({ "x-picket": { version: 1, extras: true, wiring: [{ service: "orders", file: "a.json", by: "keep" }], pending: [{ service: "billing", what: "Dockerfile" }], ignored: ["tools"] } }).picket;
  assert.deepEqual(block?.unknown_keys, ["extras"]);
  assert.deepEqual(block?.wiring, [{ service: "orders", file: "a.json", key: null, by: "keep", variable: null, replaced: null }]);
  assert.deepEqual(block?.pending, [{ service: "billing", what: "Dockerfile" }]);
  assert.deepEqual(block?.ignored, ["tools"]);
});
