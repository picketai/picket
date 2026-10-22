import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestPath, readManifest, removeItems } from "../../../dist/lib/styling/manifest.mjs";
import { setupTerminal } from "../../../dist/lib/styling/setup.mjs";
import { theme } from "../../../dist/lib/styling/theme.mjs";
import { fakeHost, homeFiles, writeHomeFile } from "./host-fixture.mjs";

test("the theme copy is kept while PicketAI is still the theme setting, and goes once the setting does (T-9.2)", async () => {
  const host = fakeHost({});
  try {
    await setupTerminal(host, { yes: true, only: ["theme"] });
    const manifest = readManifest(host);
    const [blocked] = removeItems(host, manifest, ["theme-file"], [theme]);
    assert.equal(blocked.result, "kept");
    assert.match(blocked.detail, /\/theme/);
    assert.ok(existsSync(join(host.home, ".claude", "themes", "picketai.json")));
    assert.deepEqual(readManifest(host).items.map((item) => item.id), ["theme-file", "theme-setting"]);
    const outcomes = removeItems(host, readManifest(host), ["theme-setting", "theme-file"], [theme]);
    assert.deepEqual(outcomes.map((outcome) => outcome.result), ["removed", "removed"]);
    assert.equal(existsSync(join(host.home, ".claude", "themes", "picketai.json")), false);
  } finally {
    host.dispose();
  }
});

test("the theme copy is kept while /theme chose PicketAI in ~/.claude.json, with no theme setting item", async () => {
  const global = '{"theme":"custom:picketai"}';
  const host = fakeHost({ files: { ".claude.json": global }, answers: ["yes", "no"] });
  try {
    await setupTerminal(host, { only: ["theme"] });
    assert.deepEqual(readManifest(host).items.map((item) => item.id), ["theme-file"]);
    const [blocked] = removeItems(host, readManifest(host), ["theme-file"], [theme]);
    assert.equal(blocked.result, "kept");
    assert.match(blocked.detail, /run \/theme, pick dark/);
    assert.ok(existsSync(join(host.home, ".claude", "themes", "picketai.json")));
    assert.equal(readFileSync(join(host.home, ".claude.json"), "utf8"), global);
  } finally {
    host.dispose();
  }
});

const SOURCE = "src/themes/picketai.json";
const COPY = ".claude/themes/picketai.json";
const SETTINGS = ".claude/settings.json";
const GLOBAL = ".claude.json";
const SPEC_TOKENS = [
  "claude", "claudeShimmer", "text", "inverseText", "inactive", "inactiveShimmer", "subtle", "suggestion", "permission",
  "permissionShimmer", "remember", "promptBorder", "promptBorderShimmer", "bashBorder", "planMode", "autoAccept", "success",
  "error", "warning", "warningShimmer", "diffAdded", "diffRemoved", "diffAddedWord", "diffRemovedWord", "diffAddedDimmed",
  "diffRemovedDimmed", "userMessageBackground", "userMessageBackgroundHover", "bashMessageBackgroundColor", "selectionBg",
  "briefLabelYou", "briefLabelClaude", "rate_limit_fill", "rate_limit_empty", "composerSidebarBackground",
];

