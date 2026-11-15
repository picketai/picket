import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { gitRead, gitRun } from "../../util/git.mts";
import { overrideDoc, REVISION_LABEL, type ServiceSource } from "../env/build-plan.mts";
import { failureCause, jsonRecords, readModelJson, runCompose, type Engine } from "../env/engine.mts";
import { readModel, type EnvModel, type EnvService } from "../env/model.mts";
import { COMPOSE_FILE, ENV_DIR, imageName, stackName } from "../env/standard.mts";
import { repoPrefix } from "../git.mts";
import { statePath } from "../paths.mts";
import type { ItemLayout } from "../repos.mts";
import type { WorkState } from "../work/state.mts";
import type { SavedScenario } from "./files.mts";
import { replayScenarios, type ReplayInput, type ScenarioRun } from "./replay.mts";
import type { Versions } from "./results.mts";

export type BaseCheckout = { dir: string; path: string };
export type BaseInput = {
  root: string;
  engine: Engine;
  layout: ItemLayout;
  state: Pick<WorkState, "id" | "base">;
  key: string;
  scenarios: SavedScenario[];
  replay: Omit<ReplayInput, "scenarios" | "services" | "urls">;
};
export type BaseOutcome = { runs: ScenarioRun[]; versions: Versions } | { failure: string };

type BuiltApp = EnvService & { build: NonNullable<EnvService["build"]> };
type Built = { baseRoot: string | null; files: string[]; images: string[] };

const BASE_FOLDER = "env/base";
const ROOT_FOLDER = "root";
const SHORT = 7;
const ANY_ADDRESS = new Set(["", "0.0.0.0", "[::]", "::"]);
const LOCALHOST = "127.0.0.1";

class BaseFailure extends Error {}

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

function baseCommits(layout: ItemLayout, rootBase: string | null): { dir: string; base: string }[] {
  const nested = layout.repos.flatMap(({ path, base }) => (base ? [{ dir: path, base }] : []));
  return rootBase === null ? nested : [{ dir: "", base: rootBase }, ...nested];
}

function removeWorktrees(root: string, checkouts: BaseCheckout[]): void {
  for (const { dir, path } of checkouts) gitRead(join(root, dir), ["worktree", "remove", "--force", path]);
  for (const dir of new Set(checkouts.map((checkout) => checkout.dir))) gitRead(join(root, dir), ["worktree", "prune"]);
}

export function addBaseWorktrees(root: string, layout: ItemLayout, state: Pick<WorkState, "base">, stack: string): BaseCheckout[] {
  const folder = statePath(root, `${BASE_FOLDER}/${stack}`);
  const added: BaseCheckout[] = [];
  try {
    for (const { dir, base } of baseCommits(layout, state.base ?? null)) {
      const path = join(folder, dir === "" ? ROOT_FOLDER : dir);
      gitRun(join(root, dir), ["worktree", "add", "--detach", path, base]);
      added.push({ dir, path });
    }
    return added;
  } catch (err) {
    removeWorktrees(root, added);
    throw err;
  }
}

function isBuiltApp(service: EnvService): service is BuiltApp {
  return service.role === "app" && service.build !== null && service.profiles.length === 0;
}

function dockerfileFor(build: BuiltApp["build"]): string | null {
  if (build.dockerfile === null) return null;
  const abs = resolve(build.context, build.dockerfile);
  const rel = relative(build.context, abs);
  return rel.startsWith("..") || isAbsolute(rel) ? abs : build.dockerfile;
}

function owner(checkouts: BaseCheckout[], rel: string): BaseCheckout {
  const owners = checkouts.filter(({ dir }) => dir === "" || rel === dir || rel.startsWith(`${dir}/`));
  const found = owners.sort((a, b) => b.dir.length - a.dir.length)[0];
  if (found === undefined) throw new BaseFailure(`no base checkout holds ${rel}`);
  return found;
}

export function baseSources(baseRoot: string, model: EnvModel, checkouts: BaseCheckout[]): ServiceSource[] {
  return model.services.filter(isBuiltApp).map((service) => {
    const rel = posix(relative(baseRoot, service.build.context));
    const checkout = owner(checkouts, rel);
    const folder = checkout.dir === "" ? baseRoot : checkout.path;
    const inner = checkout.dir === "" ? rel : rel.slice(checkout.dir.length + 1);
    const version = (gitRead(checkout.path, ["rev-parse", "HEAD"]) ?? "").slice(0, SHORT);
    return { service: service.name, checkout: checkout.path, context: join(folder, inner), dockerfile: dockerfileFor(service.build), version };
  });
}

