import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fakeExec, fakeRegistry, homeFiles, withFakeHost, type FakeHost, type FakeHostOptions } from "#test/styling-host.mts";
import { applyStyle, renderReport, type StyleReport } from "../../plan.mts";
import { removeAll } from "../../removal.mts";
import { detectTerminal } from "../../terminals.mts";
import { readPin } from "../font/index.mts";
import { terminalComponent } from "./index.mts";

const FAMILY = "JetBrainsMono Nerd Font Mono";
const WT_SETTINGS = "AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json";
const WT_DEFAULTS = join(import.meta.dirname, "..", "..", "terminals", "windows-terminal", "wt-defaults.test.json");
const FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const TERMINAL_ONLY = [terminalComponent()];

function withWindowsTerminal(options: FakeHostOptions, fn: (host: FakeHost) => Promise<void>): Promise<void> {
  const files = { [WT_SETTINGS]: readFileSync(WT_DEFAULTS, "utf8") };
  return withFakeHost({ platform: "win32", env: { WT_SESSION: "1" }, files, exec: fakeExec({}), ...options }, fn);
}

function setupTerminalOnly(host: FakeHost) {
  return applyStyle(host, { yes: true, components: TERMINAL_ONLY });
}

function results(report: StyleReport): Record<string, string> {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

function iconsSetting(host: FakeHost): unknown {
  const path = join(host.home, ".picketai", "config.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).statusline?.icons : undefined;
}

test("detectTerminal reads the terminal from the environment (T-5.1)", () => {
  assert.equal(detectTerminal({ WT_SESSION: "abc" }), "windows-terminal");
  assert.equal(detectTerminal({ TERM_PROGRAM: "Apple_Terminal" }), "terminal-app");
  assert.equal(detectTerminal({ KONSOLE_VERSION: "230804" }), "konsole");
  assert.equal(detectTerminal({ PTYXIS_VERSION: "47.0" }), "ptyxis");
  assert.equal(detectTerminal({ GNOME_TERMINAL_SCREEN: "/org/gnome/Terminal/screen/1" }), "gnome-terminal");
  for (const env of [{ TERM_PROGRAM: "iTerm.app" }, { TERM_PROGRAM: "WezTerm" }, { KITTY_WINDOW_ID: "1" }, {}]) assert.equal(detectTerminal(env), "other");
});

test("an unknown terminal writes nothing and prints the palette, the font and the steps (T-5.5)", async () => {
  await withFakeHost({ platform: "linux", env: { TERM_PROGRAM: "WezTerm" }, exec: fakeExec({}) }, async (host) => {
    const text = renderReport(await setupTerminalOnly(host));
    for (const expected of ["#F9782B", "#0D0A08", FAMILY, "WezTerm", "iTerm2", "Kitty", "Ghostty", "Alacritty"]) assert.ok(text.includes(expected), expected);
    assert.deepEqual(homeFiles(host.home), []);
  });
});

test("with the font present the status line switches to nerd icons and revert puts plain back (T-5.6)", async () => {
  const registry = fakeRegistry({ [FONTS_KEY]: { [`${FAMILY} Regular (TrueType)`]: "C:\\x.ttf" } });
  await withWindowsTerminal({ exec: fakeExec({ reg: registry.run }) }, async (host) => {
    assert.equal(results(await setupTerminalOnly(host))["statusline-icons"], "applied");
    assert.equal(iconsSetting(host), "nerd");
    await removeAll(host, { yes: true, components: TERMINAL_ONLY });
    assert.equal(iconsSetting(host), undefined);
  });
  await withWindowsTerminal({}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.equal(results(report)["statusline-icons"], undefined);
    assert.equal(iconsSetting(host), undefined);
  });
});

test("the vendored jsonc-parser keeps Microsoft's MIT licence and names its version (T-5.7)", () => {
  const head = readFileSync("src/lib/util/vendor/jsonc-parser.mjs", "utf8").split("\n").slice(0, 30).join("\n");
  assert.match(head, /^\/\*\*/);
  assert.match(head, /jsonc-parser v\d+\.\d+\.\d+/);
  assert.match(head, /MIT License/);
  assert.match(head, /Copyright \(c\) Microsoft/);
  assert.equal(readPin().family, FAMILY);
});
