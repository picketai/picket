import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { exited, fakeDefaults, fakeExec, withFakeHost, type FakeHost, type FakeHostOptions } from "#test/styling-host.mts";
import { setupTerminal } from "../../setup.mjs";
import { terminalComponent } from "../../terminal.mjs";
import { profileColors, profileFile } from "./index.mts";

type Defaults = ReturnType<typeof fakeDefaults>;

const TERMINAL_ONLY = [terminalComponent()];
const DOMAIN = "com.apple.Terminal";
const KEYS = ["Default Window Settings", "Startup Window Settings"];
const PROFILE = ".picketai/terminal/PicketAI.terminal";
const ARCHIVED_KEYS = [...Object.keys(profileColors()), "Font"];

function base64Of(key: string): string {
  return Buffer.from(`archived ${key}`).toString("base64");
}

function osascript(args: string[]) {
  const script = args.at(-1) ?? "";
  if (script.includes("NSKeyedArchiver")) return exited(0, `${JSON.stringify(Object.fromEntries(ARCHIVED_KEYS.map((key) => [key, base64Of(key)])))}\n`);
  return exited(script.includes('removeObjectForKey("PicketAI")') ? 0 : 1, "removed\n");
}

function basicDefaults(): Defaults {
  return fakeDefaults(Object.fromEntries(KEYS.map((key) => [`${DOMAIN} ${key}`, "Basic"])));
}

function withMac(defaults: Defaults, options: FakeHostOptions, fn: (host: FakeHost) => Promise<void>): Promise<void> {
  return withFakeHost({ platform: "darwin", env: { TERM_PROGRAM: "Apple_Terminal" }, exec: fakeExec({ osascript, defaults: defaults.run, open: () => exited(0) }), ...options }, fn);
}

function setup(host: FakeHost, options = {}) {
  return setupTerminal(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function callsOf(host: FakeHost, command: string, verb?: string): string[][] {
  return host.calls.filter(([name, first]) => name === command && (verb === undefined || first === verb));
}

function recorded(host: FakeHost, id: string) {
  const manifest = JSON.parse(readFileSync(join(host.home, ".picketai", "styling-manifest.json"), "utf8"));
  return manifest.items.find((item: { id: string }) => item.id === id);
}

test("the profile plist names PicketAI as Window Settings and holds the 22 archived values (T-7.1)", () => {
  const text = profileFile(Object.fromEntries(ARCHIVED_KEYS.map((key) => [key, { data: base64Of(key) }])));
  assert.match(text, /<key>name<\/key>\n\t<string>PicketAI<\/string>/);
  assert.match(text, /<key>type<\/key>\n\t<string>Window Settings<\/string>/);
  assert.equal(ARCHIVED_KEYS.length, 22);
  assert.equal(text.match(/<data>/g)?.length, 22);
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
    assert.deepEqual(recorded(host, "terminal-app-default").previous, { [KEYS[0]]: "Basic", [KEYS[1]]: "Basic" });
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
    assert.ok(callsOf(host, "osascript").at(-1)?.at(-1)?.includes('removeObjectForKey("PicketAI")'));
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

test("a full run on macOS with the brew cask switches the status line to Nerd Font icons (B6)", async () => {
  const defaults = basicDefaults();
  const exec = fakeExec({ osascript, defaults: defaults.run, open: () => exited(0), brew: () => exited(0) });
  await withMac(defaults, { exec }, async (host) => {
    const report = await setupTerminal(host, { yes: true });
    assert.equal(report.changes.find((change: { id: string }) => change.id === "statusline-icons")?.result, "applied", JSON.stringify(report.changes));
    const config = JSON.parse(readFileSync(join(host.home, ".picketai", "config.json"), "utf8"));
    assert.equal(config.statusline.icons, "nerd");
    assert.equal(recorded(host, "terminal-app-default").setsFont, true);
  });
});

test("the report asks for a Terminal restart and notes 24-bit colour; a second run changes nothing (T-7.5)", async () => {
  const defaults = basicDefaults();
  await withMac(defaults, {}, async (host) => {
    const report = await setup(host);
    assert.ok(report.restart.some((entry: string) => entry.includes("Terminal.app")), report.restart.join("\n"));
    assert.ok(report.manual.some((step: string) => step.includes("24-bit")), report.manual.join("\n"));
    assert.deepEqual((await setup(host)).changes, []);
    assert.equal(callsOf(host, "osascript").length, 1);
  });
});
