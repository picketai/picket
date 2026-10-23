import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHECKS } from "../../dist/lib/verbs/preflight/checks.mjs";
import { loadConfig } from "../../dist/lib/shared/config.mjs";
import { readSnapshot, stateView } from "../../dist/lib/shared/work/snapshot.mjs";
import { createWork, readState, writeState } from "./work-fixture.mjs";

const TOOLING = { tooling: { test: "npm test", lint: null, build: null, run: null, stack: "node" }, warnings: [] };
const DIRTY = ["a", "b", "c", "d", "e", "f", "g"];

function withProject(body) {
  const root = mkdtempSync(join(tmpdir(), "picket-preflight-checks-"));
  const home = mkdtempSync(join(tmpdir(), "picket-preflight-home-"));
  try {
    body(root, home);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
}

function inputFor(root, home, id, overrides = {}) {
  const snapshot = readSnapshot(root, id);
  return { root, snapshot, view: stateView(snapshot), config: loadConfig(root, {}), tooling: TOOLING, git: { repo: true, branch: "trunk", dirty: DIRTY }, home, env: {}, platform: process.platform, ...overrides };
}

const runChecks = (input) => CHECKS.flatMap((check) => check(input) ?? []);
const named = (input, name) => runChecks(input).find((c) => c.name === name);

test("CHECKS over one fixed input give today's list in today's order", () => {
  withProject((root, home) => {
    const { id } = createWork({ lane: "design", title: "Fixed", root });
    const checks = runChecks(inputFor(root, home, id)).map(({ name, level, detail }) => [name, level, detail]);
    assert.deepEqual(checks, [
      ["work_item", "ok", "design · open · Fixed"],
      ["status", "ok", "open"],
      ["artifact", "warn", "design.md not written yet (next action will ask for it)"],
      ["branch", "ok", "trunk"],
      ["tree", "warn", "7 uncommitted path(s) outside work/: a, b, c, d, e, …"],
      ["tooling", "ok", "test: npm test"],
      ["project_map", "warn", "absent; the analyst can write one"],
      ["saved_rules", "ok", "none"],
      ["extensions", "ok", "none"],
    ]);
  });
});

test("the tree check warns at every phase, and a blocked item fails the status check", () => {
  withProject((root, home) => {
    const { id } = createWork({ lane: "design", title: "Fixed", root });
    for (const current_phase of [1, 3]) {
      const input = inputFor(root, home, id);
      assert.equal(named({ ...input, view: { ...input.view, current_phase } }, "tree").level, "warn", `phase ${current_phase}`);
    }
    writeState({ ...readState(id, root), status: "blocked", blocked_reason: "waiting on the API" }, root);
    assert.deepEqual(named(inputFor(root, home, id), "status"), { name: "status", level: "fail", detail: "blocked: waiting on the API" });
  });
});

test("an env_set extension check reads the input's environment, not the process's", () => {
  withProject((root, home) => {
    const { id } = createWork({ lane: "design", title: "Fixed", root });
    const dir = join(root, ".picket", "extensions", "acme");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions: ["acme"] }));
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name: "acme", version: "1.0.0", schema: 1, preflight: [{ id: "token", kind: "env_set", value: "ACME_TOKEN", level: "fail", message: "set ACME_TOKEN" }] }));
    assert.equal(process.env.ACME_TOKEN, undefined);
    assert.equal(named(inputFor(root, home, id, { env: { ACME_TOKEN: "1" } }), "ext:acme:token").level, "ok");
    assert.equal(named(inputFor(root, home, id), "ext:acme:token").level, "fail");
  });
});
