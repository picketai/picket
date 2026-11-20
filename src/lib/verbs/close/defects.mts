import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labelCard, nextDefectId, readDefects, writeDefect, type DefectEntry } from "../../shared/scenarios/defects.mts";
import { listScenarios, type SavedScenario } from "../../shared/scenarios/files.mts";
import type { KeptBefore, KeptFiles } from "../../shared/scenarios/keep.mts";
import { readResults, type ResultRow, type RunRow, type ScenarioRow } from "../../shared/scenarios/results.mts";
import type { WorkSnapshot } from "../../shared/work/snapshot.mts";

const RECORDED_MODES: readonly string[] = ["full", "affected"];
const FAILING_BEFORE = "failing before the item";
const DAY_LENGTH = 10;

function recordedRun(rows: readonly ScenarioRow[], item: string): RunRow | null {
  const runs = rows.filter((row): row is RunRow => row.type === "run" && row.item === item && RECORDED_MODES.includes(row.mode) && row.reason === undefined);
  return runs.at(-1) ?? null;
}

function failingBefore(rows: readonly ScenarioRow[], run: RunRow): ResultRow[] {
  return rows.filter((row): row is ResultRow => row.type === "result" && row.run === run.run && row.class === FAILING_BEFORE);
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

function openEntry(root: string, item: string, today: string, run: RunRow, result: ResultRow, scenario: SavedScenario): DefectEntry {
  const intent = scenario.card?.header.intent ?? "";
  return { id: nextDefectId(root), status: "open", opened: today, found_in: item, scenario: result.scenario, expected: intent, actual: result.detail, evidence: evidence(run, result) };
}

function record(root: string, entry: DefectEntry, scenario: SavedScenario): KeptBefore[] {
  const earlier = readFileSync(join(root, scenario.path), "utf8");
  const path = writeDefect(root, entry);
  writeFileSync(join(root, scenario.path), labelCard(earlier, { known: entry.id }));
  return [{ path, text: null }, { path: scenario.path, text: earlier }];
}

export function recordKnownDefects(root: string, snap: WorkSnapshot, now: Date): KeptFiles {
  const recorded: KeptFiles = { paths: [], lines: [], before: [] };
  const rows = readResults(root);
  const run = recordedRun(rows, snap.state.id);
  if (run === null) return recorded;
  const scenarios = listScenarios(root);
  const today = now.toISOString().slice(0, DAY_LENGTH);
  for (const result of failingBefore(rows, run)) {
    const scenario = unlabelledCard(scenarios, result.scenario, readDefects(root).filter((entry) => entry.status === "open"));
    if (scenario === null) continue;
    const entry = openEntry(root, snap.state.id, today, run, result, scenario);
    const touched = record(root, entry, scenario);
    recorded.paths.push(...touched.map((before) => before.path));
    recorded.before.push(...touched);
    recorded.lines.push(`${entry.id} recorded from ${result.scenario}`);
  }
  return recorded;
}
