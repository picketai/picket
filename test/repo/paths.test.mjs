import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import * as paths from "../../dist/lib/shared/paths.mjs";
import { codeLines, isKernelSource, isPathsModule, kernelModules } from "#test/kernel-sources.mts";

const SELF_LOCATION = ["import.meta.url", "import.meta.dirname", "import.meta.filename", "__dirname", "__filename", "process.argv[1]"];

function selfLocationUses(text) {
  return SELF_LOCATION.filter((needle) => text.includes(needle));
}

test("the self-location ban flags every forbidden form", () => {
  for (const needle of SELF_LOCATION) {
    assert.deepEqual(selfLocationUses(`const here = ${needle};`), [needle]);
  }
  assert.deepEqual(selfLocationUses('const mod = await import("./vendor/x.mjs");'), []);
});

test("the vendored tokenizer lives under src/lib/util/vendor and the scans leave it out (T-7.5)", () => {
  const tokenizer = resolve("src/lib/util/vendor/shell-quote-parse.mjs");
  assert.equal(existsSync(tokenizer), true);
  assert.equal(existsSync(resolve("src/hooks/vendor")), false);
  assert.equal(kernelModules().includes(tokenizer), false);
});

test("the kernel scans read .mjs and .mts sources and leave declaration and test files out (T-1.6)", () => {
  const modules = kernelModules();
  assert.equal(modules.includes(resolve("src/lib/shared/action.mts")), true);
  assert.equal(modules.includes(resolve("src/bin/picket.mts")), true);
  assert.deepEqual(modules.filter((file) => file.endsWith(".d.mts") || file.endsWith(".test.mts")), []);
  assert.deepEqual(["a.mjs", "a.mts", "a.d.mts", "a.test.mts", "a.json"].filter(isKernelSource), ["a.mjs", "a.mts"]);
  assert.deepEqual(["paths.mjs", "paths.mts", "paths.d.mts"].map((name) => isPathsModule(join("src", "lib", name))), [true, true, false]);
});

test("no kernel, hook or bin module but paths.mts builds a path from its own location (T-1.1)", () => {
  const offenders = kernelModules()
    .filter((file) => !isPathsModule(file))
    .map((file) => ({ file, uses: selfLocationUses(readFileSync(file, "utf8")) }))
    .filter(({ uses }) => uses.length);
  assert.deepEqual(offenders, []);
});

function hostLiteralLines(text) {
  return codeLines(text).filter((line) => line.includes(paths.HOST_DIR));
}

test("the host-folder ban flags a code line and skips comment lines", () => {
  assert.deepEqual(hostLiteralLines('const dir = join(root, ".claude", "ledger");'), ['const dir = join(root, ".claude", "ledger");']);
  assert.deepEqual(hostLiteralLines(["// see .claude/hooks", "/* .claude */", " * .claude/x", "const a = 1;"].join("\n")), []);
});

test("only paths.mts spells the host folder in kernel, hook and bin code (T-2.1)", () => {
  const offenders = kernelModules()
    .filter((file) => !isPathsModule(file))
    .flatMap((file) => hostLiteralLines(readFileSync(file, "utf8")).map((line) => `${file}: ${line.trim()}`));
  assert.deepEqual(offenders, []);
});

function kernelSourcesUnder(dir, rel = "") {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((entry) => {
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return kernelSourcesUnder(dir, path);
    return isKernelSource(entry.name) ? [path] : [];
  });
}

test("paths.mts is the only file under src/lib whose code names the config file (T-2.4)", () => {
  const configName = new RegExp(`(?<![\\w.-]|\\.picketai/)${basename(paths.configRel()).replaceAll(".", "\\.")}`);
  assert.equal(configName.test('const f = "tsconfig.json";'), false);
  assert.equal(configName.test('const f = ".picketai/config.json";'), false);
  assert.equal(configName.test('const f = ".picket/config.json";'), true);
  const lib = resolve("src/lib");
  const naming = kernelSourcesUnder(lib).filter((f) => codeLines(readFileSync(join(lib, f), "utf8")).some((line) => configName.test(line)));
  assert.deepEqual(naming, ["shared/paths.mts"]);
});

test("pluginRoot is the folder that holds rules/ and lib/, and rulesDir sits under it", () => {
  const root = paths.pluginRoot();
  assert.equal(root, resolve("dist"));
  assert.equal(existsSync(join(root, "lib", "shared", "paths.mjs")), true);
  assert.equal(existsSync(join(root, "rules", "prose.md")), true);
  assert.equal(paths.rulesDir(), join(root, "rules"));
});

test("pluginRoot walks up from any built folder to dist/ (T-1.6)", () => {
  for (const from of ["dist/lib", "dist/lib/shared/styling", "dist/hooks", "dist/bin"]) {
    assert.equal(paths.pluginRoot(resolve(from)), resolve("dist"), from);
  }
});

test("pluginManifestPath names the plugin manifest the marketplace serves", () => {
  assert.equal(paths.pluginManifestPath(), resolve("dist", ".claude-plugin", "plugin.json"));
  assert.equal(existsSync(paths.pluginManifestPath()), true);
});

const PROMPT_FOLDERS = ["src/skills", "src/agents", ".claude/rules", "src/rules"];

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function legacyMentions(text) {
  return paths.LEGACY_LOCATIONS.filter((location) => text.includes(location));
}

test("the legacy-path scan flags the stale template header", () => {
  assert.deepEqual(legacyMentions("# Annotated example of .claude/branching/manifest.yaml"), [paths.LEGACY.branchingManifest]);
  assert.deepEqual(legacyMentions("# GENERATED and SELF-HEALED by the `branching` skill"), []);
});

test("no skill, agent or rule names a legacy location (T-3.5)", () => {
  const offenders = PROMPT_FOLDERS.flatMap((folder) => filesUnder(resolve(folder)))
    .flatMap((file) => legacyMentions(readFileSync(file, "utf8")).map((location) => `${file}: ${location}`));
  assert.deepEqual(offenders, []);
});
