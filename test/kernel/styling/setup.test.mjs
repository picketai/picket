import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATUS_LINE } from "../../../dist/lib/init.mjs";
import { manifestPath } from "../../../dist/lib/styling/manifest.mjs";
import { renderReport, setupTerminal } from "../../../dist/lib/styling/setup.mjs";
import { statuslineSetting } from "../../../dist/lib/styling/statusline-setting.mjs";
import { terminalComponent } from "../../../dist/lib/styling/terminal.mjs";
import { theme } from "../../../dist/lib/styling/theme.mjs";
import { exited, fakeExec, fakeHost, homeFiles, textsOf, writeHomeFile } from "./host-fixture.mjs";

const SETTINGS = ".claude/settings.json";
const KONSOLERC = ".config/konsolerc";
const THEME_COPY = ".claude/themes/picketai.json";
const CUSTOM = '{"model":"x","statusLine":{"type":"command","command":"my-line"}}';

function setupStatusline(host, options) {
  return setupTerminal(host, { only: ["statusline"], ...options });
}

async function withHost(options, fn) {
  const host = fakeHost(options);
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

function read(host, rel) {
  return readFileSync(join(host.home, ...rel.split("/")), "utf8");
}

function readManifestOf(host) {
  return JSON.parse(readFileSync(manifestPath(host.home), "utf8"));
}

test("setup creates the user settings with Picket's status line and records it; a second run changes nothing (T-2.1)", async () => {
  await withHost({}, async (host) => {
    const first = await setupStatusline(host, { yes: true });
    assert.deepEqual(first.changes.map((change) => change.result), ["applied"]);
    assert.deepEqual(JSON.parse(read(host, SETTINGS)).statusLine, STATUS_LINE);
    const manifest = readManifestOf(host);
    assert.equal(manifest.version, 1);
    assert.equal(manifest.items.length, 1);
    assert.equal(manifest.items[0].kind, "created");
    assert.match(manifest.items[0].sha256, /^[0-9a-f]{64}$/);
    const settingsBefore = read(host, SETTINGS);
    const manifestBefore = readFileSync(manifestPath(host.home), "utf8");
    const second = await setupStatusline(host, { yes: true });
    assert.deepEqual(second.changes, []);
    assert.equal(read(host, SETTINGS), settingsBefore);
    assert.equal(readFileSync(manifestPath(host.home), "utf8"), manifestBefore);
  });
});

test("declining the replace question leaves a custom status line byte for byte and writes no manifest (T-2.2)", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM }, answers: ["yes", "no"] }, async (host) => {
    const result = await setupStatusline(host, {});
    assert.deepEqual(result.changes.map((change) => change.result), ["skipped"]);
    assert.equal(read(host, SETTINGS), CUSTOM);
    assert.equal(existsSync(manifestPath(host.home)), false);
    assert.match(host.questions[1], /Replace your status line "my-line" with Picket's\?/);
  });
});

async function replacedCustomLine(host) {
  await setupStatusline(host, {});
  const settings = JSON.parse(read(host, SETTINGS));
  assert.deepEqual(settings.statusLine, STATUS_LINE);
  assert.equal(settings.model, "x");
  const backups = homeFiles(host.home).filter((path) => path.startsWith(".picketai/backups/"));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^\.picketai\/backups\/\d{8}T\d{6}Z\/statusline-settings\.json$/);
  assert.equal(read(host, backups[0]), CUSTOM);
}

test("accepting both questions replaces the status line, keeps other keys and backs the file up (T-2.2)", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM }, answers: ["yes", "yes"] }, replacedCustomLine);
});

test("revert restores an untouched settings file byte for byte and removes the manifest and backups (T-2.3)", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM }, answers: ["yes", "yes"] }, async (host) => {
    await replacedCustomLine(host);
    const reverted = await setupStatusline(host, { revert: true, yes: true });
    assert.deepEqual(reverted.changes.map((change) => change.result), ["restored"]);
    assert.equal(read(host, SETTINGS), CUSTOM);
    assert.equal(existsSync(manifestPath(host.home)), false);
    assert.equal(existsSync(join(host.home, ".picketai", "backups")), false);
  });
});

test("revert after a later user edit puts the old status line back and keeps the edit (T-2.3)", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM }, answers: ["yes", "yes"] }, async (host) => {
    await replacedCustomLine(host);
    const edited = { ...JSON.parse(read(host, SETTINGS)), env: { A: "1" } };
    writeHomeFile(host.home, SETTINGS, JSON.stringify(edited, null, 2));
    const reverted = await setupStatusline(host, { revert: true, yes: true });
    assert.deepEqual(reverted.changes.map((change) => change.result), ["removed"]);
    assert.deepEqual(JSON.parse(read(host, SETTINGS)), { model: "x", statusLine: { type: "command", command: "my-line" }, env: { A: "1" } });
    assert.equal(existsSync(manifestPath(host.home)), false);
  });
});

test("revert removes a settings file setup created", async () => {
  await withHost({}, async (host) => {
    await setupStatusline(host, { yes: true });
    const reverted = await setupStatusline(host, { revert: true, yes: true });
    assert.deepEqual(reverted.changes.map((change) => change.result), ["removed"]);
    assert.deepEqual(homeFiles(host.home), []);
  });
});