function compose(engine: Engine, baseRoot: string, stack: string, files: string[], args: string[]): string {
  const result = runCompose(engine, baseRoot, stack, files, args);
  if (result.status !== 0) throw new BaseFailure(`compose ${args[0]} failed: ${failureCause(result)}`);
  return result.stdout;
}

function proveBuilds(engine: Engine, sources: ServiceSource[], key: string): void {
  for (const source of sources) {
    const image = imageName(source.service, key, source.version);
    const result = engine.run(["image", "inspect", image]);
    const [record] = (result.status === 0 ? jsonRecords(result.stdout) : []) as { Config?: { Labels?: Record<string, string> } }[];
    if (record?.Config?.Labels?.[REVISION_LABEL] !== source.version) throw new BaseFailure(`${image} was not built from ${source.version}`);
  }
}

function hostUrl(published: string): string | null {
  const line = published.trim().split(/\r?\n/)[0];
  const at = line.lastIndexOf(":");
  if (at < 0) return null;
  const host = line.slice(0, at);
  return `http://${ANY_ADDRESS.has(host) ? LOCALHOST : host}:${line.slice(at + 1)}`;
}

function endpoints(engine: Engine, baseRoot: string, stack: string, files: string[], model: EnvModel): Record<string, string> {
  const started = model.services.filter((service) => service.profiles.length === 0 && service.ports.length > 0);
  return Object.fromEntries(
    started.flatMap((service): [string, string][] => {
      const result = runCompose(engine, baseRoot, stack, files, ["port", service.name, String(service.ports[0].target)]);
      const url = result.status === 0 ? hostUrl(result.stdout) : null;
      return url === null ? [] : [[service.name, url]];
    }),
  );
}

function writeOverride(root: string, stack: string, doc: object): string {
  const path = statePath(root, `env/${stack}/compose.picket.yaml`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  return path;
}

async function startAndReplay(input: BaseInput, checkouts: BaseCheckout[], stack: string, built: Built): Promise<BaseOutcome> {
  const { root, engine, state, scenarios } = input;
  const key = `${input.key}-base`;
  const baseRoot = join(checkouts.find((checkout) => checkout.dir === "")?.path ?? root, repoPrefix(root));
  const model = readModel(readModelJson(engine, baseRoot));
  const sources = baseSources(baseRoot, model, checkouts);
  built.baseRoot = baseRoot;
  built.files.push(join(baseRoot, ENV_DIR, COMPOSE_FILE), writeOverride(root, stack, overrideDoc(model, sources, key, state.id)));
  built.images.push(...sources.map((source) => imageName(source.service, key, source.version)));
  compose(engine, baseRoot, stack, built.files, ["build", ...sources.map((source) => source.service)]);
  proveBuilds(engine, sources, key);
  compose(engine, baseRoot, stack, built.files, ["up", "--detach", "--wait"]);
  const urls = endpoints(engine, baseRoot, stack, built.files, model);
  const runs = await replayScenarios({ ...input.replay, scenarios, services: model.services.map((service) => service.name), urls });
  return { runs, versions: Object.fromEntries(sources.map((source) => [source.service, source.version])) };
}

function cleanUp(input: BaseInput, checkouts: BaseCheckout[], stack: string, built: Built): void {
  const { root, engine } = input;
  if (built.baseRoot !== null) runCompose(engine, built.baseRoot, stack, built.files, ["down", "--volumes", "--remove-orphans"]);
  if (built.images.length > 0) engine.run(["image", "rm", "--force", ...built.images]);
  removeWorktrees(root, checkouts);
  rmSync(statePath(root, `${BASE_FOLDER}/${stack}`), { recursive: true, force: true });
  rmSync(statePath(root, `env/${stack}`), { recursive: true, force: true });
}

export async function runBase(input: BaseInput): Promise<BaseOutcome> {
  const stack = stackName(`${input.key}-base`);
  const built: Built = { baseRoot: null, files: [], images: [] };
  let checkouts: BaseCheckout[] = [];
  try {
    checkouts = addBaseWorktrees(input.root, input.layout, input.state, stack);
    return await startAndReplay(input, checkouts, stack, built);
  } catch (err) {
    return { failure: (err as Error).message };
  } finally {
    cleanUp(input, checkouts, stack, built);
  }
}
