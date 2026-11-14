import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describeExit } from "../../shared/action.mts";
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

const linuxDocker: EngineRunner = (program, args) => {
  const call = `${program} ${args.join(" ")}`;
  if (call === "docker info --format json") return { status: 0, stdout: '{"OSType":"linux","MemTotal":1}', stderr: "" };
  if (call === "docker compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
  return { status: 1, stdout: "", stderr: "" };
};

const noEngine: EngineRunner = () => ({ status: 1, stdout: "", stderr: "" });

test("env init takes no arguments and prints text", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
  assert.equal(verb.output, "text");
});

test("with no engine env init exits 2, names what to install and writes no scan (T-3.6)", (t) => {
  const ctx = copyContext(t);
  const outcome = initEnvironment(ctx, noEngine);
  assert.equal(describeExit(outcome).code, 2);
  const report = describeExit(outcome).json as InitReport;
  assert.deepEqual([report.scan, report.scan_file], [null, null]);
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
  assert.equal(lines.at(-1), 'Show this list to the user; pass changes to the defaults with picket env init --create --decide "<id>=<choice>,..."');
  assert.equal(lines.length, 3 + 5 + 1);
});

test("an unread file renders as not read with no target and no variable", () => {
  const scan: Scan = {
    fingerprint: "f",
    services: [],
    entries: [{ id: "C1", service: null, file: "conf/settings.yaml", key: null, value: null, target: null, choices: ["env", "file", "keep"], default: "env", variable: null }],
  };
  const machine = { ok: true, engine: null, os_type: "linux", compose: "2.29.1", memory_bytes: null, free_disk_bytes: null, missing: [] };
  assert.equal(renderInit({ ok: true, machine, scan_file: SCAN_FILE, scan }).split("\n")[0], "C1 conf/settings.yaml · not read · target none · default env · choices env, file, keep");
});
