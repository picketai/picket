import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withProject } from "#test/project.mts";
import { MODS } from "../../src/lib/mods.mts";

const SHIPPED = [
  "dist/bin/picket.mjs",
  "dist/bin/picket",
  "dist/bin/picket.cmd",
  "dist/hooks/hooks.json",
  "dist/.claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ...Object.keys(MODS).flatMap((name) => [".claude-plugin/plugin.json", "hooks/hooks.json", "hooks/index.tsx"].map((file) => `dist/mods/${name}/${file}`)),
];

function withoutScripts(pkg) {
  const { scripts, ...rest } = pkg;
  return rest;
}

function scriptFreeCopy(t) {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  const copy = withProject(t);
  for (const entry of pkg.files.filter((entry) => !entry.startsWith("!") && existsSync(resolve(entry)))) cpSync(resolve(entry), join(copy, entry), { recursive: true });
  writeFileSync(join(copy, "package.json"), JSON.stringify(withoutScripts(pkg)));
  return copy;
}

function packedFiles(t) {
  const [pack] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { cwd: scriptFreeCopy(t), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  return pack.files.map((file) => file.path.replaceAll("\\", "/"));
}

test("the npm tarball ships the built plugin, its marketplace and the mod manifests, and no source or test file", (t) => {
  const files = packedFiles(t);
  assert.deepEqual(SHIPPED.filter((path) => !files.includes(path)), [], "missing from the tarball");
  assert.deepEqual(files.filter((path) => path.startsWith("src/") || path.endsWith(".mts") || /\.test\./.test(path)), [], "source or test files in the tarball");
});
