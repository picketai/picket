import { existsSync } from "node:fs";
import type { Change, Component } from "./change.mts";
import { COMPONENTS } from "./components.mts";
import type { Host } from "./host.mts";
import { backupFile, emptyManifest, keepCopy, ManifestError, manifestItem, readManifest, sha256File, writeManifest, type Manifest, type ManifestItem } from "./manifest.mts";

export type StyleChange = { id: string; summary: string; result: string; detail?: string };
export type StyleReport = { changes: StyleChange[]; restart: string[]; manual: string[] };
export type ManifestRead = { manifest: Manifest | null } | { failure: StyleChange };
export type ApplyOptions ={ only?: readonly string[] | null; dryRun?: boolean; yes?: boolean; components?: readonly Component[] };

type Applicable = Change & { apply: NonNullable<Change["apply"]> };
type Entry = { component: Component; change: Applicable };
type Planned = { component: Component; change: Change };
type Applied = StyleChange & { manual?: string };
type RunState = { yes: boolean; applied: ManifestItem[] };

const YES_NO = { choices: ["yes", "no"], fallback: "no" };
const NOT_INTERACTIVE = "nothing was written: run this in a terminal or pass --yes to apply it";

export function report(changes: StyleChange[], { restart = [], manual = [] }: { restart?: string[]; manual?: string[] } = {}): StyleReport {
  return { changes, restart: [...new Set(restart)], manual };
}

export function line(id: string, summary: string, result: string, detail?: string): StyleChange {
  return { id, summary, result, ...(detail ? { detail } : {}) };
}

export function question(intro: string, summaries: readonly string[]): string {
  return [intro, ...summaries.map((summary) => `  - ${summary}`), "Go ahead?"].join("\n");
}

export async function confirmed(host: Host, text: string, yes: boolean): Promise<boolean> {
  return yes || (await host.ask(text, YES_NO)) === "yes";
}

export function declined(host: Host, changes: StyleChange[]): StyleReport {
  return report(changes, { manual: host.interactive ? [] : [NOT_INTERACTIVE] });
}

function isApplicable(change: Change): change is Applicable {
  return typeof change.apply === "function";
}

function planOf(host: Host, components: readonly Component[], manifest: Manifest): { entries: Planned[]; failures: StyleChange[] } {
  const entries: Planned[] = [];
  const failures: StyleChange[] = [];
  for (const component of components) {
    try {
      const planned = entries.map((entry) => entry.change);
      for (const change of component.plan(host, manifest, planned)) entries.push({ component, change });
    } catch (err) {
      failures.push(line(component.name, `plan the ${component.name} change`, "failed", (err as Error).message));
    }
  }
  return { entries, failures };
}

function carried(existing: ManifestItem | undefined, item: ManifestItem): ManifestItem {
  if (!existing) return item;
  const { backup: _fresh, ...rest } = item;
  return { ...rest, kind: existing.kind, previous: existing.previous, ...(existing.backup ? { backup: existing.backup } : {}) };
}

function recordItem(manifest: Manifest, item: ManifestItem): void {
  const existing = manifest.items.find((recorded) => recorded.id === item.id);
  const next = carried(existing, item);
  manifest.items = existing ? manifest.items.map((recorded) => (recorded === existing ? next : recorded)) : [...manifest.items, next];
}

function editedSinceSetup(existing: ManifestItem | undefined): existing is ManifestItem & { path: string } {
  return Boolean(existing?.path && existing.sha256 && existsSync(existing.path) && sha256File(existing.path) !== existing.sha256);
}

