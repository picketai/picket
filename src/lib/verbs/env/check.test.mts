import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EXIT, describeExit } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner, MachineReport } from "../../shared/env/engine.mts";
import { recordTrial } from "../../shared/env/trial.mts";
import { fingerprintMatches, parseScenario, writeScenario } from "../../shared/scenarios/format.mts";
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
  assert.deepEqual({ ...report(outcome), machine: null }, { ok: false, machine: null, environment: "missing", findings: [], scenarios: null });
  assert.equal(renderCheck(report(outcome)).split("\n").at(-1), "no environment: .picket/env/compose.yaml is missing");
});

const BILLING_PENDING = [
  "pending: billing: its Dockerfile is left to the project",
  "pending: billing: services/billing/appsettings.json ConnectionStrings:Billing has no wiring row",
  "pending: billing: services/billing/appsettings.json Services:Orders:Url has no wiring row",
  "pending: trial: run picket env trial",
];
const FIXTURE_COUNT = "scenarios: 1 active, 0 deprecated";

test("the fixture umbrella with no trial record passes, prints the pending lines and exits 0 (T-4.7, T-6.4)", (t) => {
  const outcome = checkEnvironment(umbrellaContext(t), linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, EXIT.done);
  assert.ok(report(outcome).findings.every((f) => f.level === "pending"));
  assert.deepEqual(renderCheck(report(outcome)).split("\n").slice(2), ["rules passed", ...BILLING_PENDING, FIXTURE_COUNT]);
});

test("a failed or stale trial record fails the check naming E10; a passing one for this model adds no E10 line (T-6.4)", (t) => {
  const failedRun = umbrellaContext(t);
  recordTrial(failedRun.root, RECORDED, false, new Date(0));
  const failedOutcome = checkEnvironment(failedRun, linuxDocker(RECORDED));
  assert.equal(describeExit(failedOutcome).code, 2);
  assert.ok(renderCheck(report(failedOutcome)).split("\n").includes("E10: the last trial failed; fix the environment and run picket env trial"));
  const stale = umbrellaContext(t);
  recordTrial(stale.root, { ...RECORDED, name: "before" }, true, new Date(0));
  const staleOutcome = checkEnvironment(stale, linuxDocker(RECORDED));
  assert.equal(describeExit(staleOutcome).code, 2);
  assert.ok(renderCheck(report(staleOutcome)).split("\n").includes("E10: the last trial ran on another environment; run picket env trial"));
  const passed = umbrellaContext(t);
  recordTrial(passed.root, RECORDED, true, new Date(0));
  const passedOutcome = checkEnvironment(passed, linuxDocker(RECORDED));
  assert.equal(describeExit(passedOutcome).code, 0);
  assert.ok(!renderCheck(report(passedOutcome)).includes("trial"));
});

test("an error finding exits 2 and prints one line per finding", (t) => {
  const model = structuredClone(RECORDED);
  model.services.cache.image = "busybox:1.36";
  const outcome = checkEnvironment(umbrellaContext(t), linuxDocker(model));
  assert.equal(describeExit(outcome).code, 2);
  assert.deepEqual(renderCheck(report(outcome)).split("\n").slice(2), ["E6 cache: image busybox:1.36 is not pinned by digest (@sha256:)", ...BILLING_PENDING, FIXTURE_COUNT]);
});

test("a scanned service missing from the environment is an E9 error that fails the check", (t) => {
  const ctx = umbrellaContext(t);
  mkdirSync(join(ctx.root, "services", "stock"), { recursive: true });
  writeFileSync(join(ctx.root, "services", "stock", "package.json"), "{}");
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  assert.ok(renderCheck(report(outcome)).split("\n").includes("E9 stock: services/stock is not in the environment: add a service, or list it as shared, ignored or pending"));
});

function withCard(ctx: Context, name: string, text: string): Context {
  writeFileSync(join(ctx.root, ".picket", "env", "scenarios", name), text);
  return ctx;
}

const CARD_HEADER = "---\nid: S-0002\nkind: normal\ncovers: []\nintent: billing\nformat: 1\n---\n";

test("a broken scenario card fails the check with one E11 line per problem under its file's id (T-1.6)", (t) => {
  const ctx = withCard(umbrellaContext(t), "S-0002.md", `${CARD_HEADER}request GET {billing}/invoices\nclick #pay\n`);
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  const lines = renderCheck(report(outcome)).split("\n");
  assert.deepEqual(lines.filter((line) => line.startsWith("E11")), ['E11 S-0002: step 2: unknown step word "click"']);
  assert.equal(lines.at(-1), FIXTURE_COUNT);
});

