import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Refused } from "../action.mts";
import { findEngine, jsonRecords, machineReport, NO_COMPOSE, NO_ENGINE, notLinux, readModelJson, type EngineRunner } from "./engine.mts";

type Answers = Record<string, string>;
type Recorded = { runner: EngineRunner; calls: string[][] };

function recording(answers: Answers): Recorded {
  const calls: string[][] = [];
  const runner: EngineRunner = (program, args) => {
    calls.push([program, ...args]);
    const stdout = answers[[program, ...args].join(" ")];
    return stdout === undefined ? { status: 1, stdout: "", stderr: "not found" } : { status: 0, stdout, stderr: "" };
  };
  return { runner, calls };
}

function tempRoot(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-engine-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function reportFor(t: TestContext, answers: Answers, env: NodeJS.ProcessEnv = {}) {
  const root = tempRoot(t);
  const { runner } = recording(answers);
  return machineReport(findEngine(env, root, runner), root);
}

const DOCKER_INFO = { "docker info --format json": '{"OSType":"linux","MemTotal":17179869184}' };
const DOCKER_COMPOSE = { "docker compose version --format json": '{"version":"v2.29.1"}' };

test("a Linux docker with Compose v2 passes and reports its version without the v (T-1.1)", (t) => {
  const { free_disk_bytes, ...report } = reportFor(t, { ...DOCKER_INFO, ...DOCKER_COMPOSE });
  assert.deepEqual(report, { ok: true, engine: { program: "docker", kind: "docker" }, os_type: "linux", compose: "2.29.1", memory_bytes: 17179869184, missing: [] });
  assert.equal(typeof free_disk_bytes, "number");
});

test("no engine answering gives only the install line and null engine facts (T-1.2)", (t) => {
  const { free_disk_bytes, ...report } = reportFor(t, {});
  assert.deepEqual(report, { ok: false, engine: null, os_type: null, compose: null, memory_bytes: null, missing: [NO_ENGINE] });
  assert.equal(NO_ENGINE, "no container engine: install Docker or Podman");
  assert.equal(typeof free_disk_bytes, "number");
});

test("an engine in Windows containers mode fails with the Linux containers line (T-1.2)", (t) => {
  const report = reportFor(t, { "docker info --format json": '{"OSType":"windows","MemTotal":1}', ...DOCKER_COMPOSE });
  assert.equal(report.ok, false);
  assert.equal(report.os_type, "windows");
  assert.deepEqual(report.missing, ["the engine runs windows containers: switch it to Linux containers"]);
  assert.equal(notLinux("windows"), report.missing[0]);
});

test("Compose 1.x or a failing compose version fails with the Compose line (T-1.2)", (t) => {
  const old = reportFor(t, { ...DOCKER_INFO, "docker compose version --format json": '{"version":"1.29.2"}' });
  assert.equal(old.ok, false);
  assert.equal(old.compose, "1.29.2");
  assert.deepEqual(old.missing, [NO_COMPOSE]);
  const absent = reportFor(t, DOCKER_INFO);
  assert.equal(absent.ok, false);
  assert.equal(absent.compose, null);
  assert.deepEqual(absent.missing, [NO_COMPOSE]);
});

test("podman is tried when docker fails and its info is read from the host block (T-1.3)", (t) => {
  const report = reportFor(t, { "podman info --format json": '{"host":{"os":"linux","memTotal":8589934592}}', "podman compose version --format json": '{"version":"2.20.0"}' });
  assert.deepEqual(report.engine, { program: "podman", kind: "podman" });
  assert.equal(report.os_type, "linux");
  assert.equal(report.memory_bytes, 8589934592);
  assert.equal(report.ok, true);
});

test("PICKET_ENGINE is the only candidate, so podman wins while docker answers (T-1.4)", (t) => {
  const root = tempRoot(t);
  const { runner, calls } = recording({ "docker info --format json": "{}", "podman info --format json": "{}" });
  const engine = findEngine({ PICKET_ENGINE: "podman" }, root, runner);
  assert.equal(engine?.program, "podman");
  assert.equal(engine?.kind, "podman");
  assert.deepEqual(calls, [["podman", "info", "--format", "json"]]);
  assert.equal(findEngine({ PICKET_ENGINE: "picket-no-such-engine" }, root, runner), null);
});

test("a PICKET_ENGINE ending in .mjs runs under node with the path resolved against cwd (T-1.4)", (t) => {
  const root = tempRoot(t);
  const script = resolve(root, "test/fixtures/env/fake-engine.mjs");
  const { runner, calls } = recording({ [`${process.execPath} ${script} info --format json`]: "{}" });
  const engine = findEngine({ PICKET_ENGINE: "test/fixtures/env/fake-engine.mjs" }, root, runner);
  assert.deepEqual(calls, [[process.execPath, script, "info", "--format", "json"]]);
  assert.equal(engine?.name, "test/fixtures/env/fake-engine.mjs");
  assert.equal(engine?.kind, "other");
});

test("an engine of kind other is read with the Docker shape, then the Podman shape", (t) => {
  const answers = { "nerd info --format json": '{"host":{"os":"linux","memTotal":4}}', "nerd compose version --format json": '{"version":"v2.1.0"}' };
  const report = reportFor(t, answers, { PICKET_ENGINE: "nerd" });
  assert.deepEqual(report.engine, { program: "nerd", kind: "other" });
  assert.equal(report.os_type, "linux");
  assert.equal(report.memory_bytes, 4);
});

test("readModelJson lists the profiles, then reads the model with each profile enabled, under the given root (T-2.3)", () => {
  const root = resolve("umbrella");
  const dir = join(root, ".picket", "env");
  const files = ["--project-directory", dir, "-f", join(dir, "compose.yaml")];
  const { runner, calls } = recording({
    [["docker", "info", "--format", "json"].join(" ")]: "{}",
    [["docker", "compose", ...files, "config", "--profiles"].join(" ")]: "picket-data\n",
    [["docker", "compose", ...files, "config", "--format", "json", "--profile", "picket-data"].join(" ")]: '{"name":"env"}',
  });
  const engine = findEngine({}, root, runner);
  assert.ok(engine);
  calls.length = 0;
  assert.deepEqual(readModelJson(engine, root), { name: "env" });
  assert.deepEqual(calls, [
    ["docker", "compose", ...files, "config", "--profiles"],
    ["docker", "compose", ...files, "config", "--format", "json", "--profile", "picket-data"],
  ]);
});

test("readModelJson refuses with the engine's last error line when compose config fails", () => {
  const { runner } = recording({ "docker info --format json": "{}" });
  const engine = findEngine({}, "/", runner);
  assert.ok(engine);
  assert.throws(() => readModelJson(engine, resolve("umbrella")), (err: Error) => err instanceof Refused && err.message === "compose config --profiles failed: not found");
});

test("jsonRecords reads a JSON array and JSON lines as the same records (T-1.5)", () => {
  const expected = [{ a: 1 }, { a: 2 }];
  assert.deepEqual(jsonRecords('[{"a":1},{"a":2}]'), expected);
  assert.deepEqual(jsonRecords('{"a":1}\n{"a":2}\n'), expected);
  assert.deepEqual(jsonRecords('{\n  "a": 1\n}'), [{ a: 1 }]);
  assert.deepEqual(jsonRecords("  \n"), []);
});