test("a dry run lists the plan and writes nothing (T-2.4)", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM } }, async (host) => {
    const before = homeFiles(host.home);
    const result = await setupStatusline(host, { dryRun: true });
    assert.deepEqual(result.changes.map((change) => [change.id, change.result]), [["statusline", "planned"]]);
    assert.deepEqual(homeFiles(host.home), before);
    assert.equal(host.questions.length, 0);
  });
});

test("without a terminal and without --yes nothing is written and the report says how to apply (T-2.4)", async () => {
  await withHost({ interactive: false }, async (host) => {
    const result = await setupStatusline(host, {});
    assert.deepEqual(result.changes.map((change) => change.result), ["declined"]);
    assert.deepEqual(homeFiles(host.home), []);
    assert.match(renderReport(result).split("\n").at(-1), /--yes/);
  });
});

test("settings that are not valid JSON fail the change with a detail and stay as they are (T-2.5)", async () => {
  await withHost({ files: { [SETTINGS]: "{ not json" } }, async (host) => {
    const result = await setupStatusline(host, { yes: true });
    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0].result, "failed");
    assert.match(result.changes[0].detail, /not valid JSON/);
    assert.equal(read(host, SETTINGS), "{ not json");
  });
});

test("a broken manifest stops setup and revert with a message naming the backups folder", async () => {
  await withHost({ files: { ".picketai/styling-manifest.json": "{ broken" } }, async (host) => {
    for (const options of [{ yes: true }, { revert: true, yes: true }]) {
      const result = await setupStatusline(host, options);
      assert.equal(result.changes[0].result, "failed");
      assert.match(result.changes[0].detail, /backups/);
    }
    assert.deepEqual(homeFiles(host.home), [".picketai/styling-manifest.json"]);
  });
});

test("a second setup after the user replaced the line keeps the first backup and previous value", async () => {
  await withHost({ files: { [SETTINGS]: CUSTOM }, answers: ["yes", "yes", "yes", "yes"] }, async (host) => {
    await setupStatusline(host, {});
    const first = readManifestOf(host).items[0];
    writeHomeFile(host.home, SETTINGS, '{"model":"x","statusLine":{"type":"command","command":"other"}}');
    await setupStatusline(host, {});
    const second = readManifestOf(host).items;
    assert.equal(second.length, 1);
    assert.equal(second[0].backup, first.backup);
    assert.deepEqual(second[0].previous, first.previous);
  });
});

test("revert takes only Picket's keys out of files setup created and the user then edited (T-9.1)", async () => {
  const exec = fakeExec({ "fc-list": () => exited(0, "JetBrainsMono Nerd Font Mono\n") });
  await withHost({ platform: "linux", env: { KONSOLE_VERSION: "230804" }, exec }, async (host) => {
    await setupTerminal(host, { yes: true, components: [theme, terminalComponent(), statuslineSetting] });
    writeHomeFile(host.home, SETTINGS, JSON.stringify({ ...JSON.parse(read(host, SETTINGS)), userKey: 1 }));
    writeHomeFile(host.home, ".picketai/config.json", JSON.stringify({ ...JSON.parse(read(host, ".picketai/config.json")), user: true }));
    writeHomeFile(host.home, KONSOLERC, `${read(host, KONSOLERC)}\n[Other]\nKey=1\n`);
    const report = await setupTerminal(host, { revert: true, yes: true, components: [theme, terminalComponent(), statuslineSetting] });
    assert.ok(report.changes.every((change) => change.result === "removed"), JSON.stringify(report.changes));
    assert.deepEqual(JSON.parse(read(host, SETTINGS)), { userKey: 1 });
    assert.deepEqual(JSON.parse(read(host, ".picketai/config.json")), { user: true });
    assert.ok(!read(host, KONSOLERC).includes("DefaultProfile"), read(host, KONSOLERC));
    assert.ok(read(host, KONSOLERC).includes("[Other]\nKey=1"));
    for (const path of [SETTINGS, ".picketai/config.json", KONSOLERC].map((rel) => join(host.home, ...rel.split("/")))) {
      assert.ok(!report.manual.some((step) => step.includes(path)), path);
    }
    assert.ok(!textsOf(report).some((text) => text.includes("undefined")));
  });
});

test("re-applying over a file the user edited keeps a copy of the edit that revert never deletes (T-9.4)", async () => {
  await withHost({ answers: ["yes", "yes"] }, async (host) => {
    await setupTerminal(host, { yes: true, only: ["theme"] });
    writeHomeFile(host.home, THEME_COPY, '{"name":"Edited"}');
    const report = await setupTerminal(host, { only: ["theme"] });
    assert.ok(host.questions.some((question) => question.startsWith("Replace ")), host.questions.join("\n"));
    const kept = homeFiles(host.home).filter((path) => /^\.picketai\/kept\/\d{8}T\d{6}Z\/theme-file-picketai\.json$/.test(path));
    assert.equal(kept.length, 1);
    assert.equal(read(host, kept[0]), '{"name":"Edited"}');
    assert.ok(textsOf(report).some((text) => text.includes(join(host.home, ...kept[0].split("/")))), textsOf(report).join("\n"));
    await setupTerminal(host, { revert: true, yes: true });
    assert.equal(read(host, kept[0]), '{"name":"Edited"}');
  });
});