test("a card whose request names no service of the model gives a rule 1 E11 line and is still counted (T-1.6)", (t) => {
  const ctx = withCard(umbrellaContext(t), "S-0002.md", `${CARD_HEADER}request GET {billing}/invoices\n`);
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  const lines = renderCheck(report(outcome)).split("\n");
  assert.deepEqual(lines.filter((line) => line.startsWith("E11")), ["E11 S-0002: rule 1: step 1 names {billing}, which is no service of the environment"]);
  assert.equal(lines.at(-1), "scenarios: 2 active, 0 deprecated");
});

test("a second card with an id already used gives a duplicate E11 line (T-1.6)", (t) => {
  const ctx = umbrellaContext(t);
  const fixture = readFileSync(join(ctx.root, ".picket", "env", "scenarios", "S-0001.md"), "utf8");
  const outcome = checkEnvironment(withCard(ctx, "S-0003.md", fixture), linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  const lines = renderCheck(report(outcome)).split("\n");
  assert.deepEqual(lines.filter((line) => line.startsWith("E11")), ["E11 S-0003: header: id S-0001 is already used by .picket/env/scenarios/S-0001.md"]);
});

test("a deprecated card is counted apart from the active ones", (t) => {
  const ctx = withCard(umbrellaContext(t), "S-0002.md", `${CARD_HEADER.replace("format: 1", "status: deprecated\nformat: 1")}request GET {orders}/health\n`);
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 0);
  assert.equal(renderCheck(report(outcome)).split("\n").at(-1), "scenarios: 1 active, 1 deprecated");
});

test("without the scenario folder no E11 line and no count line appear (T-1.6)", (t) => {
  const ctx = umbrellaContext(t);
  rmSync(join(ctx.root, ".picket", "env", "scenarios"), { recursive: true });
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 0);
  assert.equal(report(outcome).scenarios, null);
  assert.ok(!renderCheck(report(outcome)).split("\n").some((line) => line.startsWith("E11") || line.startsWith("scenarios:")));
});

function withMock(ctx: Context, name: string, text: string): Context {
  mkdirSync(join(ctx.root, ".picket", "env", "mocks"), { recursive: true });
  writeFileSync(join(ctx.root, ".picket", "env", "mocks", name), text);
  return ctx;
}

const MOCK_HEADER = "---\nreplaces: payments\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\n";

test("a broken mock definition fails the check with an E12 line under its service (T-1.4)", (t) => {
  const ctx = withMock(umbrellaContext(t), "payments-mock.md", `${MOCK_HEADER}when GET /payments?state=open\n  status 200\n`);
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, 2);
  const lines = renderCheck(report(outcome)).split("\n");
  assert.deepEqual(lines.filter((line) => line.startsWith("E12")), ["E12 payments-mock: when 1: a path holds no ? or #: the query string is never matched"]);
});

test("a valid mock definition of a mock service adds no E12 line", (t) => {
  const ctx = withMock(umbrellaContext(t), "payments-mock.md", `${MOCK_HEADER}when GET /payments/*\n  status 200\n`);
  const outcome = checkEnvironment(ctx, linuxDocker(RECORDED));
  assert.equal(describeExit(outcome).code, EXIT.done);
  assert.ok(!renderCheck(report(outcome)).split("\n").some((line) => line.startsWith("E12")));
});

test("the fixture card is written in canonical form and its fingerprint matches", () => {
  const text = readFileSync(resolve("test/fixtures/env/umbrella/.picket/env/scenarios/S-0001.md"), "utf8");
  const { card, problems } = parseScenario(text);
  assert.deepEqual(problems, []);
  assert.ok(card);
  assert.equal(writeScenario(card), text.replaceAll("\r\n", "\n"));
  assert.ok(fingerprintMatches(text));
});

test("a passing report renders the engine line and sizes in GiB with one decimal", () => {
  const value: EnvCheckReport = { ok: true, machine: MACHINE, environment: "present", findings: [], scenarios: null };
  assert.equal(renderCheck(value), "engine: docker (Linux containers, Compose 2.29.1)\nmemory: 16.0 GiB · free disk: 5.3 GiB\nrules passed");
  const unknown = { ...value, machine: { ...MACHINE, memory_bytes: null, free_disk_bytes: null } };
  assert.equal(renderCheck(unknown).split("\n")[1], "memory: unknown · free disk: unknown");
});

test("a model finding with no service prints the rule alone", () => {
  const value: EnvCheckReport = { ok: false, machine: MACHINE, environment: "present", findings: [{ rule: "E8", service: null, level: "error", message: "x-picket is missing" }], scenarios: null };
  assert.equal(renderCheck(value).split("\n").at(-1), "E8: x-picket is missing");
});

test("a failing machine renders one missing line per gap and no engine line", () => {
  const machine: MachineReport = { ...MACHINE, ok: false, missing: ["first gap", "second gap"] };
  assert.equal(renderCheck({ ok: false, machine, environment: null, findings: [], scenarios: null }), "missing: first gap\nmissing: second gap");
});
