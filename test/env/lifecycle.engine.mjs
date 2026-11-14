import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findEngine, realRunner } from "../../dist/lib/shared/env/engine.mjs";

const PICKET = resolve("dist/bin/picket.mjs");
const UMBRELLA = resolve("test/fixtures/env/umbrella");
const ITEM_LABEL = "io.github.picketai.item";
const REVISION_LABEL = "org.opencontainers.image.revision";
const RUN_MINUTES = 20;

function git(root, ...args) {
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { stdio: "ignore" });
}

function umbrellaRepo(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "picket-lifecycle-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(UMBRELLA, root, { recursive: true });
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "umbrella");
  return root;
}

function picket(root, ...args) {
  const r = spawnSync(process.execPath, [PICKET, ...args, "--root", root], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

function expectOk(root, ...args) {
  const r = picket(root, ...args);
  assert.equal(r.status, 0, `picket ${args.join(" ")}\n${r.out}`);
  return r.out;
}

function lines(engine, args) {
  const r = engine.run(args);
  assert.equal(r.status, 0, `${args.join(" ")}: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).filter((line) => line.trim() !== "");
}

function removeOwnStack(engine, root, stack, id) {
  engine.run(["compose", "-p", stack, "--project-directory", join(root, ".picket", "env"), "down", "--volumes", "--remove-orphans"]);
  const images = engine.run(["image", "ls", "-q", "--filter", `label=${ITEM_LABEL}=${id}`]).stdout.split(/\r?\n/).filter(Boolean);
  if (images.length) engine.run(["image", "rm", "--force", ...images]);
}

test("the fixture umbrella passes check, trial, start, stop and purge on a real engine (T-10.1 to T-10.3)", { timeout: RUN_MINUTES * 60_000 }, async (t) => {
  const engine = findEngine(process.env, process.cwd(), realRunner);
  assert.ok(engine, "the env step runs this file only when an engine answers");
  const root = umbrellaRepo(t);
  const key = `ENVTEST-${process.pid}`;
  const stack = `picket-${key.toLowerCase()}`;
  const opened = JSON.parse(expectOk(root, "open", "--lane", "order", "--title", "Lifecycle run", "--source", key));
  const id = opened.id;
  t.after(() => removeOwnStack(engine, root, stack, id));

  assert.match(expectOk(root, "env", "check"), /^rules passed$/m);
  assert.match(expectOk(root, "env", "trial"), /^trial passed twice/m);

  const started = expectOk(root, "env", "start", id);
  const version = started.match(/^orders · built from \S+ at (\S+)$/m)?.[1];
  const url = started.match(/^PICKET_URL_ORDERS=(\S+)$/m)?.[1];
  assert.ok(version && url, started);
  const health = await fetch(`${url}/health`);
  assert.equal(health.status, 200);
  const [labelLine] = lines(engine, ["image", "inspect", "--format", "{{json .Config.Labels}}", `picket/orders-${key.toLowerCase()}:${version}`]);
  assert.equal(JSON.parse(labelLine)[REVISION_LABEL], version);

  expectOk(root, "env", "stop", id);
  const running = lines(engine, ["ps", "-q", "--filter", `label=${ITEM_LABEL}=${id}`, "--filter", "status=running"]);
  assert.deepEqual(running, []);

  expectOk(root, "set", id, "status=done");
  assert.match(expectOk(root, "env", "purge", stack), /^removed$/m);
  assert.deepEqual(lines(engine, ["ps", "-a", "-q", "--filter", `label=${ITEM_LABEL}=${id}`]), []);
  assert.deepEqual(lines(engine, ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${stack}`]), []);
  assert.deepEqual(lines(engine, ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${stack}`]), []);
  assert.deepEqual(lines(engine, ["image", "ls", "-q", "--filter", `label=${ITEM_LABEL}=${id}`]), []);
});
