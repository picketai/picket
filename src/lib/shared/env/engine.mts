import { statfsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnProgram, type ProgramResult } from "../../util/process.mts";
import { Refused } from "../action.mts";
import { COMPOSE_FILE, ENV_DIR } from "./standard.mts";

export type EngineKind = "docker" | "podman" | "other";
export type EngineRunner = (program: string, args: string[]) => ProgramResult;
export type Engine = { name: string; program: string; prefix: string[]; kind: EngineKind; run: (args: string[]) => ProgramResult };

export type MachineReport = {
  ok: boolean;
  engine: { program: string; kind: EngineKind } | null;
  os_type: string | null;
  compose: string | null;
  memory_bytes: number | null;
  free_disk_bytes: number | null;
  missing: string[];
};

type EngineInfo = { os_type: string | null; memory_bytes: number | null };

const ENGINE_VARIABLE = "PICKET_ENGINE";
const DEFAULT_ENGINES = ["docker", "podman"];
const SCRIPT_SUFFIX = ".mjs";
const LINUX = "linux";
const MIN_COMPOSE_MAJOR = 2;

export const NO_ENGINE = "no container engine: install Docker or Podman";
export const NO_COMPOSE = "Compose version 2 or later is missing: install the Compose v2 plugin (for podman compose, docker-compose v2 as its provider)";

export function notLinux(os: string): string {
  return `the engine runs ${os} containers: switch it to Linux containers`;
}

export const realRunner: EngineRunner = (program, args) => spawnProgram(program, args);

export function jsonRecords(text: string): unknown[] {
  const trimmed = text.trim();
  if (trimmed === "") return [];
  try {
    const whole: unknown = JSON.parse(trimmed);
    return Array.isArray(whole) ? whole : [whole];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as unknown);
  }
}

function firstRecord(result: ProgramResult): Record<string, unknown> | null {
  if (result.status !== 0) return null;
  try {
    const [record] = jsonRecords(result.stdout);
    return record !== null && typeof record === "object" ? (record as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function kindOf(name: string): EngineKind {
  const base = basename(name).toLowerCase().replace(/\.exe$/, "");
  return base === "docker" || base === "podman" ? base : "other";
}

function engineFor(name: string, cwd: string, runner: EngineRunner): Engine {
  const script = name.endsWith(SCRIPT_SUFFIX);
  const program = script ? process.execPath : name;
  const prefix = script ? [resolve(cwd, name)] : [];
  return { name, program, prefix, kind: kindOf(name), run: (args) => runner(program, [...prefix, ...args]) };
}

export function findEngine(env: NodeJS.ProcessEnv, cwd: string, runner: EngineRunner): Engine | null {
  const chosen = env[ENGINE_VARIABLE];
  const names = chosen ? [chosen] : DEFAULT_ENGINES;
  return names.map((name) => engineFor(name, cwd, runner)).find((engine) => engine.run(["info", "--format", "json"]).status === 0) ?? null;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dockerInfo(record: Record<string, unknown>): EngineInfo {
  return { os_type: stringField(record.OSType), memory_bytes: numberField(record.MemTotal) };
}

function podmanInfo(record: Record<string, unknown>): EngineInfo {
  const host = record.host !== null && typeof record.host === "object" ? (record.host as Record<string, unknown>) : {};
  return { os_type: stringField(host.os), memory_bytes: numberField(host.memTotal) };
}

function readInfo(engine: Engine): EngineInfo {
  const record = firstRecord(engine.run(["info", "--format", "json"]));
  if (!record) return { os_type: null, memory_bytes: null };
  const docker = dockerInfo(record);
  return docker.os_type !== null ? docker : podmanInfo(record);
}

function readComposeVersion(engine: Engine): string | null {
  const version = stringField(firstRecord(engine.run(["compose", "version", "--format", "json"]))?.version);
  return version === null ? null : version.replace(/^v/, "");
}

function composeMajor(version: string | null): number {
  return Number.parseInt(version ?? "", 10) || 0;
}

function freeDiskBytes(root: string): number | null {
  try {
    const stats = statfsSync(root);
    return stats.bavail * stats.bsize;
  } catch {
    return null;
  }
}

function gaps(info: EngineInfo, compose: string | null): string[] {
  const missing: string[] = [];
  if (info.os_type !== LINUX) missing.push(notLinux(info.os_type ?? "unknown"));
  if (composeMajor(compose) < MIN_COMPOSE_MAJOR) missing.push(NO_COMPOSE);
  return missing;
}

export function composeFiles(root: string): string[] {
  const dir = join(root, ENV_DIR);
  return ["--project-directory", dir, "-f", join(dir, COMPOSE_FILE)];
}

function composeOutput(engine: Engine, root: string, args: string[]): string {
  const result = engine.run(["compose", ...composeFiles(root), ...args]);
  if (result.status === 0) return result.stdout;
  const last = result.stderr.trim().split(/\r?\n/).at(-1) ?? "";
  throw new Refused(`compose ${args.join(" ")} failed: ${last}`);
}

export function readModelJson(engine: Engine, root: string): unknown {
  const profiles = composeOutput(engine, root, ["config", "--profiles"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return JSON.parse(composeOutput(engine, root, ["config", "--format", "json", ...profiles.flatMap((name) => ["--profile", name])]));
}

export function machineReport(engine: Engine | null, root: string): MachineReport {
  const free_disk_bytes = freeDiskBytes(root);
  if (!engine) return { ok: false, engine: null, os_type: null, compose: null, memory_bytes: null, free_disk_bytes, missing: [NO_ENGINE] };
  const info = readInfo(engine);
  const compose = readComposeVersion(engine);
  const missing = gaps(info, compose);
  return { ok: missing.length === 0, engine: { program: engine.name, kind: engine.kind }, os_type: info.os_type, compose, memory_bytes: info.memory_bytes, free_disk_bytes, missing };
}
