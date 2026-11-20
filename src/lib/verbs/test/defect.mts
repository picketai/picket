import { action, done, Refused, type Outcome } from "../../shared/action.mts";
import { catalogOf } from "../../shared/catalog/resolve.mts";
import type { Context } from "../../shared/context.mts";
import type { Card } from "../../shared/scenarios/format.mts";
import { writesUnownedData } from "../../shared/scenarios/keep.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import { defectCard, openItemStack, runCase, runCaseInput, type CaseDeps, type CaseRun } from "../../shared/testing/cases.mts";
import { MAX_DEFECTS } from "../../shared/testing/derive.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, CASE_KINDS, defectRows, nextFoundId, readTestRows, roundRows, testRound, type CaseKind, type DefectRow, type TestRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, UsageError, type Args } from "../../util/args.mts";
import { REAL_CASE_DEPS } from "./case.mts";

export type DefectInput = { id: WorkId; kind: CaseKind; intent: string; evidence: string; steps: string };
export type DefectResult = { id: WorkId; row: DefectRow };

const USAGE = 'test defect <id> --kind <kind> --intent "<the correct answer>" --evidence "<words>", with the step lines on stdin';
const RUN_PREFIX = "PKT-";

function builtCard(id: WorkId, input: DefectInput): Card {
  const built = defectCard(input.kind, input.intent, input.steps);
  if ("problems" in built) throw new Refused(`the steps do not run: ${built.problems.join("; ")}`, { id, problems: built.problems });
  return built.card;
}

function refuseRepeat(id: WorkId, rows: readonly TestRow[], steps: string): void {
  const earlier = defectRows(rows).find((row) => row.steps === steps);
  if (earlier) throw new Refused(`${earlier.found} already records these steps`, { id, found: earlier.found });
}

function newDefectIds(rows: readonly TestRow[], round: number): Set<string> {
  const earlier = new Set(defectRows(rows.filter((row) => row.round < round)).map((row) => row.found));
  return new Set(defectRows(roundRows(rows, round)).flatMap((row) => (earlier.has(row.found) ? [] : [row.found])));
}

function refuseCap(id: WorkId, rows: readonly TestRow[], round: number): void {
  if (newDefectIds(rows, round).size < MAX_DEFECTS) return;
  throw new Refused(`the cap of ${MAX_DEFECTS} defects this round is reached; a defect still there next round can be recorded then`, { id });
}

function createdEntries(root: string): string[] {
  return catalogOf(root).flatMap((entry) => (entry.kind === "create" ? [entry.name] : []));
}

function refuseUnownedData(ctx: Context, id: WorkId, card: Card): void {
  if (writesUnownedData(card, createdEntries(ctx.root))) throw new Refused(`the steps change data they did not create; create it with a ${RUN_PREFIX} prefix`, { id });
}

function refuseNoDefect(id: WorkId, run: CaseRun): void {
  if (run.outcome === "passed") throw new Refused("the steps passed: a defect's steps assert the correct answer, so a pass records nothing", { id });
  if (run.outcome === "blocked") throw new Refused(`the steps were blocked: ${run.detail}`, { id });
  if (run.gaps.length) throw new Refused(`the run met a gap in a mock (${run.gaps.join("; ")}); a gap is never a product defect`, { id, gaps: run.gaps });
}

export async function recordDefect(ctx: Context, deps: CaseDeps, input: DefectInput): Promise<Outcome<DefectResult>> {
  const { id } = input;
  const { snap } = openTestItem(ctx.root, id);
  const card = builtCard(id, input);
  const stack = openItemStack(ctx, deps.runner, snap.state);
  const problems = scenarioProblems(card, stack.services);
  if (problems.length) throw new Refused(`the steps do not run: ${problems.join("; ")}`, { id, problems });
  const rows = readTestRows(ctx.root, id);
  const round = testRound(snap.verdicts);
  refuseCap(id, rows, round);
  refuseRepeat(id, rows, input.steps);
  refuseUnownedData(ctx, id, card);
  const run = await runCase(card, runCaseInput(ctx, deps, stack));
  refuseNoDefect(id, run);
  const entry: Omit<DefectRow, "ts"> = { round, type: "defect", found: nextFoundId(rows), kind: input.kind, intent: input.intent, steps: input.steps, evidence: input.evidence, outcome: "failed", detail: run.detail, attempts: run.attempts, mocks: run.mocks };
  const at = ctx.now();
  appendTestRow(ctx.root, id, entry, at);
  return done({ id, row: { ts: at.toISOString(), ...entry } });
}

function isCaseKind(text: string): text is CaseKind {
  return CASE_KINDS.some((kind) => kind === text);
}

function nonEmpty(args: Args, flag: string): string {
  const text = need(args, flag).trim();
  if (!text) throw new UsageError(`--${flag} must not be empty`);
  return text;
}

function parseDefect(args: Args): DefectInput {
  const [id, ...rest] = args.pos;
  if (!id || rest.length) throw new UsageError(USAGE);
  const kind = need(args, "kind");
  if (!isCaseKind(kind)) throw new UsageError(`--kind must be one of ${CASE_KINDS.join(", ")}, got "${kind}"`);
  const intent = nonEmpty(args, "intent");
  const evidence = nonEmpty(args, "evidence");
  const steps = args.stdin();
  if (!steps.trim()) throw new UsageError(`test defect reads its step lines on stdin: ${USAGE}`);
  return { id: workId(id), kind, intent, evidence, steps };
}

export function defectLine({ row }: DefectResult): string {
  return `${row.found} recorded: ${row.intent}; the stack answered ${row.detail}; it becomes a known defect at close unless a later rerun passes it`;
}

export const verb: VerbSpec<DefectInput, DefectResult> = {
  usage: USAGE,
  output: "text",
  parse: parseDefect,
  run: action(async (input, ctx) => recordDefect(ctx, REAL_CASE_DEPS, input)),
  render: defectLine,
};
