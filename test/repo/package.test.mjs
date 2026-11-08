import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DIST, DIST_PACKAGE, distPackage } from "../../scripts/build.mjs";
import { MODS } from "../../src/lib/mods.mts";

const SHIPPED = [
  "package.json",
  ".claude-plugin/plugin.json",
  "bin/picket",
  "bin/picket.cmd",
  "bin/picket.mjs",
  "hooks/hooks.json",
  "hooks/mods/index.tsx",
  ...Object.keys(MODS).map((name) => `hooks/mods/${name}/hooks/index.tsx`),
  "hooks/mods/types/index.d.ts",
  "statusline.mjs",
  "LICENSE",
  "README.md",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packedFiles() {
  const [pack] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { cwd: DIST, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  return pack.files.map((file) => file.path.replaceAll("\\", "/"));
}

test("the tarball packed from dist/ ships the plugin at its root, and no TypeScript module, test file or marketplace (T-5.2, T-5.4)", () => {
  const files = packedFiles();
  assert.deepEqual(SHIPPED.filter((path) => !files.includes(path)), [], "missing from the tarball");
  assert.deepEqual(files.filter((path) => path.endsWith(".mts") || path.includes(".test.")), [], "TypeScript modules or test files in the tarball");
  assert.deepEqual(files.filter((path) => path.endsWith("marketplace.json")), [], "a marketplace in the tarball");
});

test("dist/package.json is @picketai/picket at the root and plugin version, with the launcher and no scripts or dependencies (T-5.1)", () => {
  const pkg = readJson(DIST_PACKAGE);
  const root = readJson(resolve("package.json"));
  assert.equal(pkg.name, "@picketai/picket");
  assert.equal(pkg.version, root.version);
  assert.equal(pkg.version, readJson(resolve("src", ".claude-plugin", "plugin.json")).version);
  assert.deepEqual(pkg.bin, { picket: "bin/picket.mjs" });
  assert.deepEqual(pkg.engines, { node: ">=22" });
  for (const key of ["scripts", "dependencies", "devDependencies", "devEngines", "imports", "private"]) assert.equal(key in pkg, false, key);
});

test("distPackage keeps the published fields, lists the folder's entries in name order and ends by excluding test files", () => {
  const root = { name: "@x/y", version: "1.2.3", private: true, scripts: { build: "b" }, imports: { "#t/*": "./t/*" }, license: "MIT", engines: { node: ">=22" } };
  assert.deepEqual(distPackage(root, ["skills", "package.json", ".claude-plugin", "bin"]), {
    name: "@x/y",
    version: "1.2.3",
    license: "MIT",
    engines: { node: ">=22" },
    bin: { picket: "bin/picket.mjs" },
    files: [".claude-plugin", "bin", "skills", "!**/*.test.*"],
  });
});
