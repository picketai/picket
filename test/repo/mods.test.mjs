import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { codeLines } from "#test/kernel-sources.mts";
import { DIST, DIST_MODS, DIST_MOD_CONTRACT, MARKETPLACE, MOD_LIB_SHARED, MOD_MODULE, SRC, marketplaceJson, modSharedTarget, rewriteModImports } from "../../scripts/build.mjs";
import { MODS } from "../../src/lib/mods.mts";
import { MOD_SWITCHES } from "../../src/lib/shared/mod-switch.mts";

const PLUGIN_MANIFEST = resolve("src/.claude-plugin/plugin.json");
const HOOKS_JSON = join(DIST, "hooks", "hooks.json");
const REGISTER = /^export const register\b/m;
const ENGINE_MODULES = ["claude-code", "claude-code/testing"];
const MOD_CODE = /\.(ts|tsx)$/;
const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".d.ts", "/index.ts", "/index.tsx", "/index.d.ts"];
const SPECIFIERS = [/\bfrom\s*["']([^"']+)["']/g, /\bimport\s*\(\s*["']([^"']+)["']/g, /^\s*import\s+["']([^"']+)["']/gm];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function specifiers(text) {
  const code = codeLines(text).join("\n");
  return SPECIFIERS.flatMap((pattern) => [...code.matchAll(pattern)].map((match) => match[1]));
}

function resolvesInside(modRoot, file, specifier) {
  if (!specifier.startsWith(".")) return false;
  const base = resolve(dirname(file), specifier);
  return base.startsWith(modRoot + sep) && RESOLVE_SUFFIXES.some((suffix) => isFile(base + suffix));
}

function leaks(modRoot, file, text) {
  return specifiers(text).filter((specifier) => !ENGINE_MODULES.includes(specifier) && !resolvesInside(modRoot, file, specifier));
}

function modRoot(name) {
  return join(DIST_MODS, name);
}

test("hooks.json names the one composing module, which alone exports register and starts the session once (T-4.1)", () => {
  assert.deepEqual(readJson(HOOKS_JSON).modules, [MOD_MODULE]);
  const composer = readFileSync(resolve(dirname(HOOKS_JSON), MOD_MODULE), "utf8");
  assert.match(composer, REGISTER);
  assert.equal(composer.match(/\bon\(\s*'session\.start'/g)?.length, 1);
  for (const name of Object.keys(MODS)) assert.doesNotMatch(readFileSync(join(modRoot(name), "hooks", "index.tsx"), "utf8"), REGISTER, name);
});

test("the build writes no mod manifest and leaves no dist/mods/; the core manifest names the merged contract (T-4.2)", () => {
  assert.equal(existsSync(join(DIST, "mods")), false);
  assert.deepEqual(filesUnder(DIST_MODS).filter((file) => basename(file) === "plugin.json"), []);
  const types = readJson(join(DIST, ".claude-plugin", "plugin.json")).types;
  assert.equal(resolve(DIST, types), DIST_MOD_CONTRACT);
  const contract = readFileSync(DIST_MOD_CONTRACT, "utf8");
  assert.match(contract, /interface PluginState \{\s+'picket': \{/);
  assert.doesNotMatch(contract, /\bimport\b/);
});

test("each mod with an off switch names a key the config check knows", () => {
  const switched = Object.entries(MODS).filter(([, { switch: key }]) => key !== null);
  assert.deepEqual(switched.map(([, { switch: key }]) => key), MOD_SWITCHES.map((name) => `mods.${name}`));
  assert.deepEqual(switched.map(([name]) => name), MOD_SWITCHES);
});

test("the committed marketplace is the one the build writes (T-4.6)", () => {
  const committed = readFileSync(MARKETPLACE, "utf8").replaceAll("\r\n", "\n");
  assert.equal(committed, marketplaceJson(JSON.parse(committed), readJson(PLUGIN_MANIFEST)));
  assert.equal("renames" in JSON.parse(committed), false);
});

test("marketplaceJson keeps every other key and lists only picket from ./dist", () => {
  const current = { name: "m", owner: { name: "o" }, plugins: [{ name: "picket-status", source: "./dist/mods/status", description: "old" }, { name: "picket", source: "./dist", description: "core" }] };
  const written = JSON.parse(marketplaceJson(current, { name: "picket", description: "the core" }));
  assert.deepEqual(written.owner, { name: "o" });
  assert.deepEqual(written.plugins, [{ name: "picket", source: "./dist", description: "the core" }]);
});

test("rewriteModImports turns the two shared forms into the mod's shared/ folder, in either quote style, and leaves the rest", () => {
  const source = [
    "import { TONES } from '../../shared/theme'",
    'import { runPicket } from "../../shared/kernel"',
    "import { minutes } from '../../../lib/shared/format.mts'",
    "import { BRAND } from \"../../../lib/shared/styling/palette.mts\"",
    "import { band } from './band'",
    "import type { Work } from '../types'",
    "import { atom } from 'claude-code'",
    "import { x } from '../../../lib/verbs/x.mts'",
  ].join("\n");
  assert.equal(
    rewriteModImports(source),
    [
      "import { TONES } from '../shared/theme'",
      'import { runPicket } from "../shared/kernel"',
      "import { minutes } from '../shared/format'",
      'import { BRAND } from "../shared/styling/palette"',
      "import { band } from './band'",
      "import type { Work } from '../types'",
      "import { atom } from 'claude-code'",
      "import { x } from '../../../lib/verbs/x.mts'",
    ].join("\n"),
  );
});

test("modSharedTarget keeps the path below src/lib/shared or src/mods/shared and renames .mts to .ts", () => {
  assert.equal(modSharedTarget(join(SRC, "lib", "shared", "format.mts")), "shared/format.ts");
  assert.equal(modSharedTarget(join(SRC, "lib", "shared", "styling", "palette.mts")), "shared/styling/palette.ts");
  assert.equal(modSharedTarget(join(SRC, "mods", "shared", "theme.ts")), "shared/theme.ts");
});

test("every built mod holds the shared copies, and no file in it names lib/shared/ or an .mts module (T-2.3)", () => {
  for (const name of Object.keys(MODS)) {
    for (const file of MOD_LIB_SHARED) assert.ok(isFile(join(modRoot(name), modSharedTarget(file))), `${name}: ${modSharedTarget(file)}`);
    assert.ok(isFile(join(modRoot(name), "shared", "format.ts")) && isFile(join(modRoot(name), "shared", "styling", "palette.ts")), name);
  }
  const naming = filesUnder(DIST_MODS)
    .filter((file) => MOD_CODE.test(file))
    .filter((file) => /lib\/shared\/|\.mts["']/.test(readFileSync(file, "utf8")));
  assert.deepEqual(naming, []);
});

test("every import in a built mod is the engine's module or a file under dist/hooks/mods/ (T-4.5)", () => {
  const leaking = filesUnder(DIST_MODS)
    .filter((file) => MOD_CODE.test(file))
    .flatMap((file) => leaks(DIST_MODS, file, readFileSync(file, "utf8")).map((specifier) => `${file}: ${specifier}`));
  assert.deepEqual(leaking, []);
});

test("the leak scan reports a planted import that leaves the mod folder, a package and a missing file", () => {
  const planted = [
    "import { compactTokens } from '../../../lib/shared/format.mts'",
    "import React from 'react'",
    "import { gone } from './gone'",
    "import { agentsLine } from './band'",
    "import type { Work } from '../../types'",
    "import { mock } from 'claude-code/testing'",
    "// import { x } from '../../elsewhere'",
  ].join("\n");
  assert.deepEqual(leaks(DIST_MODS, join(modRoot("status"), "hooks", "planted.ts"), planted), ["../../../lib/shared/format.mts", "react", "./gone"]);
});
