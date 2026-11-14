import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { Refused } from "../action.mts";
import { statePath } from "../paths.mts";
import { jsonRecords, lastErrorLine, runCompose, type Engine } from "./engine.mts";
import { dropStack, readStacks } from "./stacks.mts";
import { ITEM_LABEL } from "./standard.mts";

export type Resources = { containers: string[]; volumes: string[]; networks: string[]; images: string[] };
export type Purged = { resources: Resources; evidence: string | null };

const PROJECT_LABEL = "com.docker.compose.project";

function ids(engine: Engine, args: string[]): string[] {
  const result = engine.run(args);
  if (result.status !== 0) throw new Refused(`${args.slice(0, 2).join(" ")} failed: ${lastErrorLine(result)}`);
  return [...new Set(result.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== ""))];
}

export function listResources(engine: Engine, stack: string, id: string | null): Resources {
  const project = `label=${PROJECT_LABEL}=${stack}`;
  return {
    containers: ids(engine, ["ps", "-a", "-q", "--filter", project]),
    volumes: ids(engine, ["volume", "ls", "-q", "--filter", project]),
    networks: ids(engine, ["network", "ls", "-q", "--filter", project]),
    images: id === null ? [] : ids(engine, ["image", "ls", "-q", "--filter", `label=${ITEM_LABEL}=${id}`]),
  };
}

function labelValue(labels: unknown, name: string): string | null {
  if (labels !== null && typeof labels === "object") return String((labels as Record<string, unknown>)[name] ?? "") || null;
  if (typeof labels !== "string") return null;
  const pair = labels.split(",").find((entry) => entry.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) || null : null;
}

export function labelledItem(engine: Engine, stack: string): string | null {
  const result = engine.run(["ps", "-a", "--format", "json", "--filter", `label=${PROJECT_LABEL}=${stack}`]);
  if (result.status !== 0) return null;
  for (const record of jsonRecords(result.stdout)) {
    const item = labelValue((record as { Labels?: unknown } | null)?.Labels, ITEM_LABEL);
    if (item) return item;
  }
  return null;
}

export function isEmpty(resources: Resources): boolean {
  return Object.values(resources).every((list) => list.length === 0);
}

function recordEvidence(root: string, stack: string, id: string | null, now: Date, resources: Resources): string {
  const path = statePath(root, `env/purged/${stack}-${now.toISOString().replaceAll(":", "")}.json`);
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ stack, item: id, at: now.toISOString(), resources }, null, 2)}\n`);
  } catch (err) {
    throw new Refused(`purge stopped: cannot record ${relative(root, path).replaceAll("\\", "/")}: ${(err as Error).message}`);
  }
  return relative(root, path).replaceAll("\\", "/");
}

function removeAll(engine: Engine, root: string, stack: string, resources: Resources): void {
  const files = readStacks(root)[stack]?.files ?? [];
  const down = runCompose(engine, root, stack, files, ["down", "--volumes", "--remove-orphans"]);
  if (down.status !== 0) throw new Refused(`compose down failed: ${lastErrorLine(down)}`);
  if (resources.images.length === 0) return;
  const removed = engine.run(["image", "rm", "--force", ...resources.images]);
  if (removed.status !== 0) throw new Refused(`image rm failed: ${lastErrorLine(removed)}`);
}

function forget(root: string, stack: string): void {
  if (readStacks(root)[stack]) dropStack(root, stack);
}

export function purgeStack(engine: Engine, root: string, stack: string, id: string | null, now: Date): Purged {
  const resources = listResources(engine, stack, id);
  if (isEmpty(resources)) {
    forget(root, stack);
    return { resources, evidence: null };
  }
  const evidence = recordEvidence(root, stack, id, now, resources);
  removeAll(engine, root, stack, resources);
  forget(root, stack);
  return { resources, evidence };
}
