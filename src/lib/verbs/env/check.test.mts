import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EXIT, describeExit } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner, MachineReport } from "../../shared/env/engine.mts";
import { parseArgs } from "../../util/args.mts";
import { checkEnvironment, renderCheck, verb, type EnvCheckReport } from "./check.mts";

type Model = Record<string, any>;

const RECORDED: Model = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8"));
const MACHINE: MachineReport = { ok: true, engine: { program: "docker", kind: "docker" }, os_type: "linux", compose: "2.29.1", memory_bytes: 17179869184, free_disk_bytes: 5 * 1024 ** 3 + 1024 ** 3 / 4, missing: [] };

function context(t: TestContext, { environment }: { environment: boolean }): Context {
  const root = mkdtempSync(join(tmpdir(), "picket-env-check-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (environment) {
    mkdirSync(join(root, ".picket", "env"), { recursive: true });
    writeFileSync(join(root, ".picket", "env", "compose.yaml"), "services: {}\n");
  }
  return { root, cwd: root, now: () => new Date(0), env: {}, home: root, session: null, platform: process.platform };
}

function umbrellaContext(t: TestContext): Context {
  const ctx = context(t, { environment: false });
  cpSync(resolve("test/fixtures/env/umbrella"), ctx.root, { recursive: true });
  return ctx;
}

function linuxDocker(model: Model): EngineRunner {
  return (program, args) => {
    const call = args.join(" ");
    if (program !== "docker") return { status: 1, stdout: "", stderr: "" };
    if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux","MemTotal":17179869184}', stderr: "" };
    if (call === "compose version --format json") return { status: 0, stdout: '{"version":"v2.29.1"}', stderr: "" };
    if (args.at(-1) === "--profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (args.includes("--format")) return { status: 0, stdout: JSON.stringify(model), stderr: "" };
    return { status: 1, stdout: "", stderr: "" };
  };
}

const noEngine: EngineRunner = () => ({ status: 1, stdout: "", stderr: "" });

function report(outcome: ReturnType<typeof checkEnvironment>): EnvCheckReport {
  return describeExit(outcome).json as EnvCheckReport;
}

test("env check takes no arguments and prints text", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
  assert.equal(verb.output, "text");
  assert.equal(verb.usage, "env check");
});

test("a missing engine exits 2 before the environment is looked at", (t) => {
  const outcome = checkEnvironment(context(t, { environment: true }), noEngine);
  assert.equal(describeExit(outcome).code, 2);
  const value = report(outcome);
  assert.equal(value.environment, null);
  assert.equal(renderCheck(value), "missing: no container engine: install Docker or Podman");
});

test("a machine that passes with no compose.yaml exits 2 naming the missing file (T-2.5)", (t) => {
  const outcome = checkEnvironment(context(t, { environment: false }), linuxDocker(RECORDED));
  assert.equal(outcome.status, "failed");
  assert.equal(describeExit(outcome).code, 2);
  assert.deepEqual({ ...report(outcome), machine: null }, { ok: false, machine: null, environment: "missing", findings: [] });
  assert.equal(renderCheck(report(outcome)).split("\n").at(-1), "no environment: .picket/env/compose.yaml is missing");
});

const BILLING_PENDING = [
  "pending: billing: its Dockerfile is left to the project",
  "pending: billing: services/billing/appsettings.json ConnectionStrings:Billing has no wiring row",
  "pending: billing: services/billing/appsettings.json Services:Orders:Url has no wiring row",
];

test("the fixture umbrella passes the rules, prints billing's pending lines and exits 0 (T-4.7)", (t) => {
  const outcome = checkEnvironment(umbrellaContext(t), linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, EXIT.done);
  assert.ok(report(outcome).findings.every((f) => f.rule === "E9" && f.level === "pending" && f.service === "billing"));
  assert.deepEqual(renderCheck(report(outcome)).split("\n").slice(2), ["rules passed", ...BILLING_PENDING]);
});

test("an error finding exits 2 and prints one line per finding", (t) => {
  const model = structuredClone(RECORDED);
  model.services.cache.image = "busybox:1.36";
  const outcome = checkEnvironment(umbrellaContext(t), linuxDocker(model));
  assert.equal(describeExit(outcome).code, 2);
  assert.deepEqual(renderCheck(report(outcome)).split("\n").slice(2), ["E6 cache: image busybox:1.36 is not pinned by digest (@sha256:)", ...BILLING_PENDING]);
});

test("a scanned service missing from the environment is an E9 error that fails the check", (t) => {
  const ctx = umbrellaContext(t);
  mkdirSync(join(ctx.root, "services", "stock"), { recursive: true });
  writeFileSync(join(ctx.root, "services", "stock", "package.json"), "{}");
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  assert.ok(renderCheck(report(outcome)).split("\n").includes("E9 stock: services/stock is not in the environment: add a service, or list it as shared, ignored or pending"));
});

test("a passing report renders the engine line and sizes in GiB with one decimal", () => {
  const value: EnvCheckReport = { ok: true, machine: MACHINE, environment: "present", findings: [] };
  assert.equal(renderCheck(value), "engine: docker (Linux containers, Compose 2.29.1)\nmemory: 16.0 GiB · free disk: 5.3 GiB\nrules passed");
  const unknown = { ...value, machine: { ...MACHINE, memory_bytes: null, free_disk_bytes: null } };
  assert.equal(renderCheck(unknown).split("\n")[1], "memory: unknown · free disk: unknown");
});

test("a model finding with no service prints the rule alone", () => {
  const value: EnvCheckReport = { ok: false, machine: MACHINE, environment: "present", findings: [{ rule: "E8", service: null, level: "error", message: "x-picket is missing" }] };
  assert.equal(renderCheck(value).split("\n").at(-1), "E8: x-picket is missing");
});

test("a failing machine renders one missing line per gap and no engine line", () => {
  const machine: MachineReport = { ...MACHINE, ok: false, missing: ["first gap", "second gap"] };
  assert.equal(renderCheck({ ok: false, machine, environment: null, findings: [] }), "missing: first gap\nmissing: second gap");
});
