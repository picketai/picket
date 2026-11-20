import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { frontmatter, stringify, type YamlMap } from "../../util/yaml-lite.mts";
import { SCENARIO_DIR } from "../env/standard.mts";
import { parseScenario, writeScenario, type ScenarioHeader } from "./format.mts";

export const DEFECT_DIR = `${SCENARIO_DIR}/defects`;
export const DEFECT_STATUSES = ["open", "fixed"] as const;

export type DefectStatus = (typeof DEFECT_STATUSES)[number];
export type DefectEntry = {
  id: string;
  status: DefectStatus;
  opened: string;
  found_in: string;
  scenario: string;
  expected: string;
  actual: string;
  evidence: string;
  case?: string;
  root_cause?: string;
  escaped?: string;
  fixed?: string;
  fixed_in?: string;
  reason?: string;
  range?: string;
};
export type CardLabels = { known?: string | null; defect?: string };

const FILE_ID = /^DF-(\d{4,})\.md$/;
const ENTRY_ID = /^DF-\d{4,}$/;
const ID_DIGITS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const FENCE = "---";
const REQUIRED_FIELDS = ["id", "status", "opened", "found_in", "scenario", "expected", "actual", "evidence"] as const;
const OPTIONAL_FIELDS = ["case", "root_cause", "escaped", "fixed", "fixed_in", "reason", "range"] as const;

function defectFiles(root: string): string[] {
  const dir = join(root, DEFECT_DIR);
  return existsSync(dir) ? readdirSync(dir).filter((name) => FILE_ID.test(name)).sort() : [];
}

function isEntry(front: YamlMap): boolean {
  const texts = REQUIRED_FIELDS.every((field) => typeof front[field] === "string");
  return texts && ENTRY_ID.test(front.id as string) && (DEFECT_STATUSES as readonly unknown[]).includes(front.status);
}

function toEntry(front: YamlMap): DefectEntry {
  const fields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].flatMap((field) => (typeof front[field] === "string" ? [[field, front[field]] as const] : []));
  return Object.fromEntries(fields) as DefectEntry;
}

function readEntry(root: string, name: string): DefectEntry | null {
  try {
    const { front } = frontmatter(readFileSync(join(root, DEFECT_DIR, name), "utf8"));
    return isEntry(front) ? toEntry(front) : null;
  } catch {
    return null;
  }
}

export function readDefects(root: string): DefectEntry[] {
  return defectFiles(root)
    .flatMap((name) => readEntry(root, name) ?? [])
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function defectPath(id: string): string {
  return `${DEFECT_DIR}/${id}.md`;
}

export function writeDefect(root: string, entry: DefectEntry): string {
  const path = defectPath(entry.id);
  mkdirSync(join(root, DEFECT_DIR), { recursive: true });
  writeFileSync(join(root, path), `${FENCE}\n${stringify(entry)}\n${FENCE}\n`);
  return path;
}

export function nextDefectId(root: string): string {
  const numbers = defectFiles(root).map((name) => Number(name.match(FILE_ID)?.[1] ?? 0));
  return `DF-${String(Math.max(0, ...numbers) + 1).padStart(ID_DIGITS, "0")}`;
}

export function ageDays(opened: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(`${opened}T00:00:00Z`)) / DAY_MS);
}

function labelled(header: ScenarioHeader, { known, defect }: CardLabels): ScenarioHeader {
  const { known: current, ...rest } = header;
  const nextKnown = known === undefined ? current : (known ?? undefined);
  return { ...rest, ...(nextKnown === undefined ? {} : { known: nextKnown }), ...(defect === undefined ? {} : { defect }) };
}

export function labelCard(text: string, labels: CardLabels): string {
  const { card } = parseScenario(text);
  if (card === null) return text;
  return writeScenario({ ...card, header: labelled(card.header, labels) });
}
