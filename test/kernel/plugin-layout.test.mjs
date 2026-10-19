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
const MARKETPLACE = resolve(".claude-plugin/marketplace.json");
const PACKAGE = resolve("package.json");
const MOD_FOLDERS = ["status", "session", "markdown"];
const LAUNCHER = "core/bin/picket";
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

test("hooks.json registers the eight events the plugin needs", () => {
  assert.deepEqual(Object.keys(readJson(PLUGIN_HOOKS).hooks).sort(), ["Notification", "PostToolUse", "PostToolUseFailure", "PreToolUse", "SessionStart", "Stop", "SubagentStart", "SubagentStop"]);
});

test("the Notification hook runs notify.user.mjs only for permission and idle prompts", () => {
  const [group, ...rest] = readJson(PLUGIN_HOOKS).hooks.Notification;
  assert.deepEqual(rest, []);
  assert.equal(group.matcher, "permission_prompt|idle_prompt");
  assert.deepEqual(group.hooks.map((hook) => hook.args), [[`${PLUGIN_HOOK_PREFIX}notify.user.mjs`]]);
});

test(".claude/settings.json carries no hooks, so the plugin is the only loader", () => {
  assert.equal("hooks" in readJson(SETTINGS), false);
});

test(".claude/ tracks no skills, agents or output styles", () => {
  const tracked = execFileSync("git", ["ls-files", "--", ".claude/skills", ".claude/agents", ".claude/output-styles"], { encoding: "utf8" });
  assert.equal(tracked.trim(), "");
});

test("the manifest lists every skill folder once, in name order", () => {
  const folders = readdirSync(join(CORE, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => `./skills/${e.name}`).sort();
  const manifest = readJson(join(CORE, ".claude-plugin", "plugin.json"));
  assert.equal(manifest.name, "picket");
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

test("the root marketplace picketai serves picket from core/, picket-status from status/, picket-session from session/ and picket-markdown from markdown/", () => {
  const marketplace = readJson(MARKETPLACE);
  assert.equal(marketplace.name, "picketai");
  assert.ok(marketplace.owner?.name);
  assert.deepEqual(marketplace.plugins.map(({ name, source }) => ({ name, source })), [
    { name: "picket", source: "./core" },
    { name: "picket-status", source: "./status" },
    { name: "picket-session", source: "./session" },
    { name: "picket-markdown", source: "./markdown" },
  ]);
});

test("no forwarder is tracked under .claude/ and no allow rule names .claude/bin/ or .claude/skills/", () => {
  const tracked = execFileSync("git", ["ls-files", "--", ".claude/hooks", ".claude/bin/harness.mjs"], { encoding: "utf8" });
  assert.equal(tracked.trim(), "");
  const allow = readJson(SETTINGS).permissions.allow;
  assert.deepEqual(allow.filter((rule) => /\.claude\/(bin|skills)\//.test(rule)), []);
});

test("the npm package ships the plugin and its marketplace at the plugin's version, with no runtime dependencies", () => {
  const pkg = readJson(PACKAGE);
  assert.equal(pkg.version, readJson(join(CORE, ".claude-plugin", "plugin.json")).version);
  assert.ok(pkg.files.includes("core/"), "files ships core/");
  assert.ok(pkg.files.includes(".claude-plugin/marketplace.json"), "files ships the marketplace init looks for beside core/");
  assert.equal("dependencies" in pkg, false);
  assert.deepEqual(pkg.engines, { node: ">=20" });
  assert.equal(pkg.files.at(-1), "!**/*.test.*", "files ends by excluding test files from every shipped folder");
});

test("the npm package ships each mod's sources at the package version, without generated files", () => {
  const pkg = readJson(PACKAGE);
  for (const folder of MOD_FOLDERS) {
    for (const entry of [`${folder}/.claude-plugin/plugin.json`, `${folder}/hooks/`, `${folder}/types/`]) assert.ok(pkg.files.includes(entry), `files ships ${entry}`);
    assert.equal(pkg.files.includes(`${folder}/`), false, `files names ${folder}/ sources, not the folder an engine writes into`);
    assert.equal(readJson(resolve(folder, ".claude-plugin", "plugin.json")).version, pkg.version, `${folder} manifest version`);
  }
});

test("the picket launcher is tracked as executable", () => {
  const entry = execFileSync("git", ["ls-files", "-s", LAUNCHER], { encoding: "utf8" });
  assert.equal(entry.split(" ")[0], EXECUTABLE_MODE);
});

test("the plugin ships picket as shell and cmd launchers, both running picket.mjs", () => {
  for (const launcher of [LAUNCHER, `${LAUNCHER}.cmd`]) {
    assert.equal(existsSync(resolve(launcher)), true, launcher);
    assert.match(readFileSync(resolve(launcher), "utf8"), /picket\.mjs/, launcher);
  }
});
