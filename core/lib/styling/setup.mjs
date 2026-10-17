import { backupFile, backupsDir, emptyManifest, ManifestError, manifestPath, readManifest, removeItems, writeManifest } from "./manifest.mjs";
import { statuslineSetting } from "./statusline-setting.mjs";
import { theme } from "./theme.mjs";

export const COMPONENTS = [theme, statuslineSetting];
const YES_NO = { choices: ["yes", "no"], fallback: "no" };
const NOT_INTERACTIVE = "nothing was written: run this in a terminal or pass --yes to apply it";

function report(changes, { restart = [], manual = [] } = {}) {
  return { changes, restart: [...new Set(restart)], manual };
}

function line(id, summary, result, detail) {
  return { id, summary, result, ...(detail ? { detail } : {}) };
}

function planOf(host, components, manifest) {
  const entries = [];
  const failures = [];
  for (const component of components) {
    try {
      for (const change of component.plan(host, manifest)) entries.push({ component, change });
    } catch (err) {
      failures.push(line(component.name, `plan the ${component.name} change`, "failed", err.message));
    }
  }
  return { entries, failures };
}

function question(intro, summaries) {
  return [intro, ...summaries.map((summary) => `  - ${summary}`), "Go ahead?"].join("\n");
}

async function confirmed(host, text, yes) {
  return yes || (await host.ask(text, YES_NO)) === "yes";
}

function declined(host, changes) {
  return report(changes, { manual: host.interactive ? [] : [NOT_INTERACTIVE] });
}

function carried(existing, item) {
  if (!existing) return item;
  const { backup: _fresh, ...rest } = item;
  return { ...rest, kind: existing.kind, previous: existing.previous, ...(existing.backup ? { backup: existing.backup } : {}) };
}

function recordItem(manifest, item) {
  const existing = manifest.items.find((recorded) => recorded.id === item.id);
  const next = carried(existing, item);
  manifest.items = existing ? manifest.items.map((recorded) => (recorded === existing ? next : recorded)) : [...manifest.items, next];
}

async function applyEntry(host, manifest, { component, change }, yes) {
  if (change.question && !(await confirmed(host, change.question, yes))) return line(change.id, change.summary, "skipped");
  const existing = manifest.items.find((recorded) => recorded.id === change.id);
  const backup = (path) => (existing ? existing.backup : backupFile(host, path, component.name));
  try {
    recordItem(manifest, change.apply(host, backup));
    writeManifest(host, manifest);
    return line(change.id, change.summary, "applied");
  } catch (err) {
    return line(change.id, change.summary, "failed", err.message);
  }
}

async function install(host, manifest, components, { dryRun, yes }) {
  const { entries, failures } = planOf(host, components, manifest);
  const planned = entries.map(({ change }) => line(change.id, change.summary, "planned"));
  if (entries.length === 0 || dryRun) return report([...failures, ...planned]);
  const summaries = entries.map(({ change }) => change.summary);
  if (!(await confirmed(host, question("Picket will make these changes:", summaries), yes))) {
    return declined(host, [...failures, ...planned.map((change) => ({ ...change, result: "declined" }))]);
  }
  const changes = [...failures];
  const restart = [];
  const manual = [];
  for (const entry of entries) {
    const result = await applyEntry(host, manifest, entry, yes);
    changes.push(result);
    const { change } = entry;
    if (result.result === "applied" && change.restart) restart.push(change.restart);
    if (result.result === "applied" && change.manual) manual.push(change.manual);
    if (result.result === "skipped" && change.manualIfSkipped) manual.push(change.manualIfSkipped);
  }
  return report(changes, { restart, manual });
}

function itemSummary(item) {
  return `remove ${item.component}${item.path ? ` from ${item.path}` : ""}`;
}

async function revertAll(host, manifest, { dryRun, yes }) {
  if (manifest === null || manifest.items.length === 0) {
    return report([], { manual: [`nothing to revert: no items in ${manifestPath(host.home)}; backups, if any, are under ${backupsDir(host.home)}`] });
  }
  const planned = manifest.items.map((item) => line(item.id, itemSummary(item), "planned"));
  if (dryRun) return report(planned);
  if (!(await confirmed(host, question("Picket will undo these changes:", planned.map((change) => change.summary)), yes))) {
    return declined(host, planned.map((change) => ({ ...change, result: "declined" })));
  }
  const summaries = new Map(planned.map((change) => [change.id, change.summary]));
  const outcomes = removeItems(host, manifest, manifest.items.map((item) => item.id), COMPONENTS);
  return report(
    outcomes.map((outcome) => line(outcome.id, summaries.get(outcome.id), outcome.result, outcome.detail)),
    { manual: outcomes.flatMap((outcome) => (outcome.manual ? [outcome.manual] : [])) },
  );
}

export async function setupTerminal(host, { only = null, dryRun = false, yes = false, revert = false } = {}) {
  let manifest;
  try {
    manifest = readManifest(host);
  } catch (err) {
    if (!(err instanceof ManifestError)) throw err;
    return report([line("manifest", "read the styling manifest", "failed", err.message)]);
  }
  if (revert) return revertAll(host, manifest, { dryRun, yes });
  const components = only === null ? COMPONENTS : COMPONENTS.filter((component) => only.includes(component.name));
  return install(host, manifest ?? emptyManifest(host), components, { dryRun, yes });
}

export function renderReport(report) {
  const lines = report.changes.length === 0 ? ["Nothing to change."] : report.changes.map((change) => `${change.result.padEnd(9)} ${change.id}: ${change.summary}${change.detail ? ` · ${change.detail}` : ""}`);
  if (report.restart.length > 0) lines.push(`Restart: ${report.restart.join(", ")}`);
  if (report.manual.length > 0) lines.push("Manual steps:", ...report.manual.map((step) => `  - ${step}`));
  return lines.join("\n");
}
