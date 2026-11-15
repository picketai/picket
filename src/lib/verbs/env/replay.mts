import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { machineCheck, realRunner, type Engine, type EngineRunner } from "../../shared/env/engine.mts";
import { readLayout, type ItemLayout } from "../../shared/repos.mts";
import { runBase, type BaseInput, type BaseOutcome } from "../../shared/scenarios/base-run.mts";
import { classify, isBlamed, RESULT_CLASSES, type ResultClass } from "../../shared/scenarios/compare.mts";
import { acceptFingerprint, listScenarios, type SavedScenario } from "../../shared/scenarios/files.mts";
import { httpAdapter, type HttpAdapter } from "../../shared/scenarios/http.mts";
import { baseKey, keyId, workingKey, type ContentKey } from "../../shared/scenarios/keys.mts";
import { affected, replayScenarios, type ScenarioRun } from "../../shared/scenarios/replay.mts";
import { appendRows, lastKnown, readResults, type ResultRow, type RunMode, type RunRow, type ScenarioRow, type Versions } from "../../shared/scenarios/results.mts";
import { newRunKey } from "../../shared/scenarios/values.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState, type WorkState } from "../../shared/work/state.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";
import { startStack, type StartedStack } from "./start.mts";

export type ReplayMode = Exclude<RunMode, "base">;
export type ReplayInput = { id: WorkId; mode: ReplayMode; only: string | null };
export type ReplayLine = { scenario: string; class: ResultClass; detail: string; byHand: boolean };
export type ReplayReport = { ok: boolean; stack: string | null; reason: string | null; lines: ReplayLine[] };
export type ReplayDeps = {
  runner: EngineRunner;
  adapter: HttpAdapter;
  sleep: (ms: number) => Promise<void>;
  random: (size: number) => Uint8Array;
  base: (input: BaseInput) => Promise<BaseOutcome>;
};

const CLOSED_STATUSES = ["done", "abandoned"];
const NO_ENGINE = "no container engine";
const NO_BASE_COMMIT = "the item has no base commit";
const REQUEST_TIMEOUT_MS = 20_000;
const RUN_KEY_BYTES = 2;
const DAY_LENGTH = 10;

type Keys = { working: ContentKey; base: ContentKey };
type RunContext = { item: WorkId; run: string; mode: RunMode; key: string; versions: Versions };
type Session = { ctx: Context; deps: ReplayDeps; input: ReplayInput; state: WorkState; engine: Engine; start: StartedStack; layout: ItemLayout; run: string };
type BaseComparison = { rows: ScenarioRow[]; note: string | null };

function openState(root: string, id: WorkId): WorkState {
  const state = readState(root, id);
  if (CLOSED_STATUSES.includes(state.status)) throw new Refused(`${id} is ${state.status}; env replay runs only for an open or blocked item`);
  return state;
}

function runRow({ item, run, mode, key, versions }: RunContext, reason: string | null): RunRow {
  return { type: "run", run, item, mode, key, versions, ...(reason === null ? {} : { reason }) };
}

function resultRow(scenarioRun: ScenarioRun, rows: ScenarioRow[], context: RunContext, baseId: string): ResultRow {
  const cls = classify(scenarioRun, lastKnown(rows, scenarioRun.id, scenarioRun.fingerprint, baseId), false);
  const { id: scenario, fingerprint, outcome, attempts, unstable, detail } = scenarioRun;
  return { type: "result", run: context.run, scenario, fingerprint, key: context.key, versions: context.versions, outcome, attempts: attempts.length, unstable, class: cls, detail };
}

function selected(scenarios: SavedScenario[], input: ReplayInput, keys: Keys): SavedScenario[] {
  if (input.mode === "affected") return affected(scenarios, keys.working, keys.base);
  if (input.mode === "full") return scenarios;
  const chosen = scenarios.filter((scenario) => scenario.id === input.only);
  if (chosen.length === 0) throw new Refused(`no saved scenario ${input.only}`);
  return chosen;
}

function lineOf(run: ScenarioRun, row: ResultRow): ReplayLine {
  return { scenario: run.id, class: row.class, detail: row.detail, byHand: run.byHand };
}

function replayDeps(ctx: Context, deps: ReplayDeps): BaseInput["replay"] {
  const today = ctx.now().toISOString().slice(0, DAY_LENGTH);
  return { adapter: deps.adapter, env: ctx.env, today, newRunKey: () => newRunKey(deps.random(RUN_KEY_BYTES)), timeoutMs: REQUEST_TIMEOUT_MS, sleep: deps.sleep };
}

function needsBase(run: ScenarioRun, stored: ScenarioRow[], baseId: string): boolean {
  return run.outcome === "failed" && !run.unstable && lastKnown(stored, run.id, run.fingerprint, baseId) === null;
}

