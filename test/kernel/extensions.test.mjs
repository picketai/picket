import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadExtensions, MANIFEST_KEYS, SUPPORTED_SCHEMAS } from "../../dist/lib/shared/extensions.mjs";
import { codeLines, sourceOf } from "#test/kernel-sources.mts";

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
    resolve("src/lib/verbs/route/index.mts"),
    resolve("src/lib/shared/work/gate.mts"),
    resolve("src/lib/shared/work/next-step.mts"),
    resolve(hooks, "route", "verdict", "index.mts"),
    ...readdirSync(join(hooks, "guard"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => resolve(hooks, "guard", entry.name, "index.mts")),
    ...readdirSync(hooks).filter((f) => /^guard\..+\.mjs$/.test(f)).map((f) => resolve(hooks, f)),
  ];
  const reached = reachable(starts, relativeImports);
  assert.ok(reached.size > starts.length, "the walk follows imports");
  assert.equal(reached.has(EXTENSIONS_MODULE), false);

  const planted = { a: ["b"], b: ["c", "loader"], c: [], loader: [] };
  assert.equal(reachable(["a"], (f) => planted[f]).has("loader"), true, "an import added two hops away is found");
});

