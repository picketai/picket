import { Refused } from "../action.mts";
import type { Context } from "../context.mts";
import { machineCheck, readModelJson, type Engine, type EngineRunner } from "../env/engine.mts";
import { readModel } from "../env/model.mts";
import { serviceEndpoints } from "../env/stack-start.mts";
import { readStacks } from "../env/stacks.mts";
import { itemKey, stackName } from "../env/standard.mts";
import { listMocks } from "../mocks/definition.mts";
import { catalogOf } from "../catalog/resolve.mts";
import { stackMocks, stubbedMocks, withStubPorts } from "../mocks/stub.mts";
import { FORMAT, parseScenario, writeScenario, type Card, type ScenarioHeader } from "../scenarios/format.mts";
import type { HttpAdapter } from "../scenarios/http.mts";
import { CANDIDATE_ID } from "../scenarios/keep.mts";
import { replayScenarios, type ReplayInput } from "../scenarios/replay.mts";
import { newRunKey } from "../scenarios/values.mts";
import type { WorkState } from "../work/state.mts";
import type { CaseKind, CaseOutcome, CaseRow } from "./results.mts";

export type CaseSpec = { criterion: string; kind: CaseKind; intent: string };
export type CaseRun = { outcome: CaseOutcome; attempts: number; unstable: boolean; detail: string; mocks: string[]; gaps: string[] };
export type ItemStack = { urls: Record<string, string>; services: string[]; stubs: Record<string, string>; ownMocks: string[] };
export type CaseDeps = { runner: EngineRunner; adapter: HttpAdapter; sleep: (ms: number) => Promise<void>; random: (size: number) => Uint8Array };
export type RunCaseInput = Omit<ReplayInput, "scenarios">;

const NO_ENGINE = "no container engine";
const REQUEST_TIMEOUT_MS = 20_000;
const RUN_KEY_BYTES = 2;
const DAY_LENGTH = 10;
const CASE_PATH = "case";

export function caseCard(item: string, spec: CaseSpec, steps: string): { card: Card } | { problems: string[] } {
  const header: ScenarioHeader = { id: CANDIDATE_ID, kind: spec.kind, covers: [`${item}/${spec.criterion}`], intent: spec.intent, status: "active", format: FORMAT };
  const { card, problems } = parseScenario(`${writeScenario({ header, steps: [] })}${steps}`);
  return card === null ? { problems } : { card };
}

export function stackOf(root: string, engine: Engine, state: Pick<WorkState, "id" | "source">): ItemStack {
  const stack = stackName(itemKey(state));
  const entry = readStacks(root)[stack];
  if (entry === undefined) throw new Refused(`no stack for ${state.id}: run picket env start ${state.id}`, { id: state.id });
  const model = readModel(readModelJson(engine, root));
  const started = model.services.filter((service) => service.profiles.length === 0);
  const mocks = listMocks(root);
  const urls = serviceEndpoints(engine, root, stack, entry.files, withStubPorts(started, stubbedMocks(model, mocks)));
  return { urls, services: started.map((service) => service.name), ...stackMocks(model, mocks, urls) };
}

export function openItemStack(ctx: Context, runner: EngineRunner, state: Pick<WorkState, "id" | "source">): ItemStack {
  const { engine } = machineCheck(ctx.env, ctx.cwd, ctx.root, runner);
  if (!engine) throw new Refused(`${NO_ENGINE}; the tester runs cases on the stack of picket env start ${state.id}`, { id: state.id });
  return stackOf(ctx.root, engine, state);
}

export function runCaseInput(ctx: Context, deps: CaseDeps, stack: ItemStack): RunCaseInput {
  return {
    services: stack.services,
    urls: stack.urls,
    stubs: stack.stubs,
    ownMocks: stack.ownMocks,
    catalog: catalogOf(ctx.root),
    adapter: deps.adapter,
    env: ctx.env,
    today: ctx.now().toISOString().slice(0, DAY_LENGTH),
    newRunKey: () => newRunKey(deps.random(RUN_KEY_BYTES)),
    timeoutMs: REQUEST_TIMEOUT_MS,
    sleep: deps.sleep,
  };
}

export async function runCase(card: Card, input: RunCaseInput): Promise<CaseRun> {
  const scenario = { path: CASE_PATH, id: card.header.id, card, problems: [], fingerprint: "", byHand: false };
  const [run] = await replayScenarios({ ...input, scenarios: [scenario] });
  const outcome: CaseOutcome = run.outcome === "not run" ? "blocked" : run.outcome;
  return { outcome, attempts: run.attempts.length, unstable: run.unstable, detail: run.detail, mocks: run.mocks, gaps: run.gaps };
}

export function caseLine(id: string, row: Pick<CaseRow, "case" | "criterion" | "kind" | "outcome" | "detail" | "mocks" | "gaps">): string {
  const head = `${row.case} ${row.criterion} ${row.kind} ${row.outcome}${row.outcome === "passed" || row.detail === "" ? "" : `: ${row.detail}`}`;
  const mocks = row.mocks.length ? ` · through a mock: ${row.mocks.join(", ")}` : "";
  const classify = row.outcome === "failed" ? [`classify it: picket test classify ${id} ${row.case} <product|test|environment> --evidence "<why>"`] : [];
  const gaps = (row.gaps ?? []).map((gap) => ` · gap: ${gap}`).join("");
  return [`${head}${mocks}${gaps}`, ...classify].join("\n");
}
