import { basename } from "node:path";
import { writeScenario } from "../scenarios/format.mts";
import { keepCandidates, writesUnownedData, type Candidate, type KeptFiles } from "../scenarios/keep.mts";
import { catalogOf } from "../catalog/resolve.mts";
import { caseCard } from "./cases.mts";
import { latestCases, roundRows, type CaseRow, type TestRow } from "./results.mts";

const MASK = "***";

function isKeepable(row: CaseRow): boolean {
  return row.outcome === "passed" && !row.unstable && !row.steps.includes(MASK);
}

function candidateOf(item: string, row: CaseRow, index: number, created: readonly string[]): Candidate[] {
  const built = caseCard(item, { criterion: row.criterion, kind: row.kind, intent: row.intent }, row.steps);
  if ("problems" in built || writesUnownedData(built.card, created)) return [];
  return [{ covers: `${row.criterion} ${row.kind}`, index, outcome: "passed", detail: "", text: writeScenario(built.card), replaces: null }];
}

export function caseCandidates(item: string, rows: readonly TestRow[], round: number, created: readonly string[]): Candidate[] {
  return latestCases(roundRows(rows, round))
    .filter(isKeepable)
    .flatMap((row, index) => candidateOf(item, row, index, created));
}

function createdEntries(root: string): string[] {
  return catalogOf(root).flatMap((entry) => (entry.kind === "create" ? [entry.name] : []));
}

export function notProven(rows: readonly TestRow[], round: number, real: (mock: string) => string): string[] {
  const mocks = latestCases(roundRows(rows, round)).flatMap((row) => row.mocks);
  return [...new Set(mocks.map(real))];
}

export type KeptScenario = { covers: string; id: string };
export type KeptCases = { files: KeptFiles; labels: string[]; scenarios: KeptScenario[] };

export function keepFinalCases(root: string, item: string, rows: readonly TestRow[], round: number): KeptCases {
  const candidates = caseCandidates(item, rows, round, createdEntries(root));
  const files = keepCandidates(root, candidates);
  const scenarios = files.paths.map((path, at) => ({ covers: candidates[at].covers, id: basename(path, ".md") }));
  return { files, labels: scenarios.map(({ covers, id }) => `${id} (${covers})`), scenarios };
}
