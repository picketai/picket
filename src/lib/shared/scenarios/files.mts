import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SCENARIO_DIR } from "../env/standard.mts";
import { fingerprintMatches, parseScenario, type Card } from "./format.mts";

export type SavedScenario = { path: string; id: string | null; card: Card | null; problems: string[]; byHand: boolean };

const CARD_FILE = /\.md$/;
const FILE_ID = /^(S-\d{4,})\.md$/;

function readScenario(root: string, name: string): SavedScenario {
  const path = `${SCENARIO_DIR}/${name}`;
  const text = readFileSync(join(root, path), "utf8");
  const { card, problems } = parseScenario(text);
  const id = card?.header.id ?? name.match(FILE_ID)?.[1] ?? null;
  return { path, id, card, problems, byHand: !fingerprintMatches(text) };
}

function withDuplicateIds(scenarios: SavedScenario[]): SavedScenario[] {
  const firstPath = new Map<string, string>();
  return scenarios.map((scenario) => {
    if (scenario.id === null) return scenario;
    const first = firstPath.get(scenario.id);
    if (first === undefined) {
      firstPath.set(scenario.id, scenario.path);
      return scenario;
    }
    return { ...scenario, problems: [...scenario.problems, `header: id ${scenario.id} is already used by ${first}`] };
  });
}

export function listScenarios(root: string): SavedScenario[] {
  const dir = join(root, SCENARIO_DIR);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && CARD_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  return withDuplicateIds(names.map((name) => readScenario(root, name)));
}
