import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Refused } from "../action.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import { staticFindings, type Finding } from "../env/rules.mts";
import { pluginRoot, statePath } from "../paths.mts";
import type { HttpAdapter } from "../scenarios/http.mts";
import { listMocks, mockFindings, type MockDefinition, type MockFile } from "./definition.mts";

export type CompiledAnswer = { method: string; path: string; status: number; headers: [string, string][]; body: string | null };
export type CompiledDefinition = { service: string; answers: CompiledAnswer[] };
export type StubFragment = {
  command: string[];
  volumes: { type: "bind"; source: string; target: string; read_only: true }[];
  healthcheck: { test: string[]; interval: string; timeout: string; retries: number };
  ports: { target: number }[];
};
export type EnvironmentStubs = { mocks: MockFile[]; stubbed: string[]; findings: Finding[] };
export type TrafficEntry = { method: string; path: string; answered: boolean };
export type Traffic = Record<string, TrafficEntry[] | null>;
export type StackMocks = { stubs: Record<string, string>; ownMocks: string[] };

export const STUB_PORT = 8080;
const PROGRAM_NAME = "stub-server.mjs";
const CONTAINER_FOLDER = "/picket";
const CONTAINER_PROGRAM = `${CONTAINER_FOLDER}/${PROGRAM_NAME}`;
const CONTAINER_DEFINITION = `${CONTAINER_FOLDER}/mock.json`;
const HEALTH_INTERVAL = "2s";
const HEALTH_TIMEOUT = "2s";
const HEALTH_RETRIES = 15;
const MOCK_ROLE = "mock";
const RECEIVED_PATH = "/__picket/received";
const OK = 200;

export function stubProgram(): string {
  return join(pluginRoot(), "lib", "shared", "mocks", PROGRAM_NAME);
}

export function compileDefinition(definition: MockDefinition): CompiledDefinition {
  const answers = definition.answers.map(({ method, path, status, headers, body }) => ({ method, path, status, headers, body }));
  return { service: definition.service, answers };
}

export function stubbedMocks(model: EnvModel, mocks: MockFile[]): string[] {
  const defined = new Set(mocks.filter((mock) => mock.definition !== null).map((mock) => mock.service));
  return model.services.filter((service) => service.role === MOCK_ROLE && defined.has(service.name)).map((service) => service.name);
}

export function environmentStubs(root: string, model: EnvModel): EnvironmentStubs {
  const mocks = listMocks(root);
  const stubbed = stubbedMocks(model, mocks);
  return { mocks, stubbed, findings: [...staticFindings(model, stubbed), ...mockFindings(root, model, mocks)] };
}

function bind(source: string, target: string): StubFragment["volumes"][number] {
  return { type: "bind", source, target, read_only: true };
}

function fragment(program: string, definitionFile: string): StubFragment {
  return {
    command: ["node", CONTAINER_PROGRAM, CONTAINER_DEFINITION],
    volumes: [bind(program, CONTAINER_PROGRAM), bind(definitionFile, CONTAINER_DEFINITION)],
    healthcheck: { test: ["CMD", "node", CONTAINER_PROGRAM, "--health"], interval: HEALTH_INTERVAL, timeout: HEALTH_TIMEOUT, retries: HEALTH_RETRIES },
    ports: [{ target: STUB_PORT }],
  };
}

export function prepareStubs(root: string, stack: string, model: EnvModel, mocks: MockFile[], program: string = stubProgram()): Record<string, StubFragment> {
  const stubbed = new Set(stubbedMocks(model, mocks));
  const definitions = mocks.flatMap((mock) => (mock.definition !== null && stubbed.has(mock.service) ? [mock.definition] : []));
  if (definitions.length === 0) return {};
  if (!existsSync(program)) throw new Refused("the stub program is missing: rebuild Picket");
  const folder = statePath(root, `env/${stack}/stub`);
  mkdirSync(folder, { recursive: true });
  const copied = join(folder, PROGRAM_NAME);
  copyFileSync(program, copied);
  const fragments = definitions.map((definition): [string, StubFragment] => {
    const file = join(folder, `${definition.service}.json`);
    writeFileSync(file, `${JSON.stringify(compileDefinition(definition), null, 2)}\n`);
    return [definition.service, fragment(copied, file)];
  });
  return Object.fromEntries(fragments);
}

export function withStubPorts(services: EnvService[], stubbed: readonly string[]): EnvService[] {
  return services.map((service) => (stubbed.includes(service.name) ? { ...service, ports: [{ target: STUB_PORT, published: null }] } : service));
}

export function stackMocks(model: EnvModel, mocks: MockFile[], endpoints: Record<string, string>): StackMocks {
  const stubbed = stubbedMocks(model, mocks);
  const started = model.services.filter((service) => service.role === MOCK_ROLE && service.profiles.length === 0).map((service) => service.name);
  const stubs = Object.fromEntries(stubbed.flatMap((service) => (endpoints[service] === undefined ? [] : [[service, endpoints[service]]])));
  return { stubs, ownMocks: started.filter((service) => !stubbed.includes(service)) };
}

function isEntry(value: unknown): value is TrafficEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.method === "string" && typeof entry.path === "string" && typeof entry.answered === "boolean";
}

function entriesOf(text: string): TrafficEntry[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : null;
  } catch {
    return null;
  }
}

export async function readTraffic(adapter: HttpAdapter, stubs: Record<string, string>, timeoutMs: number): Promise<Traffic> {
  const read = Object.entries(stubs).map(async ([service, url]): Promise<[string, TrafficEntry[] | null]> => {
    const answer = await adapter({ method: "GET", url: `${url}${RECEIVED_PATH}`, headers: {}, body: null, timeoutMs });
    return [service, answer.status === OK ? entriesOf(answer.text) : null];
  });
  return Object.fromEntries(await Promise.all(read));
}

function duringRun(before: TrafficEntry[], after: TrafficEntry[]): TrafficEntry[] {
  return after.length < before.length ? after : after.slice(before.length);
}

export function trafficBetween(before: Traffic, after: Traffic): { mocks: string[]; gaps: string[] } {
  const runs = Object.entries(after).flatMap(([service, entries]) => {
    const earlier = before[service];
    return entries === null || earlier === null ? [] : [{ service, entries: duringRun(earlier ?? [], entries) }];
  });
  const mocks = runs.filter(({ entries }) => entries.length > 0).map(({ service }) => service);
  const gaps = runs.flatMap(({ service, entries }) => entries.filter((entry) => !entry.answered).map((entry) => `${service} has no answer for ${entry.method} ${entry.path}`));
  return { mocks, gaps: [...new Set(gaps)] };
}
