import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { loadConfig, CONFIG_DEFAULTS, DEFAULT_LANES, DEFAULT_SECURITY_PATHS, KNOWN_KEYS } from "../../core/lib/config.mjs";
import { detectTooling } from "../../core/lib/preflight.mjs";
import { configRel, hostPath } from "../../core/lib/paths.mjs";
import { codeLines } from "./kernel-sources.mjs";
import { writeConfig } from "./config-fixture.mjs";

const SCHEMA = JSON.parse(readFileSync(resolve("core/lib/config.schema.json"), "utf8"));

function projectWith(config) {
  const root = mkdtempSync(join(tmpdir(), "harness-config-"));
  mkdirSync(hostPath(root));
  if (config !== undefined) writeConfig(root, config);
  return root;
}

function withProject(config, fn) {
  const root = projectWith(config);
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("paths.mjs is the only file under core/lib whose code names the config file (T-2.4)", () => {
  const configName = new RegExp(`(?<![\\w.-])${basename(configRel()).replaceAll(".", "\\.")}`);
  assert.equal(configName.test('const f = "tsconfig.json";'), false);
  assert.equal(configName.test('const f = ".picket/config.json";'), true);
  const lib = resolve("core/lib");
  const naming = readdirSync(lib)
    .filter((f) => f.endsWith(".mjs") && codeLines(readFileSync(join(lib, f), "utf8")).some((line) => configName.test(line)));
  assert.deepEqual(naming, ["paths.mjs"]);
});

test("an unset env var gives the source with root null and a reason naming the variable (T-3.2)", () => {
  withProject({ sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } }, (root) => {
    const c = loadConfig(root, {});
    assert.equal(c.error, null);
    assert.deepEqual(c.security_paths, DEFAULT_SECURITY_PATHS);
    assert.equal(c.sources.length, 1);
    assert.deepEqual([c.sources[0].name, c.sources[0].root], ["analysis", null]);
    assert.match(c.sources[0].reason, /HARNESS_SOURCE_ANALYSIS/);
  });
});

test("a set env var resolves to an absolute root; a missing directory is a reason, not a root", () => {
  withProject({ security_paths: ["src/pay/"], sources: { analysis: { env: "X_SRC" } } }, (root) => {
    assert.equal(loadConfig(root, { X_SRC: root }).sources[0].root, resolve(root));
    assert.deepEqual(loadConfig(root, { X_SRC: root }).security_paths, ["src/pay/"]);
    const gone = loadConfig(root, { X_SRC: join(root, "nope") }).sources[0];
    assert.equal(gone.root, null);
    assert.match(gone.reason, /not a directory/);
  });
});

test("a file with every key returns them, with no warning (T-5.1)", () => {
  const config = {
    version: 1,
    security_paths: ["src/pay/"],
    sources: { analysis: { env: "X_SRC" } },
    lanes: { fast: { max_files: 2 }, order: { max_phases: 2, max_decisions: 4 }, design: { max_phases: 6, max_decisions: 7 } },
    commands: { test: "node -e 1", lint: "npm run lint", build: "npm run build", run: "node server.mjs" },
  };
  withProject(config, (root) => {
    const c = loadConfig(root, {});
    assert.deepEqual(c.warnings, []);
    assert.equal(c.version, 1);
    assert.deepEqual(c.security_paths, config.security_paths);
    assert.deepEqual(c.sources.map((s) => s.name), ["analysis"]);
    assert.deepEqual(c.lanes, config.lanes);
    assert.deepEqual(c.commands, config.commands);
  });
});

test("a wrong cap type keeps the default with a warning (T-5.1)", () => {
  withProject({ version: 1, lanes: { order: { max_phases: "x" } } }, (root) => {
    const c = loadConfig(root, {});
    assert.equal(c.lanes.order.max_phases, 3);
    assert.equal(c.lanes.order.max_decisions, 5);
    assert.equal(c.warnings.length, 1);
    assert.match(c.warnings[0], /lanes\.order\.max_phases must be a positive integer/);
  });
});

test("an unknown key and a version other than 1 each give a warning (T-5.1)", () => {
  withProject({ version: 1, plugins: {} }, (root) => assert.deepEqual(loadConfig(root, {}).warnings, ['unknown key "plugins"']));
  withProject({ version: 2 }, (root) => {
    const c = loadConfig(root, {});
    assert.equal(c.warnings.length, 1);
    assert.match(c.warnings[0], /version 2 is not 1/);
  });
});

test("malformed JSON keeps the defaults and sets error (T-5.1)", () => {
  withProject("{ not json", (root) => {
    const c = loadConfig(root, {});
    assert.deepEqual(c.security_paths, DEFAULT_SECURITY_PATHS);
    assert.deepEqual(c.sources, []);
    assert.deepEqual(c.lanes, DEFAULT_LANES);
    assert.deepEqual(c.commands, {});
    assert.match(c.error, /malformed/);
  });
});

test("no config file is the defaults with no error and no warning", () => {
  withProject(undefined, (root) => {
    assert.deepEqual(loadConfig(root, {}), { version: 1, security_paths: DEFAULT_SECURITY_PATHS, sources: [], lanes: DEFAULT_LANES, commands: {}, extensions: [], error: null, warnings: [] });
  });
});

test("the published schema names the loader's keys and carries its defaults (T-5.2)", () => {
  assert.deepEqual(Object.keys(SCHEMA.properties).sort(), [...KNOWN_KEYS].sort());
  for (const key of KNOWN_KEYS) assert.deepEqual(SCHEMA.properties[key].default, CONFIG_DEFAULTS[key], key);
  assert.deepEqual(Object.keys(SCHEMA.properties.lanes.properties).sort(), Object.keys(DEFAULT_LANES).sort());
  for (const [lane, caps] of Object.entries(DEFAULT_LANES)) {
    assert.deepEqual(Object.keys(SCHEMA.properties.lanes.properties[lane].properties).sort(), Object.keys(caps).sort(), lane);
  }
});

test("a configured command overrides detection; a destructive one is dropped with a warning (T-5.4)", () => {
  withProject({ version: 1, commands: { test: "node -e 1" } }, (root) => {
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    assert.equal(detectTooling(root).test, "node -e 1");
  });
  withProject({ version: 1, commands: { test: "rm -rf ." } }, (root) => {
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    const c = loadConfig(root, {});
    assert.deepEqual(c.commands, {});
    assert.match(c.warnings[0], /commands\.test dropped: .*destructive/);
    assert.equal(detectTooling(root).test, "npm test");
  });
});

test("extensions defaults to an empty list, keeps a valid list and drops a malformed one with a warning", () => {
  withProject({ version: 1, extensions: ["acme", "local"] }, (root) => {
    const config = loadConfig(root, {});
    assert.deepEqual(config.extensions, ["acme", "local"]);
    assert.deepEqual(config.warnings, []);
  });
  withProject({ version: 1, extensions: "acme" }, (root) => {
    const config = loadConfig(root, {});
    assert.deepEqual(config.extensions, []);
    assert.match(config.warnings.join("\n"), /extensions must be a list/);
  });
  withProject({ version: 1, extensions: ["acme", 7] }, (root) => {
    const config = loadConfig(root, {});
    assert.deepEqual(config.extensions, ["acme"]);
    assert.match(config.warnings.join("\n"), /not a name; it is dropped/);
  });
  assert.deepEqual(SCHEMA.properties.extensions.default, []);
});
