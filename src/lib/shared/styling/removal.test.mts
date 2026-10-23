import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildZip, exited, fakeExec, fakeRegistry, servingFetch, withFakeHost, writeHomeFile, type FakeHost, type Program } from "#test/styling-host.mts";
import { fontComponent } from "./components/font/index.mts";
import { component as statusline } from "./components/statusline/index.mts";
import { terminalComponent } from "./components/terminal/index.mts";
import { component as theme } from "./components/theme/index.mts";
import { backupsDir, manifestPath, type ManifestItem } from "./manifest.mts";
import { applyStyle, renderReport, type StyleReport } from "./plan.mts";
import { chooseAndRemove } from "./removal.mts";

type Registry = ReturnType<typeof fakeRegistry>;
type Installed = { answers?: string[]; interactive?: boolean; registry?: Registry; reg?: Program };

const FAMILY = "JetBrainsMono Nerd Font Mono";
const FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const SETTINGS = ".claude/settings.json";
const ORIGINAL_SETTINGS = '{"model":"x","statusLine":{"type":"command","command":"my-line"}}';
const WT_SETTINGS = "AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json";
const ORIGINAL_WT = readFileSync(join(import.meta.dirname, "terminals", "windows-terminal", "wt-defaults.test.json"), "utf8");
const ZIP = buildZip([{ name: "JetBrainsMonoNerdFontMono-Regular.ttf", data: Buffer.from("regular") }]);
const PIN = {
  version: "0.0.1",
  url: "https://github.com/ryanoasis/nerd-fonts/releases/download/v0.0.1/JetBrainsMono.zip",
  sha256: createHash("sha256").update(ZIP).digest("hex"),
  family: FAMILY,
  files: "^JetBrainsMonoNerdFontMono-.*\\.ttf$",
};
const COMPONENTS = [theme, fontComponent(PIN), terminalComponent(), statusline];
const LISTED = ["theme-file", "theme-setting", "windows-terminal-scheme@stable", "windows-terminal-defaults@stable", "statusline-icons", "statusline"];

async function withInstalled({ answers = [], interactive = true, registry = fakeRegistry(), reg = registry.run }: Installed, fn: (host: FakeHost, registry: Registry) => Promise<void>): Promise<void> {
  const options = {
    platform: "win32" as const,
    env: { WT_SESSION: "1" },
    files: { [SETTINGS]: ORIGINAL_SETTINGS, [WT_SETTINGS]: ORIGINAL_WT },
    exec: fakeExec({ reg }),
    fetch: servingFetch(ZIP),
    answers,
    interactive,
  };
  await withFakeHost(options, async (host) => {
    await applyStyle(host, { yes: true, components: COMPONENTS });
    await fn(host, registry);
  });
}

function read(host: FakeHost, rel: string): string {
  return readFileSync(join(host.home, ...rel.split("/")), "utf8");
}

function manifestIds(host: FakeHost): string[] {
  return JSON.parse(readFileSync(manifestPath(host.home), "utf8")).items.map((item: ManifestItem) => item.id);
}

