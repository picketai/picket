import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { overrideDoc, sourceFor, type ServiceSource } from "../../shared/env/build-plan.mts";
import { failureCause, machineCheck, readModelJson, realRunner, runCompose, type Engine, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { readModel, type EnvModel } from "../../shared/env/model.mts";
import { hasError } from "../../shared/env/rules.mts";
import { serviceEndpoints, unprovedBuild, writeOverride } from "../../shared/env/stack-start.mts";
import { activeClaim, readStacks, recordStack } from "../../shared/env/stacks.mts";
import { COMPOSE_FILE, ENV_DIR, itemKey, stackName, urlVariable } from "../../shared/env/standard.mts";
import { browserStack, prepareBrowser, withDriverPort, type BrowserStack } from "../../shared/browser/service.mts";
import { environmentStubs, prepareStubs, withStubPorts, type EnvironmentStubs } from "../../shared/mocks/stub.mts";
import { readLayout } from "../../shared/repos.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState, type WorkState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type StartInput = { id: WorkId };
export type BuiltApp = { service: string; checkout: string; version: string };
export type StartReport = { ok: boolean; machine: MachineReport; stack: string | null; apps: BuiltApp[]; urls: Record<string, string>; endpoints: Record<string, string> };
export type StartedStack = { report: StartReport; model: EnvModel; key: string; browsing: BrowserStack };

const CLOSED_STATUSES = ["done", "abandoned"];

function openState(root: string, id: WorkId): WorkState {
  const state = readState(root, id);
  if (CLOSED_STATUSES.includes(state.status)) throw new Refused(`${id} is ${state.status}; env start runs only for an open or blocked item`);
  return state;
}

function refuseClaimedStack(root: string, stack: string, id: WorkId): void {
  const claim = activeClaim(root, stack, readStacks(root)[stack]?.item ?? null, id);
  if (claim !== null) throw new Refused(claim);
}

function checkedModel(engine: Engine, root: string): { model: EnvModel; stubs: EnvironmentStubs } {
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) throw new Refused(`no environment: ${ENV_DIR}/${COMPOSE_FILE} is missing`);
  const model = readModel(readModelJson(engine, root));
  const stubs = environmentStubs(root, model);
  const errors = stubs.findings;
  if (hasError(errors)) throw new Refused(`the environment fails ${[...new Set(errors.map((f) => f.rule))].join(", ")}; run picket env check`);
  return { model, stubs };
}

function composeOrRefuse(engine: Engine, root: string, stack: string, files: string[], args: string[]): string {
  const result = runCompose(engine, root, stack, files, args);
  if (result.status !== 0) throw new Refused(`compose ${args[0]} failed: ${failureCause(result)}`);
  return result.stdout;
}

function refuseUnprovedBuild(engine: Engine, sources: ServiceSource[], key: string): void {
  const unproved = unprovedBuild(engine, sources, key);
  if (unproved !== null) throw new Refused(unproved);
}

function urlVariables(endpoints: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(endpoints).map(([service, url]) => [urlVariable(service), url]));
}

export function startStack(ctx: Context, engine: Engine, machine: MachineReport, id: WorkId): StartedStack {
  const { root, env, session, now } = ctx;
  const state = openState(root, id);
  const key = itemKey(state);
  const stack = stackName(key);
  refuseClaimedStack(root, stack, id);
  const { model, stubs } = checkedModel(engine, root);
  const layout = readLayout(root, id);
  const started = model.services.filter((s) => s.profiles.length === 0);
  const apps = started.filter((s) => s.role === "app" && s.build !== null);
  const sources = apps.map((service) => sourceFor(root, layout, service, env));
  const overlays = { ...prepareStubs(root, stack, model, stubs.mocks), ...prepareBrowser(root, stack, model) };
  const files = [join(root, ENV_DIR, COMPOSE_FILE), writeOverride(root, stack, overrideDoc(model, sources, key, id, overlays))];
  composeOrRefuse(engine, root, stack, files, ["build", ...apps.map((s) => s.name)]);
  refuseUnprovedBuild(engine, sources, key);
  recordStack(root, stack, { item: id, session, files, engine: { name: engine.name, program: engine.program, prefix: engine.prefix }, started: now().toISOString() });
  composeOrRefuse(engine, root, stack, files, ["up", "--detach", "--wait"]);
  const built = sources.map(({ service, checkout, version }) => ({ service, checkout: relative(root, checkout).replaceAll("\\", "/") || ".", version }));
  const ported = withDriverPort(withStubPorts(started, stubs.stubbed));
  const endpoints = serviceEndpoints(engine, root, stack, files, ported);
  return { report: { ok: true, machine, stack, apps: built, urls: urlVariables(endpoints), endpoints }, model, key, browsing: browserStack(ported, endpoints) };
}

export function startEnvironment(ctx: Context, runner: EngineRunner, id: WorkId): Outcome<StartReport> {
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, ctx.root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, stack: null, apps: [], urls: {}, endpoints: {} });
  return done(startStack(ctx, engine, machine, id).report);
}

export function renderStart(report: StartReport): string {
  if (!report.ok) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  const apps = report.apps.map((app) => `${app.service} · built from ${app.checkout} at ${app.version}`);
  const urls = Object.entries(report.urls).map(([variable, url]) => `${variable}=${url}`);
  return [`stack ${report.stack} is up`, ...apps, ...urls].join("\n");
}

function parseStart(args: Args): StartInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("env start needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<StartInput, StartReport> = {
  usage: "env start <id>",
  output: "text",
  parse: parseStart,
  run: action(async ({ id }, ctx) => startEnvironment(ctx, realRunner, id)),
  render: renderStart,
};
