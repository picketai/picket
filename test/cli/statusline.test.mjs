import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const ESCAPE = /\x1b\[[0-9;]*m/g;

function spawnStatusline(input, root) {
  return runCli(process.cwd(), ["statusline"], { input: JSON.stringify(input), env: { ...process.env, COLUMNS: "150", CLAUDE_PROJECT_DIR: root } });
}

function fixture() {
  return JSON.parse(readFileSync(resolve("src/lib/verbs/statusline/statusline-input.test.json"), "utf8"));
}

test("picket statusline prints a line without cost and writes no session folder (T-1.1)", (t) => {
  const root = withProject(t);
  const input = fixture();
  assert.equal(input.cost.total_cost_usd, 4.12);
  const printed = spawnStatusline(input, root);
  assert.equal(printed.status, 0);
  assert.equal(printed.stderr, "");
  const line = printed.stdout.replace(ESCAPE, "");
  assert.match(line, /PICKETAI/);
  assert.ok(!line.includes("$"), line);
  assert.equal(existsSync(join(root, ".picket", "state", "sessions")), false);
});
