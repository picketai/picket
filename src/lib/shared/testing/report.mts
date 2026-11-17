import type { Derived } from "./derive.mts";
import { latestCases, latestClass, roundRows, type CaseRow, type CellRow, type QuestionRow, type TestRow } from "./results.mts";

export type ReportInput = { id: string; round: number; derived: Derived; rows: TestRow[]; criteria: string[] };

const COUNTED_OUTCOMES = ["passed", "failed", "blocked", "not run", "not covered"] as const;
const TABLE_HEAD = ["| Criterion | Kind | Case | Outcome | Class | Mock | Detail |", "| --- | --- | --- | --- | --- | --- | --- |"];

function cellsOf(rows: readonly TestRow[]): CellRow[] {
  return rows.filter((row): row is CellRow => row.type === "cell");
}

function classText(rows: readonly TestRow[], caseId: string): string {
  return latestClass(rows, caseId)?.class ?? "";
}

function tableCell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function tableRow(fields: string[]): string {
  return `| ${fields.map(tableCell).join(" | ")} |`;
}

function countsLine(cases: CaseRow[], cells: CellRow[]): string {
  const outcomes: string[] = [...cases.map((row) => row.outcome), ...cells.map((row) => row.outcome)];
  const parts = COUNTED_OUTCOMES.map((outcome) => ({ outcome, count: outcomes.filter((seen) => seen === outcome).length }))
    .filter(({ count }) => count > 0)
    .map(({ outcome, count }) => `${count} ${outcome}`);
  return parts.length ? parts.join(", ") : "no cases recorded";
}

function verdictLine(round: number, derived: Derived): string {
  return `Round ${round} · ${derived.verdict}${derived.route ? ` · route ${derived.route}` : ""}`;
}

function table(cases: CaseRow[], cells: CellRow[], rows: readonly TestRow[]): string[] {
  const caseRows = cases.map((row) => tableRow([row.criterion, row.kind, row.case, row.outcome, classText(rows, row.case), row.mocks.join(", "), row.detail]));
  const cellRows = cells.map((row) => tableRow([row.criterion, row.kind, "", row.outcome, "", "", row.why]));
  return [...TABLE_HEAD, ...caseRows, ...cellRows];
}

function section(title: string, lines: string[]): string[] {
  return lines.length ? ["", `## ${title}`, "", ...lines] : [];
}

function questionLines(question: QuestionRow): string[] {
  const choices = question.choices.map((choice) => `  - ${choice}${choice === question.default ? " (default)" : ""}`);
  const basis = question.basis === null ? [] : [`  Basis: ${question.basis}`];
  return [`- ${question.criterion}: ${question.question}`, ...choices, ...basis];
}

function mockNames(cases: CaseRow[]): string[] {
  return [...new Set(cases.flatMap((row) => row.mocks))];
}

export function renderReport(input: ReportInput): string {
  const rows = roundRows(input.rows, input.round);
  const cases = latestCases(rows);
  const cells = cellsOf(rows);
  const questions = rows.filter((row): row is QuestionRow => row.type === "question");
  const mocks = mockNames(cases);
  const lines = [
    `# Test report: ${input.id}`,
    "",
    verdictLine(input.round, input.derived),
    "",
    `Criteria: ${input.criteria.join(", ")}`,
    "",
    countsLine(cases, cells),
    "",
    ...table(cases, cells, rows),
    ...section("Unclassified", input.derived.unclassified.map((caseId) => `- ${caseId}`)),
    ...section("Reasons", input.derived.reasons.map((reason) => `- ${reason}`)),
    ...section("Questions", questions.flatMap(questionLines)),
    ...(mocks.length ? ["", `Through a mock: ${mocks.join(", ")}`] : []),
  ];
  return `${lines.join("\n")}\n`;
}
