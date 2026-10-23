import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fakeExec, homeFiles, withFakeHost, writeHomeFile, type FakeHost, type FakeHostOptions } from "#test/styling-host.mts";
import { parse, type ParseError } from "../../../../util/vendor/jsonc-parser.mjs";
import { terminalComponent } from "../../components/terminal/index.mts";
import { applyStyle, type ApplyOptions, type StyleReport } from "../../plan.mts";
import { removeAll } from "../../removal.mts";

type WtSettings = {
  schemes: { name: string; background: string }[];
  profiles: { defaults: { colorScheme?: string; font?: { face?: string; size?: number } }; list: { guid?: string; name?: string }[] };
};

const FAMILY = "JetBrainsMono Nerd Font Mono";
const WT_SETTINGS = "AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json";
const TERMINAL_ONLY = [terminalComponent()];

function fixture(name: string): string {
  return readFileSync(join(import.meta.dirname, `${name}.test.json`), "utf8");
}

function withTerminal(settingsText: string | null, options: FakeHostOptions, fn: (host: FakeHost) => Promise<void>): Promise<void> {
  const files: Record<string, string> = settingsText === null ? {} : { [WT_SETTINGS]: settingsText };
  return withFakeHost({ platform: "win32", env: { WT_SESSION: "1" }, files, exec: fakeExec({}), ...options }, fn);
}

function setupTerminalOnly(host: FakeHost, options: ApplyOptions = {}) {
  return applyStyle(host, { yes: true, components: TERMINAL_ONLY, ...options });
}

function revert(host: FakeHost) {
  return removeAll(host, { yes: true, components: TERMINAL_ONLY });
}

function wtText(host: FakeHost): string {
  return readFileSync(join(host.home, ...WT_SETTINGS.split("/")), "utf8");
}

function wtSettings(host: FakeHost): WtSettings {
  const errors: ParseError[] = [];
  const settings = parse(wtText(host), errors, { allowTrailingComma: true });
  assert.deepEqual(errors, []);
  return settings as WtSettings;
}

function results(report: StyleReport): Record<string, string> {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

test("Windows Terminal gains the PicketAI scheme and defaults with every comment kept (T-5.2)", async () => {
  const original = fixture("wt-comments");
  await withTerminal(original, {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.equal(results(report)["windows-terminal-scheme@stable"], "applied");
    assert.equal(results(report)["windows-terminal-defaults@stable"], "applied");
    const text = wtText(host);
    for (const line of original.split("\n").filter((l) => l.includes("//") || l.includes("/*"))) assert.ok(text.includes(line), line);
    const settings = wtSettings(host);
    assert.equal(settings.schemes.length, 3);
    assert.equal(settings.schemes.find((scheme) => scheme.name === "PicketAI")?.background, "#0D0A08");
    assert.equal(settings.profiles.defaults.colorScheme, "PicketAI");
    assert.equal(settings.profiles.defaults.font?.face, FAMILY);
    assert.ok(report.manual.some((step) => step.includes("Ubuntu")), report.manual.join("\n"));
  });
});

test("no to the default question adds the scheme only (T-5.2)", async () => {
  await withTerminal(fixture("wt-comments"), { answers: ["yes", "no"] }, async (host) => {
    const report = await setupTerminalOnly(host, { yes: false });
    assert.equal(results(report)["windows-terminal-defaults@stable"], "skipped");
    const settings = wtSettings(host);
    assert.equal(settings.schemes.length, 3);
    assert.equal(settings.profiles.defaults.colorScheme, undefined);
  });
});

test("a second run changes nothing and revert of an untouched file restores its bytes (T-5.3)", async () => {
  const original = fixture("wt-comments");
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
  await withTerminal(fixture("wt-defaults"), {}, async (host) => {
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
  const legacy = fixture("wt-profiles-array");
  await withTerminal(legacy, {}, async (host) => {
    const report = await setupTerminalOnly(host);
    assert.deepEqual(report.changes.map((change) => change.result), ["manual"]);
    assert.equal(wtText(host), legacy);
    assert.deepEqual(homeFiles(host.home), [WT_SETTINGS]);
  });
});
