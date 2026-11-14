import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describeExit, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import type { Scan } from "../../shared/env/scan.mts";
import { parseArgs } from "../../util/args.mts";
import { initEnvironment, renderInit, verb, type InitReport } from "./init.mts";

const UMBRELLA = resolve("test/fixtures/env/umbrella");
const SECRETS = ["fixture-secret-1", "fixture-secret-2", "fixture-secret-3"];
const SCAN_FILE = ".picket/state/env/scan.json";

function copyContext(t: TestContext): Context {
  const root = mkdtempSync(join(tmpdir(), "picket-env-init-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(UMBRELLA, root, { recursive: true });
  return { root, cwd: root, now: () => new Date(0), env: {}, home: root, session: null, platform: process.platform };
}

const RECORDED = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");

const linuxDocker: EngineRunner = (program, args) => {
  const call = `${program} ${args.join(" ")}`;
  if (call === "docker info --format json") return { status: 0, stdout: '{"OSType":"linux","MemTotal":1}', stderr: "" };
  if (call === "docker compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
  if (args.at(-1) === "--profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
  if (args.includes("config")) return { status: 0, stdout: RECORDED, stderr: "" };
  return { status: 1, stdout: "", stderr: "" };
};

const noEngine: EngineRunner = () => ({ status: 1, stdout: "", stderr: "" });

function setupContext(t: TestContext): Context {
  const ctx = copyContext(t);
  rmSync(join(ctx.root, ".picket", "env"), { recursive: true, force: true });
  return ctx;
}

function workItems(root: string): string[] {
  return existsSync(join(root, "work")) ? readdirSync(join(root, "work")) : [];
}

function created(ctx: Context, decide = ""): { code: number; report: InitReport } {
  const { code, json } = describeExit(initEnvironment(ctx, linuxDocker, { create: true, decide }));
  return { code, report: json as InitReport };
}

function refusedWith(ctx: Context, decide = ""): string {
  try {
    initEnvironment(ctx, linuxDocker, { create: true, decide });
  } catch (err) {
    assert.ok(err instanceof Refused, String(err));
    return err.message;
  }
  assert.fail("--create was not refused");
}

test("env init takes --create and --decide, and --decide alone is a usage error", () => {
  assert.deepEqual(verb.parse(parseArgs([])), { create: false, decide: "" });
  assert.deepEqual(verb.parse(parseArgs(["--create", "--decide", "S1=user"])), { create: true, decide: "S1=user" });
  assert.throws(() => verb.parse(parseArgs(["--decide", "S1=user"])), /--decide goes with --create/);
  assert.equal(verb.output, "text");
});

test("--create without a saved scan refuses and creates no item", (t) => {
  const ctx = setupContext(t);
  assert.equal(refusedWith(ctx), "no scan yet; run picket env init");
  assert.deepEqual(workItems(ctx.root), []);
});

test("--create after init writes a setup item whose request holds no secret (T-4.4)", (t) => {
  const ctx = setupContext(t);
  initEnvironment(ctx, linuxDocker);
  const { code, report } = created(ctx, "S3=user");
  assert.equal(code, 0);
  assert.equal(report.created?.mode, "setup");
  assert.equal(report.created?.title, "Set up the test environment");
  assert.deepEqual(workItems(ctx.root), [report.created?.id]);
  const request = readFileSync(join(ctx.root, "work", String(report.created?.id), "request.md"), "utf8");
  for (const secret of SECRETS) assert.ok(!request.includes(secret), secret);
  assert.ok(request.includes("Password=***"));
  assert.ok(request.includes("`x-picket.pending` row for `orders`"));
  assert.equal(renderInit(report), `created ${report.created?.id} (setup) in the ${report.created?.lane} lane\npicket next ${report.created?.id}`);
});

test("a file added after the scan makes --create refuse and create nothing (T-4.5)", (t) => {
  const ctx = setupContext(t);
  initEnvironment(ctx, linuxDocker);
  mkdirSync(join(ctx.root, "services", "stock"));
  writeFileSync(join(ctx.root, "services", "stock", "package.json"), "{}");
  assert.equal(refusedWith(ctx), "the umbrella changed since the scan; run picket env init again");
  assert.deepEqual(workItems(ctx.root), []);
});

test("an unknown decision id refuses and creates nothing", (t) => {
  const ctx = setupContext(t);
  initEnvironment(ctx, linuxDocker);
  assert.match(refusedWith(ctx, "S9=use"), /^unknown id S9/);
  assert.deepEqual(workItems(ctx.root), []);
});

test("with the environment present, --create writes an update for services/stock only, and refuses when in step (T-4.6)", (t) => {
  const inStep = copyContext(t);
  initEnvironment(inStep, linuxDocker);
  assert.equal(refusedWith(inStep), "the environment is in step; nothing to do");
  const ctx = copyContext(t);
  mkdirSync(join(ctx.root, "services", "stock"));
  writeFileSync(join(ctx.root, "services", "stock", "package.json"), "{}");
  initEnvironment(ctx, linuxDocker);
  const { report } = created(ctx);
  assert.equal(report.created?.mode, "update");
  assert.equal(report.created?.title, "Bring the test environment in step");
  const request = readFileSync(join(ctx.root, "work", String(report.created?.id), "request.md"), "utf8");
  assert.ok(request.includes("`services/stock`"));
  for (const other of ["services/billing", "services/legacy", "services/orders"]) assert.ok(!request.includes(other), other);
});

test("with no engine env init exits 2, names what to install and writes no scan (T-3.6)", (t) => {
  const ctx = copyContext(t);
  const outcome = initEnvironment(ctx, noEngine);
  assert.equal(describeExit(outcome).code, 2);
  const report = describeExit(outcome).json as InitReport;
  assert.deepEqual([report.scan, report.scan_file, report.created], [null, null, null]);
  assert.equal(renderInit(report), "missing: no container engine: install Docker or Podman");
  assert.equal(existsSync(join(ctx.root, SCAN_FILE)), false);
});

test("env init saves the masked scan and lists every decision with the --create line (T-3.5)", (t) => {
  const ctx = copyContext(t);
  const outcome = initEnvironment(ctx, linuxDocker);
  assert.equal(describeExit(outcome).code, 0);
  const report = describeExit(outcome).json as InitReport;
  assert.equal(report.scan_file, SCAN_FILE);
  const saved = readFileSync(join(ctx.root, SCAN_FILE), "utf8");
  assert.deepEqual(JSON.parse(saved), report.scan);
  const lines = renderInit(report).split("\n");
  for (const text of [saved, ...lines]) for (const secret of SECRETS) assert.ok(!text.includes(secret), secret);
  assert.equal(lines[0], "S1 services/billing · dotnet · default write · choices write, user, shared, ignore");
  assert.equal(lines[1], "S2 services/legacy · dotnet-framework, not Linux · default shared · choices user, shared, ignore");
  assert.equal(
    lines[3],
    "C1 services/billing/appsettings.json · ConnectionStrings:Billing = Server=localhost,1433;Database=Billing;User Id=sa;Password=***;TrustServerCertificate=True · target local · variable ConnectionStrings__Billing · default env · choices env, file, keep",
  );
  assert.equal(lines.at(-2), "H1 payments.example.com · outside host · default mock · choices mock, dependency, shared");
  assert.equal(lines.at(-1), 'Show this list to the user; pass changes to the defaults with picket env init --create --decide "<id>=<choice>,..."');
  assert.equal(lines.length, 3 + 5 + 1 + 1);
});

test("an unread file renders as not read with no target and no variable", () => {
  const scan: Scan = {
    fingerprint: "f",
    services: [],
    entries: [{ id: "C1", service: null, file: "conf/settings.yaml", key: null, value: null, target: null, choices: ["env", "file", "keep"], default: "env", variable: null }],
  };
  const machine = { ok: true, engine: null, os_type: "linux", compose: "2.29.1", memory_bytes: null, free_disk_bytes: null, missing: [] };
  assert.equal(renderInit({ ok: true, machine, scan_file: SCAN_FILE, scan, hosts: [], created: null }).split("\n")[0], "C1 conf/settings.yaml · not read · target none · default env · choices env, file, keep");
});