async function applyEntry(host: Host, manifest: Manifest, { component, change }: Entry, { yes, applied }: RunState): Promise<Applied> {
  if (change.question && !(await confirmed(host, change.question, yes))) return line(change.id, change.summary, "skipped");
  const existing = manifest.items.find((recorded) => recorded.id === change.id);
  const backup = (path: string) => (existing ? existing.backup : backupFile(host, path, change.id));
  const copyNote = editedSinceSetup(existing) ? `your edited ${existing.path} is saved at ${keepCopy(host, existing.path, change.id)}` : undefined;
  try {
    const fields = await change.apply(host, { backup, applied });
    if (fields === null) return line(change.id, change.summary, "skipped", "not needed after the earlier changes");
    const item = manifestItem(host, change, component.name, fields);
    applied.push(item);
    recordItem(manifest, item);
    writeManifest(host, manifest);
    return { ...line(change.id, change.summary, "applied", copyNote), manual: copyNote };
  } catch (err) {
    const failure = err as Error & { manual?: string };
    return { ...line(change.id, change.summary, "failed", failure.message), manual: [failure.manual, copyNote].filter(Boolean).join("; ") || undefined };
  }
}

async function install(host: Host, manifest: Manifest, components: readonly Component[], { dryRun, yes }: { dryRun: boolean; yes: boolean }): Promise<StyleReport> {
  const planOutcome = planOf(host, components, manifest);
  const notes = planOutcome.entries.map(({ change }) => change).filter((change) => !isApplicable(change));
  const entries = planOutcome.entries.flatMap(({ component, change }) => (isApplicable(change) ? [{ component, change }] : []));
  const upfront = [...planOutcome.failures, ...notes.map((change) => line(change.id, change.summary, "manual"))];
  const noteSteps = notes.flatMap((change) => (change.manual ? [change.manual] : []));
  const planned = entries.map(({ change }) => line(change.id, change.summary, "planned"));
  if (entries.length === 0 || dryRun) return report([...upfront, ...planned], { manual: noteSteps });
  const summaries = entries.map(({ change }) => change.summary);
  if (!(await confirmed(host, question("Picket will make these changes:", summaries), yes))) {
    const result = declined(host, [...upfront, ...planned.map((change) => ({ ...change, result: "declined" }))]);
    return { ...result, manual: [...noteSteps, ...result.manual] };
  }
  const changes = [...upfront];
  const restart: string[] = [];
  const manual = [...noteSteps];
  const state: RunState = { yes, applied: [] };
  for (const entry of entries) {
    const { manual: entryManual, ...result } = await applyEntry(host, manifest, entry, state);
    changes.push(result);
    const { change } = entry;
    if (entryManual) manual.push(entryManual);
    if (result.result === "applied" && change.restart) restart.push(change.restart);
    if (result.result === "applied" && change.manual) manual.push(change.manual);
    if (result.result === "skipped" && change.manualIfSkipped) manual.push(change.manualIfSkipped);
  }
  return report(changes, { restart, manual });
}

export function readStyleManifest(host: Host): ManifestRead {
  try {
    return { manifest: readManifest(host) };
  } catch (err) {
    if (!(err instanceof ManifestError)) throw err;
    return { failure: line("manifest", "read the styling manifest", "failed", err.message) };
  }
}

export async function applyStyle(host: Host, { only = null, dryRun = false, yes = false, components = COMPONENTS }: ApplyOptions = {}): Promise<StyleReport> {
  const read = readStyleManifest(host);
  if ("failure" in read) return report([read.failure]);
  const chosen = only === null ? components : components.filter((component) => only.includes(component.name));
  return install(host, read.manifest ?? emptyManifest(host), chosen, { dryRun, yes });
}

export function renderReport(report: StyleReport): string {
  const lines = report.changes.length === 0 ? ["Nothing to change."] : report.changes.map((change) => `${change.result.padEnd(9)} ${change.id}: ${change.summary}${change.detail ? ` · ${change.detail}` : ""}`);
  if (report.restart.length > 0) lines.push(`Restart: ${report.restart.join(", ")}`);
  if (report.manual.length > 0) lines.push("Manual steps:", ...report.manual.map((step) => `  - ${step.replaceAll("\n", "\n    ")}`));
  return lines.join("\n");
}
