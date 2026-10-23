import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HOOKS } from "../../dist/lib/hooks.mjs";
import { DIST, hookFolder, hookSources, hooksJson } from "../../scripts/build.mjs";

const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/";
const ORACLE = resolve("src/hooks/hooks.json");
const BUILT = join(DIST, "hooks", "hooks.json");
const MOVED = ["inject.state", "inject.rules", "inject.extensions", "lint.schema", "monitor.context", "notify.user", "guard.block", "route.verdict", "emit.ledger", "observe.drive", "guard.scope", "guard.comments", "guard.silenced", "guard.bash"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function registeredFiles(hooks) {
  const args = Object.values(hooks).flatMap((groups) => groups.flatMap((group) => group.hooks.flatMap((hook) => hook.args)));
  return [...new Set(args.map((arg) => arg.slice(PLUGIN_HOOK_PREFIX.length)))];
}

test("hooksJson(HOOKS) and the built hooks.json both equal the hand-written registration, events in its order (T-1.1)", () => {
  const oracle = readJson(ORACLE);
  for (const generated of [hooksJson(HOOKS), readJson(BUILT)]) {
    assert.deepEqual(generated, oracle);
    assert.deepEqual(Object.keys(generated.hooks), Object.keys(oracle.hooks));
  }
});

test("hooksJson groups hooks by event and matcher in order of first appearance", () => {
  const hooks = {
    "a.one": { summary: "x", on: [{ event: "PreToolUse", matcher: "Bash" }, { event: "Stop" }] },
    "b.two": { summary: "x", on: [{ event: "PreToolUse", matcher: "Write" }] },
    "c.three": { summary: "x", on: [{ event: "PreToolUse", matcher: "Bash" }] },
  };
  const entry = (name) => ({ type: "command", command: "node", args: [`${PLUGIN_HOOK_PREFIX}${name}.mjs`] });
  assert.deepEqual(hooksJson(hooks), {
    hooks: {
      PreToolUse: [
        { matcher: "Bash", hooks: [entry("a.one"), entry("c.three")] },
        { matcher: "Write", hooks: [entry("b.two")] },
      ],
      Stop: [{ hooks: [entry("a.one")] }],
    },
  });
});

test("every file the built hooks.json registers exists in dist/hooks/ (T-1.2)", () => {
  const missing = registeredFiles(readJson(BUILT).hooks).filter((file) => !existsSync(join(DIST, "hooks", file)));
  assert.deepEqual(missing, []);
});

test("every hook has exactly one source: each moved hook a folder, the others a shell (T-1.2)", () => {
  const { folders, problems } = hookSources(HOOKS);
  assert.deepEqual(problems, []);
  assert.deepEqual(folders.sort(), [...MOVED].sort());
  for (const name of MOVED) {
    assert.equal(existsSync(resolve("src/hooks", `${name}.mjs`)), false, name);
    assert.equal(existsSync(resolve("src/lib/hooks", `${name}.mjs`)), false, name);
  }
});

test("hookSources names a hook that has neither a folder nor a shell", () => {
  const { problems } = hookSources({ "inject.rules": HOOKS["inject.rules"], "guard.nothing": { summary: "x", on: [] } });
  assert.deepEqual(problems, ["guard.nothing has neither src/lib/hooks/guard/nothing/index.mts nor src/hooks/guard.nothing.mjs"]);
  assert.match(hookFolder("inject.rules").replaceAll("\\", "/"), /src\/lib\/hooks\/inject\/rules\/index\.mts$/);
});

test("every summary is one non-empty line", () => {
  const bad = Object.entries(HOOKS).filter(([, { summary }]) => typeof summary !== "string" || !summary.trim() || /\n/.test(summary)).map(([name]) => name);
  assert.deepEqual(bad, []);
});

test("Stop and SubagentStop run the same hooks in the same order", () => {
  const { hooks } = hooksJson(HOOKS);
  assert.deepEqual(hooks.SubagentStop, hooks.Stop);
});
