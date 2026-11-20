import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { machineCheck, realRunner, type Engine, type EngineRunner } from "../../shared/env/engine.mts";
import { listMocks, realService, type MockFile } from "../../shared/mocks/definition.mts";
import { stackMocks } from "../../shared/mocks/stub.mts";
import { catalogOf } from "../../shared/catalog/resolve.mts";
import { readLayout, type ItemLayout } from "../../shared/repos.mts";
import { runBase, type BaseInput, type BaseOutcome } from "../../shared/scenarios/base-run.mts";
import { classify, isBlamed, RESULT_CLASSES, type ResultClass } from "../../shared/scenarios/compare.mts";
import { ageDays, readDefects } from "../../shared/scenarios/defects.mts";
import { itemChanges, lastFailing, maskedBy, namesDefect, stoppedFailing } from "../../shared/scenarios/known.mts";
import { acceptFingerprint, listScenarios, type SavedScenario } from "../../shared/scenarios/files.mts";
import { httpAdapter, type HttpAdapter } from "../../shared/scenarios/http.mts";
import { baseKey, keyId, workingKey, type ContentKey } from "../../shared/scenarios/keys.mts";
import { affected, replayScenarios, type ScenarioRun } from "../../shared/scenarios/replay.mts";
import { appendRows, lastKnown, readResults, type ResultRow, type RunMode, type RunRow, type ScenarioRow, type Versions } from "../../shared/scenarios/results.mts";
import { newRunKey } from "../../shared/scenarios/values.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { readDriveLog } from "../../shared/drive-log.mts";
import { writeScenario } from "../../shared/scenarios/format.mts";
import { candidateCard, candidateInputs, keepText, storeCandidates, type Candidate, type CandidateInput } from "../../shared/scenarios/keep.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import { runScenario } from "../../shared/scenarios/runner.mts";
import { replacedScenarios } from "../../shared/work/declared-checks.mts";
import { currentPhase, readSnapshot } from "../../shared/work/snapshot.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { readState, type WorkState } from "../../shared/work/state.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";
import { startStack, type StartedStack } from "./start.mts";

export type ReplayMode = Exclude<RunMode, "base">;
export type ReplayInput = { id: WorkId; mode: ReplayMode; only: string | null };
export type ReplayLine = { scenario: string; class: ResultClass; detail: string; byHand: boolean; flow: string; mocks: string[] };
export type MockedFlow = { flow: string; real: string[] };
export type KeepLine = { covers: string; text: string };
export type OpenDefect = { id: string; scenario: string; days: number };
export type ReplayReport = { ok: boolean; stack: string | null; reason: string | null; lines: ReplayLine[]; flows: MockedFlow[]; keeps: KeepLine[]; open: OpenDefect[] };
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
const NO_FLOW = "(none)";
const DETAIL_JOIN = " · ";

type Keys = { working: ContentKey; base: ContentKey };
type RunContext = { item: WorkId; run: string; mode: RunMode; key: string; versions: Versions };
type Session = { ctx: Context; deps: ReplayDeps; input: ReplayInput; state: WorkState; engine: Engine; start: StartedStack; layout: ItemLayout; run: string; replaced: Set<string> };
type BaseComparison = { rows: ScenarioRow[]; note: string | null };

function openState(root: string, id: WorkId): WorkState {
  const state = readState(root, id);
  if (CLOSED_STATUSES.includes(state.status)) throw new Refused(`${id} is ${state.status}; env replay runs only for an open or blocked item`);
  return state;
}

function runRow({ item, run, mode, key, versions }: RunContext, reason: string | null): RunRow {
  return { type: "run", run, item, mode, key, versions, ...(reason === null ? {} : { reason }) };
}

function replacedByItem(root: string, id: WorkId): Set<string> {
  return new Set(readSnapshot(root, id).phases.flatMap((phase) => replacedScenarios(phase.entry?.drive, phase.n)));
}

type Labels = Map<string, string>;
type KnownFacts = { labels: Labels; rows: ScenarioRow[]; baseId: string; paths: Map<string, string>; texts: string[]; changes: () => string[] };

function knownLabels(scenarios: SavedScenario[]): Labels {
  return new Map(scenarios.flatMap((scenario) => (scenario.card?.header.known === undefined ? [] : [[scenario.id ?? scenario.path, scenario.card.header.known] as const])));
}

function openDefects(root: string, now: Date): OpenDefect[] {
  return readDefects(root)
    .filter((entry) => entry.status === "open")
    .map((entry) => ({ id: entry.id, scenario: entry.scenario, days: ageDays(entry.opened, now) }));
}

function resultRow(scenarioRun: ScenarioRun, rows: ScenarioRow[], context: RunContext, baseId: string, known: string | null, replaced = false): ResultRow {
  const cls = classify(scenarioRun, lastKnown(rows, scenarioRun.id, scenarioRun.fingerprint, baseId), replaced, known);
  const { id: scenario, fingerprint, outcome, attempts, unstable, detail, mocks, gaps } = scenarioRun;
  return { type: "result", run: context.run, scenario, fingerprint, key: context.key, versions: context.versions, outcome, attempts: attempts.length, unstable, class: cls, detail, mocks, gaps };
}

