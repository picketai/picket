import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const ESCAPE = /\x1b\[[0-9;]*m/g;

function spawnStatusline(input, root) {
  return runCli(process.cwd(), ["statusline"], { input: JSON.stringify(input), env: { ...process.env, COLUMNS: "150", CLAUDE_PROJECT_DIR: root } });
}

function fixture() {
  return JSON.parse(readFileSync(resolve("src/lib/verbs/statusline/statusline-input.test.json"), "utf8"));
}

function sessionFiles(root) {
  const dir = statePath(root, STATE_FILES.sessions);
  return existsSync(dir) ? readdirSync(dir) : [];
}

test("picket statusline writes the session cost snapshot under the project root and prints as before (T-1.1)", (t) => {
  const root = withProject(t);
  const printed = spawnStatusline(fixture(), root);
  const bare = withProject(t, { picket: false });
  assert.equal(printed.stdout, spawnStatusline(fixture(), bare).stdout);
  assert.equal(printed.status, 0);
  assert.equal(printed.stderr, "");
  const snapshot = JSON.parse(readFileSync(join(root, ".picket", "state", "sessions", "statusline-fixture.json"), "utf8"));
  assert.equal(snapshot.session, "statusline-fixture");
  assert.equal(snapshot.cost_usd, 4.12);
  assert.match(snapshot.ts, /^\d{4}-\d{2}-\d{2}T/);
});

test("picket statusline prints and writes nothing without .picket, with an unsafe session id or without a cost (T-1.2)", (t) => {
  const noCost = fixture();
  delete noCost.cost;
  const cases = [
    [{ picket: false }, fixture()],
    [{ picket: true }, { ...fixture(), session_id: "../x" }],
    [{ picket: true }, noCost],
  ];
  for (const [options, input] of cases) {
    const root = withProject(t, options);
    const printed = spawnStatusline(input, root);
    assert.equal(printed.status, 0);
    assert.match(printed.stdout.replace(ESCAPE, ""), /PICKETAI/);
    assert.deepEqual(sessionFiles(root), [], JSON.stringify(input.session_id));
    assert.equal(existsSync(statePath(root, "x.json")), false);
  }
});
