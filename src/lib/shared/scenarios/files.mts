import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readJson } from "../../util/io.mts";
import { SCENARIO_DIR } from "../env/standard.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { fingerprintMatches, fingerprintOf, parseScenario, type Card } from "./format.mts";
import type { ScenarioRow } from "./results.mts";

export type SavedScenario = { path: string; id: string | null; card: Card | null; problems: string[]; fingerprint: string; byHand: boolean };

const CARD_FILE = /\.md$/;
const FILE_ID = /^(S-\d{4,})\.md$/;
const ID_NUMBER = /^S-(\d+)/;
const ID_DIGITS = 4;

function acceptedPath(root: string): string {
  return statePath(root, STATE_FILES.scenarioAccepted);
}

export function readAccepted(root: string): Set<string> {
  const stored = readJson<unknown>(acceptedPath(root));
  return new Set(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : []);
}

export function acceptFingerprint(root: string, fingerprint: string): void {
  const accepted = readAccepted(root);
  if (accepted.has(fingerprint)) return;
  const path = acceptedPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify([...accepted, fingerprint].sort(), null, 2)}\n`);
}

function readScenario(root: string, name: string, accepted: Set<string>): SavedScenario {
  const path = `${SCENARIO_DIR}/${name}`;
  const text = readFileSync(join(root, path), "utf8");
  const { card, problems } = parseScenario(text);
  const id = card?.header.id ?? name.match(FILE_ID)?.[1] ?? null;
  const fingerprint = fingerprintOf(text);
  return { path, id, card, problems, fingerprint, byHand: !fingerprintMatches(text) && !accepted.has(fingerprint) };
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

function idNumber(id: string): number {
  return Number(id.match(ID_NUMBER)?.[1] ?? 0);
}

export function nextScenarioId(root: string, rows: readonly ScenarioRow[]): string {
  const dir = join(root, SCENARIO_DIR);
  const fromFiles = existsSync(dir) ? readdirSync(dir).flatMap((name) => (FILE_ID.test(name) ? [idNumber(name)] : [])) : [];
  const fromRows = rows.flatMap((row) => (row.type === "result" ? [idNumber(row.scenario)] : []));
  const next = Math.max(0, ...fromFiles, ...fromRows) + 1;
  return `S-${String(next).padStart(ID_DIGITS, "0")}`;
}

export function writeScenarioFile(root: string, id: string, text: string): string {
  const path = `${SCENARIO_DIR}/${id}.md`;
  mkdirSync(join(root, SCENARIO_DIR), { recursive: true });
  writeFileSync(join(root, path), text);
  return path;
}

export function listScenarios(root: string): SavedScenario[] {
  const dir = join(root, SCENARIO_DIR);
  if (!existsSync(dir)) return [];
  const accepted = readAccepted(root);
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && CARD_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  return withDuplicateIds(names.map((name) => readScenario(root, name, accepted)));
}
