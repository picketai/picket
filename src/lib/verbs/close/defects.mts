import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isUnexplained, type ResultClass } from "../../shared/scenarios/compare.mts";
import { defectPath, labelCard, nextDefectId, readDefects, writeDefect, type CardLabels, type DefectEntry } from "../../shared/scenarios/defects.mts";
import { listScenarios, type SavedScenario } from "../../shared/scenarios/files.mts";
import type { KeptBefore, KeptFiles } from "../../shared/scenarios/keep.mts";
import { readResults, type ResultRow, type RunRow, type ScenarioRow } from "../../shared/scenarios/results.mts";
import type { WorkSnapshot } from "../../shared/work/snapshot.mts";

type Settling = { root: string; item: string; today: string; run: RunRow; scenarios: SavedScenario[] };
type Settled = { touched: KeptBefore[]; line: string };

const RECORDED_MODES: readonly string[] = ["full", "affected"];
const FAILING_BEFORE: ResultClass = "failing before the item";
const FIXED: readonly ResultClass[] = ["fixed outside this item", "fixed by this item"];
const DAY_LENGTH = 10;

function recordedRun(rows: readonly ScenarioRow[], item: string): RunRow | null {
  const runs = rows.filter((row): row is RunRow => row.type === "run" && row.item === item && RECORDED_MODES.includes(row.mode) && row.reason === undefined);
  return runs.at(-1) ?? null;
}

function runResults(rows: readonly ScenarioRow[], run: RunRow): ResultRow[] {
  return rows.filter((row): row is ResultRow => row.type === "result" && row.run === run.run);
}

function openDefects(root: string): DefectEntry[] {
  return readDefects(root).filter((entry) => entry.status === "open");
}

function relabel(root: string, scenario: SavedScenario, labels: CardLabels): KeptBefore {
  const earlier = readFileSync(join(root, scenario.path), "utf8");
  writeFileSync(join(root, scenario.path), labelCard(earlier, labels));
  return { path: scenario.path, text: earlier };
}

function unlabelledCard(scenarios: readonly SavedScenario[], id: string, open: readonly DefectEntry[]): SavedScenario | null {
  const scenario = scenarios.find((entry) => entry.id === id);
  const header = scenario?.card?.header;
  if (!scenario || header?.status !== "active" || header.known !== undefined) return null;
  return open.some((entry) => entry.scenario === id) ? null : scenario;
}

function evidence(run: RunRow, result: ResultRow): string {
  const versions = Object.entries(result.versions).map(([app, version]) => `${app} ${version}`);
  return versions.length ? `run ${run.run} on ${versions.join(", ")}` : `run ${run.run}`;
}

function recorded(at: Settling, result: ResultRow): Settled | null {
  const scenario = unlabelledCard(at.scenarios, result.scenario, openDefects(at.root));
  if (scenario === null) return null;
  const entry: DefectEntry = { id: nextDefectId(at.root), status: "open", opened: at.today, found_in: at.item, scenario: result.scenario, expected: scenario.card?.header.intent ?? "", actual: result.detail, evidence: evidence(at.run, result) };
  const path = writeDefect(at.root, entry);
  return { touched: [{ path, text: null }, relabel(at.root, scenario, { known: entry.id })], line: `${entry.id} recorded from ${result.scenario}` };
}

function entryOf(root: string, result: ResultRow): DefectEntry | null {
  const open = openDefects(root);
  return open.find((entry) => entry.id === result.defect) ?? open.find((entry) => entry.scenario === result.scenario) ?? null;
}

function fixed(at: Settling, result: ResultRow, entry: DefectEntry): Settled {
  const path = defectPath(entry.id);
  const earlier = readFileSync(join(at.root, path), "utf8");
  writeDefect(at.root, { ...entry, status: "fixed", fixed: at.today, fixed_in: at.item, reason: result.class, ...(result.detail === "" ? {} : { range: result.detail }) });
  const scenario = at.scenarios.find((saved) => saved.id === result.scenario);
  const card = scenario === undefined ? [] : [relabel(at.root, scenario, { known: null, defect: entry.id })];
  const range = result.detail === "" ? "" : ` (${result.detail})`;
  return { touched: [{ path, text: earlier }, ...card], line: `${entry.id} ${result.class}${range}` };
}

function resolved(at: Settling, result: ResultRow): Settled | null {
  const entry = entryOf(at.root, result);
  if (entry === null) return null;
  if (FIXED.includes(result.class)) return fixed(at, result, entry);
  if (isUnexplained(result.class)) return { touched: [], line: `${entry.id} ${result.class} (${result.detail}); still open` };
  return null;
}

function settle(at: Settling, result: ResultRow): Settled | null {
  return result.class === FAILING_BEFORE ? recorded(at, result) : resolved(at, result);
}

export function recordKnownDefects(root: string, snap: WorkSnapshot, now: Date): KeptFiles {
  const files: KeptFiles = { paths: [], lines: [], before: [] };
  const rows = readResults(root);
  const run = recordedRun(rows, snap.state.id);
  if (run === null) return files;
  const at: Settling = { root, item: snap.state.id, today: now.toISOString().slice(0, DAY_LENGTH), run, scenarios: listScenarios(root) };
  for (const result of runResults(rows, run)) {
    const settled = settle(at, result);
    if (settled === null) continue;
    files.paths.push(...settled.touched.map((before) => before.path));
    files.before.push(...settled.touched);
    files.lines.push(settled.line);
  }
  return files;
}
