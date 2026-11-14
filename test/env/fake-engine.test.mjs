import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const FAKE_ENGINE = resolve("test/fixtures/env/fake-engine.mjs");
const UMBRELLA = resolve("test/fixtures/env/umbrella");
const ENV_DIR = join(UMBRELLA, ".picket", "env");
const COMPOSE_FILE = join(ENV_DIR, "compose.yaml");
const MODEL_CALL = ["config", "--format", "json"];
const PROFILE = ["--profile", "picket-data"];

function fake(args) {
  return spawnSync(process.execPath, [FAKE_ENGINE, ...args], { encoding: "utf8" });
}

function recordedModelAt(root) {
  return readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8").replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`);
}

const MISPLACED = [
  { flag: "--profile", value: "picket-data", stderr: "unknown flag: --profile\n" },
  { flag: "--project-directory", value: ENV_DIR, stderr: "unknown flag: --project-directory\n" },
  { flag: "-p", value: "picket-trial", stderr: "unknown shorthand flag: 'p' in -p\n" },
  { flag: "-f", value: COMPOSE_FILE, stderr: "unknown shorthand flag: 'f' in -f\n" },
];

for (const { flag, value, stderr } of MISPLACED) {
  test(`the fake refuses ${flag} after the subcommand the way Compose does (T-1.2)`, () => {
    const r = fake(["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...PROFILE, ...MODEL_CALL, flag, value]);
    assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, { status: 1, stdout: "", stderr });
  });
}

test("the fake answers the recorded model when --profile picket-data precedes config (T-1.2)", () => {
  const r = fake(["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...PROFILE, ...MODEL_CALL]);
  assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, { status: 0, stdout: recordedModelAt(UMBRELLA), stderr: "" });
});

test("the fake has no model answer when no profile is enabled", () => {
  const r = fake(["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...MODEL_CALL]);
  assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, { status: 1, stdout: "", stderr: 'fake engine: no answer for "compose config --format json"\n' });
});
