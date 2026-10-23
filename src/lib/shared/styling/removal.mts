import type { Component } from "./change.mts";
import { COMPONENTS } from "./components.mts";
import type { Host } from "./host.mts";
import { backupsDir, manifestPath, removeItems, type Manifest, type ManifestItem } from "./manifest.mts";
import { confirmed, declined, line, question, readStyleManifest, report, type StyleChange, type StyleReport } from "./plan.mts";

export type RemoveAllOptions = { dryRun?: boolean; yes?: boolean; components?: readonly Component[] };
export type ChooseOptions = { yes?: boolean; components?: readonly Component[] };

type Choice = { label: string; ids: string[] };

const FONT_ID = "font";
const FONT_QUESTION = "Remove JetBrainsMono Nerd Font Mono? Other apps may use it.";
const PICKET_ITSELF = "to remove Picket from a project, run picket uninstall in it; to remove the picket command, run npm uninstall -g @picketai/picket";
const RESTART = "your terminal, so it drops the PicketAI scheme and font";
const SELECTION = /^\d+(\s*,\s*\d+)*$/;
const THEME_IDS = ["theme-file", "theme-setting"];

function itemSummary(item: ManifestItem): string {
  return `remove ${item.id}${item.path ? ` from ${item.path}` : ""}`;
}

export function removeChosen(host: Host, manifest: Manifest, ids: readonly string[], components: readonly Component[]): { changes: StyleChange[]; manual: string[] } {
  const summaries = new Map(manifest.items.map((item) => [item.id, itemSummary(item)]));
  const outcomes = removeItems(host, manifest, ids, components);
  return {
    changes: outcomes.map((outcome) => line(outcome.id, summaries.get(outcome.id) ?? `remove ${outcome.id}`, outcome.result, outcome.detail)),
    manual: outcomes.flatMap((outcome) => (outcome.manual ? [outcome.manual] : [])),
  };
}

export async function removeAll(host: Host, { dryRun = false, yes = false, components = COMPONENTS }: RemoveAllOptions = {}): Promise<StyleReport> {
  const read = readStyleManifest(host);
  if ("failure" in read) return report([read.failure]);
  const { manifest } = read;
  if (manifest === null || manifest.items.length === 0) {
    return report([], { manual: [`nothing to revert: no items in ${manifestPath(host.home)}; backups, if any, are under ${backupsDir(host.home)}`] });
  }
  const planned = manifest.items.map((item) => line(item.id, itemSummary(item), "planned"));
  if (dryRun) return report(planned);
  if (!(await confirmed(host, question("Picket will undo these changes:", planned.map((change) => change.summary)), yes))) {
    return declined(host, planned.map((change) => ({ ...change, result: "declined" })));
  }
  const { changes, manual } = removeChosen(host, manifest, manifest.items.map((item) => item.id), components);
  return report(changes, { manual });
}

function pathsOf(items: readonly ManifestItem[]): string {
  const paths = items.flatMap((item) => (item.path ? [item.path] : []));
  return paths.length ? ` (${paths.join(", ")})` : "";
}

function choicesOf(items: readonly ManifestItem[]): Choice[] {
  const theme = items.filter((item) => THEME_IDS.includes(item.id));
  const others = items.filter((item) => !THEME_IDS.includes(item.id)).map((item) => ({ label: `${item.id}${pathsOf([item])}`, ids: [item.id] }));
  const themeChoice = theme.length ? [{ label: `Claude Code theme${pathsOf(theme)}`, ids: theme.map((item) => item.id) }] : [];
  return [...themeChoice, ...others];
}

function listing(choices: readonly Choice[]): string {
  return ["Picket installed these styling items:", ...choices.map((choice, i) => `  ${i + 1}. ${choice.label}`), "Remove which? all, none, or numbers such as 1,3"].join("\n");
}

function selected(answer: string, choices: readonly Choice[]): string[] | null {
  const text = answer.trim().toLowerCase();
  if (text === "all") return choices.flatMap((choice) => choice.ids);
  if (text === "none" || text === "") return [];
  if (!SELECTION.test(text)) return null;
  const numbers = text.split(",").map(Number);
  if (numbers.some((n) => n < 1 || n > choices.length)) return null;
  return numbers.flatMap((n) => choices[n - 1].ids);
}

async function chooseItems(host: Host, items: readonly ManifestItem[]): Promise<string[]> {
  const choices = choicesOf(items);
  if (choices.length === 0) return [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const chosen = selected(await host.ask(listing(choices), { fallback: "none" }), choices);
    if (chosen !== null) return chosen;
  }
  return [];
}

function isPreexisting(font: ManifestItem): boolean {
  return Boolean(font.data?.preexisting);
}

async function chooseFont(host: Host, font: ManifestItem | undefined): Promise<string[]> {
  if (!font || isPreexisting(font)) return [];
  const answer = await host.ask(FONT_QUESTION, { choices: ["yes", "no"], fallback: "no" });
  return answer === "yes" ? [font.id] : [];
}

function fontIds(font: ManifestItem | undefined): string[] {
  return font && !isPreexisting(font) ? [font.id] : [];
}

function needsRestart(items: readonly ManifestItem[], removedIds: readonly string[]): boolean {
  return items.filter((item) => removedIds.includes(item.id)).some((item) => item.component === "terminal" || item.component === "font");
}

function keptLine(item: ManifestItem): StyleChange {
  return line(item.id, `left in place${item.path ? ` at ${item.path}` : ""}`, "kept", isPreexisting(item) ? "installed before setup" : undefined);
}

export async function chooseAndRemove(host: Host, { yes = false, components = COMPONENTS }: ChooseOptions = {}): Promise<StyleReport> {
  const read = readStyleManifest(host);
  if ("failure" in read) return report([read.failure], { manual: [PICKET_ITSELF] });
  const { manifest } = read;
  if (manifest === null || manifest.items.length === 0) {
    return report([], { manual: [`nothing to remove: no items in ${manifestPath(host.home)}`, PICKET_ITSELF] });
  }
  const font = manifest.items.find((item) => item.id === FONT_ID);
  const others = manifest.items.filter((item) => item.id !== FONT_ID);
  const chosen = yes ? [...others.map((item) => item.id), ...fontIds(font)] : [...(await chooseItems(host, others)), ...(await chooseFont(host, font))];
  const items = [...manifest.items];
  const kept = items.filter((item) => !chosen.includes(item.id)).map(keptLine);
  const { changes, manual } = chosen.length ? removeChosen(host, manifest, chosen, components) : { changes: [], manual: [] };
  const removedIds = changes.filter((change) => change.result !== "failed").map((change) => change.id);
  return report([...changes, ...kept], { restart: needsRestart(items, removedIds) ? [RESTART] : [], manual: [...manual, PICKET_ITSELF] });
}
