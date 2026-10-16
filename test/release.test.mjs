import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkTag, distTag, syncPluginVersion } from "../.github/scripts/release.mjs";

const SCRIPT = resolve(".github/scripts/release.mjs");
const MANIFEST = '{\n  "name": "picket",\n  "version": "1.0.0-alpha.1",\n  "author": { "name": "Vlad Apetre" },\n  "skills": ["./skills/a"]\n}\n';
const STATUS_MANIFEST = '{\n  "name": "picket-status",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';
const SESSION_MANIFEST = '{\n  "name": "picket-session",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';
const MARKDOWN_MANIFEST = '{\n  "name": "picket-markdown",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';

function manifestPath(root, plugin) {
  return join(root, plugin, ".claude-plugin", "plugin.json");
}

function project(manifest, version, statusManifest = STATUS_MANIFEST) {
  const root = mkdtempSync(join(tmpdir(), "picket-release-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@picketai/picket", version }));
  for (const [plugin, text] of [["core", manifest], ["status", statusManifest], ["session", SESSION_MANIFEST], ["markdown", MARKDOWN_MANIFEST]]) {
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

test("checkTag accepts only the v-prefixed package version", () => {
  assert.doesNotThrow(() => checkTag("v1.0.0-alpha.1", "1.0.0-alpha.1"));
  assert.throws(() => checkTag("1.0.0-alpha.1", "1.0.0-alpha.1"), /expected v1\.0\.0-alpha\.1/);
  assert.throws(() => checkTag("v1.0.0-alpha.9", "1.0.0-alpha.1"), /v1\.0\.0-alpha\.9 does not match package\.json version 1\.0\.0-alpha\.1/);
});

test("sync-version rewrites all four plugin manifests from package.json, and fails in one stderr line", () => {
  const ok = project(MANIFEST, "9.9.9");
  const twice = project('{ "version": "1", "nested": { "version": "2" } }', "1.0.0-alpha.2");
  try {
    const r = syncVersionCli(ok);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(manifestPath(ok, "core"), "utf8"), MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
    assert.equal(readFileSync(manifestPath(ok, "status"), "utf8"), STATUS_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
    assert.equal(readFileSync(manifestPath(ok, "session"), "utf8"), SESSION_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
    assert.equal(readFileSync(manifestPath(ok, "markdown"), "utf8"), MARKDOWN_MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
    const bad = syncVersionCli(twice);
    assert.equal(bad.status, 1);
    assert.equal(bad.stderr.trim().split("\n").length, 1, bad.stderr);
  } finally {
    rmSync(ok, { recursive: true, force: true });
    rmSync(twice, { recursive: true, force: true });
  }
});

test("sync-version writes no manifest when the status manifest is malformed", () => {
  const root = project(MANIFEST, "9.9.9", '{ "name": "picket-status" }');
  try {
    const r = syncVersionCli(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /status\/\.claude-plugin\/plugin\.json holds 0 version values/);
    assert.equal(readFileSync(manifestPath(root, "core"), "utf8"), MANIFEST);
    assert.equal(readFileSync(manifestPath(root, "session"), "utf8"), SESSION_MANIFEST);
    assert.equal(readFileSync(manifestPath(root, "markdown"), "utf8"), MARKDOWN_MANIFEST);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
