import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { gitRun } from "../../util/git.mts";
import { locate } from "../checkouts.mts";
import type { ItemLayout } from "../repos.mts";
import type { EnvModel, EnvService } from "./model.mts";
import { imageName, ITEM_LABEL } from "./standard.mts";

export type ServiceSource = { service: string; checkout: string; context: string; dockerfile: string | null; version: string };

export const REVISION_LABEL = "org.opencontainers.image.revision";
const SHORT = 7;

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

function within(path: string, folder: string): boolean {
  const rel = relative(folder, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function dockerfileFor(build: NonNullable<EnvService["build"]>): string | null {
  if (build.dockerfile === null) return null;
  const abs = resolve(build.context, build.dockerfile);
  return within(abs, build.context) ? build.dockerfile : abs;
}

function contextTree(checkoutDir: string, rel: string, fromTop: string, env: NodeJS.ProcessEnv): string {
  const scratch = mkdtempSync(join(tmpdir(), "picket-index-"));
  try {
    const indexEnv = { ...env, GIT_INDEX_FILE: join(scratch, "index") };
    gitRun(checkoutDir, ["add", "-A", "--", rel === "" ? "." : rel], { env: indexEnv });
    const prefix = fromTop === "" ? [] : [`--prefix=${fromTop}/`];
    return gitRun(checkoutDir, ["write-tree", ...prefix], { env: indexEnv }).trim();
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function contextPaths(checkoutDir: string, contextRel: string): { rel: string; fromTop: string } {
  const rel = posix(contextRel).replace(/\/$/, "");
  const fromTop = `${gitRun(checkoutDir, ["rev-parse", "--show-prefix"]).trim()}${rel}`.replace(/\/$/, "");
  return { rel, fromTop };
}

export function workingTree(checkoutDir: string, contextRel: string, env: NodeJS.ProcessEnv): string {
  const { rel, fromTop } = contextPaths(checkoutDir, contextRel);
  return contextTree(checkoutDir, rel, fromTop, env);
}

export function contextVersion(checkoutDir: string, contextRel: string, env: NodeJS.ProcessEnv): string {
  const { rel, fromTop } = contextPaths(checkoutDir, contextRel);
  const head = gitRun(checkoutDir, ["rev-parse", "HEAD"]).trim();
  const headTree = gitRun(checkoutDir, ["rev-parse", fromTop === "" ? "HEAD^{tree}" : `HEAD:${fromTop}`], { okExitCodes: [128] }).trim();
  const tree = contextTree(checkoutDir, rel, fromTop, env);
  return tree === headTree ? head.slice(0, SHORT) : `${head.slice(0, SHORT)}-t${tree.slice(0, SHORT)}`;
}

export function sourceFor(root: string, layout: ItemLayout, service: EnvService, env: NodeJS.ProcessEnv): ServiceSource {
  const build = service.build;
  if (build === null) throw new Error(`${service.name} has no build`);
  const located = locate(layout, posix(relative(root, build.context)));
  const checkout = join(root, located.dir);
  const context = join(checkout, located.rel);
  return { service: service.name, checkout, context, dockerfile: dockerfileFor(build), version: contextVersion(checkout, located.rel, env) };
}

function isStarted(service: EnvService): boolean {
  return service.profiles.length === 0;
}

function appOverride(source: ServiceSource, key: string, id: string): object {
  const labels = { [ITEM_LABEL]: id };
  const dockerfile = source.dockerfile === null ? {} : { dockerfile: source.dockerfile };
  return {
    image: imageName(source.service, key, source.version),
    build: { context: source.context, ...dockerfile, labels: { [REVISION_LABEL]: source.version, ...labels } },
    labels,
  };
}

export function overrideDoc(model: EnvModel, sources: ServiceSource[], key: string, id: string, stubs: Record<string, object> = {}): { services: Record<string, object> } {
  const services = model.services.filter(isStarted).map((service): [string, object] => {
    const source = sources.find((s) => s.service === service.name);
    return [service.name, source ? appOverride(source, key, id) : { labels: { [ITEM_LABEL]: id }, ...stubs[service.name] }];
  });
  return { services: Object.fromEntries(services) };
}
