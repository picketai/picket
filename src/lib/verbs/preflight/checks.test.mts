import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS } from "./checks.mts";
import { loadConfig } from "../../shared/config.mjs";
import { readSnapshot, stateView } from "../../shared/work/snapshot.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";

const TOOLING = { tooling: { test: "npm test", lint: null, build: null, run: null, stack: "node" }, warnings: [] };
const DIRTY = ["a", "b", "c", "d", "e", "f", "g"];

type CheckInput = Parameters<(typeof CHECKS)[number]>[0];
type CheckRow = { name: string; level: string; detail: string };

function project(t: TestContext) {
  const root = withProject(t, { picket: false });
  const home = withProject(t, { picket: false });
  const { id } = openItem(root, { lane: "design", title: "Fixed" });
  return { root, home, id };
}

function inputFor(root: string, home: string, id: WorkId, overrides: Partial<CheckInput> = {}): CheckInput {
  const snapshot = readSnapshot(root, id);
  return { root, snapshot, view: stateView(snapshot), config: loadConfig(root, {}), tooling: TOOLING, git: { repo: true, branch: "trunk", dirty: DIRTY }, home, env: {}, platform: process.platform, ...overrides } as CheckInput;
}

const runChecks = (input: CheckInput): CheckRow[] => CHECKS.flatMap((check) => (check(input) as CheckRow | CheckRow[] | null) ?? []);
const named = (input: CheckInput, name: string) => runChecks(input).find((c) => c.name === name);

test("CHECKS over one fixed input give today's list in today's order", (t) => {
  const { root, home, id } = project(t);
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

test("the tree check warns at every phase, and a blocked item fails the status check", (t) => {
  const { root, home, id } = project(t);
  for (const current_phase of [1, 3]) {
    const input = inputFor(root, home, id);
    assert.equal(named({ ...input, view: { ...input.view, current_phase } }, "tree")?.level, "warn", `phase ${current_phase}`);
  }
  writeState(root, { ...readState(root, id), status: "blocked", blocked_reason: "waiting on the API" }, new Date());
  assert.deepEqual(named(inputFor(root, home, id), "status"), { name: "status", level: "fail", detail: "blocked: waiting on the API" });
});

test("an env_set extension check reads the input's environment, not the process's", (t) => {
  const { root, home, id } = project(t);
  const dir = join(root, ".picket", "extensions", "acme");
  mkdirSync(dir, { recursive: true });
  writeConfig(root, { version: 1, extensions: ["acme"] });
  writeFileSync(join(dir, "extension.json"), JSON.stringify({ name: "acme", version: "1.0.0", schema: 1, preflight: [{ id: "token", kind: "env_set", value: "ACME_TOKEN", level: "fail", message: "set ACME_TOKEN" }] }));
  assert.equal(process.env.ACME_TOKEN, undefined);
  assert.equal(named(inputFor(root, home, id, { env: { ACME_TOKEN: "1" } }), "ext:acme:token")?.level, "ok");
  assert.equal(named(inputFor(root, home, id), "ext:acme:token")?.level, "fail");
});