function results(report: StyleReport): Record<string, string> {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

test("setup records the six listed items and the font (fixture check)", async () => {
  await withInstalled({}, async (host) => {
    assert.deepEqual(manifestIds(host).filter((id) => id !== "font"), LISTED);
    assert.ok(manifestIds(host).includes("font"));
  });
});

test("all and yes remove every item and return both settings files to their bytes (T-8.1)", async () => {
  await withInstalled({ answers: ["all", "yes"] }, async (host, registry) => {
    const report = await chooseAndRemove(host, { components: COMPONENTS });
    assert.ok(Object.values(results(report)).every((result) => result === "restored" || result === "removed"), JSON.stringify(results(report)));
    assert.equal(read(host, SETTINGS), ORIGINAL_SETTINGS);
    assert.equal(read(host, WT_SETTINGS), ORIGINAL_WT);
    assert.equal(registry.keys.get(FONTS_KEY)?.size, 0);
    assert.equal(existsSync(manifestPath(host.home)), false);
    assert.equal(existsSync(backupsDir(host.home)), false);
    assert.equal(report.restart.length, 1);
    assert.match(renderReport(report).split("\n").at(-1) ?? "", /claude plugin uninstall picket@picketai.*npm uninstall -g @picketai\/picket/);
  });
});

test("2,4 removes only those entries and keeps the rest with their backups; no keeps the font (T-8.2)", async () => {
  await withInstalled({ answers: ["2,4", "no"] }, async (host) => {
    const report = await chooseAndRemove(host, { components: COMPONENTS });
    assert.notEqual(results(report)["windows-terminal-scheme@stable"], "kept");
    assert.equal(results(report)["statusline-icons"], "removed");
    assert.equal(results(report).font, "kept");
    const left: ManifestItem[] = JSON.parse(readFileSync(manifestPath(host.home), "utf8")).items;
    assert.deepEqual(left.map((item) => item.id), ["theme-file", "theme-setting", "font", "windows-terminal-defaults@stable", "statusline"]);
    for (const item of left.filter((recorded) => recorded.backup)) assert.ok(existsSync(item.backup ?? ""), item.backup);
  });
});

test("the listing shows both theme items as one Claude Code theme entry, and choosing it removes both (T-9.3)", async () => {
  await withInstalled({ answers: ["1", "no"] }, async (host) => {
    const report = await chooseAndRemove(host, { components: COMPONENTS });
    const lines = host.questions[0].split("\n").filter((text) => /^\s+\d+\. /.test(text));
    assert.equal(lines.filter((text) => text.includes("Claude Code theme")).length, 1);
    assert.ok(!lines.some((text) => /\d+\. theme-(file|setting)/.test(text)), lines.join("\n"));
    assert.equal(lines.length, 5);
    assert.equal(results(report)["theme-file"], "removed");
    assert.notEqual(results(report)["theme-setting"], "kept");
    assert.notEqual(JSON.parse(read(host, SETTINGS)).theme, "custom:picketai");
  });
});

test("none, an empty answer and a host without a terminal keep everything (T-8.3)", async () => {
  for (const options of [{ answers: ["none", "no"] }, { answers: ["", ""] }, { interactive: false }]) {
    await withInstalled(options, async (host) => {
      const before = readFileSync(manifestPath(host.home), "utf8");
      const report = await chooseAndRemove(host, { components: COMPONENTS });
      assert.ok(report.changes.every((change) => change.result === "kept"), JSON.stringify(results(report)));
      assert.equal(report.changes.length, 7);
      assert.equal(readFileSync(manifestPath(host.home), "utf8"), before);
    });
  }
});

test("an answer that is not a selection is asked once more and then keeps everything", async () => {
  await withInstalled({ answers: ["some", "9", "no"] }, async (host) => {
    const report = await chooseAndRemove(host, { components: COMPONENTS });
    assert.ok(report.changes.every((change) => change.result === "kept"));
    assert.equal(host.questions.filter((question) => question.startsWith("Picket installed")).length, 2);
  });
});

test("removing the status line after a user edit puts the old line back and keeps the edit (T-8.4)", async () => {
  await withInstalled({ answers: ["5", "no"] }, async (host) => {
    writeHomeFile(host.home, SETTINGS, JSON.stringify({ ...JSON.parse(read(host, SETTINGS)), env: { A: "1" } }));
    await chooseAndRemove(host, { components: COMPONENTS });
    const settings = JSON.parse(read(host, SETTINGS));
    assert.deepEqual(settings.statusLine, { type: "command", command: "my-line" });
    assert.deepEqual(settings.env, { A: "1" });
    assert.equal(settings.theme, "custom:picketai");
  });
});

test("a preexisting font is never asked about or removed; a Picket-installed one goes with yes (T-8.5)", async () => {
  const registry = fakeRegistry({ [FONTS_KEY]: { [`${FAMILY} Regular (TrueType)`]: "C:\\Fonts\\x.ttf" } });
  await withInstalled({ registry, answers: ["all"] }, async (host) => {
    const report = await chooseAndRemove(host, { components: COMPONENTS });
    assert.equal(results(report).font, "kept");
    assert.ok(!host.questions.some((question) => question.includes("Other apps may use it")));
    assert.equal(registry.keys.get(FONTS_KEY)?.size, 1);
  });
  await withInstalled({ registry: fakeRegistry({ [FONTS_KEY]: { [`${FAMILY} Regular (TrueType)`]: "C:\\Fonts\\x.ttf" } }) }, async (host) => {
    assert.equal(results(await chooseAndRemove(host, { yes: true, components: COMPONENTS })).font, "kept");
  });
  await withInstalled({}, async (host, installed) => {
    assert.equal(results(await chooseAndRemove(host, { yes: true, components: COMPONENTS })).font, "removed");
    assert.equal(installed.keys.get(FONTS_KEY)?.size, 0);
  });
});

test("a failed reg delete keeps the font item with a manual step while the rest are removed (T-8.6)", async () => {
  const registry = fakeRegistry();
  const reg = (args: string[]) => (args[0] === "delete" ? exited(1) : registry.run(args));
  await withInstalled({ registry, reg }, async (host) => {
    const report = await chooseAndRemove(host, { yes: true, components: COMPONENTS });
    assert.equal(results(report).font, "failed");
    assert.ok(report.manual.some((step) => step.includes(FONTS_KEY)), report.manual.join("\n"));
    assert.deepEqual(manifestIds(host), ["font"]);
    assert.equal(read(host, SETTINGS), ORIGINAL_SETTINGS);
  });
});

test("no manifest means nothing to remove", async () => {
  await withFakeHost({}, async (host) => {
    const report = await chooseAndRemove(host, {});
    assert.deepEqual(report.changes, []);
    assert.match(report.manual[0], /nothing to remove/);
  });
});
