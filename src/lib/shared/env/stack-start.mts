import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { statePath } from "../paths.mts";
import { REVISION_LABEL, type ServiceSource } from "./build-plan.mts";
import { jsonRecords, runCompose, type Engine } from "./engine.mts";
import type { EnvService } from "./model.mts";
import { imageName } from "./standard.mts";

const ANY_ADDRESS = new Set(["", "0.0.0.0", "[::]", "::"]);
const LOCALHOST = "127.0.0.1";

type ImageRecord = { Config?: { Labels?: Record<string, string> } };

export function writeOverride(root: string, stack: string, doc: object): string {
  const path = statePath(root, `env/${stack}/compose.picket.yaml`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  return path;
}

function builtRevision(engine: Engine, image: string): string | null {
  const result = engine.run(["image", "inspect", image]);
  if (result.status !== 0) return null;
  const [record] = jsonRecords(result.stdout) as ImageRecord[];
  return record?.Config?.Labels?.[REVISION_LABEL] ?? null;
}

export function unprovedBuild(engine: Engine, sources: ServiceSource[], key: string): string | null {
  for (const source of sources) {
    const image = imageName(source.service, key, source.version);
    if (builtRevision(engine, image) !== source.version) return `${image} was not built from ${source.version}`;
  }
  return null;
}

function hostUrl(published: string): string | null {
  const line = published.trim().split(/\r?\n/)[0];
  const at = line.lastIndexOf(":");
  if (at < 0) return null;
  const host = line.slice(0, at);
  return `http://${ANY_ADDRESS.has(host) ? LOCALHOST : host}:${line.slice(at + 1)}`;
}

export function serviceEndpoints(engine: Engine, root: string, stack: string, files: string[], services: EnvService[]): Record<string, string> {
  const endpoints = services.flatMap((service): [string, string][] => {
    const [port] = service.ports;
    if (port === undefined) return [];
    const result = runCompose(engine, root, stack, files, ["port", service.name, String(port.target)]);
    const url = result.status === 0 ? hostUrl(result.stdout) : null;
    return url === null ? [] : [[service.name, url]];
  });
  return Object.fromEntries(endpoints);
}
