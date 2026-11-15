import { appendJsonl, readJsonl } from "../../util/io.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import type { ResultClass } from "./compare.mts";

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
};
export type ScenarioRow = RunRow | ResultRow;

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
