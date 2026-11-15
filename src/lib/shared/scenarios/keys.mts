import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { gitRead } from "../../util/git.mts";
import { locate, type Located } from "../checkouts.mts";
import { workingTree } from "../env/build-plan.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import { ENV_DIR } from "../env/standard.mts";
import { repoPrefix } from "../git.mts";
import type { ItemLayout } from "../repos.mts";

export type ContentKey = { env: string; apps: Record<string, string | null> };

const KEY_ID_LENGTH = 12;
const SCENARIO_FOLDER = "scenarios/";
const TAB = "\t";

type App = { name: string; located: Located };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

export function keyId(key: ContentKey): string {
  const apps = Object.fromEntries(Object.entries(key.apps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return sha256(JSON.stringify({ env: key.env, apps })).slice(0, KEY_ID_LENGTH);
}

function isBuiltApp(service: EnvService): service is EnvService & { build: NonNullable<EnvService["build"]> } {
  return service.role === "app" && service.build !== null && service.profiles.length === 0;
}

function appsOf(root: string, layout: ItemLayout, model: EnvModel): App[] {
  return model.services.filter(isBuiltApp).map((service) => ({ name: service.name, located: locate(layout, posix(relative(root, service.build.context))) }));
}

function envHash(root: string, tree: string | null): string {
  const listing = tree === null ? "" : (gitRead(root, ["ls-tree", "-r", tree]) ?? "");
  const kept = listing
    .split(/\r?\n/)
    .filter((line) => line !== "" && !line.slice(line.indexOf(TAB) + 1).startsWith(SCENARIO_FOLDER));
  return sha256(kept.join("\n"));
}

export function workingKey(root: string, layout: ItemLayout, model: EnvModel, env: NodeJS.ProcessEnv): ContentKey {
  const apps = appsOf(root, layout, model).map(({ name, located }) => [name, workingTree(join(root, located.dir), located.rel, env)]);
  return { env: envHash(root, workingTree(root, ENV_DIR, env)), apps: Object.fromEntries(apps) };
}

function treeAt(checkout: string, base: string | null, rel: string): string | null {
  if (base === null) return null;
  const path = `${repoPrefix(checkout)}${rel}`.replace(/\/$/, "");
  return gitRead(checkout, ["rev-parse", "--verify", "--quiet", path === "" ? `${base}^{tree}` : `${base}:${path}`]);
}

function repoBase(layout: ItemLayout, repo: string | null, rootBase: string | null): string | null {
  if (repo === null) return rootBase;
  return layout.repos.find((entry) => entry.path === repo)?.base ?? null;
}

export function baseKey(root: string, layout: ItemLayout, base: string | null, model: EnvModel): ContentKey {
  const apps = appsOf(root, layout, model).map(({ name, located }) => [name, treeAt(join(root, located.dir), repoBase(layout, located.repo, base), located.rel)]);
  return { env: envHash(root, treeAt(root, base, ENV_DIR)), apps: Object.fromEntries(apps) };
}