function selected(scenarios: SavedScenario[], input: ReplayInput, keys: Keys): SavedScenario[] {
  if (input.mode === "affected") return affected(scenarios, keys.working, keys.base);
  if (input.mode === "full") return scenarios;
  const chosen = scenarios.filter((scenario) => scenario.id === input.only);
  if (chosen.length === 0) throw new Refused(`no saved scenario ${input.only}`);
  return chosen;
}

function flowOf(scenarios: SavedScenario[], run: ScenarioRun): string {
  return scenarios.find((scenario) => (scenario.id ?? scenario.path) === run.id)?.card?.header.flow ?? NO_FLOW;
}

function lineOf(run: ScenarioRun, row: ResultRow, flow: string): ReplayLine {
  const detail = [row.detail, ...run.gaps.map((gap) => `gap: ${gap}`)].filter((part) => part !== "").join(DETAIL_JOIN);
  return { scenario: run.id, class: row.class, detail, byHand: run.byHand, flow, mocks: run.mocks };
}

export function mockedFlows(lines: readonly ReplayLine[], mocks: readonly MockFile[]): MockedFlow[] {
  const flows = new Map<string, Set<string>>();
  for (const line of lines.filter((entry) => entry.mocks.length > 0)) {
    const real = flows.get(line.flow) ?? new Set<string>();
    for (const mock of line.mocks) real.add(realService(mocks, mock));
    flows.set(line.flow, real);
  }
  return [...flows].map(([flow, real]) => ({ flow, real: [...real].sort() }));
}

function replayDeps(ctx: Context, deps: ReplayDeps): BaseInput["replay"] {
  const today = ctx.now().toISOString().slice(0, DAY_LENGTH);
  return { adapter: deps.adapter, env: ctx.env, today, newRunKey: () => newRunKey(deps.random(RUN_KEY_BYTES)), timeoutMs: REQUEST_TIMEOUT_MS, sleep: deps.sleep };
}

function needsBase(run: ScenarioRun, stored: ScenarioRow[], baseId: string, labels: Labels): boolean {
  const compared = labels.has(run.id) ? "passed" : "failed";
  return run.outcome === compared && !run.unstable && lastKnown(stored, run.id, run.fingerprint, baseId) === null;
}

async function compareWithBase(session: Session, unmatched: SavedScenario[], baseId: string): Promise<BaseComparison> {
  if (unmatched.length === 0) return { rows: [], note: null };
  const { ctx, deps, input, state, engine, start, layout, run } = session;
  if (!state.base) return { rows: [], note: NO_BASE_COMMIT };
  const outcome = await deps.base({ root: ctx.root, engine, layout, state, key: start.key, scenarios: unmatched, replay: replayDeps(ctx, deps) });
  if ("failure" in outcome) return { rows: [], note: `the base did not start: ${outcome.failure}` };
  const context: RunContext = { item: input.id, run: `${run}-base`, mode: "base", key: baseId, versions: outcome.versions };
  return { rows: [runRow(context, null), ...outcome.runs.map((baseRun) => resultRow(baseRun, [], context, baseId, null))], note: null };
}

function once<T>(read: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= read());
}

function knownFacts(session: Session, scenarios: SavedScenario[], labels: Labels, rows: ScenarioRow[], baseId: string): KnownFacts {
  const { ctx, input, state, layout } = session;
  const texts = [readText(workFile(ctx.root, input.id, "request.md")) ?? "", readSnapshot(ctx.root, input.id).artifact?.body ?? ""];
  const paths = new Map(scenarios.map((scenario) => [scenario.id ?? scenario.path, scenario.path]));
  return { labels, rows, baseId, paths, texts, changes: once(() => itemChanges(ctx.root, layout, state.base ?? null)) };
}

