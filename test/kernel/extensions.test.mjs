import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadExtensions, MANIFEST_KEYS, SUPPORTED_SCHEMAS } from "../../dist/lib/shared/extensions.mjs";
import { codeLines, sourceOf } from "./kernel-sources.mjs";

const BIN = resolve("dist/bin/picket.mjs");
const EXTENSIONS_MODULE = resolve("src/lib/shared/extensions.mjs");

function project(extensions) {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-"));
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions }));
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

test("listed extensions load in config order with their texts; a folder not listed is unlisted", () => {
  const root = project(["acme", "local"]);
  try {
    extension(root, "acme", valid("acme", { rules: ["rules/style.md"], agents: { reviewer: ["agents/reviewer.md"] }, review_steps: [{ path: "review/api.md", min_size: "medium" }], preflight: [{ id: "docker", kind: "command_on_path", value: "docker", level: "warn", message: "install docker" }] }), {
      "rules/style.md": "Use pnpm, never npm.\n",
      "agents/reviewer.md": "Check the OpenAPI file.\n",
      "review/api.md": "| row | check |\n",
    });
    extension(root, "local", valid("local", { rules: ["notes.md"] }), { "notes.md": "Ports start at 8100.\n" });
    extension(root, "stray", valid("stray"));
    const { enabled, refused, unlisted } = loadExtensions(root);
    assert.deepEqual(refused, []);
    assert.deepEqual(enabled.map((e) => e.name), ["acme", "local"]);
    assert.deepEqual(enabled[0].rules, [{ path: ".picket/extensions/acme/rules/style.md", text: "Use pnpm, never npm.\n" }]);
    assert.equal(enabled[0].agents.reviewer[0].text, "Check the OpenAPI file.\n");
    assert.deepEqual(enabled[0].review_steps, [{ path: ".picket/extensions/acme/review/api.md", min_size: "medium" }]);
    assert.equal(enabled[0].preflight[0].id, "docker");
    assert.equal(enabled[1].rules[0].text, "Ports start at 8100.\n");
    assert.deepEqual(unlisted, ["stray"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("each broken manifest refuses its extension with one reason, and a refused one contributes nothing", () => {
  const cases = [
    ["unknown-key", valid("unknown-key", { replace: ["x.md"] }), {}, /unknown key "replace"/],
    ["name-differs", valid("other-name"), {}, /differs from its folder/],
    ["bad-version", valid("bad-version", { version: "1" }), {}, /not a SemVer string/],
    ["future-schema", valid("future-schema", { schema: 2 }), {}, /schema 2 is not supported by this Picket \(supports 1\)/],
    ["escapes", valid("escapes", { rules: ["../../CLAUDE.md"] }), {}, /leaves the extension folder/],
    ["missing-file", valid("missing-file", { rules: ["gone.md"] }), {}, /does not exist/],
    ["verdict-line", valid("verdict-line", { rules: ["r.md"] }), { "r.md": "Review the diff.\nAPPROVED\n" }, /verdict line "APPROVED"/],
    ["folder-rule", valid("folder-rule", { rules: ["rules"] }), { "rules/a.md": "Text.\n" }, /path rules is a folder, not a file/],
    ["folder-step", valid("folder-step", { review_steps: [{ path: "review", min_size: "small" }] }), { "review/a.md": "| row |\n" }, /path review is a folder, not a file/],
  ];
  const root = project([...cases.map(([name]) => name), "linked"]);
  try {
    for (const [name, manifest, files] of cases) extension(root, name, manifest, files);
    const outside = join(root, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "secret.md"), "outside text\n");
    const linked = extension(root, "linked", valid("linked", { rules: ["link/secret.md"] }));
    symlinkSync(outside, join(linked, "link"), "junction");
    const { enabled, refused } = loadExtensions(root);
    assert.deepEqual(enabled, []);
    for (const [name, , , reason] of cases) {
      const r = refused.find((x) => x.name === name);
      assert.ok(r, name);
      assert.match(r.reason, reason, name);
      assert.equal(r.reason.includes("\n"), false, name);
    }
    assert.match(refused.find((x) => x.name === "linked").reason, /resolves outside the extension folder/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the published manifest schema names exactly the loader's manifest keys and schema 1", () => {
  const schema = JSON.parse(readFileSync(resolve("src/lib/shared/extension.schema.json"), "utf8"));
  assert.deepEqual(Object.keys(schema.properties).sort(), [...MANIFEST_KEYS].sort());
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(SUPPORTED_SCHEMAS, [1]);
  assert.equal(schema.properties.schema.const, 1);
  for (const [key, property] of Object.entries(schema.properties)) assert.ok(property.description, key);
});

function relativeImports(file) {
  const code = codeLines(readFileSync(file, "utf8")).join("\n");
  const specifiers = [...code.matchAll(/\bfrom\s+["'](\.[^"']+)["']|\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)|\bimport\s+["'](\.[^"']+)["']/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  return specifiers.map((s) => sourceOf(resolve(dirname(file), s)));
}

function reachable(starts, importsOf) {
  const seen = new Set();
  const queue = [...starts];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...importsOf(file));
  }
  return seen;
}

test("no module reachable from routing, gates, next or the guards imports the extension loader", () => {
  const hooks = resolve("src/lib/hooks");
  const starts = [
    resolve("src/lib/verbs/route/route.mjs"),
    resolve("src/lib/shared/work/gate.mjs"),
    resolve("src/lib/shared/work/next-step.mjs"),
    resolve(hooks, "route.verdict.mjs"),
    ...readdirSync(hooks).filter((f) => /^guard\..+\.mjs$/.test(f)).map((f) => resolve(hooks, f)),
  ];
  const reached = reachable(starts, relativeImports);
  assert.ok(reached.size > starts.length, "the walk follows imports");
  assert.equal(reached.has(EXTENSIONS_MODULE), false);

  const planted = { a: ["b"], b: ["c", "loader"], c: [], loader: [] };
  assert.equal(reachable(["a"], (f) => planted[f]).has("loader"), true, "an import added two hops away is found");
});

test("picket extension list --human lists enabled, refused and unlisted extensions with reasons", () => {
  const root = project(["acme", "ghost", "future"]);
  try {
    extension(root, "acme", valid("acme", { rules: ["r.md"] }), { "r.md": "Use pnpm.\n" });
    extension(root, "future", valid("future", { schema: 2 }));
    extension(root, "stray", valid("stray"));
    const r = spawnSync("node", [BIN, "extension", "list", "--root", root, "--human"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^enabled  acme 0\.1\.0 \(schema 1\)/m);
    assert.match(r.stdout, /^refused  ghost: no folder/m);
    assert.match(r.stdout, /^refused  future: schema 2 is not supported/m);
    assert.match(r.stdout, /^unlisted stray/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function cli(root, ...args) {
  const r = spawnSync("node", [BIN, ...args, "--root", root], { encoding: "utf8" });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("extension add writes the manifest and appends the name, keeping the other config keys", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-new-"));
  try {
    mkdirSync(join(root, ".picket"));
    writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, sources: { analysis: { env: "SRC" } }, extensions: ["acme"] }));
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
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extension add refuses a bad name or a repeat and writes nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-new-"));
  try {
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
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extension add creates the config with version 1 and the one name when none exists", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-new-"));
  try {
    assert.equal(cli(root, "extension", "add", "local").code, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(root, ".picket", "config.json"), "utf8")), { version: 1, extensions: ["local"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
