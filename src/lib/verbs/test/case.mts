import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { action, done, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { realRunner } from "../../shared/env/engine.mts";
import { httpAdapter } from "../../shared/scenarios/http.mts";
import type { Card } from "../../shared/scenarios/format.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import { caseCard, caseLine, openItemStack, runCase, runCaseInput, type CaseDeps, type CaseSpec } from "../../shared/testing/cases.mts";
import { caseCap } from "../../shared/testing/derive.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, CASE_KINDS, latestCases, nextCaseId, readTestRows, roundRows, testRound, type CaseKind, type CaseRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type CaseInput = { id: WorkId; spec: CaseSpec; steps: string };
export type CaseResult = { id: WorkId; row: CaseRow };

const USAGE = "test case <id> --criterion <T-N.x> --kind <kind> --intent \"<words>\", with the step lines on stdin";

export const REAL_CASE_DEPS: CaseDeps = { runner: realRunner, adapter: httpAdapter(), sleep: (ms) => delay(ms), random: (size) => randomBytes(size) };

function refuseCriterion(criterion: string, criteria: string[], id: WorkId): void {
  if (!criteria.includes(criterion)) throw new Refused(`${criterion} is not a tested criterion; the tested criteria are ${criteria.join(", ")}`, { id });
}

function refuseCap(id: WorkId, spec: CaseSpec, cap: number, cases: number): void {
  if (cases < cap) return;
  throw new Refused(`the cap of ${cap} cases this round is reached; record what is left with picket test note ${id} ${spec.criterion} ${spec.kind} not-covered --why "<why>"`, { id });
}

function refuseProblems(problems: string[], id: WorkId): void {
  if (problems.length) throw new Refused(`the case does not run: ${problems.join("; ")}`, { id, problems });
}

function builtCard(id: WorkId, spec: CaseSpec, steps: string): Card {
  const built = caseCard(id, spec, steps);
  if ("problems" in built) throw new Refused(`the case does not run: ${built.problems.join("; ")}`, { id, problems: built.problems });
  return built.card;
}

export async function recordCase(ctx: Context, deps: CaseDeps, { id, spec, steps }: CaseInput): Promise<Outcome<CaseResult>> {
  const { snap, criteria } = openTestItem(ctx.root, id);
  refuseCriterion(spec.criterion, criteria, id);
  const rows = readTestRows(ctx.root, id);
  const round = testRound(snap.verdicts);
  refuseCap(id, spec, caseCap(criteria), latestCases(roundRows(rows, round)).length);
  const card = builtCard(id, spec, steps);
  const stack = openItemStack(ctx, deps.runner, snap.state);
  refuseProblems(scenarioProblems(card, stack.services), id);
  const run = await runCase(card, runCaseInput(ctx, deps, stack));
  const entry: Omit<CaseRow, "ts"> = { round, type: "case", case: nextCaseId(rows), ...spec, steps, ...run, mocks: stack.mocks };
  const at = ctx.now();
  appendTestRow(ctx.root, id, entry, at);
  return done({ id, row: { ts: at.toISOString(), ...entry } });
}

function isCaseKind(text: string): text is CaseKind {
  return CASE_KINDS.some((kind) => kind === text);
}

function parseCase(args: Args): CaseInput {
  const [id, ...rest] = args.pos;
  if (!id || rest.length) throw new UsageError(USAGE);
  const kind = need(args, "kind");
  if (!isCaseKind(kind)) throw new UsageError(`--kind must be one of ${CASE_KINDS.join(", ")}, got "${kind}"`);
  const intent = need(args, "intent").trim();
  if (!intent) throw new UsageError("--intent must not be empty");
  const steps = args.stdin();
  if (!steps.trim()) throw new UsageError(`test case reads its step lines on stdin: ${USAGE}`);
  return { id: workId(id), spec: { criterion: need(args, "criterion"), kind, intent }, steps };
}

export const verb: VerbSpec<CaseInput, CaseResult> = {
  usage: USAGE,
  output: "text",
  parse: parseCase,
  run: action(async (input, ctx) => recordCase(ctx, REAL_CASE_DEPS, input)),
  render: ({ id, row }) => caseLine(id, row),
};
