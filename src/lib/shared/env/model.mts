import { ROLE_LABEL, X_PICKET } from "./standard.mts";

export type EnvBuild = { context: string; dockerfile: string | null };
export type EnvHealthcheck = { test: string[]; disable: boolean };
export type EnvPort = { target: number; published: string | null };
export type EnvVolume = { type: string; source: string | null; target: string; read_only: boolean };

export type EnvService = {
  name: string;
  role: string | null;
  build: EnvBuild | null;
  image: string | null;
  healthcheck: EnvHealthcheck | null;
  ports: EnvPort[];
  volumes: EnvVolume[];
  profiles: string[];
  environment: Record<string, string | null>;
  labels: Record<string, string>;
};

export type WiringRow = { service: string; file: string; key: string | null; by: string; variable: string | null; replaced: string | null };
export type PendingRow = { service: string; what: string };

export type XPicket = {
  version: unknown;
  shared: Record<string, { address: string }>;
  wiring: WiringRow[];
  ignored: string[];
  pending: PendingRow[];
  unknown_keys: string[];
};

export type EnvModel = { name: string; services: EnvService[]; picket: XPicket | null };

type Fields = Record<string, unknown>;

const X_PICKET_KEYS = ["version", "shared", "wiring", "ignored", "pending"];

function fields(value: unknown): Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Fields) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function texts(value: unknown): string[] {
  return list(value).filter((item): item is string => typeof item === "string");
}

function textMap(value: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(fields(value)).map(([key, item]) => [key, String(item)]));
}

function nullableTextMap(value: unknown): Record<string, string | null> {
  return Object.fromEntries(Object.entries(fields(value)).map(([key, item]) => [key, item === null || item === undefined ? null : String(item)]));
}

function readBuild(value: unknown): EnvBuild | null {
  if (value === undefined || value === null) return null;
  const build = fields(value);
  return { context: text(build.context) ?? "", dockerfile: text(build.dockerfile) };
}

function readHealthcheck(value: unknown): EnvHealthcheck | null {
  if (value === undefined || value === null) return null;
  const check = fields(value);
  return { test: texts(check.test), disable: check.disable === true };
}

function readPort(value: unknown): EnvPort {
  const port = fields(value);
  const published = port.published === undefined || port.published === null || port.published === "" ? null : String(port.published);
  return { target: Number(port.target), published };
}

function readVolume(value: unknown): EnvVolume {
  const volume = fields(value);
  return { type: text(volume.type) ?? "", source: text(volume.source) || null, target: text(volume.target) ?? "", read_only: volume.read_only === true };
}

function readService(name: string, value: unknown): EnvService {
  const service = fields(value);
  const labels = textMap(service.labels);
  return {
    name,
    role: labels[ROLE_LABEL] ?? null,
    build: readBuild(service.build),
    image: text(service.image),
    healthcheck: readHealthcheck(service.healthcheck),
    ports: list(service.ports).map(readPort),
    volumes: list(service.volumes).map(readVolume),
    profiles: texts(service.profiles),
    environment: nullableTextMap(service.environment),
    labels,
  };
}

function readShared(value: unknown): Record<string, { address: string }> {
  return Object.fromEntries(Object.entries(fields(value)).map(([name, entry]) => [name, { address: text(fields(entry).address) ?? "" }]));
}

function readWiring(value: unknown): WiringRow {
  const row = fields(value);
  return { service: text(row.service) ?? "", file: text(row.file) ?? "", key: text(row.key), by: text(row.by) ?? "", variable: text(row.variable), replaced: text(row.replaced) };
}

function readPending(value: unknown): PendingRow {
  const row = fields(value);
  return { service: text(row.service) ?? "", what: text(row.what) ?? "" };
}

function readXPicket(value: unknown): XPicket | null {
  if (value === undefined || value === null) return null;
  const block = fields(value);
  return {
    version: block.version,
    shared: readShared(block.shared),
    wiring: list(block.wiring).map(readWiring),
    ignored: texts(block.ignored),
    pending: list(block.pending).map(readPending),
    unknown_keys: Object.keys(block).filter((key) => !X_PICKET_KEYS.includes(key)),
  };
}

export function readModel(json: unknown): EnvModel {
  const project = fields(json);
  return {
    name: text(project.name) ?? "",
    services: Object.entries(fields(project.services)).map(([name, service]) => readService(name, service)),
    picket: readXPicket(project[X_PICKET]),
  };
}
