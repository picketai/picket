import { appendJsonl, readJsonl } from "../../util/io.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { isBlamed, isUnexplained, RESULT_CLASSES, type ResultClass } from "./compare.mts";

export type RunMode = "full" | "affected" | "only" | "base";
export type ScenarioOutcome = "passed" | "failed" | "blocked" | "not run";
export type Versions = Record<string, string>;

export type RunRow = { type: "run"; run: string; item: string; mode: RunMode; key: string; versions: Versions; reason?: string };
export type ResultRow = {
  type: "result";
  run: string;
  scenario: string;
  fingerprint: string;
  key: string;
  versions: Versions;
  outcome: ScenarioOutcome;
  attempts: number;
  unstable: boolean;
  class: ResultClass;
  detail: string;
  mocks?: string[];
  gaps?: string[];
  defect?: string;
};
export type ScenarioRow = RunRow | ResultRow;
export type UnexplainedRow = { scenario: string; class: ResultClass; detail: string; defect: string | null };
export type ReplaySummary = { run: RunRow | null; counts: Partial<Record<ResultClass, number>>; blamed: { scenario: string; class: ResultClass }[]; unexplained: UnexplainedRow[] };

const KNOWN_MODES: readonly RunMode[] = ["full", "affected", "base"];

function resultsPath(root: string): string {
  return statePath(root, STATE_FILES.scenarioResults);
}

export function appendRows(root: string, rows: readonly ScenarioRow[]): void {
  for (const row of rows) appendJsonl(resultsPath(root), row);
}

export function readResults(root: string): ScenarioRow[] {
  return readJsonl<ScenarioRow>(resultsPath(root)).rows.filter((row) => row.type === "run" || row.type === "result");
}

function runModes(rows: readonly ScenarioRow[]): Map<string, RunMode> {
  return new Map(rows.flatMap((row) => (row.type === "run" ? [[row.run, row.mode] as const] : [])));
}

function knownMode(mode: RunMode | undefined): boolean {
  return mode !== undefined && KNOWN_MODES.includes(mode);
}

export function lastKnown(rows: readonly ScenarioRow[], scenario: string, fingerprint: string, keyId: string): ResultRow | null {
  const modes = runModes(rows);
  const matching = rows.filter(
    (row): row is ResultRow => row.type === "result" && row.scenario === scenario && row.fingerprint === fingerprint && row.key === keyId && knownMode(modes.get(row.run)),
  );
  return matching.at(-1) ?? null;
}

export function latestRun(rows: readonly ScenarioRow[], item: string, modes: readonly RunMode[]): RunRow | null {
  const runs = rows.filter((row): row is RunRow => row.type === "run" && row.item === item && modes.includes(row.mode));
  return runs.at(-1) ?? null;
}

export function itemMocks(rows: readonly ScenarioRow[], item: string): string[] {
  const run = latestRun(rows, item, ["full", "affected"]);
  if (run === null) return [];
  const mocks = rows.flatMap((row) => (row.type === "result" && row.run === run.run ? (row.mocks ?? []) : []));
  return [...new Set(mocks)];
}

export function replaySummary(rows: readonly ScenarioRow[], item: string): ReplaySummary {
  const run = latestRun(rows, item, ["full"]);
  const results = run === null ? [] : rows.filter((row): row is ResultRow => row.type === "result" && row.run === run.run);
  const counts: Partial<Record<ResultClass, number>> = {};
  for (const result of results) counts[result.class] = (counts[result.class] ?? 0) + 1;
  const blamed = results.filter((result) => isBlamed(result.class)).map((result) => ({ scenario: result.scenario, class: result.class }));
  const unexplained = results.filter((result) => isUnexplained(result.class)).map((result) => ({ scenario: result.scenario, class: result.class, detail: result.detail, defect: result.defect ?? null }));
  return { run, counts, blamed, unexplained };
}

function countText(summary: ReplaySummary, cls: ResultClass): string {
  const named = [...summary.blamed, ...summary.unexplained].filter((entry) => entry.class === cls).map((entry) => entry.scenario);
  return `${summary.counts[cls]} ${cls}${named.length ? ` (${named.join(", ")})` : ""}`;
}

export function summaryText(summary: ReplaySummary): string {
  if (summary.run === null) return "not replayed";
  if (summary.run.reason !== undefined) return `not replayed: ${summary.run.reason}`;
  const present = RESULT_CLASSES.filter((cls) => (summary.counts[cls] ?? 0) > 0);
  const total = present.reduce((sum, cls) => sum + (summary.counts[cls] ?? 0), 0);
  if (total === 0) return "0 replayed: no saved scenarios";
  return `${total} replayed: ${present.map((cls) => countText(summary, cls)).join(", ")}`;
}
