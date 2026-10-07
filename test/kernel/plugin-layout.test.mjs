import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { codeLines } from "./kernel-sources.mjs";

const CORE = resolve("core");
const SETTINGS = resolve(".claude/settings.json");
const PLUGIN_HOOKS = join(CORE, "hooks", "hooks.json");
const FORWARDER_HOOKS = resolve(".claude/hooks");
const FORWARDER_CLI = resolve(".claude/bin/harness.mjs");
const LAUNCHER = "core/bin/tether";
const EXECUTABLE_MODE = "100755";

const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/";

const SPECIFIER_PATTERNS = [/\bfrom\s+["']([^"']+)["']/g, /\bimport\s+["']([^"']+)["']/g, /\bimport\(\s*["']([^"']+)["']/g];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function modulesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return modulesUnder(full);
    return entry.name.endsWith(".mjs") ? [full] : [];
  });
}

function importSpecifiers(text) {
  const code = codeLines(text).join("\n");
  return SPECIFIER_PATTERNS.flatMap((pattern) => [...code.matchAll(pattern)].map((match) => match[1]));
}

function isBuiltin(specifier) {
  return builtinModules.includes(specifier.replace(/^node:/, ""));
}

function staysInside(root, file, specifier) {
  if (isBuiltin(specifier)) return true;
  if (!specifier.startsWith(".")) return false;
  return resolve(dirname(file), specifier).startsWith(root + sep);
}

function importsLeavingCore() {
  return modulesUnder(CORE).flatMap((file) =>
    importSpecifiers(readFileSync(file, "utf8"))
      .filter((specifier) => !staysInside(CORE, file, specifier))
      .map((specifier) => `${file}: ${specifier}`),
  );
}

function onlyLine(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim());
}

function registeredShells(hooks) {
  const commands = Object.values(hooks).flatMap((groups) => groups.flatMap((group) => group.hooks.flatMap((hook) => hook.args ?? [])));
  return new Set(commands.filter((arg) => arg.startsWith(PLUGIN_HOOK_PREFIX)).map((arg) => arg.slice(PLUGIN_HOOK_PREFIX.length)));
}

function shellsOnDisk() {
  return readdirSync(join(CORE, "hooks")).filter((file) => file.endsWith(".mjs"));
}

test("core/hooks/hooks.json registers every hook shell and only shells that exist", () => {
  const registered = registeredShells(readJson(PLUGIN_HOOKS).hooks);
  assert.deepEqual([...registered].sort(), shellsOnDisk().sort());
});

test("the registration check notices a shell that hooks.json drops", () => {
  const hooks = readJson(PLUGIN_HOOKS).hooks;
  const dropped = { ...hooks, Stop: [{ hooks: hooks.Stop[0].hooks.slice(1) }], SubagentStop: [{ hooks: hooks.SubagentStop[0].hooks.slice(1) }] };
  assert.notDeepEqual([...registeredShells(dropped)].sort(), shellsOnDisk().sort());
});

test("hooks.json registers the six events the plugin needs", () => {
  assert.deepEqual(Object.keys(readJson(PLUGIN_HOOKS).hooks).sort(), ["PostToolUse", "PreToolUse", "SessionStart", "Stop", "SubagentStart", "SubagentStop"]);
});

test(".claude/settings.json carries no hooks, so the plugin is the only loader", () => {
  assert.equal("hooks" in readJson(SETTINGS), false);
});

test(".claude/ tracks no skills, agents or output styles", () => {
  const tracked = execFileSync("git", ["ls-files", "--", ".claude/skills", ".claude/agents", ".claude/output-styles"], { encoding: "utf8" });
  assert.equal(tracked.trim(), "");
});

test("the manifest lists every skill folder once, in name order", () => {
  const folders = readdirSync(join(CORE, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `./skills/${e.name}`).sort();
  const manifest = readJson(join(CORE, ".claude-plugin", "plugin.json"));
  assert.equal(manifest.name, "tether");
  assert.deepEqual(manifest.skills, folders);
});

test("every import under core/ is a Node built-in or a path inside core/", () => {
  assert.deepEqual(importsLeavingCore(), []);
});

test("the import check flags a module that reaches outside core/ or into a package", () => {
  const module = join(CORE, "lib", "planted.mjs");
  const planted = 'import { run } from "../../bench/run.mjs";\nimport parse from "shell-quote";\nimport { x } from "./hook.mjs";\nimport { readFileSync } from "node:fs";\nimport path from "path";';
  const leaving = importSpecifiers(planted).filter((specifier) => !staysInside(CORE, module, specifier));
  assert.deepEqual(leaving, ["../../bench/run.mjs", "shell-quote"]);
});

test("the import scan reads static, side-effect and dynamic imports and skips comment lines", () => {
  const text = 'import "../../core/hooks/a.mjs";\nconst m = await import("./b.mjs");\nexport { c } from "./c.mjs";\n// import "./d.mjs";\nspawnSync("pandoc", ["--from", "markdown"]);';
  assert.deepEqual(importSpecifiers(text).sort(), ["../../core/hooks/a.mjs", "./b.mjs", "./c.mjs"]);
});

test("every .claude/hooks shell and the old CLI path is one import of its core/ counterpart", () => {
  const shells = readdirSync(FORWARDER_HOOKS).filter((file) => file.endsWith(".mjs"));
  assert.equal(shells.length, 11);
  for (const shell of shells) {
    assert.deepEqual(onlyLine(join(FORWARDER_HOOKS, shell)), [`import "../../core/hooks/${shell}";`], shell);
    assert.equal(existsSync(join(CORE, "hooks", shell)), true, shell);
  }
  assert.deepEqual(onlyLine(FORWARDER_CLI), ['import "../../core/bin/tether.mjs";']);
});

test("the tether launcher is tracked as executable", () => {
  const entry = execFileSync("git", ["ls-files", "-s", LAUNCHER], { encoding: "utf8" });
  assert.equal(entry.split(" ")[0], EXECUTABLE_MODE);
});
