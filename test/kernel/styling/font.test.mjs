import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { fontComponent, fontDir, readPin, registryName } from "../../../core/lib/styling/font.mjs";
import { manifestPath } from "../../../core/lib/styling/manifest.mjs";
import { setupTerminal } from "../../../core/lib/styling/setup.mjs";
import { theme } from "../../../core/lib/styling/theme.mjs";
import { buildZip, exited, fakeExec, fakeHost, fakeRegistry, servingFetch } from "./host-fixture.mjs";

const FONTS_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
const CASK = "font-jetbrains-mono-nerd-font";
const FAMILY = "JetBrainsMono Nerd Font Mono";
const MONO_FILES = ["JetBrainsMonoNerdFontMono-Bold.ttf", "JetBrainsMonoNerdFontMono-Regular.ttf"];

function testZip() {
  const regular = Buffer.from("regular font bytes ".repeat(50));
  return buildZip([
    { name: "JetBrainsMonoNerdFontMono-Regular.ttf", data: regular, compressed: deflateRawSync(regular), method: 8 },
    { name: "fonts/JetBrainsMonoNerdFontMono-Bold.ttf", data: Buffer.from("bold font bytes") },
    { name: "JetBrainsMonoNerdFont-Regular.ttf", data: Buffer.from("not the mono variant") },
    { name: "README.md", data: Buffer.from("readme") },
  ]);
}

const ZIP = testZip();
const PIN = {
  version: "0.0.1",
  url: "https://github.com/ryanoasis/nerd-fonts/releases/download/v0.0.1/JetBrainsMono.zip",
  sha256: createHash("sha256").update(ZIP).digest("hex"),
  family: FAMILY,
  files: "^JetBrainsMonoNerdFontMono-.*\\.ttf$",
};
const FONT_ONLY = [fontComponent(PIN)];

