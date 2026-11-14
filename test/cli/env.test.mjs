import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { gitIn, gitRepo } from "#test/git.mts";
import { openItem, withProject } from "#test/project.mts";

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

function envCreate(root, engine) {
  return runCli(root, ["env", "init", "--create", "--root", root], { env: { ...process.env, CLAUDE_PROJECT_DIR: root, PICKET_ENGINE: engine } });
}

function items(root) {
  return existsSync(join(root, "work")) ? readdirSync(join(root, "work")) : [];
}

test("env init then env init --create on a copy without an environment creates one item with a masked request (T-4.4)", (t) => {
  const root = umbrellaCopy(t);
  rmSync(join(root, ".picket", "env"), { recursive: true });
  assert.equal(envInit(root, FAKE_ENGINE).status, 0);
  const r = envCreate(root, FAKE_ENGINE);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const [id] = items(root);
  assert.equal(items(root).length, 1);
  assert.match(r.stdout, new RegExp(`^picket next ${id}$`, "m"));
  const request = readFileSync(join(root, "work", id, "request.md"), "utf8");
  for (const secret of SECRETS) assert.ok(!request.includes(secret), secret);
  assert.ok(request.includes("Password=***"));
});

test("a file added between env init and --create makes --create exit 2 and creates no item (T-4.5)", (t) => {
  const root = umbrellaCopy(t);
  rmSync(join(root, ".picket", "env"), { recursive: true });
  envInit(root, FAKE_ENGINE);
  writeFileSync(join(root, "services", "orders", "appsettings.json"), '{ "Stock": { "Url": "http://stock:8080" } }');
  const r = envCreate(root, FAKE_ENGINE);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /the umbrella changed since the scan/);
  assert.deepEqual(items(root), []);
});

test("with the fixture environment, --create names only services/stock, and without it exits 2 in step (T-4.6)", (t) => {
  const inStep = umbrellaCopy(t);
  envInit(inStep, FAKE_ENGINE);
  const refused = envCreate(inStep, FAKE_ENGINE);
  assert.equal(refused.status, 2);
  assert.match(refused.stdout, /the environment is in step/);
  const root = umbrellaCopy(t);
  mkdirSync(join(root, "services", "stock"));
  writeFileSync(join(root, "services", "stock", "package.json"), "{}");
  envInit(root, FAKE_ENGINE);
  const r = envCreate(root, FAKE_ENGINE);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const request = readFileSync(join(root, "work", items(root)[0], "request.md"), "utf8");
  assert.ok(request.includes("services/stock"));
  for (const other of ["services/billing", "services/legacy", "services/orders"]) assert.ok(!request.includes(other), other);
});

test("env init with no engine exits 2 and leaves no scan behind (T-3.6)", (t) => {
  const root = umbrellaCopy(t);
  const r = envInit(root, "picket-no-such-engine");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /no container engine/);
  assert.equal(existsSync(join(root, SCAN_FILE)), false);
});

function startProject(t) {
  const root = gitRepo(t, { files: { "README.md": "umbrella\n" } });
  cpSync(UMBRELLA, root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  const { id } = openItem(root, { lane: "order", title: "Orders export", source: "PROJ-481" });
  return { root, id };
}

function envVerb(root, verb, id) {
  return runCli(root, ["env", verb, id, "--root", root], { env: { ...process.env, CLAUDE_PROJECT_DIR: root, PICKET_ENGINE: FAKE_ENGINE } });
}

test("env start on a git copy with an open item prints the orders URL and records the stack; env stop keeps it (T-5.6)", (t) => {
  const { root, id } = startProject(t);
  const r = envVerb(root, "start", id);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PICKET_URL_ORDERS=http:\/\/127\.0\.0\.1:49153$/m);
  assert.match(r.stdout, /^orders · built from \. at [0-9a-f]{7}$/m);
  const stacks = JSON.parse(readFileSync(join(root, ".picket", "state", "env", "stacks.json"), "utf8"));
  assert.deepEqual(Object.keys(stacks), ["picket-proj-481"]);
  const stopped = envVerb(root, "stop", id);
  assert.equal(stopped.status, 0, stopped.stdout + stopped.stderr);
  assert.match(stopped.stdout, /^stopped picket-proj-481/);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(root, ".picket", "state", "env", "stacks.json"), "utf8"))), ["picket-proj-481"]);
});

test("env check with an engine that does not exist exits 2 and names what to install (T-1.6)", (t) => {
  const root = withProject(t);
  const r = envCheck(root, "picket-no-such-engine");
  assert.equal(r.status, 2, r.stderr);
  assert.equal(r.stdout.trim(), "missing: no container engine: install Docker or Podman\nmissing: PICKET_ENGINE names picket-no-such-engine, which is neither docker nor podman, so no engine was tried");
});
