import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject, writeConfig } from "#test/project.mts";

function project(t, extensions) {
  const root = withProject(t);
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeConfig(root, { version: 1, extensions });
  return root;
}

function extension(root, folder, manifest, files = {}) {
  const dir = join(root, ".picket", "extensions", folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "extension.json"), JSON.stringify(manifest));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function valid(name, extra = {}) {
  return { name, version: "0.1.0", schema: 1, ...extra };
}

function cli(root, ...args) {
  const r = runCli(root, [...args, "--root", root]);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("picket extension list --human lists enabled, refused and unlisted extensions with reasons", (t) => {
  const root = project(t, ["acme", "ghost", "future"]);
  extension(root, "acme", valid("acme", { rules: ["r.md"] }), { "r.md": "Use pnpm.\n" });
  extension(root, "future", valid("future", { schema: 2 }));
  extension(root, "stray", valid("stray"));
  const r = cli(root, "extension", "list", "--human");
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^enabled  acme 0\.1\.0 \(schema 1\)/m);
  assert.match(r.stdout, /^refused  ghost: no folder/m);
  assert.match(r.stdout, /^refused  future: schema 2 is not supported/m);
  assert.match(r.stdout, /^unlisted stray/m);
});

test("extension add writes the manifest and appends the name, keeping the other config keys", (t) => {
  const root = withProject(t);
  writeConfig(root, { version: 1, sources: { analysis: { env: "SRC" } }, extensions: ["acme"] });
  extension(root, "acme", valid("acme"));
  const r = cli(root, "extension", "add", "local");
  assert.equal(r.code, 0, r.stderr);
  const manifest = readFileSync(join(root, ".picket", "extensions", "local", "extension.json"), "utf8");
  assert.deepEqual(JSON.parse(manifest), { name: "local", version: "0.1.0", schema: 1, rules: [] });
  assert.ok(manifest.endsWith("}\n"));
  const config = JSON.parse(readFileSync(join(root, ".picket", "config.json"), "utf8"));
  assert.deepEqual(config.extensions, ["acme", "local"]);
  assert.deepEqual(config.sources, { analysis: { env: "SRC" } });
  assert.match(cli(root, "extension", "list", "--human").stdout, /^enabled  local 0\.1\.0 \(schema 1\)/m);
});

test("extension add refuses a bad name or a repeat and writes nothing", (t) => {
  const root = withProject(t, { picket: false });
  assert.equal(cli(root, "extension", "add", "local").code, 0);
  const config = readFileSync(join(root, ".picket", "config.json"), "utf8");
  for (const name of ["Local", "../x"]) {
    const r = cli(root, "extension", "add", name);
    assert.equal(r.code, 1, name);
    assert.match(r.stderr, /must match/, name);
  }
  const again = cli(root, "extension", "add", "local");
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already exists/);
  assert.equal(readFileSync(join(root, ".picket", "config.json"), "utf8"), config);
  assert.deepEqual(readdirSync(join(root, ".picket", "extensions")), ["local"]);
});

test("extension add creates the config with version 1 and the one name when none exists", (t) => {
  const root = withProject(t, { picket: false });
  assert.equal(cli(root, "extension", "add", "local").code, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(root, ".picket", "config.json"), "utf8")), { version: 1, extensions: ["local"] });
});