async function withHost(options, fn) {
  const host = fakeHost({ fetch: servingFetch(ZIP), ...options });
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function setupFont(host, options = {}) {
  return setupTerminal(host, { yes: true, components: FONT_ONLY, ...options });
}

function revert(host) {
  return setupTerminal(host, { revert: true, yes: true, components: FONT_ONLY });
}

function fontItem(host) {
  return JSON.parse(readFileSync(manifestPath(host.home), "utf8")).items.find((item) => item.id === "font");
}

function listed(dir) {
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

function linuxExec() {
  return fakeExec({ "fc-list": () => exited(0, "DejaVu Sans\n"), "fc-cache": () => exited(0) });
}

test("the Windows value name spells the style in words", () => {
  assert.equal(registryName(FAMILY, "JetBrainsMonoNerdFontMono-Bold.ttf"), "JetBrainsMono Nerd Font Mono Bold (TrueType)");
  assert.equal(registryName(FAMILY, "JetBrainsMonoNerdFontMono-ExtraLightItalic.ttf"), "JetBrainsMono Nerd Font Mono Extra Light Italic (TrueType)");
});

test("on Windows only the Mono files land in the user font folder, each registered under HKCU (T-4.2)", async () => {
  const registry = fakeRegistry();
  await withHost({ platform: "win32", exec: fakeExec({ reg: registry.run }) }, async (host) => {
    host.env.LOCALAPPDATA = join(host.home, "AppData", "Local");
    const report = await setupFont(host);
    assert.deepEqual(report.changes.map((change) => change.result), ["applied"]);
    const dir = join(host.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts");
    assert.deepEqual(listed(dir), MONO_FILES);
    const adds = host.calls.filter(([command, verb]) => command === "reg" && verb === "add").map((call) => call.join(" ")).sort();
    const expected = MONO_FILES.map((file) => ["reg", "add", FONTS_KEY, "/v", registryName(FAMILY, file), "/t", "REG_SZ", "/d", join(dir, file), "/f"].join(" "));
    assert.deepEqual(adds, expected);
    assert.deepEqual(report.restart.length, 1);
  });
});

test("on Linux the files land in $XDG_DATA_HOME/fonts followed by fc-cache -f (T-4.2)", async () => {
  await withHost({ platform: "linux", exec: linuxExec() }, async (host) => {
    host.env.XDG_DATA_HOME = join(host.home, "xdg");
    await setupFont(host);
    assert.deepEqual(listed(join(host.home, "xdg", "fonts")), MONO_FILES);
    assert.deepEqual(host.calls.at(-1), ["fc-cache", "-f"]);
  });
});

test("on macOS brew installs the cask and nothing is fetched; without brew the files land in ~/Library/Fonts (T-4.2)", async () => {
  const brew = (args) => (args[0] === "list" ? exited(1) : exited(0));
  await withHost({ platform: "darwin", exec: fakeExec({ brew }) }, async (host) => {
    await setupFont(host);
    const installs = host.calls.filter(([, verb]) => verb === "install");
    assert.deepEqual(installs, [["brew", "install", "--cask", CASK]]);
    assert.equal(host.fetch.urls.length, 0);
    assert.equal(fontItem(host).data.via, "brew");
  });
  await withHost({ platform: "darwin", exec: fakeExec({}) }, async (host) => {
    await setupFont(host);
    assert.deepEqual(listed(join(host.home, "Library", "Fonts")), MONO_FILES);
  });
});

test("a download with one changed byte fails on sha256, installs nothing and leaves no zip (T-4.3)", async () => {
  const tampered = Buffer.from(ZIP);
  tampered[40] ^= 0xff;
  await withHost({ platform: "linux", exec: linuxExec(), fetch: servingFetch(tampered) }, async (host) => {
    const report = await setupFont(host);
    assert.equal(report.changes[0].result, "failed");
    assert.match(report.changes[0].detail, /sha256/);
    assert.deepEqual(listed(fontDir(host)), []);
    assert.deepEqual(listed(join(host.home, ".picketai", "cache")), []);
    assert.equal(existsSync(manifestPath(host.home)), false);
  });
});

test("a rejected download fails only the font change and names the release and the folder (T-4.3)", async () => {
  const offline = async () => {
    throw new TypeError("fetch failed");
  };
  await withHost({ platform: "linux", exec: linuxExec(), fetch: offline }, async (host) => {
    const report = await setupTerminal(host, { yes: true, components: [theme, fontComponent(PIN)] });
    const results = Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
    assert.deepEqual(results, { "theme-file": "applied", "theme-setting": "applied", font: "failed" });
    const step = report.manual.find((line) => line.includes(PIN.url));
    assert.ok(step?.includes(fontDir(host)), report.manual.join("\n"));
  });
});

async function assertPreexisting(host) {
  await setupFont(host);
  assert.equal(host.fetch.urls.length, 0);
  assert.equal(fontItem(host).data.preexisting, true);
  const report = await revert(host);
  assert.deepEqual(report.changes.map((change) => change.result), ["kept"]);
}

test("a font already present is recorded as preexisting, fetched never and kept on revert (T-4.4)", async () => {
  const registry = fakeRegistry({ [FONTS_KEY]: { [`${FAMILY} Regular (TrueType)`]: "C:\\Fonts\\x.ttf" } });
  await withHost({ platform: "win32", exec: fakeExec({ reg: registry.run }) }, async (host) => {
    await assertPreexisting(host);
    assert.equal(registry.keys.get(FONTS_KEY).size, 1);
  });
  await withHost({ platform: "linux", exec: fakeExec({ "fc-list": () => exited(0, `${FAMILY}\nDejaVu Sans\n`) }) }, assertPreexisting);
  await withHost({ platform: "darwin", exec: fakeExec({ brew: () => exited(0) }) }, async (host) => {
    await assertPreexisting(host);
    assert.ok(!host.calls.some(([, verb]) => verb === "uninstall"));
  });
});

test("revert removes a Picket-installed font with the per-OS calls (T-4.5)", async () => {
  const registry = fakeRegistry();
  await withHost({ platform: "win32", exec: fakeExec({ reg: registry.run }) }, async (host) => {
    await setupFont(host);
    assert.deepEqual((await revert(host)).changes.map((change) => change.result), ["removed"]);
    assert.deepEqual(listed(fontDir(host)), []);
    assert.equal(host.calls.filter(([command, verb]) => command === "reg" && verb === "delete").length, 2);
    assert.equal(registry.keys.get(FONTS_KEY).size, 0);
  });
  await withHost({ platform: "linux", exec: linuxExec() }, async (host) => {
    await setupFont(host);
    await revert(host);
    assert.deepEqual(listed(fontDir(host)), []);
    assert.deepEqual(host.calls.at(-1), ["fc-cache", "-f"]);
  });
  await withHost({ platform: "darwin", exec: fakeExec({ brew: (args) => (args[0] === "list" ? exited(1) : exited(0)) }) }, async (host) => {
    await setupFont(host);
    await revert(host);
    assert.deepEqual(host.calls.at(-1), ["brew", "uninstall", "--cask", CASK]);
  });
});

test("a font file that cannot be deleted fails with a manual step and stays recorded; the rest are gone (T-4.5)", async () => {
  await withHost({ platform: "linux", exec: linuxExec() }, async (host) => {
    await setupFont(host);
    const stuck = join(fontDir(host), MONO_FILES[1]);
    rmSync(stuck);
    mkdirSync(stuck);
    writeFileSync(join(stuck, "keep"), "x");
    const report = await revert(host);
    assert.equal(report.changes[0].result, "failed");
    assert.ok(report.manual.some((step) => step.includes(stuck)), report.manual.join("\n"));
    assert.deepEqual(listed(fontDir(host)), [MONO_FILES[1]]);
    assert.deepEqual(fontItem(host).data.files, [stuck]);
  });
});

test("a second run and a dry run fetch nothing (T-4.6)", async () => {
  await withHost({ platform: "linux", exec: linuxExec() }, async (host) => {
    assert.equal((await setupFont(host, { only: ["font"], dryRun: true })).changes[0].result, "planned");
    assert.equal(host.fetch.urls.length, 0);
    await setupFont(host);
    assert.equal(host.fetch.urls.length, 1);
    assert.deepEqual((await setupFont(host)).changes, []);
    assert.equal(host.fetch.urls.length, 1);
  });
});

test("the shipped pin names a release download and a SHA-256 (T-4.7)", () => {
  const pin = readPin();
  assert.match(pin.sha256, /^[0-9a-f]{64}$/);
  assert.ok(pin.url.startsWith("https://github.com/ryanoasis/nerd-fonts/releases/download/"), pin.url);
  assert.equal(pin.family, FAMILY);
  assert.ok(new RegExp(pin.files).test("JetBrainsMonoNerdFontMono-Regular.ttf"));
  assert.ok(!new RegExp(pin.files).test("JetBrainsMonoNerdFont-Regular.ttf"));
});
