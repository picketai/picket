import { join } from "node:path";
import { appendJsonl, readJsonl } from "../../util/io.mts";
import { workDir, workRel, type WorkId } from "../work/files.mts";

export const CASE_KINDS = ["normal", "boundary", "negative", "permission", "state", "integration"] as const;
export const FAILURE_CLASSES = ["product", "test", "environment"] as const;
export const CELL_OUTCOMES = ["blocked", "not run", "not covered"] as const;
export const CASE_OUTCOMES = ["passed", "failed", "blocked"] as const;
export const COUNTED_OUTCOMES: readonly (CaseOutcome | CellOutcome)[] = [...new Set([...CASE_OUTCOMES, ...CELL_OUTCOMES])];
export const TEST_DIR = "test";

export type CaseKind = (typeof CASE_KINDS)[number];
export type FailureClass = (typeof FAILURE_CLASSES)[number];
export type CellOutcome = (typeof CELL_OUTCOMES)[number];
export type CaseOutcome = (typeof CASE_OUTCOMES)[number];

type Stamped = { ts: string; round: number };

export type CaseRow = Stamped & {
  type: "case";
  case: string;
  criterion: string;
  kind: CaseKind;
  intent: string;
  steps: string;
  outcome: CaseOutcome;
  attempts: number;
  unstable: boolean;
  detail: string;
  mocks: string[];
  gaps?: string[];
};
export type ClassRow = Stamped & { type: "class"; case: string; class: FailureClass; evidence: string };
export type CellRow = Stamped & { type: "cell"; criterion: string; kind: CaseKind; outcome: CellOutcome; why: string };
export type QuestionRow = Stamped & { type: "question"; criterion: string; question: string; choices: string[]; default: string | null; basis: string | null };
export type UntestableRow = Stamped & { type: "untestable"; criterion: string; why: string };
export type TestRow = CaseRow | ClassRow | CellRow | QuestionRow | UntestableRow;

type Unstamped<T> = T extends TestRow ? Omit<T, "ts"> : never;
export type TestEntry = Unstamped<TestRow>;

const RESULTS_FILE = "results.jsonl";
const ROW_TYPES: ReadonlySet<string> = new Set(["case", "class", "cell", "question", "untestable"]);
const CASE_ID = /^C-(\d+)$/;
const TESTER = "tester";

function resultsPath(root: string, id: WorkId): string {
  return join(workDir(root, id), TEST_DIR, RESULTS_FILE);
}

export function testFolderRel(id: WorkId): string {
  return `${workRel(id)}${TEST_DIR}/`;
}

export function appendTestRow(root: string, id: WorkId, row: TestEntry, now: Date): void {
  appendJsonl(resultsPath(root, id), { ts: now.toISOString(), ...row });
}

export function readTestRows(root: string, id: WorkId): TestRow[] {
  return readJsonl<TestRow>(resultsPath(root, id)).rows.filter((row) => ROW_TYPES.has(row.type));
}

export function testRound(verdicts: readonly { agent: string }[]): number {
  return 1 + verdicts.filter((row) => row.agent === TESTER).length;
}

export function roundRows(rows: readonly TestRow[], round: number): TestRow[] {
  return rows.filter((row) => row.round === round);
}

export function latestCases(rows: readonly TestRow[]): CaseRow[] {
  const byId = new Map<string, CaseRow>();
  for (const row of rows) if (row.type === "case") byId.set(row.case, row);
  return [...byId.values()];
}

export function latestClass(rows: readonly TestRow[], caseId: string): ClassRow | null {
  return rows.filter((row): row is ClassRow => row.type === "class" && row.case === caseId).at(-1) ?? null;
}

function caseNumber(row: TestRow): number {
  return row.type === "case" ? Number(row.case.match(CASE_ID)?.[1] ?? 0) : 0;
}

export function nextCaseId(rows: readonly TestRow[]): string {
  const highest = Math.max(0, ...rows.map(caseNumber));
  return `C-${String(highest + 1).padStart(2, "0")}`;
}