async function compareWithBase(session: Session, unmatched: SavedScenario[], baseId: string): Promise<BaseComparison> {
  if (unmatched.length === 0) return { rows: [], note: null };
  const { ctx, deps, input, state, engine, start, layout, run } = session;
  if (!state.base) return { rows: [], note: NO_BASE_COMMIT };
  const outcome = await deps.base({ root: ctx.root, engine, layout, state, key: start.key, scenarios: unmatched, replay: replayDeps(ctx, deps) });
  if ("failure" in outcome) return { rows: [], note: `the base did not start: ${outcome.failure}` };
  const context: RunContext = { item: input.id, run: `${run}-base`, mode: "base", key: baseId, versions: outcome.versions };
  return { rows: [runRow(context, null), ...outcome.runs.map((baseRun) => resultRow(baseRun, [], context, baseId))], note: null };
}

function noted(row: ResultRow, note: string | null, unmatched: Set<string>): ResultRow {
  return note !== null && row.class === "no base result" && unmatched.has(row.scenario) ? { ...row, detail: note } : row;
}

async function replayStack(session: Session): Promise<ReplayReport> {
  const { ctx, input, state, start, layout, run } = session;
  const { root, env } = ctx;
  const keys = { working: workingKey(root, layout, start.model, env), base: baseKey(root, layout, state.base ?? null, start.model) };
  const scenarios = selected(listScenarios(root), input, keys);
  const services = start.model.services.map((service) => service.name);
  const runs = await replayScenarios({ ...replayDeps(ctx, session.deps), scenarios, services, urls: start.report.endpoints });
  const baseId = keyId(keys.base);
  const stored = readResults(root);
  const unmatched = new Set(runs.filter((scenarioRun) => needsBase(scenarioRun, stored, baseId)).map((scenarioRun) => scenarioRun.id));
  const base = await compareWithBase(session, scenarios.filter((scenario) => unmatched.has(scenario.id ?? scenario.path)), baseId);
  const context: RunContext = { item: input.id, run, mode: input.mode, key: keyId(keys.working), versions: Object.fromEntries(start.report.apps.map((app) => [app.service, app.version])) };
  const rows = runs.map((scenarioRun) => noted(resultRow(scenarioRun, [...stored, ...base.rows], context, baseId), base.note, unmatched));
  appendRows(root, [...base.rows, runRow(context, null), ...rows]);
  for (const scenarioRun of runs) if (scenarioRun.byHand && scenarioRun.outcome !== "blocked") acceptFingerprint(root, scenarioRun.fingerprint);
  const lines = runs.map((scenarioRun, at) => lineOf(scenarioRun, rows[at]));
  return { ok: !lines.some((line) => isBlamed(line.class)), stack: start.report.stack, reason: null, lines };
}

export async function replayEnvironment(ctx: Context, deps: ReplayDeps, input: ReplayInput): Promise<Outcome<ReplayReport>> {
  const state = openState(ctx.root, input.id);
  const run = `${ctx.now().toISOString()}-${newRunKey(deps.random(RUN_KEY_BYTES))}`;
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, ctx.root, deps.runner);
  if (!engine || !machine.ok) {
    const reason = engine ? machine.missing.join("; ") : NO_ENGINE;
    appendRows(ctx.root, [runRow({ item: input.id, run, mode: input.mode, key: "", versions: {} }, reason)]);
    return failed({ ok: false, stack: null, reason, lines: [] });
  }
  const start = startStack(ctx, engine, machine, input.id);
  const report = await replayStack({ ctx, deps, input, state, engine, start, layout: readLayout(ctx.root, input.id), run });
  return report.ok ? done(report) : failed(report);
}

function lineText({ scenario, class: cls, detail, byHand }: ReplayLine): string {
  return `${scenario} ${cls}${detail === "" ? "" : `: ${detail}`}${byHand ? " · changed by hand" : ""}`;
}

function summaryText(report: ReplayReport): string {
  if (report.lines.length === 0) return "no saved scenarios to replay";
  const counts = RESULT_CLASSES.flatMap((cls) => {
    const count = report.lines.filter((line) => line.class === cls).length;
    return count === 0 ? [] : [`${count} ${cls}`];
  });
  return `replayed ${report.lines.length} on ${report.stack}: ${counts.join(", ")}`;
}

export function renderReplay(report: ReplayReport): string {
  if (report.reason !== null) return `not replayed: ${report.reason}`;
  return [...report.lines.map(lineText), summaryText(report)].join("\n");
}

function parseReplay(args: Args): ReplayInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("env replay needs <id>");
  const only = str(args, "only") ?? null;
  const wantsAffected = flag(args, "affected");
  if (wantsAffected && only !== null) throw new UsageError("--affected and --only exclude each other");
  return { id: workId(id), mode: wantsAffected ? "affected" : only !== null ? "only" : "full", only };
}

const REAL_DEPS: ReplayDeps = { runner: realRunner, adapter: httpAdapter(), sleep: (ms) => delay(ms), random: (size) => randomBytes(size), base: runBase };

export const verb: VerbSpec<ReplayInput, ReplayReport> = {
  usage: "env replay <id> [--affected | --only <S-id>]",
  output: "text",
  parse: parseReplay,
  run: action(async (input, ctx) => replayEnvironment(ctx, REAL_DEPS, input)),
  render: renderReplay,
};
