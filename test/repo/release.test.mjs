import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkTag, distTag, releaseVersion, renameRelease, syncPluginVersion } from "../../.github/scripts/release.mjs";
import { INSTALL } from "../../src/lib/shared/install.mts";
import { withProject } from "#test/project.mts";

const SCRIPT = resolve(".github/scripts/release.mjs");
const MANIFEST = '{\n  "name": "picket",\n  "version": "1.0.0-alpha.1",\n  "author": { "name": "Vlad Apetre" },\n  "skills": ["./skills/a"]\n}\n';
function manifestPath(root) {
  return join(root, "src", ".claude-plugin", "plugin.json");
}

function project(t, manifest, version) {
  const root = withProject(t, { picket: false });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@picketai/picket", version }));
  mkdirSync(dirname(manifestPath(root)), { recursive: true });
  writeFileSync(manifestPath(root), manifest);
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

test("the release workflow tests on Node 24, checks the build on Node 22, tests the mods, and publishes only after all three (D-006)", () => {
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
  assert.match(jobs["build-on-22"], /download-artifact@[0-9a-f]{40}\n\s+with:\n\s+name: dist\n\s+path: dist\/\n\n\s+- name: .+\n\s+run: chmod \+x dist\/bin\/picket\n\n\s+- name: Test the build\n\s+run: node --test /);
  assert.equal(jobs["build-on-22"].match(/chmod/g).length, 1);
  assert.doesNotMatch(jobs.mods, /continue-on-error/);
  assert.match(jobs.mods, /node-version: 24\n/);
  assert.match(jobs.mods, /run: npm ci\n[\s\S]*run: npm install -g @anthropic-ai\/claude-code\n[\s\S]*run: node scripts\/test\.mjs build mods\n/);
  assert.match(jobs.publish, /needs: \[test, build-on-22, mods\]\n/);
  assert.doesNotMatch(jobs.publish, /npm test/);
  assert.match(jobs.publish, /run: npm ci\n/);
  const uses = Object.values(jobs).join("").match(/uses: \S+/g);
  assert.ok(uses.length >= 9, uses.join(", "));
  assert.deepEqual(uses.filter((line) => !/@[0-9a-f]{40}$/.test(line)), []);
});

test("both publish steps publish ./dist under the chosen dist-tag, and only ./dist (T-5.5)", () => {
  const { publish } = workflowJobs();
  const runs = publish.match(/run: npm publish.*\n/g);
  assert.deepEqual(runs, ['run: npm publish ./dist --access public --tag "$DIST_TAG"\n', 'run: npm publish ./dist --dry-run --access public --tag "$DIST_TAG"\n']);
});

test("init's settings marketplace names this package and the dist-tag its version publishes under (T-6.1)", () => {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  const [plugin] = INSTALL.marketplace.source.plugins;
  assert.equal(INSTALL.marketplace.source.source, "settings");
  assert.equal(INSTALL.marketplace.source.name, "picketai");
  assert.deepEqual(plugin.source, { source: "npm", package: pkg.name, version: distTag(pkg.version) });
  assert.equal(plugin.source.package, "@picketai/picket");
});

test("checkTag accepts only the v-prefixed package version", () => {
  assert.doesNotThrow(() => checkTag("v1.0.0-alpha.1", "1.0.0-alpha.1"));
  assert.throws(() => checkTag("1.0.0-alpha.1", "1.0.0-alpha.1"), /expected v1\.0\.0-alpha\.1/);
  assert.throws(() => checkTag("v1.0.0-alpha.9", "1.0.0-alpha.1"), /v1\.0\.0-alpha\.9 does not match package\.json version 1\.0\.0-alpha\.1/);
});

test("sync-version rewrites the core manifest from package.json, and fails in one stderr line", (t) => {
  const ok = project(t, MANIFEST, "9.9.9");
  const twice = project(t, '{ "version": "1", "nested": { "version": "2" } }', "1.0.0-alpha.2");
  const r = syncVersionCli(ok);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(manifestPath(ok), "utf8"), MANIFEST.replace("1.0.0-alpha.1", "9.9.9"));
  const bad = syncVersionCli(twice);
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr.trim().split("\n").length, 1, bad.stderr);
});

