import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const MANIFEST_VERSION = 1;
const PICKET_HOME = ".picketai";
const MANIFEST_FILE = "styling-manifest.json";

export class ManifestError extends Error {}

export function picketHome(home) {
  return join(home, PICKET_HOME);
}

export function manifestPath(home) {
  return join(picketHome(home), MANIFEST_FILE);
}

export function backupsDir(home) {
  return join(picketHome(home), "backups");
}

function isoOf(host) {
  return new Date(host.now()).toISOString();
}

export function stampOf(host) {
  return isoOf(host).replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

export function emptyManifest(host) {
  const now = isoOf(host);
  return { version: MANIFEST_VERSION, created: now, updated: now, items: [] };
}

export function readManifest(host) {
  const path = manifestPath(host.home);
  if (!existsSync(path)) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new ManifestError(`${path} is not valid JSON (${err.message}); nothing was changed, and backups are under ${backupsDir(host.home)}`);
  }
  if (manifest?.version !== MANIFEST_VERSION || !Array.isArray(manifest.items)) {
    throw new ManifestError(`${path} is not a version ${MANIFEST_VERSION} manifest; nothing was changed, and backups are under ${backupsDir(host.home)}`);
  }
  return manifest;
}

export function writeManifest(host, manifest) {
  const path = manifestPath(host.home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...manifest, updated: isoOf(host) }, null, 2)}\n`);
}

export function installedAt(host) {
  return isoOf(host);
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function backupFile(host, path, component) {
  const target = join(backupsDir(host.home), stampOf(host), `${component}-${basename(path)}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
  return target;
}

export function keepCopy(host, path, id) {
  const target = join(picketHome(host.home), "kept", stampOf(host), `${id}-${basename(path)}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
  return target;
}

function unapplied(item, host, component) {
  return component.unapply(item, host) ?? { result: "removed" };
}

function unchanged(item) {
  return existsSync(item.path) && sha256File(item.path) === item.sha256;
}

function removeEdited(item, host, component) {
  if (!unchanged(item)) return unapplied(item, host, component);
  copyFileSync(item.backup, item.path);
  return { result: "restored" };
}

function removeCreated(item, host, component) {
  if (!existsSync(item.path)) return { result: "removed" };
  if (!unchanged(item)) return unapplied(item, host, component);
  rmSync(item.path);
  return { result: "removed" };
}

const REMOVERS = { created: removeCreated, edited: removeEdited, external: unapplied };

function removeItem(item, host, components) {
  const component = components.find((c) => c.name === item.component);
  if (!component) throw new Error(`no component named ${item.component} to remove it`);
  const reason = component.blocks?.(item, host) ?? null;
  if (reason !== null) return { result: "kept", detail: reason, blocked: true };
  return REMOVERS[item.kind](item, host, component);
}

function fallbackStep(item) {
  if (item.path && item.backup) return `put ${item.backup} back at ${item.path} by hand`;
  if (item.path) return `check ${item.path} by hand`;
  if (item.backup) return `the state before setup is saved in ${item.backup}`;
  return `check ${item.id} by hand`;
}

function finish(host, manifest) {
  if (manifest.items.length > 0) {
    writeManifest(host, manifest);
    return;
  }
  rmSync(manifestPath(host.home), { force: true });
  rmSync(backupsDir(host.home), { recursive: true, force: true });
}

export function removeItems(host, manifest, ids, components) {
  const outcomes = [];
  for (const item of [...manifest.items].reverse()) {
    if (!ids.includes(item.id)) continue;
    try {
      const { blocked, ...outcome } = removeItem(item, host, components);
      outcomes.push({ id: item.id, ...outcome });
      if (!blocked) manifest.items = manifest.items.filter((kept) => kept !== item);
      finish(host, manifest);
    } catch (err) {
      outcomes.push({ id: item.id, result: "failed", detail: err.message, manual: err.manual ?? fallbackStep(item) });
      finish(host, manifest);
    }
  }
  return outcomes;
}
