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

function stderrLines(stderr) {
  return stderr
    .replaceAll(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .filter((line) => line !== "");
}

function assertComposeRefusal(r, args, cause) {
  assert.deepEqual({ status: r.status, stdout: r.stdout }, { status: 1, stdout: "" });
  const lines = stderrLines(r.stderr);
  assert.match(lines[0], /^>>>> Executing external compose provider /);
  assert.deepEqual(lines.slice(1), [cause, `Error: executing /usr/libexec/docker/cli-plugins/docker-compose ${args.slice(1).join(" ")}: exit status 1`]);
}

function recordedModelAt(root) {
  return readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8").replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`);
}

const MISPLACED = [
  { flag: "--profile", value: "picket-data", cause: "unknown flag: --profile" },
  { flag: "--project-directory", value: ENV_DIR, cause: "unknown flag: --project-directory" },
  { flag: "-p", value: "picket-trial", cause: "unknown shorthand flag: 'p' in -p" },
  { flag: "-f", value: COMPOSE_FILE, cause: "unknown shorthand flag: 'f' in -f" },
];

for (const { flag, value, cause } of MISPLACED) {
  test(`the fake refuses ${flag} after the subcommand with Compose's text inside Podman's wrapper (T-1.2, T-2.5)`, () => {
    const args = ["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...PROFILE, ...MODEL_CALL, flag, value];
    assertComposeRefusal(fake(args), args, cause);
  });
}

test("the fake answers the recorded model when --profile picket-data precedes config (T-1.2)", () => {
  const r = fake(["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...PROFILE, ...MODEL_CALL]);
  assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, { status: 0, stdout: recordedModelAt(UMBRELLA), stderr: "" });
});

test("the fake has no model answer when no profile is enabled", () => {
  const args = ["compose", "--project-directory", ENV_DIR, "-f", COMPOSE_FILE, ...MODEL_CALL];
  assertComposeRefusal(fake(args), args, 'fake engine: no answer for "compose config --format json"');
});

test("a failed call outside compose keeps one stderr line", () => {
  const r = fake(["volume", "rm", "x"]);
  assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, { status: 1, stdout: "", stderr: 'fake engine: no answer for "volume rm x"\n' });
});
