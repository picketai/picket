import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkTag, distTag, syncPluginVersion } from "../../.github/scripts/release.mjs";
import { withProject } from "#test/project.mts";

const SCRIPT = resolve(".github/scripts/release.mjs");
const MANIFEST = '{\n  "name": "picket",\n  "version": "1.0.0-alpha.1",\n  "author": { "name": "Vlad Apetre" },\n  "skills": ["./skills/a"]\n}\n';
const BUILT_MOD_MANIFEST = '{\n  "name": "picket-status",\n  "version": "1.0.0-alpha.1",\n  "types": "./types/index.d.ts"\n}\n';
const BUILT_MOD = "dist/mods/status";

function manifestPath(root, plugin) {
  return join(root, plugin, ".claude-plugin", "plugin.json");
}

function project(t, manifest, version) {
  const root = withProject(t, { picket: false });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@picketai/picket", version }));
  for (const [plugin, text] of [["src", manifest], [BUILT_MOD, BUILT_MOD_MANIFEST]]) {
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

test("the version script stages only the picket manifest under src/, and the release job runs Node 24", () => {
  const { scripts } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  assert.match(scripts.version, /git add src\/\.claude-plugin\/plugin\.json$/);
  assert.match(readFileSync(resolve(".github/workflows/release.yml"), "utf8"), /^\s+node-version: 24$/m);
});

function workflowJobs() {
  const text = readFileSync(resolve(".github/workflows/release.yml"), "utf8").replaceAll("\r\n", "\n");
  const jobs = text.slice(text.indexOf("\njobs:\n") + "\njobs:\n".length);
  return Object.fromEntries(jobs.split(/^(?= {2}\S)/m).map((body) => [body.match(/^ {2}([\w-]+):/)[1], body]));
}

test("the release workflow tests on Node 24, checks the build on Node 22, runs the mods beside, and publishes after both (D-006)", () => {
  const jobs = workflowJobs();
  assert.deepEqual(Object.keys(jobs), ["test", "build-on-22", "mods", "publish"]);
  assert.match(jobs.test, /node-version: 24\n/);
  assert.match(jobs.test, /run: npm test\n/);
  assert.match(jobs.test, /actions\/upload-artifact@[0-9a-f]{40}\n\s+with:\n\s+name: dist\n\s+path: dist\/\n\s+include-hidden-files: true\n\s+retention-days: 1\n/);
  assert.match(jobs["build-on-22"], /needs: test\n/);
  assert.match(jobs["build-on-22"], /node-version: 22\n/);
  assert.doesNotMatch(jobs["build-on-22"], /npm ci/);
  assert.match(jobs["build-on-22"], /actions\/download-artifact@[0-9a-f]{40}\n\s+with:\n\s+name: dist\n\s+path: dist\/\n/);
  assert.match(jobs["build-on-22"], /run: node --test "test\/cli\/\*\*\/\*\.test\.mjs" "test\/hooks\/\*\*\/\*\.test\.mjs"\n/);
  assert.match(jobs.mods, /continue-on-error: true\n/);
  assert.match(jobs.mods, /node-version: 24\n/);
  assert.match(jobs.mods, /run: npm ci\n[\s\S]*run: npm install -g @anthropic-ai\/claude-code\n[\s\S]*run: node scripts\/test\.mjs build mods\n/);
  assert.match(jobs.publish, /needs: \[test, build-on-22\]\n/);
  assert.doesNotMatch(jobs.publish, /npm test/);
  const uses = Object.values(jobs).join("").match(/uses: \S+/g);
  assert.ok(uses.length >= 9, uses.join(", "));
  assert.deepEqual(uses.filter((line) => !/@[0-9a-f]{40}$/.test(line)), []);
});

test("checkTag accepts only the v-prefixed package version", () => {
  assert.doesNotThrow(() => checkTag("v1.0.0-alpha.1", "1.0.0-alpha.1"));
  assert.throws(() => checkTag("1.0.0-alpha.1", "1.0.0-alpha.1"), /expected v1\.0\.0-alpha\.1/);
  assert.throws(() => checkTag("v1.0.0-alpha.9", "1.0.0-alpha.1"), /v1\.0\.0-alpha\.9 does not match package\.json version 1\.0\.0-alpha\.1/);
});

test("sync-version rewrites only the core manifest from package.json, never a built mod manifest, and fails in one stderr line", (t) => {
  const ok = project(t, MANIFEST, "9.9.9");
  const twice = project(t, '{ "version": "1", "nested": { "version": "2" } }', "1.0.0-alpha.2");
  const r = syncVersionCli(ok);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(manifestPath(ok, "src"), "utf8"), MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  assert.equal(readFileSync(manifestPath(ok, BUILT_MOD), "utf8"), BUILT_MOD_MANIFEST);
  const bad = syncVersionCli(twice);
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr.trim().split("\n").length, 1, bad.stderr);
});
