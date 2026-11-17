import { basename } from "node:path";
import { writeScenario } from "../scenarios/format.mts";
import { keepCandidates, writesUnownedData, type Candidate, type KeptFiles } from "../scenarios/keep.mts";
import { caseCard } from "./cases.mts";
import { latestCases, roundRows, type CaseRow, type TestRow } from "./results.mts";

const MASK = "***";
const MOCK_SUFFIX = "-mock";

function isKeepable(row: CaseRow): boolean {
  return row.outcome === "passed" && !row.unstable && !row.steps.includes(MASK);
}

function candidateOf(item: string, row: CaseRow, index: number): Candidate[] {
  const built = caseCard(item, { criterion: row.criterion, kind: row.kind, intent: row.intent }, row.steps);
  if ("problems" in built || writesUnownedData(built.card)) return [];
  return [{ covers: `${row.criterion} ${row.kind}`, index, outcome: "passed", detail: "", text: writeScenario(built.card), replaces: null }];
}

export function caseCandidates(item: string, rows: readonly TestRow[], round: number): Candidate[] {
  return latestCases(roundRows(rows, round))
    .filter(isKeepable)
    .flatMap((row, index) => candidateOf(item, row, index));
}

function realName(mock: string): string {
  return mock.endsWith(MOCK_SUFFIX) ? mock.slice(0, -MOCK_SUFFIX.length) : mock;
}

export function notProven(rows: readonly TestRow[], round: number): string[] {
  const mocks = latestCases(roundRows(rows, round)).flatMap((row) => row.mocks);
  return [...new Set(mocks.map(realName))];
}

export type KeptCases = { files: KeptFiles; labels: string[] };

export function keepFinalCases(root: string, item: string, rows: readonly TestRow[], round: number): KeptCases {
  const candidates = caseCandidates(item, rows, round);
  const files = keepCandidates(root, candidates);
  const labels = files.paths.map((path, at) => `${basename(path, ".md")} (${candidates[at].covers})`);
  return { files, labels };
}
