import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setupTerminal } from "../../../dist/lib/shared/styling/setup.mjs";
import { terminalComponent } from "../../../dist/lib/shared/styling/terminal.mjs";
import { profileColors, profileFile } from "../../../dist/lib/shared/styling/terminals/terminal-app.mjs";
import { exited, fakeDefaults, fakeExec, fakeHost } from "./host-fixture.mjs";

const TERMINAL_ONLY = [terminalComponent()];
const DOMAIN = "com.apple.Terminal";
const KEYS = ["Default Window Settings", "Startup Window Settings"];
const PROFILE = ".picketai/terminal/PicketAI.terminal";
const ARCHIVED_KEYS = [...Object.keys(profileColors()), "Font"];

function base64Of(key) {
  return Buffer.from(`archived ${key}`).toString("base64");
}

function osascript(args) {
  const script = args.at(-1);
  if (script.includes("NSKeyedArchiver")) return exited(0, `${JSON.stringify(Object.fromEntries(ARCHIVED_KEYS.map((key) => [key, base64Of(key)])))}\n`);
  return exited(script.includes('removeObjectForKey("PicketAI")') ? 0 : 1, "removed\n");
}

function basicDefaults() {
  return fakeDefaults(Object.fromEntries(KEYS.map((key) => [`${DOMAIN} ${key}`, "Basic"])));
}

async function withMac(defaults, options, fn) {
  const host = fakeHost({ platform: "darwin", env: { TERM_PROGRAM: "Apple_Terminal" }, exec: fakeExec({ osascript, defaults: defaults.run, open: () => exited(0) }), ...options });
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function setup(host, options = {}) {
  return setupTerminal(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function callsOf(host, command, verb) {
  return host.calls.filter(([name, first]) => name === command && (verb === undefined || first === verb));
}

function manifestItem(host, id) {
  return JSON.parse(readFileSync(join(host.home, ".picketai", "styling-manifest.json"), "utf8")).items.find((item) => item.id === id);
}

test("the profile plist names PicketAI as Window Settings and holds the 22 archived values (T-7.1)", () => {
  const text = profileFile(Object.fromEntries(ARCHIVED_KEYS.map((key) => [key, { data: base64Of(key) }])));
  assert.match(text, /<key>name<\/key>\n\t<string>PicketAI<\/string>/);
  assert.match(text, /<key>type<\/key>\n\t<string>Window Settings<\/string>/);
  assert.equal(ARCHIVED_KEYS.length, 22);
  assert.equal(text.match(/<data>/g).length, 22);
  for (const key of ARCHIVED_KEYS) assert.ok(text.includes(`<key>${key}</key>\n\t<data>${base64Of(key)}</data>`), key);
});

test("setup archives once, writes and opens the profile, and makes it the default (T-7.2)", async () => {
  const defaults = basicDefaults();
  await withMac(defaults, {}, async (host) => {
    await setup(host);
    assert.equal(callsOf(host, "osascript").length, 1);
    const path = join(host.home, ...PROFILE.split("/"));
    assert.ok(existsSync(path));
    assert.deepEqual(callsOf(host, "open"), [["open", path]]);
    assert.deepEqual(manifestItem(host, "terminal-app-default").previous, { [KEYS[0]]: "Basic", [KEYS[1]]: "Basic" });
    assert.deepEqual(callsOf(host, "defaults", "write"), KEYS.map((key) => ["defaults", "write", DOMAIN, key, "-string", "PicketAI"]));
  });
});

test("no to the default question imports the profile and writes no default (T-7.3)", async () => {
  const defaults = basicDefaults();
  await withMac(defaults, { answers: ["yes", "no"] }, async (host) => {
    await setup(host, { yes: false });
    assert.ok(existsSync(join(host.home, ...PROFILE.split("/"))));
    assert.equal(callsOf(host, "open").length, 1);
    assert.deepEqual(callsOf(host, "defaults", "write"), []);
  });
});

test("revert writes the old defaults back, removes the profile entry and deletes the file (T-7.4)", async () => {
  const defaults = basicDefaults();
  await withMac(defaults, {}, async (host) => {
    await setup(host);
    await setupTerminal(host, { revert: true, yes: true, components: TERMINAL_ONLY });
    for (const key of KEYS) assert.equal(defaults.values.get(`${DOMAIN} ${key}`), "Basic");
    assert.ok(callsOf(host, "osascript").at(-1).at(-1).includes('removeObjectForKey("PicketAI")'));
    assert.equal(existsSync(join(host.home, ...PROFILE.split("/"))), false);
  });
  const empty = fakeDefaults();
  await withMac(empty, {}, async (host) => {
    await setup(host);
    await setupTerminal(host, { revert: true, yes: true, components: TERMINAL_ONLY });
    assert.deepEqual(callsOf(host, "defaults", "delete"), KEYS.map((key) => ["defaults", "delete", DOMAIN, key]));
    assert.equal(empty.values.size, 0);
  });
});

test("the report asks for a Terminal restart and notes 24-bit colour; a second run changes nothing (T-7.5)", async () => {
  const defaults = basicDefaults();
  await withMac(defaults, {}, async (host) => {
    const report = await setup(host);
    assert.ok(report.restart.some((entry) => entry.includes("Terminal.app")), report.restart.join("\n"));
    assert.ok(report.manual.some((step) => step.includes("24-bit")), report.manual.join("\n"));
    assert.deepEqual((await setup(host)).changes, []);
    assert.equal(callsOf(host, "osascript").length, 1);
  });
});
