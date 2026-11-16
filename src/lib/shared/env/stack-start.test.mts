import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProgramResult } from "../../util/process.mts";
import type { ServiceSource } from "./build-plan.mts";
import type { Engine } from "./engine.mts";
import type { EnvService } from "./model.mts";
import { serviceEndpoints, unprovedBuild } from "./stack-start.mts";

function fakeEngine(answer: (args: string[]) => ProgramResult): Engine {
  return { name: "docker", program: "docker", prefix: [], kind: "docker", run: answer };
}

function service(name: string, target: number | null): EnvService {
  const ports = target === null ? [] : [{ target, published: null }];
  return { name, role: "app", build: null, image: null, healthcheck: null, ports, volumes: [], profiles: [], environment: {}, labels: {} };
}

const PUBLISHED: Record<string, ProgramResult> = {
  any4: { status: 0, stdout: "0.0.0.0:49153\n", stderr: "" },
  any6: { status: 0, stdout: "[::]:49153\n", stderr: "" },
  named: { status: 0, stdout: "10.0.0.5:8080\n", stderr: "" },
  gone: { status: 1, stdout: "", stderr: "no such service" },
};

test("serviceEndpoints maps any address to localhost, keeps a named host, and leaves out portless and failed services", () => {
  const engine = fakeEngine((args) => PUBLISHED[args.at(-2) ?? ""] ?? { status: 1, stdout: "", stderr: "" });
  const services = [service("any4", 80), service("any6", 80), service("named", 8080), service("portless", null), service("gone", 80)];
  assert.deepEqual(serviceEndpoints(engine, "/umbrella", "picket-x", ["/umbrella/.picket/env/compose.yaml"], services), {
    any4: "http://127.0.0.1:49153",
    any6: "http://127.0.0.1:49153",
    named: "http://10.0.0.5:8080",
  });
});

function source(service: string, version: string): ServiceSource {
  return { service, checkout: "/umbrella", context: `/umbrella/services/${service}`, dockerfile: null, version };
}

function labelled(revisions: Record<string, string>): Engine {
  return fakeEngine(([, , image]) => {
    const revision = Object.entries(revisions).find(([service]) => image.startsWith(`picket/${service}-`))?.[1];
    if (revision === undefined) return { status: 1, stdout: "", stderr: "no such image" };
    return { status: 0, stdout: JSON.stringify([{ Config: { Labels: { "org.opencontainers.image.revision": revision } } }]), stderr: "" };
  });
}

test("unprovedBuild names the first image whose revision label differs, and is null when every label matches", () => {
  const sources = [source("orders", "abc1234"), source("billing", "def5678")];
  assert.equal(unprovedBuild(labelled({ orders: "abc1234", billing: "def5678" }), sources, "proj-1"), null);
  assert.equal(unprovedBuild(labelled({ orders: "abc1234", billing: "0000000" }), sources, "proj-1"), "picket/billing-proj-1:def5678 was not built from def5678");
  assert.equal(unprovedBuild(labelled({ billing: "0000000" }), sources, "proj-1"), "picket/orders-proj-1:abc1234 was not built from abc1234");
});
