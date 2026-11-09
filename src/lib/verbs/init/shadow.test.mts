import { test } from "node:test";
import assert from "node:assert/strict";
import { shadowingPicket, shadowWarning, type ShadowProbe } from "./shadow.mts";

const HOME = "/home/u";
const NPX = "/home/u/.npm/_npx/ab12/node_modules/.bin";
const GLOBAL = "/usr/local/bin";
const PLUGIN = "/home/u/.claude/plugins/cache/picketai/picket/1.0.0/bin";

function probe(folders: string[], overrides: Partial<ShadowProbe> = {}): ShadowProbe {
  const files = new Set(folders.map((folder) => `${folder}/picket`));
  return {
    pathEnv: folders.join(":"),
    platform: "linux",
    home: HOME,
    configDir: null,
    realpath: (path) => path,
    isFile: (path) => files.has(path),
    ...overrides,
  };
}

test("the first picket on PATH outside the plugin cache and the npx cache is the shadow (T-6.4)", () => {
  assert.equal(shadowingPicket(probe([NPX, GLOBAL, PLUGIN])), "/usr/local/bin/picket");
});

test("a PATH holding only the npx and the plugin launchers has no shadow (T-6.4)", () => {
  assert.equal(shadowingPicket(probe([NPX, PLUGIN])), null);
});

test("with a config dir set, its plugins folder is skipped and the one under home is not (T-6.4)", () => {
  const custom = "/srv/claude/plugins/cache/picketai/picket/1.0.0/bin";
  assert.equal(shadowingPicket(probe([custom, PLUGIN], { configDir: "/srv/claude" })), `${PLUGIN}/picket`);
  assert.equal(shadowingPicket(probe([custom], { configDir: "/srv/claude" })), null);
});

test("a global launcher that links into the plugin cache is not a shadow, and one that links elsewhere is", () => {
  const linked = probe([GLOBAL], { realpath: (path) => (path === `${GLOBAL}/picket` ? `${PLUGIN}/picket` : path) });
  assert.equal(shadowingPicket(linked), null);
  const global = probe([GLOBAL], { realpath: (path) => (path === `${GLOBAL}/picket` ? "/usr/local/lib/node_modules/@picketai/picket/dist/bin/picket.mjs" : path) });
  assert.equal(shadowingPicket(global), "/usr/local/bin/picket");
});

test("on win32 only picket.cmd counts, in any letter case of the plugins folder (T-6.4)", () => {
  const roaming = "C:\\Users\\u\\AppData\\Roaming\\npm";
  const plugin = "c:\\users\\u\\.claude\\plugins\\cache\\picketai\\picket\\1.0.0\\bin";
  const files = new Set([`${roaming}\\picket`, `${plugin}\\picket.cmd`]);
  const windows: ShadowProbe = { pathEnv: [roaming, plugin].join(";"), platform: "win32", home: "C:\\Users\\u", configDir: null, realpath: (path) => path, isFile: (path) => files.has(path) };
  assert.equal(shadowingPicket(windows), null);
  files.add(`${roaming}\\picket.cmd`);
  assert.equal(shadowingPicket(windows), `${roaming}\\picket.cmd`);
});

test("the warning names the shadowing path and the npm command that removes it", () => {
  assert.equal(shadowWarning("/usr/local/bin/picket"), "/usr/local/bin/picket is a picket from an earlier global install and runs before the plugin's; remove it with npm uninstall -g @picketai/picket");
});
