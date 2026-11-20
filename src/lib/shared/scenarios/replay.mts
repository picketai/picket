import { resolveData } from "../catalog/resolve.mts";
import type { CatalogEntry } from "../catalog/entry.mts";
import { readTraffic, trafficBetween } from "../mocks/stub.mts";
import type { SavedScenario } from "./files.mts";
import type { Card } from "./format.mts";
import type { BrowserAdapter } from "./browser.mts";
import type { HttpAdapter } from "./http.mts";
import type { ContentKey } from "./keys.mts";
import type { ScenarioOutcome } from "./results.mts";
import { scenarioProblems } from "./rules.mts";
import { runScenario, type RunOutcome } from "./runner.mts";

export type ScenarioRun = { id: string; fingerprint: string; outcome: ScenarioOutcome; attempts: string[]; unstable: boolean; byHand: boolean; detail: string; mocks: string[]; gaps: string[] };

export type ReplayInput = {
  scenarios: SavedScenario[];
  services: string[];
  urls: Record<string, string>;
  stubs: Record<string, string>;
  ownMocks: string[];
  catalog: CatalogEntry[];
  adapter: HttpAdapter;
  browser: BrowserAdapter;
  pages: Record<string, string>;
  env: NodeJS.ProcessEnv;
  today: string;
  newRunKey: () => string;
  timeoutMs: number;
  sleep: (ms: number) => Promise<void>;
};

const SERVICE_TARGET = /^\{([^{}]+)\}/;

function isActive(scenario: SavedScenario): boolean {
  return scenario.card?.header.status !== "deprecated";
}

function problemsOf(scenario: SavedScenario, services: string[]): string[] {
  return [...scenario.problems, ...(scenario.card ? scenarioProblems(scenario.card, services) : [])];
}

async function attempt(card: Card, input: ReplayInput): Promise<RunOutcome> {
  const { urls, adapter, browser, pages, env, today, timeoutMs, sleep } = input;
  const run = { urls, adapter, browser, pages, env, today, runKey: input.newRunKey(), timeoutMs, sleep };
  const resolved = await resolveData(card, input.catalog, run);
  if ("blocked" in resolved) return { outcome: "blocked", step: null, detail: resolved.blocked, captures: {} };
  return runScenario({ ...run, card, data: resolved.data });
}

async function confirmed(card: Card, input: ReplayInput): Promise<Pick<ScenarioRun, "outcome" | "attempts" | "unstable" | "detail">> {
  const first = await attempt(card, input);
  if (first.outcome !== "failed") return { outcome: first.outcome, attempts: [first.outcome], unstable: false, detail: first.detail };
  const second = await attempt(card, input);
  return { outcome: second.outcome, attempts: [first.outcome, second.outcome], unstable: second.outcome !== first.outcome, detail: second.outcome === "passed" ? first.detail : second.detail };
}

async function replayOne(scenario: SavedScenario, input: ReplayInput): Promise<ScenarioRun> {
  const base = { id: scenario.id ?? scenario.path, fingerprint: scenario.fingerprint, byHand: scenario.byHand };
  const [problem] = problemsOf(scenario, input.services);
  if (problem !== undefined || scenario.card === null) return { ...base, outcome: "blocked", attempts: [], unstable: false, detail: problem ?? "", mocks: [], gaps: [] };
  const before = await readTraffic(input.adapter, input.stubs, input.timeoutMs);
  const ran = await confirmed(scenario.card, input);
  const traffic = trafficBetween(before, await readTraffic(input.adapter, input.stubs, input.timeoutMs));
  return { ...base, ...ran, mocks: [...traffic.mocks, ...input.ownMocks], gaps: traffic.gaps };
}

export async function replayScenarios(input: ReplayInput): Promise<ScenarioRun[]> {
  const runs: ScenarioRun[] = [];
  for (const scenario of input.scenarios.filter(isActive)) runs.push(await replayOne(scenario, input));
  return runs;
}

function targetServices(card: Card): string[] {
  return card.steps.flatMap((step) => (step.word === "request" || step.word === "open" ? (step.target.match(SERVICE_TARGET)?.slice(1, 2) ?? []) : []));
}

export function affected(scenarios: SavedScenario[], working: ContentKey, base: ContentKey): SavedScenario[] {
  if (working.env !== base.env) return scenarios;
  const changed = new Set(Object.keys(working.apps).filter((app) => working.apps[app] !== base.apps[app]));
  return scenarios.filter((scenario) => scenario.card === null || targetServices(scenario.card).some((service) => changed.has(service)));
}
