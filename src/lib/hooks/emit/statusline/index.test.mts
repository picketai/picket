import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { withProject, writeConfig } from "#test/project.mts";
import { STATUSLINE_FILE } from "../../../shared/install.mts";
import { emitStatusline } from "./index.mts";

const BUNDLE = "console.log('line');\n";
const START = { hook_event_name: "SessionStart" } as const;
const PAST = new Date("2026-01-01T00:00:00Z");

type Setup = { root: string; source: string; data: string; target: string; projectCopy: string };

function setup(t: TestContext): Setup {
  const plugin = withProject(t, { picket: false });
  const root = withProject(t, { picket: false });
  const data = join(withProject(t, { picket: false }), "plugins", "data", "picket-picketai");
  const source = join(plugin, STATUSLINE_FILE);
  writeFileSync(source, BUNDLE);
  return { root, source, data, target: join(data, STATUSLINE_FILE), projectCopy: join(root, ".picket", "state", STATUSLINE_FILE) };
}

function run({ root, source }: Setup, data: string | undefined): null {
  const env = data === undefined ? {} : { CLAUDE_PLUGIN_DATA: data };
  return emitStatusline(START, { ...hookContext(root, { env }), name: "emit.statusline" }, () => source);
}

function age(path: string): number {
  utimesSync(path, PAST, PAST);
  return statSync(path).mtimeMs;
}

test("the hook creates statusline.mjs in the plugin data folder when it is missing (T-3.3)", (t) => {
  const world = setup(t);
  assert.equal(run(world, world.data), null);
  assert.equal(readFileSync(world.target, "utf8"), BUNDLE);
  assert.deepEqual(readdirSync(world.data), [STATUSLINE_FILE]);
});

test("an identical copy is left alone, its mtime unchanged (T-3.3)", (t) => {
  const world = setup(t);
  run(world, world.data);
  const before = age(world.target);
  run(world, world.data);
  assert.equal(statSync(world.target).mtimeMs, before);
});

test("a copy with different bytes is replaced with the plugin's (T-3.3)", (t) => {
  const world = setup(t);
  run(world, world.data);
  writeFileSync(world.target, "stale\n");
  run(world, world.data);
  assert.equal(readFileSync(world.target, "utf8"), BUNDLE);
  assert.deepEqual(readdirSync(world.data), [STATUSLINE_FILE]);
});

test("without CLAUDE_PLUGIN_DATA the hook returns null and writes nothing (T-3.3)", (t) => {
  const world = setup(t);
  assert.equal(run(world, undefined), null);
  assert.equal(existsSync(world.data), false);
});

test("a missing source writes nothing and does not throw", (t) => {
  const world = setup(t);
  writeConfig(world.root, { version: 1 });
  assert.equal(run({ ...world, source: `${world.source}.missing` }, world.data), null);
  assert.equal(existsSync(world.data), false);
  assert.equal(existsSync(world.projectCopy), false);
});

test("with .picket/config.json the hook writes the project copy and the data folder copy, and a rerun leaves both mtimes alone (T-2.1)", (t) => {
  const world = setup(t);
  writeConfig(world.root, { version: 1 });
  run(world, world.data);
  assert.equal(readFileSync(world.projectCopy, "utf8"), BUNDLE);
  assert.equal(readFileSync(world.target, "utf8"), BUNDLE);
  assert.deepEqual(readdirSync(join(world.root, ".picket", "state")), [STATUSLINE_FILE]);

  const projectBefore = age(world.projectCopy);
  const dataBefore = age(world.target);
  run(world, world.data);
  assert.equal(statSync(world.projectCopy).mtimeMs, projectBefore);
  assert.equal(statSync(world.target).mtimeMs, dataBefore);
});

test("without .picket/config.json the hook creates no .picket folder and still writes the data folder copy (T-2.1)", (t) => {
  const world = setup(t);
  run(world, world.data);
  assert.equal(existsSync(join(world.root, ".picket")), false);
  assert.equal(readFileSync(world.target, "utf8"), BUNDLE);
});

test("a project copy that cannot be written still leaves the data folder copy written (T-2.1)", (t) => {
  const world = setup(t);
  writeConfig(world.root, { version: 1 });
  writeFileSync(join(world.root, ".picket", "state"), "a file where the folder goes");
  run(world, world.data);
  assert.equal(readFileSync(world.target, "utf8"), BUNDLE);
});
