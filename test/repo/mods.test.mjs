import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { codeLines } from "#test/kernel-sources.mts";
import { DIST_MODS, MARKETPLACE, marketplaceJson } from "../../scripts/build.mjs";
import { MODS } from "../../src/lib/mods.mts";

const PACKAGE = resolve("package.json");
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

test("the build writes each mod's manifest from the mod list and package.json (T-1.1)", () => {
  const pkg = readJson(PACKAGE);
  for (const [name, { plugin, description }] of Object.entries(MODS)) {
    const manifest = readJson(join(modRoot(name), ".claude-plugin", "plugin.json"));
    assert.deepEqual(manifest, { name: plugin, version: pkg.version, description, author: { name: pkg.author }, types: "./types/index.d.ts" }, name);
    assert.ok(manifest.author.name, `${name} author`);
  }
});

test("the build writes each mod's hooks.json naming index.tsx, which exports register (T-1.1)", () => {
  for (const name of Object.keys(MODS)) {
    assert.deepEqual(readJson(join(modRoot(name), "hooks", "hooks.json")), { modules: ["./index.tsx"] }, name);
    assert.match(readFileSync(join(modRoot(name), "hooks", "index.tsx"), "utf8"), /^export const register\b/m, name);
  }
});

test("the committed marketplace is the one the build writes (T-1.3)", () => {
  const committed = readFileSync(MARKETPLACE, "utf8").replaceAll("\r\n", "\n");
  assert.equal(committed, marketplaceJson(JSON.parse(committed)));
});

test("marketplaceJson keeps the core entry first and every other key, and lists the mods in list order from dist/mods/", () => {
  const current = { name: "m", owner: { name: "o" }, plugins: [{ name: "picket-status", source: "./status", description: "old" }, { name: "picket", source: "./dist", description: "core" }] };
  const written = JSON.parse(marketplaceJson(current));
  assert.deepEqual(written.owner, { name: "o" });
  assert.deepEqual(written.plugins.map(({ name, source }) => `${name} ${source}`), ["picket ./dist", ...Object.entries(MODS).map(([name, { plugin }]) => `${plugin} ./dist/mods/${name}`)]);
});

test("every import in a built mod is the engine's module or a file inside the same mod folder (D-003)", () => {
  const leaking = Object.keys(MODS).flatMap((name) =>
    filesUnder(modRoot(name))
      .filter((file) => MOD_CODE.test(file))
      .flatMap((file) => leaks(modRoot(name), file, readFileSync(file, "utf8")).map((specifier) => `${file}: ${specifier}`)),
  );
  assert.deepEqual(leaking, []);
});

test("the leak scan reports a planted import that leaves the mod folder, a package and a missing file", () => {
  const root = modRoot("status");
  const planted = [
    "import { compactTokens } from '../../../lib/shared/format.mts'",
    "import React from 'react'",
    "import { gone } from './gone'",
    "import { agentsLine } from './band'",
    "import type { Work } from '../types'",
    "import { mock } from 'claude-code/testing'",
    "// import { x } from '../../elsewhere'",
  ].join("\n");
  assert.deepEqual(leaks(root, join(root, "hooks", "planted.ts"), planted), ["../../../lib/shared/format.mts", "react", "./gone"]);
});