async function withHost(options, fn) {
  const host = fakeHost(options);
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function bytes(host, rel) {
  return readFileSync(join(host.home, ...rel.split("/")));
}

function json(host, rel) {
  return JSON.parse(bytes(host, rel).toString("utf8"));
}

function setupTheme(host, options = {}) {
  return setupTerminal(host, { only: ["theme"], ...options });
}

function revert(host) {
  return setupTerminal(host, { revert: true, yes: true });
}

function results(report) {
  return Object.fromEntries(report.changes.map((change) => [change.id, change.result]));
}

test("the plugin theme is the spec's PicketAI theme with 35 hex tokens (T-3.1)", () => {
  const theme = JSON.parse(readFileSync(SOURCE, "utf8"));
  assert.equal(theme.name, "PicketAI");
  assert.equal(theme.base, "dark");
  assert.deepEqual(Object.keys(theme.overrides).sort(), [...SPEC_TOKENS].sort());
  assert.equal(theme.overrides.claude, "#F9782B");
  for (const [token, value] of Object.entries(theme.overrides)) assert.match(value, /^#[0-9A-F]{6}$/, token);
});

test("setup copies the theme, selects custom:picketai, names the theme in effect, and a second run changes nothing (T-3.2)", async () => {
  await withHost({ files: { [GLOBAL]: '{"theme":"dark"}' } }, async (host) => {
    const planned = await setupTheme(host, { dryRun: true });
    assert.match(planned.changes.find((change) => change.id === "theme-setting").summary, /custom:picketai.*\(now dark\)/);
    const first = await setupTheme(host, { yes: true });
    assert.deepEqual(results(first), { "theme-file": "applied", "theme-setting": "applied" });
    assert.ok(bytes(host, COPY).equals(readFileSync(SOURCE)));
    assert.equal(json(host, SETTINGS).theme, "custom:picketai");
    const setting = JSON.parse(readFileSync(manifestPath(host.home), "utf8")).items.find((item) => item.id === "theme-setting");
    assert.deepEqual(setting.previous, {});
    assert.deepEqual((await setupTheme(host, { yes: true })).changes, []);
  });
});

test("no to the setting question copies the file, leaves settings alone and points at /theme (T-3.3)", async () => {
  await withHost({ files: { [SETTINGS]: '{"model":"x"}' }, answers: ["yes", "no"] }, async (host) => {
    const report = await setupTheme(host);
    assert.deepEqual(results(report), { "theme-file": "applied", "theme-setting": "skipped" });
    assert.ok(existsSync(join(host.home, COPY)));
    assert.equal(bytes(host, SETTINGS).toString("utf8"), '{"model":"x"}');
    assert.ok(report.manual.some((step) => step.includes("/theme")), report.manual.join("\n"));
  });
});

test("a different theme file stays on no, and on yes is backed up, replaced and restored by revert (T-3.3)", async () => {
  const theirs = '{"name":"Mine"}';
  await withHost({ files: { [COPY]: theirs }, answers: ["yes", "no", "no"] }, async (host) => {
    assert.equal(results(await setupTheme(host))["theme-file"], "skipped");
    assert.equal(bytes(host, COPY).toString("utf8"), theirs);
  });
  await withHost({ files: { [COPY]: theirs }, answers: ["yes", "yes", "no"] }, async (host) => {
    assert.equal(results(await setupTheme(host))["theme-file"], "applied");
    assert.ok(bytes(host, COPY).equals(readFileSync(SOURCE)));
    assert.ok(homeFiles(host.home).some((path) => /^\.picketai\/backups\/\d{8}T\d{6}Z\/theme-file-picketai\.json$/.test(path)));
    assert.equal(results(await revert(host))["theme-file"], "restored");
    assert.equal(bytes(host, COPY).toString("utf8"), theirs);
  });
});

test("revert deletes an unchanged copy, keeps an edited one with a manual step, and removes the key it added (T-3.4)", async () => {
  await withHost({ files: { [SETTINGS]: '{"model":"x"}' } }, async (host) => {
    await setupTheme(host, { yes: true });
    assert.deepEqual(results(await revert(host)), { "theme-file": "removed", "theme-setting": "restored" });
    assert.equal(existsSync(join(host.home, COPY)), false);
    assert.equal(bytes(host, SETTINGS).toString("utf8"), '{"model":"x"}');
  });
  await withHost({}, async (host) => {
    await setupTheme(host, { yes: true });
    writeHomeFile(host.home, COPY, '{"name":"Edited"}');
    const report = await revert(host);
    assert.equal(results(report)["theme-file"], "kept");
    assert.ok(report.manual.some((step) => step.includes("picketai.json")), report.manual.join("\n"));
    assert.equal(bytes(host, COPY).toString("utf8"), '{"name":"Edited"}');
  });
});

test("revert puts a previous theme back, and keeps a theme the user chose after setup (T-3.4)", async () => {
  await withHost({ files: { [SETTINGS]: '{"theme":"dark-ansi"}' } }, async (host) => {
    await setupTheme(host, { yes: true });
    writeHomeFile(host.home, SETTINGS, JSON.stringify({ ...json(host, SETTINGS), model: "y" }));
    await revert(host);
    assert.deepEqual(json(host, SETTINGS), { theme: "dark-ansi", model: "y" });
  });
  await withHost({ files: { [SETTINGS]: '{"theme":"dark-ansi"}' } }, async (host) => {
    await setupTheme(host, { yes: true });
    writeHomeFile(host.home, SETTINGS, '{"theme":"light"}');
    assert.equal(results(await revert(host))["theme-setting"], "kept");
    assert.deepEqual(json(host, SETTINGS), { theme: "light" });
  });
});

test("revert after a user edit removes only theme, and theme plus status line revert to the original bytes (T-3.5)", async () => {
  const original = '{\n  "model": "x"\n}\n';
  const global = '{"theme":"dark","numStartups":3}';
  await withHost({ files: { [SETTINGS]: original, [GLOBAL]: global } }, async (host) => {
    await setupTheme(host, { yes: true });
    writeHomeFile(host.home, SETTINGS, JSON.stringify({ ...json(host, SETTINGS), env: { A: "1" } }));
    await revert(host);
    assert.deepEqual(json(host, SETTINGS), { model: "x", env: { A: "1" } });
    assert.equal(bytes(host, GLOBAL).toString("utf8"), global);
  });
  await withHost({ files: { [SETTINGS]: original, [GLOBAL]: global } }, async (host) => {
    const report = await setupTerminal(host, { yes: true, only: ["theme", "statusline"] });
    assert.deepEqual(Object.values(results(report)), ["applied", "applied", "applied"]);
    const settings = json(host, SETTINGS);
    assert.equal(settings.theme, "custom:picketai");
    assert.equal(settings.statusLine.command, "picket statusline");
    await revert(host);
    assert.equal(bytes(host, SETTINGS).toString("utf8"), original);
    assert.equal(bytes(host, GLOBAL).toString("utf8"), global);
    assert.equal(existsSync(manifestPath(host.home)), false);
  });
});
