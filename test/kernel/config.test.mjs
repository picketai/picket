import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { loadConfig, DEFAULT_SECURITY_PATHS } from "../../.claude/lib/config.mjs";
import { configRel } from "../../.claude/lib/paths.mjs";
import { codeLines } from "./kernel-sources.mjs";

function projectWith(configText) {
  const root = mkdtempSync(join(tmpdir(), "harness-config-"));
  mkdirSync(join(root, ".claude"));
  if (configText !== undefined) writeFileSync(join(root, ".claude", "harness.json"), configText);
  return root;
}

test("paths.mjs is the only file under .claude/lib whose code names the config file (T-2.4)", () => {
  const configName = basename(configRel());
  const lib = resolve(".claude/lib");
  const naming = readdirSync(lib)
    .filter((f) => f.endsWith(".mjs") && codeLines(readFileSync(join(lib, f), "utf8")).some((line) => line.includes(configName)));
  assert.deepEqual(naming, ["paths.mjs"]);
});

test("an unset env var gives the source with root null and a reason naming the variable (T-3.2)", () => {
  const root = projectWith(JSON.stringify({ sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } }));
  const c = loadConfig(root, {});
  assert.equal(c.error, null);
  assert.deepEqual(c.security_paths, DEFAULT_SECURITY_PATHS);
  assert.equal(c.sources.length, 1);
  assert.deepEqual([c.sources[0].name, c.sources[0].root], ["analysis", null]);
  assert.match(c.sources[0].reason, /HARNESS_SOURCE_ANALYSIS/);
  rmSync(root, { recursive: true, force: true });
});

test("a set env var resolves to an absolute root; a missing directory is a reason, not a root", () => {
  const root = projectWith(JSON.stringify({ security_paths: ["src/pay/"], sources: { analysis: { env: "X_SRC" } } }));
  assert.equal(loadConfig(root, { X_SRC: root }).sources[0].root, resolve(root));
  assert.deepEqual(loadConfig(root, { X_SRC: root }).security_paths, ["src/pay/"]);
  const gone = loadConfig(root, { X_SRC: join(root, "nope") }).sources[0];
  assert.equal(gone.root, null);
  assert.match(gone.reason, /not a directory/);
  rmSync(root, { recursive: true, force: true });
});

test("a malformed harness.json keeps the default security paths and sets error (T-3.2)", () => {
  const root = projectWith("{ not json");
  const c = loadConfig(root, {});
  assert.deepEqual(c.security_paths, DEFAULT_SECURITY_PATHS);
  assert.deepEqual(c.sources, []);
  assert.match(c.error, /malformed/);
  rmSync(root, { recursive: true, force: true });
});

test("no harness.json is the defaults with no error", () => {
  const root = projectWith(undefined);
  assert.deepEqual(loadConfig(root, {}), { security_paths: DEFAULT_SECURITY_PATHS, sources: [], error: null });
  rmSync(root, { recursive: true, force: true });
});