function explained(row: ResultRow, facts: KnownFacts): ResultRow {
  const defect = facts.labels.get(row.scenario);
  if (defect === undefined) return row;
  if (row.class !== "passed") return { ...row, defect };
  const changes = facts.changes();
  const stopped = stoppedFailing({
    base: lastKnown(facts.rows, row.scenario, row.fingerprint, facts.baseId),
    lastFailing: lastFailing(facts.rows, row.scenario),
    masked: maskedBy(changes, facts.paths.get(row.scenario) ?? ""),
    named: namesDefect(facts.texts, defect),
    changes,
  });
  return { ...row, class: stopped.class, detail: stopped.detail, defect };
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
  const mockFiles = listMocks(root);
  const runs = await replayScenarios({ ...replayDeps(ctx, session.deps), scenarios, services, urls: start.report.endpoints, ...stackMocks(start.model, mockFiles, start.report.endpoints), catalog: catalogOf(root) });
  const baseId = keyId(keys.base);
  const stored = readResults(root);
  const labels = knownLabels(scenarios);
  const unmatched = new Set(runs.filter((scenarioRun) => !session.replaced.has(scenarioRun.id) && needsBase(scenarioRun, stored, baseId, labels)).map((scenarioRun) => scenarioRun.id));
  const base = await compareWithBase(session, scenarios.filter((scenario) => unmatched.has(scenario.id ?? scenario.path)), baseId);
  const context: RunContext = { item: input.id, run, mode: input.mode, key: keyId(keys.working), versions: Object.fromEntries(start.report.apps.map((app) => [app.service, app.version])) };
  const known = [...stored, ...base.rows];
  const facts = knownFacts(session, scenarios, labels, known, baseId);
  const rows = runs.map((scenarioRun) => explained(noted(resultRow(scenarioRun, known, context, baseId, labels.get(scenarioRun.id) ?? null, session.replaced.has(scenarioRun.id)), base.note, unmatched), facts));
  appendRows(root, [...base.rows, runRow(context, null), ...rows]);
  for (const scenarioRun of runs) if (scenarioRun.byHand && scenarioRun.outcome !== "blocked") acceptFingerprint(root, scenarioRun.fingerprint);
  const lines = runs.map((scenarioRun, at) => lineOf(scenarioRun, rows[at], flowOf(scenarios, scenarioRun)));
  const keeps = await replayCandidates(session, services);
  return { ok: !lines.some((line) => isBlamed(line.class)), stack: start.report.stack, reason: null, lines, flows: mockedFlows(lines, mockFiles), keeps, open: openDefects(root, ctx.now()) };
}

async function replayCandidate(candidate: CandidateInput, session: Session, services: string[]): Promise<Candidate> {
  const { check, index } = candidate.result;
  const base = { covers: check.covers, index, replaces: "replaces" in check ? (check.replaces ?? null) : null };
  const built = candidateCard(candidate);
  if ("notKept" in built) return { ...base, outcome: "not kept", detail: built.notKept, text: null };
  const text = writeScenario(built.card);
  const [problem] = scenarioProblems(built.card, services);
  if (problem !== undefined) return { ...base, outcome: "blocked", detail: problem, text };
  const { newRunKey: runKeyOf, ...replay } = replayDeps(session.ctx, session.deps);
  const ran = await runScenario({ ...replay, card: built.card, urls: session.start.report.endpoints, runKey: runKeyOf(), data: {} });
  return { ...base, outcome: ran.outcome, detail: ran.detail, text };
}

async function replayCandidates(session: Session, services: string[]): Promise<KeepLine[]> {
  const { ctx, input, start } = session;
  const snap = readSnapshot(ctx.root, input.id);
  const phase = currentPhase(snap)?.n;
  if (phase === undefined) return [];
  const inputs = candidateInputs(ctx.root, snap, readDriveLog(ctx.root).rows, phase, start.model);
  if (inputs.length === 0) return [];
  const candidates: Candidate[] = [];
  for (const candidate of inputs) candidates.push(await replayCandidate(candidate, session, services));
  storeCandidates(ctx.root, input.id, phase, candidates);
  return candidates.map((candidate) => ({ covers: candidate.covers, text: candidate.outcome === "passed" ? `replay passed; ${keepText(candidate)}` : keepText(candidate) }));
}

export async function replayEnvironment(ctx: Context, deps: ReplayDeps, input: ReplayInput): Promise<Outcome<ReplayReport>> {
  const state = openState(ctx.root, input.id);
  const run = `${ctx.now().toISOString()}-${newRunKey(deps.random(RUN_KEY_BYTES))}`;
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, ctx.root, deps.runner);
  if (!engine || !machine.ok) {
    const reason = engine ? machine.missing.join("; ") : NO_ENGINE;
    appendRows(ctx.root, [runRow({ item: input.id, run, mode: input.mode, key: "", versions: {} }, reason)]);
    return failed({ ok: false, stack: null, reason, lines: [], flows: [], keeps: [], open: openDefects(ctx.root, ctx.now()) });
  }
  const start = startStack(ctx, engine, machine, input.id);
  const report = await replayStack({ ctx, deps, input, state, engine, start, layout: readLayout(ctx.root, input.id), run, replaced: replacedByItem(ctx.root, input.id) });
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

function flowText({ flow, real }: MockedFlow): string {
  return `flow ${flow}: verified up to ${real.join(" and ")}, which ${real.length > 1 ? "are" : "is"} mocked`;
}

function dayText(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function openText(open: readonly OpenDefect[]): string {
  const entries = open.map(({ id, scenario, days }) => `${id} (${scenario}) ${dayText(days)}`);
  return `known defects open: ${entries.length ? entries.join(", ") : "none"}`;
}

function replayedLines(report: ReplayReport): string[] {
  if (report.reason !== null) return [`not replayed: ${report.reason}`];
  return [...report.lines.map(lineText), summaryText(report), ...report.flows.map(flowText), ...report.keeps.map((keep) => `keep ${keep.covers}: ${keep.text}`)];
}

export function renderReplay(report: ReplayReport): string {
  return [...replayedLines(report), openText(report.open)].join("\n");
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
