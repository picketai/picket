import { action, done, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import { caseCard, caseLine, openItemStack, runCase, runCaseInput, type CaseDeps, type CaseRun, type RunCaseInput } from "../../shared/testing/cases.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, latestCases, readTestRows, roundRows, testRound, type CaseRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { REAL_CASE_DEPS } from "./case.mts";

export type RerunInput = { id: WorkId };
export type RerunResult = { id: WorkId; round: number; rows: CaseRow[] };

function blocked(detail: string): CaseRun {
  return { outcome: "blocked", attempts: 0, unstable: false, detail, mocks: [], gaps: [] };
}

async function rerunOne(id: WorkId, earlier: CaseRow, input: RunCaseInput): Promise<CaseRun> {
  const built = caseCard(id, { criterion: earlier.criterion, kind: earlier.kind, intent: earlier.intent }, earlier.steps);
  if ("problems" in built) return blocked(built.problems.join("; "));
  const problems = scenarioProblems(built.card, input.services);
  if (problems.length) return blocked(problems.join("; "));
  return runCase(built.card, input);
}

function rerunEntry(earlier: CaseRow, round: number, run: CaseRun): Omit<CaseRow, "ts"> {
  const { case: id, criterion, kind, intent, steps } = earlier;
  return { round, type: "case", case: id, criterion, kind, intent, steps, ...run };
}

export async function rerunCases(ctx: Context, deps: CaseDeps, { id }: RerunInput): Promise<Outcome<RerunResult>> {
  const { snap } = openTestItem(ctx.root, id);
  const round = testRound(snap.verdicts);
  const earlier = latestCases(roundRows(readTestRows(ctx.root, id), round - 1));
  if (earlier.length === 0) return done({ id, round, rows: [] });
  const stack = openItemStack(ctx, deps.runner, snap.state);
  const input = runCaseInput(ctx, deps, stack);
  const rows: CaseRow[] = [];
  for (const row of earlier) {
    const entry = rerunEntry(row, round, await rerunOne(id, row, input));
    const at = ctx.now();
    appendTestRow(ctx.root, id, entry, at);
    rows.push({ ts: at.toISOString(), ...entry });
  }
  return done({ id, round, rows });
}

function rerunText({ id, round, rows }: RerunResult): string {
  if (rows.length === 0) return `round ${round} has no earlier cases`;
  return rows.map((row) => caseLine(id, row)).join("\n");
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
