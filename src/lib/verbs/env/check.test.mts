import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXIT, describeExit } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner, MachineReport } from "../../shared/env/engine.mts";
import { parseArgs } from "../../util/args.mts";
import { checkMachine, renderMachine, verb } from "./check.mts";

function context(t: TestContext): Context {
  const root = mkdtempSync(join(tmpdir(), "picket-env-check-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, cwd: root, now: () => new Date(0), env: {}, home: root, session: null, platform: process.platform };
}

function answering(answers: Record<string, string>): EngineRunner {
  return (program, args) => {
    const stdout = answers[[program, ...args].join(" ")];
    return stdout === undefined ? { status: 1, stdout: "", stderr: "" } : { status: 0, stdout, stderr: "" };
  };
}

const LINUX_DOCKER = { "docker info --format json": '{"OSType":"linux","MemTotal":17179869184}', "docker compose version --format json": '{"version":"v2.29.1"}' };

test("env check takes no arguments and prints text", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
  assert.equal(verb.output, "text");
  assert.equal(verb.usage, "env check");
});

test("a passing machine exits 0 and a missing engine exits 2 with the report as its value", (t) => {
  const passing = checkMachine(context(t), answering(LINUX_DOCKER));
  assert.equal(describeExit(passing).code, EXIT.done);
  const missing = checkMachine(context(t), answering({}));
  assert.equal(missing.status, "failed");
  assert.equal(describeExit(missing).code, 2);
  assert.deepEqual((describeExit(missing).json as MachineReport).missing, ["no container engine: install Docker or Podman"]);
});

test("a passing report renders the engine line and sizes in GiB with one decimal", () => {
  const report: MachineReport = { ok: true, engine: { program: "docker", kind: "docker" }, os_type: "linux", compose: "2.29.1", memory_bytes: 17179869184, free_disk_bytes: 5 * 1024 ** 3 + 1024 ** 3 / 4, missing: [] };
  assert.equal(renderMachine(report), "engine: docker (Linux containers, Compose 2.29.1)\nmemory: 16.0 GiB · free disk: 5.3 GiB");
  assert.equal(renderMachine({ ...report, memory_bytes: null, free_disk_bytes: null }).split("\n")[1], "memory: unknown · free disk: unknown");
});

test("a failing report renders one missing line per gap and no engine line", () => {
  const report: MachineReport = { ok: false, engine: { program: "docker", kind: "docker" }, os_type: "windows", compose: null, memory_bytes: 1, free_disk_bytes: 1, missing: ["first gap", "second gap"] };
  assert.equal(renderMachine(report), "missing: first gap\nmissing: second gap");
});
