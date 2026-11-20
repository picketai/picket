import { action, done, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import { caseCard, caseLine, defectCard, openItemStack, runCase, runCaseInput, type BuiltCard, type CaseDeps, type CaseRun, type RunCaseInput } from "../../shared/testing/cases.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, latestCases, latestDefects, readTestRows, roundRows, testRound, type CaseRow, type DefectRow, type TestEntry } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { REAL_CASE_DEPS } from "./case.mts";

export type RerunInput = { id: WorkId };
export type RerunResult = { id: WorkId; round: number; rows: CaseRow[]; defects: DefectRow[] };

function blocked(detail: string): CaseRun {
  return { outcome: "blocked", attempts: 0, unstable: false, detail, mocks: [], gaps: [] };
}

async function runBuilt(built: BuiltCard, input: RunCaseInput): Promise<CaseRun> {
  if ("problems" in built) return blocked(built.problems.join("; "));
  const problems = scenarioProblems(built.card, input.services);
  if (problems.length) return blocked(problems.join("; "));
  return runCase(built.card, input);
}

function rerunEntry(earlier: CaseRow, round: number, run: CaseRun): Omit<CaseRow, "ts"> {
  const { case: id, criterion, kind, intent, steps } = earlier;
  return { round, type: "case", case: id, criterion, kind, intent, steps, ...run };
}

function defectRerunEntry(earlier: DefectRow, round: number, run: CaseRun): Omit<DefectRow, "ts"> {
  const { found, kind, intent, steps, evidence } = earlier;
  const gapped = run.gaps.length > 0;
  const outcome = gapped ? "blocked" : run.outcome;
  const detail = gapped ? run.gaps.join("; ") : run.detail;
  return { round, type: "defect", found, kind, intent, steps, evidence, outcome, detail, attempts: run.attempts, mocks: run.mocks };
}

function appended<T extends TestEntry>(ctx: Context, id: WorkId, entry: T): T & { ts: string } {
  const at = ctx.now();
  appendTestRow(ctx.root, id, entry, at);
  return { ts: at.toISOString(), ...entry };
}

export async function rerunCases(ctx: Context, deps: CaseDeps, { id }: RerunInput): Promise<Outcome<RerunResult>> {
  const { snap } = openTestItem(ctx.root, id);
  const round = testRound(snap.verdicts);
  const all = readTestRows(ctx.root, id);
  const earlier = latestCases(roundRows(all, round - 1));
  const recorded = latestDefects(all.filter((row) => row.round < round));
  if (earlier.length === 0 && recorded.length === 0) return done({ id, round, rows: [], defects: [] });
  const input = runCaseInput(ctx, deps, openItemStack(ctx, deps.runner, snap.state));
  const rows: CaseRow[] = [];
  for (const row of earlier) {
    const built = caseCard(id, { criterion: row.criterion, kind: row.kind, intent: row.intent }, row.steps);
    rows.push(appended(ctx, id, rerunEntry(row, round, await runBuilt(built, input))));
  }
  const defects: DefectRow[] = [];
  for (const row of recorded) {
    const built = defectCard(row.kind, row.intent, row.steps);
    defects.push(appended(ctx, id, defectRerunEntry(row, round, await runBuilt(built, input))));
  }
  return done({ id, round, rows, defects });
}

function defectRerunLine(row: DefectRow): string {
  return `${row.found} ${row.kind} ${row.outcome}${row.outcome === "passed" ? "" : `: ${row.detail}`}`;
}

function rerunText({ id, round, rows, defects }: RerunResult): string {
  if (rows.length === 0 && defects.length === 0) return `round ${round} has no earlier cases`;
  return [...rows.map((row) => caseLine(id, row)), ...defects.map(defectRerunLine)].join("\n");
}

function parseRerun(args: Args): RerunInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("test rerun needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<RerunInput, RerunResult> = {
  usage: "test rerun <id>",
  output: "text",
  parse: parseRerun,
  run: action(async (input, ctx) => rerunCases(ctx, REAL_CASE_DEPS, input)),
  render: rerunText,
};
