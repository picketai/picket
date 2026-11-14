import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { overrideDoc, REVISION_LABEL, sourceFor, type ServiceSource } from "../../shared/env/build-plan.mts";
import { jsonRecords, lastErrorLine, machineCheck, readModelJson, realRunner, runCompose, type Engine, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { readModel, type EnvModel, type EnvService } from "../../shared/env/model.mts";
import { hasError, staticFindings } from "../../shared/env/rules.mts";
import { recordStack } from "../../shared/env/stacks.mts";
import { COMPOSE_FILE, ENV_DIR, imageName, itemKey, stackName, urlVariable } from "../../shared/env/standard.mts";
import { statePath } from "../../shared/paths.mts";
import { readLayout } from "../../shared/repos.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState, type WorkState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type StartInput = { id: WorkId };
export type BuiltApp = { service: string; checkout: string; version: string };
export type StartReport = { ok: boolean; machine: MachineReport; stack: string | null; apps: BuiltApp[]; urls: Record<string, string> };

const CLOSED_STATUSES = ["done", "abandoned"];
const ANY_ADDRESS = /^(?:0\.0\.0\.0|\[::\]|::)$/;
const LOCALHOST = "127.0.0.1";

function openState(root: string, id: WorkId): WorkState {
  const state = readState(root, id);
  if (CLOSED_STATUSES.includes(state.status)) throw new Refused(`${id} is ${state.status}; env start runs only for an open or blocked item`);
  return state;
}

function checkedModel(engine: Engine, root: string): EnvModel {
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) throw new Refused(`no environment: ${ENV_DIR}/${COMPOSE_FILE} is missing`);
  const model = readModel(readModelJson(engine, root));
  const errors = staticFindings(model);
  if (hasError(errors)) throw new Refused(`the environment fails ${[...new Set(errors.map((f) => f.rule))].join(", ")}; run picket env check`);
  return model;
}

function writeOverride(root: string, stack: string, doc: object): string {
  const path = statePath(root, `env/${stack}/compose.picket.yaml`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  return path;
}

function composeOrRefuse(engine: Engine, root: string, stack: string, files: string[], args: string[]): string {
  const result = runCompose(engine, root, stack, files, args);
  if (result.status !== 0) throw new Refused(`compose ${args[0]} failed: ${lastErrorLine(result)}`);
  return result.stdout;
}

function builtRevision(engine: Engine, image: string): string | null {
  const result = engine.run(["image", "inspect", image]);
  if (result.status !== 0) return null;
  const [record] = jsonRecords(result.stdout) as { Config?: { Labels?: Record<string, string> } }[];
  return record?.Config?.Labels?.[REVISION_LABEL] ?? null;
}

function provedBuilds(engine: Engine, sources: ServiceSource[], key: string): void {
  for (const source of sources) {
    const image = imageName(source.service, key, source.version);
    if (builtRevision(engine, image) !== source.version) throw new Refused(`${image} was not built from ${source.version}`);
  }
}

function hostUrl(published: string): string | null {
  const line = published.trim().split(/\r?\n/)[0];
  const at = line.lastIndexOf(":");
  if (at < 0) return null;
  const host = line.slice(0, at);
  return `http://${ANY_ADDRESS.test(host) ? LOCALHOST : host}:${line.slice(at + 1)}`;
}

function serviceUrls(engine: Engine, root: string, stack: string, files: string[], services: EnvService[]): Record<string, string> {
  const urls = services.flatMap((service): [string, string][] => {
    const [port] = service.ports;
    if (port === undefined) return [];
    const result = runCompose(engine, root, stack, files, ["port", service.name, String(port.target)]);
    const url = result.status === 0 ? hostUrl(result.stdout) : null;
    return url === null ? [] : [[urlVariable(service.name), url]];
  });
  return Object.fromEntries(urls);
}

function startStack(ctx: Context, engine: Engine, machine: MachineReport, id: WorkId): StartReport {
  const { root, env, session, now } = ctx;
  const state = openState(root, id);
  const model = checkedModel(engine, root);
  const key = itemKey(state);
  const stack = stackName(key);
  const layout = readLayout(root, id);
  const started = model.services.filter((s) => s.profiles.length === 0);
  const apps = started.filter((s) => s.role === "app" && s.build !== null);
  const sources = apps.map((service) => sourceFor(root, layout, service, env));
  const files = [join(root, ENV_DIR, COMPOSE_FILE), writeOverride(root, stack, overrideDoc(model, sources, key, id))];
  composeOrRefuse(engine, root, stack, files, ["build", ...apps.map((s) => s.name)]);
  provedBuilds(engine, sources, key);
  recordStack(root, stack, { item: id, session, files, engine: { name: engine.name, program: engine.program, prefix: engine.prefix }, started: now().toISOString() });
  composeOrRefuse(engine, root, stack, files, ["up", "--detach", "--wait"]);
  const built = sources.map(({ service, checkout, version }) => ({ service, checkout: relative(root, checkout).replaceAll("\\", "/") || ".", version }));
  return { ok: true, machine, stack, apps: built, urls: serviceUrls(engine, root, stack, files, started) };
}

export function startEnvironment(ctx: Context, runner: EngineRunner, id: WorkId): Outcome<StartReport> {
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, ctx.root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, stack: null, apps: [], urls: {} });
  return done(startStack(ctx, engine, machine, id));
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
