import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const SHIPPED = [
  "dist/bin/picket.mjs",
  "dist/bin/picket",
  "dist/bin/picket.cmd",
  "dist/hooks/hooks.json",
  "dist/.claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "status/.claude-plugin/plugin.json",
  "session/.claude-plugin/plugin.json",
  "markdown/.claude-plugin/plugin.json",
];

function packedFiles() {
  const [pack] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  return pack.files.map((file) => file.path.replaceAll("\\", "/"));
}

test("the npm tarball ships the built plugin, its marketplace and the mod manifests, and no source or test file", () => {
  const files = packedFiles();
  assert.deepEqual(SHIPPED.filter((path) => !files.includes(path)), [], "missing from the tarball");
  assert.deepEqual(files.filter((path) => path.startsWith("src/") || path.endsWith(".mts") || /\.test\./.test(path)), [], "source or test files in the tarball");
});
