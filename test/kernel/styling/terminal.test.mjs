import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { iconsMode } from "../../../core/lib/statusline.mjs";
import { readPin } from "../../../core/lib/styling/font.mjs";
import { renderReport, setupTerminal } from "../../../core/lib/styling/setup.mjs";
import { detectTerminal, terminalComponent } from "../../../core/lib/styling/terminal.mjs";
import { parse } from "../../../core/lib/vendor/jsonc-parser.mjs";
import { fakeExec, fakeHost, fakeRegistry, homeFiles, writeHomeFile } from "./host-fixture.mjs";

const FAMILY = "JetBrainsMono Nerd Font Mono";
const WT_SETTINGS = "AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json";
const FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const TERMINAL_ONLY = [terminalComponent()];

function fixture(name) {
  return readFileSync(join("test", "kernel", "styling", "fixtures", name), "utf8");
}

async function withTerminal(settingsText, options, fn) {
  const files = settingsText === null ? {} : { [WT_SETTINGS]: settingsText };
  const host = fakeHost({ platform: "win32", env: { WT_SESSION: "1" }, files, exec: fakeExec({}), ...options });
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function setupTerminalOnly(host, options = {}) {
  return setupTerminal(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function revert(host) {
  return setupTerminal(host, { revert: true, yes: true, components: TERMINAL_ONLY });
}

function wtText(host) {
  return readFileSync(join(host.home, ...WT_SETTINGS.split("/")), "utf8");
}

function wtSettings(host) {
  const errors = [];
  const settings = parse(wtText(host), errors, { allowTrailingComma: true });
  assert.deepEqual(errors, []);
  return settings;
}

function results(report) {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

test("detectTerminal reads the terminal from the environment (T-5.1)", () => {
  assert.equal(detectTerminal({ WT_SESSION: "abc" }), "windows-terminal");
  assert.equal(detectTerminal({ TERM_PROGRAM: "Apple_Terminal" }), "terminal-app");
  assert.equal(detectTerminal({ KONSOLE_VERSION: "230804" }), "konsole");
  assert.equal(detectTerminal({ PTYXIS_VERSION: "47.0" }), "ptyxis");
  assert.equal(detectTerminal({ GNOME_TERMINAL_SCREEN: "/org/gnome/Terminal/screen/1" }), "gnome-terminal");
  for (const env of [{ TERM_PROGRAM: "iTerm.app" }, { TERM_PROGRAM: "WezTerm" }, { KITTY_WINDOW_ID: "1" }, {}]) assert.equal(detectTerminal(env), "other");
});

test("Windows Terminal gains the PicketAI scheme and defaults with every comment kept (T-5.2)", async () => {
  const original = fixture("wt-comments.json");
  await withTerminal(original, {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.equal(results(report)["windows-terminal-scheme@stable"], "applied");
    assert.equal(results(report)["windows-terminal-defaults@stable"], "applied");
    const text = wtText(host);
    for (const line of original.split("\n").filter((l) => l.includes("//") || l.includes("/*"))) assert.ok(text.includes(line), line);
    const settings = wtSettings(host);
    assert.equal(settings.schemes.length, 3);
    assert.equal(settings.schemes.find((scheme) => scheme.name === "PicketAI").background, "#0D0A08");
    assert.equal(settings.profiles.defaults.colorScheme, "PicketAI");
    assert.equal(settings.profiles.defaults.font.face, FAMILY);
    assert.ok(report.manual.some((step) => step.includes("Ubuntu")), report.manual.join("\n"));
  });
});

test("no to the default question adds the scheme only (T-5.2)", async () => {
  await withTerminal(fixture("wt-comments.json"), { answers: ["yes", "no"] }, async (host) => {
    const report = await setupTerminalOnly(host, { yes: false });
    assert.equal(results(report)["windows-terminal-defaults@stable"], "skipped");
    const settings = wtSettings(host);
    assert.equal(settings.schemes.length, 3);
    assert.equal(settings.profiles.defaults.colorScheme, undefined);
  });
});

test("a second run changes nothing and revert of an untouched file restores its bytes (T-5.3)", async () => {
  const original = fixture("wt-comments.json");
  await withTerminal(original, {}, async (host) => {
    await setupTerminalOnly(host);
    const after = wtText(host);
    assert.deepEqual((await setupTerminalOnly(host)).changes, []);
    assert.equal(wtText(host), after);
    await revert(host);
    assert.equal(wtText(host), original);
  });
});

test("revert after a user edit removes the scheme, puts Campbell back and keeps the new profile (T-5.3)", async () => {
  await withTerminal(fixture("wt-defaults.json"), {}, async (host) => {
    await setupTerminalOnly(host);
    const settings = wtSettings(host);
    settings.profiles.list.push({ guid: "{00000000-0000-0000-0000-000000000001}", name: "Added" });
    writeHomeFile(host.home, WT_SETTINGS, JSON.stringify(settings, null, 4));
    assert.deepEqual(Object.values(results(await revert(host))), ["removed", "removed"]);
    const reverted = wtSettings(host);
    assert.deepEqual(reverted.schemes, []);
    assert.equal(reverted.profiles.defaults.colorScheme, "Campbell");
    assert.deepEqual(reverted.profiles.defaults.font, { size: 11 });
    assert.ok(reverted.profiles.list.some((profile) => profile.name === "Added"));
  });
});

test("no settings file, or the old profiles list, gives a manual step and writes nothing (T-5.4)", async () => {
  await withTerminal(null, {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.deepEqual(report.changes.map((change) => change.result), ["manual"]);
    assert.ok(report.manual.some((step) => step.includes("Open JSON file")));
    assert.deepEqual(homeFiles(host.home), []);
  });
  const legacy = fixture("wt-profiles-array.json");
  await withTerminal(legacy, {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.deepEqual(report.changes.map((change) => change.result), ["manual"]);
    assert.equal(wtText(host), legacy);
    assert.deepEqual(homeFiles(host.home), [WT_SETTINGS]);
  });
});

test("an unknown terminal writes nothing and prints the palette, the font and the steps (T-5.5)", async () => {
  const host = fakeHost({ platform: "linux", env: { TERM_PROGRAM: "WezTerm" }, exec: fakeExec({}) });
  try {
    const text = renderReport(await setupTerminalOnly(host));
    for (const expected of ["#F9782B", "#0D0A08", FAMILY, "WezTerm", "iTerm2", "Kitty", "Ghostty", "Alacritty"]) assert.ok(text.includes(expected), expected);
    assert.deepEqual(homeFiles(host.home), []);
  } finally {
    host.dispose();
  }
});

test("with the font present the status line switches to nerd icons and revert puts plain back (T-5.6)", async () => {
  const registry = fakeRegistry({ [FONTS_KEY]: { [`${FAMILY} Regular (TrueType)`]: "C:\\x.ttf" } });
  await withTerminal(fixture("wt-defaults.json"), { exec: fakeExec({ reg: registry.run }) }, async (host) => {
    assert.equal(results(await setupTerminalOnly(host))["statusline-icons"], "applied");
    assert.equal(iconsMode(host.home), "nerd");
    await revert(host);
    assert.equal(iconsMode(host.home), "plain");
  });
  await withTerminal(fixture("wt-defaults.json"), {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.equal(results(report)["statusline-icons"], undefined);
    assert.equal(iconsMode(host.home), "plain");
  });
});

test("the vendored jsonc-parser keeps Microsoft's MIT licence and names its version (T-5.7)", () => {
  const head = readFileSync("core/lib/vendor/jsonc-parser.mjs", "utf8").split("\n").slice(0, 30).join("\n");
  assert.match(head, /^\/\*\*/);
  assert.match(head, /jsonc-parser v\d+\.\d+\.\d+/);
  assert.match(head, /MIT License/);
  assert.match(head, /Copyright \(c\) Microsoft/);
  assert.equal(readPin().family, FAMILY);
});
