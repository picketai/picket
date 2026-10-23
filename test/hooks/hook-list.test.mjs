import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HOOKS } from "../../dist/lib/hooks.mjs";
import { DIST, hookFolder, hooksJson, missingHooks } from "../../scripts/build.mjs";

const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/";
const BUILT = join(DIST, "hooks", "hooks.json");
const HOOK_FOLDERS = resolve("src/lib/hooks");

const EXPECTED_GROUPS = [
  ["SessionStart", undefined, ["inject.state", "inject.rules", "inject.extensions"]],
  ["SubagentStart", undefined, ["inject.rules", "inject.extensions"]],
  ["PreToolUse", "Write|Edit", ["guard.scope", "guard.comments", "guard.silenced"]],
  ["PreToolUse", "Bash|PowerShell", ["guard.bash"]],
  ["PostToolUse", "Write|Edit", ["lint.schema"]],
  ["PostToolUse", "Bash|PowerShell", ["observe.drive"]],
  ["PostToolUse", "Read|Grep|Glob|WebFetch|WebSearch", ["monitor.context"]],
  ["PostToolUseFailure", "Bash|PowerShell", ["observe.drive"]],
  ["Stop", undefined, ["guard.block", "route.verdict", "emit.ledger"]],
  ["SubagentStop", undefined, ["guard.block", "route.verdict", "emit.ledger"]],
  ["Notification", "permission_prompt|idle_prompt", ["notify.user"]],
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function groupsOf(registration) {
  return Object.entries(registration.hooks).flatMap(([event, groups]) =>
    groups.map((group) => [event, group.matcher, group.hooks.map((hook) => hook.args[0].slice(PLUGIN_HOOK_PREFIX.length).replace(/\.mjs$/, ""))]),
  );
}

function registeredFiles(hooks) {
  const args = Object.values(hooks).flatMap((groups) => groups.flatMap((group) => group.hooks.flatMap((hook) => hook.args)));
  return [...new Set(args.map((arg) => arg.slice(PLUGIN_HOOK_PREFIX.length)))];
}

function folderNames() {
  return readdirSync(HOOK_FOLDERS, { withFileTypes: true })
    .filter((kind) => kind.isDirectory())
    .flatMap((kind) => readdirSync(join(HOOK_FOLDERS, kind.name)).filter((name) => existsSync(join(HOOK_FOLDERS, kind.name, name, "index.mts"))).map((name) => `${kind.name}.${name}`));
}

test("hooksJson(HOOKS) and the built hooks.json register exactly the expected event, matcher and hook groups, in order (T-5.2)", () => {
  for (const registration of [hooksJson(HOOKS), readJson(BUILT)]) {
    assert.deepEqual(groupsOf(registration), EXPECTED_GROUPS);
    for (const group of Object.values(registration.hooks).flat()) {
      assert.deepEqual(group.hooks.map(({ type, command }) => [type, command]), group.hooks.map(() => ["command", "node"]));
    }
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

test("every file the built hooks.json registers exists in dist/hooks/, and dist/hooks/ holds nothing else (T-5.1)", () => {
  const registered = registeredFiles(readJson(BUILT).hooks);
  assert.deepEqual(registered.filter((file) => !existsSync(join(DIST, "hooks", file))), []);
  assert.deepEqual(readdirSync(join(DIST, "hooks")).sort(), ["hooks.json", ...registered].sort());
});

test("every HOOKS name has its folder and every hook folder has a HOOKS entry (T-5.2)", () => {
  assert.deepEqual(missingHooks(HOOKS), []);
  assert.deepEqual(folderNames().sort(), Object.keys(HOOKS).sort());
});

test("missingHooks names a hook without a folder", () => {
  assert.deepEqual(missingHooks({ "guard.nothing": { summary: "x", on: [] } }), ["guard.nothing has no src/lib/hooks/guard/nothing/index.mts"]);
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
