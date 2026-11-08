import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { emitStatusline, STATUSLINE_FILE } from "./index.mts";

const BUNDLE = "console.log('line');\n";
const START = { hook_event_name: "SessionStart" } as const;

function setup(t: TestContext): { source: string; data: string; target: string } {
  const plugin = withProject(t, { picket: false });
  const data = join(withProject(t, { picket: false }), "plugins", "data", "picket-picketai");
  const source = join(plugin, STATUSLINE_FILE);
  writeFileSync(source, BUNDLE);
  return { source, data, target: join(data, STATUSLINE_FILE) };
}

function run(source: string, data: string | undefined): null {
  const env = data === undefined ? {} : { CLAUDE_PLUGIN_DATA: data };
  return emitStatusline(START, { ...hookContext(process.cwd(), { env }), name: "emit.statusline" }, () => source);
}

test("the hook creates statusline.mjs in the plugin data folder when it is missing (T-3.3)", (t) => {
  const { source, data, target } = setup(t);
  assert.equal(run(source, data), null);
  assert.equal(readFileSync(target, "utf8"), BUNDLE);
  assert.deepEqual(readdirSync(data), [STATUSLINE_FILE]);
});

test("an identical copy is left alone, its mtime unchanged (T-3.3)", (t) => {
  const { source, data, target } = setup(t);
  run(source, data);
  const past = new Date("2026-01-01T00:00:00Z");
  utimesSync(target, past, past);
  const before = statSync(target).mtimeMs;
  run(source, data);
  assert.equal(statSync(target).mtimeMs, before);
});

test("a copy with different bytes is replaced with the plugin's (T-3.3)", (t) => {
  const { source, data, target } = setup(t);
  run(source, data);
  writeFileSync(target, "stale\n");
  run(source, data);
  assert.equal(readFileSync(target, "utf8"), BUNDLE);
  assert.deepEqual(readdirSync(data), [STATUSLINE_FILE]);
});

test("without CLAUDE_PLUGIN_DATA the hook returns null and writes nothing (T-3.3)", (t) => {
  const { source, data } = setup(t);
  assert.equal(run(source, undefined), null);
  assert.equal(existsSync(data), false);
});

test("a missing source writes nothing and does not throw", (t) => {
  const { source, data } = setup(t);
  assert.equal(run(`${source}.missing`, data), null);
  assert.equal(existsSync(data), false);
});
