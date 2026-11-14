import { realpathSync, statfsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnProgram, type ProgramResult } from "../../util/process.mts";
import { Refused } from "../action.mts";
import { pluginRoot } from "../paths.mts";
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
const FAKE_ENGINE = ["test", "fixtures", "env", "fake-engine.mjs"];
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

function realPathOrNull(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

export function fakeEnginePath(): string | null {
  try {
    return realPathOrNull(join(pluginRoot(), "..", ...FAKE_ENGINE));
  } catch {
    return null;
  }
}

function isFake(value: string, cwd: string, fake: string | null): boolean {
  return fake !== null && realPathOrNull(resolve(cwd, value)) === fake;
}

export function allowedEngine(value: string, cwd: string, fake: string | null): boolean {
  return DEFAULT_ENGINES.includes(value) || isFake(value, cwd, fake);
}

export function engineRefusal(env: NodeJS.ProcessEnv, cwd: string, fake: string | null = fakeEnginePath()): string | null {
  const value = env[ENGINE_VARIABLE];
  if (!value || allowedEngine(value, cwd, fake)) return null;
  return `${ENGINE_VARIABLE} names ${value}, which is neither docker nor podman, so no engine was tried`;
}

function engineFor(name: string, cwd: string, fake: string | null, runner: EngineRunner): Engine {
  const script = isFake(name, cwd, fake);
  const program = script ? process.execPath : name;
  const prefix = script && fake !== null ? [fake] : [];
  const kind: EngineKind = name === "docker" || name === "podman" ? name : "other";
  return { name, program, prefix, kind, run: (args) => runner(program, [...prefix, ...args]) };
}

export function findEngine(env: NodeJS.ProcessEnv, cwd: string, runner: EngineRunner, fake: string | null = fakeEnginePath()): Engine | null {
  const chosen = env[ENGINE_VARIABLE];
  if (chosen && !allowedEngine(chosen, cwd, fake)) return null;
  const names = chosen ? [chosen] : DEFAULT_ENGINES;
  return names.map((name) => engineFor(name, cwd, fake, runner)).find((engine) => engine.run(["info", "--format", "json"]).status === 0) ?? null;
}

export function composeArgs(root: string, stack: string, files: string[], args: string[]): string[] {
  return ["compose", "-p", stack, "--project-directory", join(root, ENV_DIR), ...files.flatMap((file) => ["-f", file]), ...args];
}

export function runCompose(engine: Engine, root: string, stack: string, files: string[], args: string[]): ProgramResult {
  return engine.run(composeArgs(root, stack, files, args));
}

export function lastErrorLine(result: ProgramResult): string {
  return result.stderr.trim().split(/\r?\n/).at(-1) ?? "";
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

function composeOutput(engine: Engine, root: string, globalFlags: string[], args: string[]): string {
  const result = engine.run(["compose", ...composeFiles(root), ...globalFlags, ...args]);
  if (result.status === 0) return result.stdout;
  throw new Refused(`compose ${args.join(" ")} failed: ${lastErrorLine(result)}`);
}

export function readModelJson(engine: Engine, root: string): unknown {
  const profiles = composeOutput(engine, root, [], ["config", "--profiles"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const profileFlags = profiles.flatMap((name) => ["--profile", name]);
  return JSON.parse(composeOutput(engine, root, profileFlags, ["config", "--format", "json"]));
}

export type MachineCheck = { engine: Engine | null; machine: MachineReport };

export function machineCheck(env: NodeJS.ProcessEnv, cwd: string, root: string, runner: EngineRunner, fake: string | null = fakeEnginePath()): MachineCheck {
  const engine = findEngine(env, cwd, runner, fake);
  return { engine, machine: machineReport(engine, root, engineRefusal(env, cwd, fake)) };
}

export function machineReport(engine: Engine | null, root: string, refused: string | null = null): MachineReport {
  const free_disk_bytes = freeDiskBytes(root);
  const noEngine = refused === null ? [NO_ENGINE] : [NO_ENGINE, refused];
  if (!engine) return { ok: false, engine: null, os_type: null, compose: null, memory_bytes: null, free_disk_bytes, missing: noEngine };
  const info = readInfo(engine);
  const compose = readComposeVersion(engine);
  const missing = gaps(info, compose);
  return { ok: missing.length === 0, engine: { program: engine.name, kind: engine.kind }, os_type: info.os_type, compose, memory_bytes: info.memory_bytes, free_disk_bytes, missing };
}
