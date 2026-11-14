import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const FAKE_ENGINE = resolve("test/fixtures/env/fake-engine.mjs");

function envCheck(root, engine) {
  return runCli(root, ["env", "check", "--root", root], { env: { ...process.env, CLAUDE_PROJECT_DIR: root, PICKET_ENGINE: engine } });
}

test("env check with the fake engine passes and names Linux containers and the Compose version (T-1.6)", (t) => {
  const root = withProject(t);
  const r = envCheck(root, FAKE_ENGINE);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^engine: .*fake-engine\.mjs \(Linux containers, Compose 2\.99\.0-fixture\)$/m);
  assert.match(r.stdout, /^memory: 8\.0 GiB · free disk: \d+\.\d GiB$/m);
});

test("env check with an engine that does not exist exits 2 and names what to install (T-1.6)", (t) => {
  const root = withProject(t);
  const r = envCheck(root, "picket-no-such-engine");
  assert.equal(r.status, 2, r.stderr);
  assert.equal(r.stdout.trim(), "missing: no container engine: install Docker or Podman");
});
