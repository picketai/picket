import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Host } from "./host.mts";

export const MANIFEST_VERSION = 1;
const PICKET_HOME = ".picketai";
const MANIFEST_FILE = "styling-manifest.json";

export const ITEM_KINDS = ["created", "edited", "external"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type ItemFields = {
  kind: ItemKind;
  path?: string;
  backup?: string;
  sha256?: string;
  previous?: Record<string, unknown>;
  data?: Record<string, unknown>;
};
export type ManifestItem = ItemFields & { id: string; component: string; setsFont?: true; installedAt: string };
export type Manifest = { version: number; created: string; updated: string; items: ManifestItem[] };
export type Backup = (path: string) => string | undefined;
export type RecordedChange = { id: string; setsFont?: boolean };
export type TrackedFields = { kind: "created" | "edited"; path: string; backup?: string; sha256: string };

export type Unapplied = { result: string; detail?: string; manual?: string };
export type ItemRemover = {
  name: string;
  unapply: (item: ManifestItem, host: Host) => Unapplied | null | undefined;
  blocks?: (item: ManifestItem, host: Host) => string | null;
};
export type RemovalOutcome = Unapplied & { id: string };

type Removal = Unapplied & { blocked?: boolean };
type ManualError = Error & { manual?: string };

export class ManifestError extends Error {}

export function picketHome(home: string): string {
  return join(home, PICKET_HOME);
}

export function manifestPath(home: string): string {
  return join(picketHome(home), MANIFEST_FILE);
}

export function backupsDir(home: string): string {
  return join(picketHome(home), "backups");
}

function isoOf(host: Host): string {
  return host.now().toISOString();
}

export function stampOf(host: Host): string {
  return isoOf(host).replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

export function emptyManifest(host: Host): Manifest {
  const now = isoOf(host);
  return { version: MANIFEST_VERSION, created: now, updated: now, items: [] };
}

export function readManifest(host: Host): Manifest | null {
  const path = manifestPath(host.home);
  if (!existsSync(path)) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new ManifestError(`${path} is not valid JSON (${(err as Error).message}); nothing was changed, and backups are under ${backupsDir(host.home)}`);
  }
  if (manifest?.version !== MANIFEST_VERSION || !Array.isArray(manifest.items)) {
    throw new ManifestError(`${path} is not a version ${MANIFEST_VERSION} manifest; nothing was changed, and backups are under ${backupsDir(host.home)}`);
  }
  return manifest as Manifest;
}

export function writeManifest(host: Host, manifest: Manifest): void {
  const path = manifestPath(host.home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...manifest, updated: isoOf(host) }, null, 2)}\n`);
}

function installedAt(host: Host): string {
  return isoOf(host);
}

export function manifestItem(host: Host, change: RecordedChange, component: string, fields: ItemFields): ManifestItem {
  return { id: change.id, component, ...fields, ...(change.setsFont ? { setsFont: true } : {}), installedAt: installedAt(host) };
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function writeTracked(path: string, content: string | Uint8Array, backup: Backup): TrackedFields {
  const existed = existsSync(path);
  const backupPath = existed ? backup(path) : undefined;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return { kind: existed ? "edited" : "created", path, ...(backupPath ? { backup: backupPath } : {}), sha256: sha256File(path) };
}

export function backupFile(host: Host, path: string, component: string): string {
  const target = join(backupsDir(host.home), stampOf(host), `${component}-${basename(path)}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
  return target;
}

export function keepCopy(host: Host, path: string, id: string): string {
  const target = join(picketHome(host.home), "kept", stampOf(host), `${id}-${basename(path)}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
  return target;
}

function unapplied(item: ManifestItem, host: Host, component: ItemRemover): Unapplied {
  return component.unapply(item, host) ?? { result: "removed" };
}

function unchanged(item: ManifestItem): boolean {
  return item.path !== undefined && existsSync(item.path) && sha256File(item.path) === item.sha256;
}

function removeEdited(item: ManifestItem, host: Host, component: ItemRemover): Unapplied {
  if (!unchanged(item) || item.path === undefined || item.backup === undefined) return unapplied(item, host, component);
  copyFileSync(item.backup, item.path);
  return { result: "restored" };
}

function removeCreated(item: ManifestItem, host: Host, component: ItemRemover): Unapplied {
  if (item.path === undefined || !existsSync(item.path)) return { result: "removed" };
  if (!unchanged(item)) return unapplied(item, host, component);
  rmSync(item.path);
  return { result: "removed" };
}

const REMOVERS: Record<ItemKind, (item: ManifestItem, host: Host, component: ItemRemover) => Unapplied> = {
  created: removeCreated,
  edited: removeEdited,
  external: unapplied,
};

function removeItem(item: ManifestItem, host: Host, components: readonly ItemRemover[]): Removal {
  const component = components.find((c) => c.name === item.component);
  if (!component) throw new Error(`no component named ${item.component} to remove it`);
  const reason = component.blocks?.(item, host) ?? null;
  if (reason !== null) return { result: "kept", detail: reason, blocked: true };
  return REMOVERS[item.kind](item, host, component);
}

function fallbackStep(item: ManifestItem): string {
  if (item.path && item.backup) return `put ${item.backup} back at ${item.path} by hand`;
  if (item.path) return `check ${item.path} by hand`;
  if (item.backup) return `the state before setup is saved in ${item.backup}`;
  return `check ${item.id} by hand`;
}

function finish(host: Host, manifest: Manifest): void {
  if (manifest.items.length > 0) {
    writeManifest(host, manifest);
    return;
  }
  rmSync(manifestPath(host.home), { force: true });
  rmSync(backupsDir(host.home), { recursive: true, force: true });
}

export function removeItems(host: Host, manifest: Manifest, ids: readonly string[], components: readonly ItemRemover[]): RemovalOutcome[] {
  const outcomes: RemovalOutcome[] = [];
  for (const item of [...manifest.items].reverse()) {
    if (!ids.includes(item.id)) continue;
    try {
      const { blocked, ...outcome } = removeItem(item, host, components);
      outcomes.push({ id: item.id, ...outcome });
      if (!blocked) manifest.items = manifest.items.filter((kept) => kept !== item);
      finish(host, manifest);
    } catch (err) {
      const failure = err as ManualError;
      outcomes.push({ id: item.id, result: "failed", detail: failure.message, manual: failure.manual ?? fallbackStep(item) });
      finish(host, manifest);
    }
  }
  return outcomes;
}