const PREPARED = "# Changelog\n\n## 1.0.0-alpha.7 (not released yet)\n\n- x\n\n## 1.0.0-alpha.6\n";
const RELEASED = PREPARED.replace("## 1.0.0-alpha.7 (not released yet)", "## 1.0.0-alpha.7");

function changelogProject(t, text) {
  const root = withProject(t, { picket: false });
  writeFileSync(join(root, "CHANGELOG.md"), text);
  return root;
}

function releaseCli(root, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args, "--root", root], { encoding: "utf8" });
}

function assertOneLineFailure(r) {
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
  assert.equal(r.stderr.trim().split("\n").length, 1, r.stderr);
}

test("releaseVersion reads the version of a newest heading that ends (not released yet) (T-1.1)", () => {
  assert.equal(releaseVersion(PREPARED), "1.0.0-alpha.7");
  assert.equal(releaseVersion(PREPARED.replaceAll("\n", "\r\n")), "1.0.0-alpha.7");
});

test("releaseVersion refuses a released newest heading and a changelog without one (T-1.1)", () => {
  assert.throws(() => releaseVersion(RELEASED), { message: 'newest CHANGELOG.md heading "## 1.0.0-alpha.7" does not end "(not released yet)"' });
  assert.throws(() => releaseVersion("# Changelog\n\n### Added\n"), { message: 'CHANGELOG.md has no "## " heading' });
});

test("renameRelease drops (not released yet) from the newest heading and keeps every other byte (T-1.2)", () => {
  assert.equal(renameRelease(PREPARED, "1.0.0-alpha.7"), RELEASED);
  const crlf = PREPARED.replaceAll("\n", "\r\n");
  assert.equal(renameRelease(crlf, "1.0.0-alpha.7"), RELEASED.replaceAll("\n", "\r\n"));
});

test("renameRelease refuses a version other than the prepared one, naming both (T-1.2)", () => {
  assert.throws(() => renameRelease(PREPARED, "1.0.0-alpha.8"), { message: "newest CHANGELOG.md heading prepares 1.0.0-alpha.7, not 1.0.0-alpha.8" });
});

test("changelog-check prints the prepared version and changelog-rename writes the released heading (T-1.3)", (t) => {
  const root = changelogProject(t, PREPARED);
  const check = releaseCli(root, "changelog-check");
  assert.equal(check.status, 0, check.stderr);
  assert.equal(check.stdout, "1.0.0-alpha.7\n");
  assert.equal(readFileSync(join(root, "CHANGELOG.md"), "utf8"), PREPARED);
  const rename = releaseCli(root, "changelog-rename", "1.0.0-alpha.7");
  assert.equal(rename.status, 0, rename.stderr);
  assert.equal(rename.stdout, "");
  assert.equal(readFileSync(join(root, "CHANGELOG.md"), "utf8"), RELEASED);
});

test("changelog-rename with another version and changelog-check on a released heading fail in one stderr line and write nothing (T-1.4)", (t) => {
  const prepared = changelogProject(t, PREPARED);
  assertOneLineFailure(releaseCli(prepared, "changelog-rename", "1.0.0-alpha.8"));
  assert.equal(readFileSync(join(prepared, "CHANGELOG.md"), "utf8"), PREPARED);
  const released = changelogProject(t, RELEASED);
  assertOneLineFailure(releaseCli(released, "changelog-check"));
  assert.equal(readFileSync(join(released, "CHANGELOG.md"), "utf8"), RELEASED);
});

test("changelog-rename without a version fails in one stderr line", (t) => {
  const root = changelogProject(t, PREPARED);
  assertOneLineFailure(releaseCli(root, "changelog-rename"));
  assert.equal(readFileSync(join(root, "CHANGELOG.md"), "utf8"), PREPARED);
});
