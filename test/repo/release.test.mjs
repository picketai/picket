import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkTag, distTag, syncPluginVersion } from "../../.github/scripts/release.mjs";
import { withProject } from "#test/project.mts";

const SCRIPT = resolve(".github/scripts/release.mjs");
const MANIFEST = '{\n  "name": "picket",\n  "version": "1.0.0-alpha.1",\n  "author": { "name": "Vlad Apetre" },\n  "skills": ["./skills/a"]\n}\n';
const STATUS_MANIFEST = '{\n  "name": "picket-status",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';
const SESSION_MANIFEST = '{\n  "name": "picket-session",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';
const MARKDOWN_MANIFEST = '{\n  "name": "picket-markdown",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';

function manifestPath(root, plugin) {
  return join(root, plugin, ".claude-plugin", "plugin.json");
}

function project(t, manifest, version, statusManifest = STATUS_MANIFEST) {
  const root = withProject(t, { picket: false });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@picketai/picket", version }));
  for (const [plugin, text] of [["src", manifest], ["status", statusManifest], ["session", SESSION_MANIFEST], ["markdown", MARKDOWN_MANIFEST]]) {
    mkdirSync(join(root, plugin, ".claude-plugin"), { recursive: true });
    writeFileSync(manifestPath(root, plugin), text);
  }
  return root;
}

function syncVersionCli(root) {
  return spawnSync(process.execPath, [SCRIPT, "sync-version", "--root", root], { encoding: "utf8" });
}

test("syncPluginVersion changes the version value and keeps every other byte", () => {
  const out = syncPluginVersion(MANIFEST, "1.0.0-alpha.2");
  assert.equal(out, MANIFEST.replace('"version": "1.0.0-alpha.1"', '"version": "1.0.0-alpha.2"'));
});

test("syncPluginVersion refuses a manifest without exactly one version value", () => {
  assert.throws(() => syncPluginVersion('{ "name": "picket" }', "1.0.0"), /holds 0 version values/);
  assert.throws(() => syncPluginVersion('{ "version": "1", "nested": { "version": "2" } }', "1.0.0"), /holds 2 version values/);
});

test("distTag is latest for a stable version and the prerelease identifier otherwise", () => {
  assert.equal(distTag("1.2.0"), "latest");
  assert.equal(distTag("1.0.0-beta.3"), "beta");
  assert.equal(distTag("1.0.0-alpha.2"), "alpha");
  assert.throws(() => distTag("1.0.0-0"), /prerelease identifier "0"/);
});

test("the version script stages the picket manifest under src/, and the release job runs Node 24", () => {
  const { scripts } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  assert.match(scripts.version, /git add src\/\.claude-plugin\/plugin\.json /);
  assert.match(readFileSync(resolve(".github/workflows/release.yml"), "utf8"), /^\s+node-version: 24$/m);
});

test("checkTag accepts only the v-prefixed package version", () => {
  assert.doesNotThrow(() => checkTag("v1.0.0-alpha.1", "1.0.0-alpha.1"));
  assert.throws(() => checkTag("1.0.0-alpha.1", "1.0.0-alpha.1"), /expected v1\.0\.0-alpha\.1/);
  assert.throws(() => checkTag("v1.0.0-alpha.9", "1.0.0-alpha.1"), /v1\.0\.0-alpha\.9 does not match package\.json version 1\.0\.0-alpha\.1/);
});

test("sync-version rewrites all four plugin manifests from package.json, and fails in one stderr line", (t) => {
  const ok = project(t, MANIFEST, "9.9.9");
  const twice = project(t, '{ "version": "1", "nested": { "version": "2" } }', "1.0.0-alpha.2");
  const r = syncVersionCli(ok);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(manifestPath(ok, "src"), "utf8"), MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  assert.equal(readFileSync(manifestPath(ok, "status"), "utf8"), STATUS_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  assert.equal(readFileSync(manifestPath(ok, "session"), "utf8"), SESSION_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  assert.equal(readFileSync(manifestPath(ok, "markdown"), "utf8"), MARKDOWN_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  const bad = syncVersionCli(twice);
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr.trim().split("\n").length, 1, bad.stderr);
});

test("sync-version writes no manifest when the status manifest is malformed", (t) => {
  const root = project(t, MANIFEST, "9.9.9", '{ "name": "picket-status" }');
  const r = syncVersionCli(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /status\/\.claude-plugin\/plugin\.json holds 0 version values/);
  assert.equal(readFileSync(manifestPath(root, "src"), "utf8"), MANIFEST);
  assert.equal(readFileSync(manifestPath(root, "session"), "utf8"), SESSION_MANIFEST);
  assert.equal(readFileSync(manifestPath(root, "markdown"), "utf8"), MARKDOWN_MANIFEST);
});
