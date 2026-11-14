import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const FAKE_ENGINE = resolve("test/fixtures/env/fake-engine.mjs");
const UMBRELLA = resolve("test/fixtures/env/umbrella");
const SCAN_FILE = ".picket/state/env/scan.json";
const SECRETS = ["fixture-secret-1", "fixture-secret-2", "fixture-secret-3"];

function envCheck(root, engine) {
  return runCli(root, ["env", "check", "--root", root], { env: { ...process.env, CLAUDE_PROJECT_DIR: root, PICKET_ENGINE: engine } });
}

test("env check on the fixture umbrella names Linux containers and passes the rules (T-1.6, T-2.5)", () => {
  const r = envCheck(UMBRELLA, FAKE_ENGINE);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^engine: .*fake-engine\.mjs \(Linux containers, Compose 2\.99\.0-fixture\)$/m);
  assert.match(r.stdout, /^memory: 8\.0 GiB · free disk: \d+\.\d GiB$/m);
  assert.match(r.stdout, /^rules passed$/m);
});

test("env check in a project without an environment exits 2 naming compose.yaml", (t) => {
  const root = withProject(t);
  const r = envCheck(root, FAKE_ENGINE);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /^no environment: \.picket\/env\/compose\.yaml is missing$/m);
});

function umbrellaCopy(t) {
  const root = mkdtempSync(join(tmpdir(), "picket-env-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(UMBRELLA, root, { recursive: true });
  return root;
}

function envInit(root, engine) {
  return runCli(root, ["env", "init", "--root", root], { env: { ...process.env, CLAUDE_PROJECT_DIR: root, PICKET_ENGINE: engine } });
}

test("env init on a copy of the umbrella prints and saves no secret and masks the password (T-3.5)", (t) => {
  const root = umbrellaCopy(t);
  const r = envInit(root, FAKE_ENGINE);
  assert.equal(r.status, 0, r.stderr);
  const saved = readFileSync(join(root, SCAN_FILE), "utf8");
  for (const text of [r.stdout, saved]) {
    for (const secret of SECRETS) assert.ok(!text.includes(secret), secret);
    assert.ok(text.includes("Password=***"));
  }
  assert.match(r.stdout, /^S1 services\/billing /m);
  assert.match(r.stdout, /picket env init --create/);
});

test("env init with no engine exits 2 and leaves no scan behind (T-3.6)", (t) => {
  const root = umbrellaCopy(t);
  const r = envInit(root, "picket-no-such-engine");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /no container engine/);
  assert.equal(existsSync(join(root, SCAN_FILE)), false);
});

test("env check with an engine that does not exist exits 2 and names what to install (T-1.6)", (t) => {
  const root = withProject(t);
  const r = envCheck(root, "picket-no-such-engine");
  assert.equal(r.status, 2, r.stderr);
  assert.equal(r.stdout.trim(), "missing: no container engine: install Docker or Podman");
});
