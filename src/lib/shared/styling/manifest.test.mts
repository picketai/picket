import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FIXED_NOW, fixedContext } from "#test/context.mts";
import { hostFrom, type Host } from "./host.mts";
import { manifestItem, manifestPath, readManifest, removeItems, sha256File, writeTracked, type ItemRemover } from "./manifest.mts";

const SILENT = { interactive: false, ask: async (_question: string, { fallback }: { fallback: string }) => fallback };
const BACKUP = "/backups/theme.json";

function tempHost(t: TestContext): Host {
  const home = mkdtempSync(join(tmpdir(), "picket-manifest-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  return hostFrom(fixedContext(home, { home }), SILENT);
}

function writeFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

test("manifestItem sets setsFont only for a change that declares it and stamps installedAt from host.now()", (t) => {
  const host = tempHost(t);
  const font = manifestItem(host, { id: "konsole-default", setsFont: true }, "terminal", { kind: "edited", path: "/rc" });
  const plain = manifestItem(host, { id: "konsole-profile" }, "terminal", { kind: "created", path: "/profile" });
  assert.deepEqual(font, { id: "konsole-default", component: "terminal", kind: "edited", path: "/rc", setsFont: true, installedAt: FIXED_NOW });
  assert.equal("setsFont" in plain, false);
  assert.equal(plain.installedAt, FIXED_NOW);
});

test("writeTracked records a new file as created with no backup", (t) => {
  const host = tempHost(t);
  const path = join(host.home, "themes", "picketai.json");
  const fields = writeTracked(path, "{}\n", () => BACKUP);
  assert.deepEqual(fields, { kind: "created", path, sha256: sha256File(path) });
  assert.equal(readFileSync(path, "utf8"), "{}\n");
});

test("writeTracked backs up an existing file and records it as edited with the backup path", (t) => {
  const host = tempHost(t);
  const path = join(host.home, "settings.json");
  writeFile(path, '{"theme":"dark"}\n');
  const backedUp: string[] = [];
  const backup = (file: string) => {
    backedUp.push(file);
    return BACKUP;
  };
  const fields = writeTracked(path, '{"theme":"custom:picketai"}\n', backup);
  assert.deepEqual(backedUp, [path]);
  assert.deepEqual(fields, { kind: "edited", path, backup: BACKUP, sha256: sha256File(path) });
});

test("a version-1 manifest written before setsFont reads and its items remove", (t) => {
  const host = tempHost(t);
  const created = join(host.home, ".claude", "themes", "picketai.json");
  writeFile(created, "theme\n");
  const oldItems = [
    { id: "theme-file", component: "theme", kind: "created", path: created, sha256: sha256File(created), installedAt: "2026-10-17T12:00:00.000Z" },
    { id: "konsole-default", component: "terminal", kind: "external", previous: {}, data: { writer: "konsole", part: "default" }, installedAt: "2026-10-17T12:00:00.000Z" },
  ];
  writeFile(manifestPath(host.home), JSON.stringify({ version: 1, created: "2026-10-17T12:00:00.000Z", updated: "2026-10-17T12:00:00.000Z", items: oldItems }));
  const manifest = readManifest(host);
  assert.ok(manifest);
  assert.equal(manifest.items.some((item) => item.setsFont), false);
  const removers: ItemRemover[] = [
    { name: "theme", unapply: () => null },
    { name: "terminal", unapply: () => ({ result: "removed" }) },
  ];
  const outcomes = removeItems(host, manifest, ["theme-file", "konsole-default"], removers);
  assert.deepEqual(outcomes, [{ id: "konsole-default", result: "removed" }, { id: "theme-file", result: "removed" }]);
  assert.equal(existsSync(created), false);
  assert.equal(existsSync(manifestPath(host.home)), false);
});
