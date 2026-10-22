import { ManifestError, manifestPath, readManifest } from "./manifest.mjs";
import { COMPONENTS, line, removeChosen, report } from "./setup.mjs";

const FONT_ID = "font";
const FONT_QUESTION = "Remove JetBrainsMono Nerd Font Mono? Other apps may use it.";
const PICKET_ITSELF = "to remove Picket itself, run by hand: claude plugin uninstall picket@picketai, then npm uninstall -g @picketai/picket";
const RESTART = "your terminal, so it drops the PicketAI scheme and font";
const SELECTION = /^\d+(\s*,\s*\d+)*$/;
const THEME_IDS = ["theme-file", "theme-setting"];

function pathsOf(items) {
  const paths = items.flatMap((item) => (item.path ? [item.path] : []));
  return paths.length ? ` (${paths.join(", ")})` : "";
}

function entriesOf(items) {
  const theme = items.filter((item) => THEME_IDS.includes(item.id));
  const entries = items.filter((item) => !THEME_IDS.includes(item.id)).map((item) => ({ label: `${item.id}${pathsOf([item])}`, ids: [item.id] }));
  const themeEntry = theme.length ? [{ label: `Claude Code theme${pathsOf(theme)}`, ids: theme.map((item) => item.id) }] : [];
  return [...themeEntry, ...entries];
}

function listing(entries) {
  return [
    "Picket installed these styling items:",
    ...entries.map((entry, i) => `  ${i + 1}. ${entry.label}`),
    "Remove which? all, none, or numbers such as 1,3",
  ].join("\n");
}

function selected(answer, entries) {
  const text = answer.trim().toLowerCase();
  if (text === "all") return entries.flatMap((entry) => entry.ids);
  if (text === "none" || text === "") return [];
  if (!SELECTION.test(text)) return null;
  const numbers = text.split(",").map(Number);
  if (numbers.some((n) => n < 1 || n > entries.length)) return null;
  return numbers.flatMap((n) => entries[n - 1].ids);
}

async function chooseItems(host, items) {
  const entries = entriesOf(items);
  if (entries.length === 0) return [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const chosen = selected(await host.ask(listing(entries), { fallback: "none" }), entries);
    if (chosen !== null) return chosen;
  }
  return [];
}

async function chooseFont(host, font) {
  if (!font || font.data?.preexisting) return [];
  const answer = await host.ask(FONT_QUESTION, { choices: ["yes", "no"], fallback: "no" });
  return answer === "yes" ? [font.id] : [];
}

function removable(manifest) {
  const font = manifest.items.find((item) => item.id === FONT_ID);
  const others = manifest.items.filter((item) => item.id !== FONT_ID);
  return { font, others };
}

function fontIds(font) {
  return font && !font.data?.preexisting ? [font.id] : [];
}

function needsRestart(items, removedIds) {
  return items.filter((item) => removedIds.includes(item.id)).some((item) => item.component === "terminal" || item.component === "font");
}

export async function uninstall(host, { yes = false, components = COMPONENTS } = {}) {
  let manifest;
  try {
    manifest = readManifest(host);
  } catch (err) {
    if (!(err instanceof ManifestError)) throw err;
    return report([line("manifest", "read the styling manifest", "failed", err.message)], { manual: [PICKET_ITSELF] });
  }
  if (manifest === null || manifest.items.length === 0) {
    return report([], { manual: [`nothing to remove: no items in ${manifestPath(host.home)}`, PICKET_ITSELF] });
  }
  const { font, others } = removable(manifest);
  const chosen = yes ? [...others.map((item) => item.id), ...fontIds(font)] : [...(await chooseItems(host, others)), ...(await chooseFont(host, font))];
  const items = [...manifest.items];
  const kept = items.filter((item) => !chosen.includes(item.id)).map((item) => line(item.id, `left in place${item.path ? ` at ${item.path}` : ""}`, "kept", item.data?.preexisting ? "installed before setup" : undefined));
  const { changes, manual } = chosen.length ? removeChosen(host, manifest, chosen, components) : { changes: [], manual: [] };
  const removedIds = changes.filter((change) => change.result !== "failed").map((change) => change.id);
  return report([...changes, ...kept], { restart: needsRestart(items, removedIds) ? [RESTART] : [], manual: [...manual, PICKET_ITSELF] });
}
