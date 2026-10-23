import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { codeLines, isKernelSource } from "#test/kernel-sources.mts";
import { MODS } from "../../src/lib/mods.mts";

const SRC = resolve("src");
const SETTINGS = resolve(".claude/settings.json");
const DIST_HOOKS = resolve("dist/hooks");
const PLUGIN_HOOKS = join(DIST_HOOKS, "hooks.json");
const MARKETPLACE = resolve(".claude-plugin/marketplace.json");
const PACKAGE = resolve("package.json");
const LAUNCHER = "src/bin/picket";
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
    return isKernelSource(entry.name) ? [full] : [];
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

function importsLeavingSrc() {
  return modulesUnder(SRC).flatMap((file) =>
    importSpecifiers(readFileSync(file, "utf8"))
      .filter((specifier) => !staysInside(SRC, file, specifier))
      .map((specifier) => `${file}: ${specifier}`),
  );
}

function registeredBundles(hooks) {
  const commands = Object.values(hooks).flatMap((groups) => groups.flatMap((group) => group.hooks.flatMap((hook) => hook.args ?? [])));
  return new Set(commands.filter((arg) => arg.startsWith(PLUGIN_HOOK_PREFIX)).map((arg) => arg.slice(PLUGIN_HOOK_PREFIX.length)));
}

function bundlesOnDisk() {
  return readdirSync(DIST_HOOKS).filter((file) => file.endsWith(".mjs"));
}

test("dist/hooks/hooks.json registers every hook bundle and only bundles that exist", () => {
  const registered = registeredBundles(readJson(PLUGIN_HOOKS).hooks);
  assert.deepEqual([...registered].sort(), bundlesOnDisk().sort());
});

test("no hook shell is left on disk: the build generates every entry from the hook list", () => {
  assert.equal(existsSync(join(SRC, "hooks")), false);
});

test("the registration check notices a bundle that hooks.json drops", () => {
  const hooks = readJson(PLUGIN_HOOKS).hooks;
  const dropped = { ...hooks, Stop: [{ hooks: hooks.Stop[0].hooks.slice(1) }], SubagentStop: [{ hooks: hooks.SubagentStop[0].hooks.slice(1) }] };
  assert.notDeepEqual([...registeredBundles(dropped)].sort(), bundlesOnDisk().sort());
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

function skillFolders(skillsDir) {
  return readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md"))).map((e) => `./skills/${e.name}`).sort();
}

test("the manifest lists every skill folder once, in name order", () => {
  const folders = skillFolders(join(SRC, "skills"));
  const manifest = readJson(join(SRC, ".claude-plugin", "plugin.json"));
  assert.equal(manifest.name, "picket");
  assert.deepEqual(manifest.skills, folders);
});

test("a folder under skills/ without a SKILL.md, such as shared/, is not a skill", () => {
  assert.equal(existsSync(join(SRC, "skills", "shared", "procedures")), true);
  assert.equal(skillFolders(join(SRC, "skills")).includes("./skills/shared"), false);
  assert.equal(skillFolders(join(SRC, "skills")).length, 17);
});

test("every import under src/ is a Node built-in or a path inside src/", () => {
  assert.deepEqual(importsLeavingSrc(), []);
});

test("the import check flags a module that reaches outside src/ or into a package", () => {
  const module = join(SRC, "lib", "planted.mjs");
  const planted = 'import { run } from "../../bench/run.mjs";\nimport parse from "shell-quote";\nimport { x } from "./hook.mjs";\nimport { readFileSync } from "node:fs";\nimport path from "path";';
  const leaving = importSpecifiers(planted).filter((specifier) => !staysInside(SRC, module, specifier));
  assert.deepEqual(leaving, ["../../bench/run.mjs", "shell-quote"]);
});

test("the import scan reads static, side-effect and dynamic imports and skips comment lines", () => {
  const text = 'import "../../src/hooks/a.mjs";\nconst m = await import("./b.mjs");\nexport { c } from "./c.mjs";\n// import "./d.mjs";\nspawnSync("pandoc", ["--from", "markdown"]);';
  assert.deepEqual(importSpecifiers(text).sort(), ["../../src/hooks/a.mjs", "./b.mjs", "./c.mjs"]);
});

test("the root marketplace picketai serves picket from dist/, then each mod from dist/mods/ in list order", () => {
  const marketplace = readJson(MARKETPLACE);
  assert.equal(marketplace.name, "picketai");
  assert.ok(marketplace.owner?.name);
  assert.deepEqual(marketplace.plugins.map(({ name, source }) => ({ name, source })), [
    { name: "picket", source: "./dist" },
    { name: "picket-status", source: "./dist/mods/status" },
    { name: "picket-markdown", source: "./dist/mods/markdown" },
    { name: "picket-session", source: "./dist/mods/session" },
  ]);
});

test("no forwarder is tracked under .claude/ and no allow rule names .claude/bin/ or .claude/skills/", () => {
  const tracked = execFileSync("git", ["ls-files", "--", ".claude/hooks", ".claude/bin/harness.mjs"], { encoding: "utf8" });
  assert.equal(tracked.trim(), "");
  const allow = readJson(SETTINGS).permissions.allow;
  assert.deepEqual(allow.filter((rule) => /\.claude\/(bin|skills)\//.test(rule)), []);
});

test(".claude/settings.json denies Edit and Write under the generated dist/", () => {
  const deny = readJson(SETTINGS).permissions.deny;
  assert.ok(deny.includes("Edit(dist/**)"), "Edit(dist/**)");
  assert.ok(deny.includes("Write(dist/**)"), "Write(dist/**)");
});

test("the npm package ships the plugin and its marketplace at the plugin's version, with no runtime dependencies", () => {
  const pkg = readJson(PACKAGE);
  assert.equal(pkg.version, readJson(join(SRC, ".claude-plugin", "plugin.json")).version);
  assert.equal(pkg.bin.picket, "dist/bin/picket.mjs");
  assert.ok(pkg.files.includes("dist/"), "files ships dist/");
  assert.equal(pkg.files.includes("src/"), false, "files leaves the source out");
  assert.ok(pkg.files.includes(".claude-plugin/marketplace.json"), "files ships the marketplace init looks for beside dist/");
  assert.equal("dependencies" in pkg, false);
  assert.deepEqual(pkg.engines, { node: ">=22" });
  assert.deepEqual(pkg.devEngines, { runtime: { name: "node", version: ">=24", onFail: "error" } });
  assert.equal(pkg.files.at(-1), "!**/*.test.*", "files ends by excluding test files from every shipped folder");
});

test("the npm package ships each mod only as built under dist/mods/, at the package version", () => {
  const pkg = readJson(PACKAGE);
  for (const name of Object.keys(MODS)) {
    assert.deepEqual(pkg.files.filter((entry) => entry.startsWith(`${name}/`)), [], `files names no ${name}/ folder`);
    assert.equal(readJson(resolve("dist", "mods", name, ".claude-plugin", "plugin.json")).version, pkg.version, `${name} manifest version`);
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
