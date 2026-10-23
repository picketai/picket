import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import type { Host } from "../../src/lib/shared/styling/host.mts";
import type { ProgramResult } from "../../src/lib/util/process.mts";
import type { AskOptions } from "../../src/lib/util/prompt.mts";
import type { StyleReport } from "../../src/lib/verbs/style/report.mts";

export const FIXED_NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

export type Exec = (command: string, args: string[]) => ProgramResult;
export type Program = (args: string[]) => ProgramResult;
export type FakeHost = Host & { calls: string[][]; questions: string[]; dispose: () => void };
export type FakeHostOptions = {
  platform?: NodeJS.Platform;
  files?: Record<string, string>;
  env?: NodeJS.ProcessEnv;
  answers?: string[];
  interactive?: boolean;
  exec?: Exec;
  fetch?: typeof globalThis.fetch;
};
export type ServingFetch = typeof globalThis.fetch & { urls: string[] };
export type ZipSpec = { name: string; data: Buffer; compressed?: Buffer; method?: number; flags?: number };

function succeed(): ProgramResult {
  return { status: 0, stdout: "", stderr: "" };
}

async function noFetch(): Promise<Response> {
  throw new Error("this test host has no network");
}

export function fakeHost({ platform = "linux", files = {}, env = {}, answers = [], interactive = true, exec = succeed, fetch = noFetch }: FakeHostOptions = {}): FakeHost {
  const home = mkdtempSync(join(tmpdir(), "picket-styling-"));
  for (const [rel, text] of Object.entries(files)) writeHomeFile(home, rel, text);
  const queue = [...answers];
  const host: FakeHost = {
    platform,
    home,
    env,
    now: () => new Date(FIXED_NOW),
    calls: [],
    questions: [],
    interactive,
    fetch,
    exec(command, args) {
      host.calls.push([command, ...args]);
      return exec(command, args);
    },
    async ask(question: string, { fallback }: AskOptions) {
      host.questions.push(question);
      return interactive && queue.length > 0 ? (queue.shift() ?? fallback) : fallback;
    },
    dispose() {
      rmSync(home, { recursive: true, force: true });
    },
  };
  return host;
}

export async function withFakeHost(options: FakeHostOptions, fn: (host: FakeHost) => Promise<void>): Promise<void> {
  const host = fakeHost(options);
  try {
    await fn(host);
  } finally {
    host.dispose();
  }
}

export function textsOf(report: StyleReport): string[] {
  return [...report.changes.flatMap((change) => (change.detail ? [String(change.detail)] : [])), ...report.manual];
}

export function notFound(command: string): ProgramResult {
  return { status: null, stdout: "", stderr: `${command}: not found` };
}

export function exited(status: number | null, stdout = ""): ProgramResult {
  return { status, stdout, stderr: status === 0 ? "" : "failed" };
}

export function fakeExec(programs: Record<string, Program>): Exec {
  return (command, args) => (programs[command] ? programs[command](args) : notFound(command));
}

export function fakeRegistry(values: Record<string, Record<string, string>> = {}) {
  const keys = new Map(Object.entries(values).map(([key, entries]) => [key, new Map(Object.entries(entries))]));
  const valuesOf = (key: string) => keys.get(key) ?? keys.set(key, new Map()).get(key)!;
  const run: Program = ([verb, key, ...rest]) => {
    const option = (flag: string) => rest[rest.indexOf(flag) + 1];
    if (verb === "query") {
      const entries = keys.get(key);
      if (!entries) return exited(1);
      return exited(0, [...entries].map(([name, data]) => `    ${name}    REG_SZ    ${data}`).join("\r\n"));
    }
    if (verb === "add") {
      valuesOf(key).set(option("/v"), option("/d"));
      return exited(0);
    }
    if (verb === "delete") return exited(valuesOf(key).delete(option("/v")) ? 0 : 1);
    return exited(1);
  };
  return { keys, run };
}

export function fakeDconf(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const run: Program = ([verb, ...args]) => {
    if (verb === "help") return exited(0);
    if (verb === "read") return exited(0, values.has(args[0]) ? `${values.get(args[0])}\n` : "");
    if (verb === "write") {
      values.set(args[0], args[1]);
      return exited(0);
    }
    if (verb === "reset" && args[0] === "-f") {
      for (const key of [...values.keys()]) if (key.startsWith(args[1])) values.delete(key);
      return exited(0);
    }
    if (verb === "reset") {
      values.delete(args[0]);
      return exited(0);
    }
    if (verb === "dump") return exited(0, [...values].filter(([key]) => key.startsWith(args[0])).map(([key, value]) => `${key}=${value}`).join("\n"));
    return exited(1);
  };
  return { values, run };
}

export function fakeDefaults(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const run: Program = ([verb, domain, key, , value]) => {
    const name = `${domain} ${key}`;
    if (verb === "read") return values.has(name) ? exited(0, `${values.get(name)}\n`) : exited(1);
    if (verb === "write") {
      values.set(name, value);
      return exited(0);
    }
    if (verb === "delete") return exited(values.delete(name) ? 0 : 1);
    return exited(1);
  };
  return { values, run };
}

export function servingFetch(body: BodyInit): ServingFetch {
  const urls: string[] = [];
  const fetch = async (url: string | URL | Request) => {
    urls.push(String(url));
    return new Response(body);
  };
  return Object.assign(fetch, { urls }) as ServingFetch;
}

function zipHeader(fields: [value: number, size: number][]): Buffer {
  const buffer = Buffer.alloc(fields.reduce((sum, [, size]) => sum + size, 0));
  let at = 0;
  for (const [value, size] of fields) {
    if (size === 2) buffer.writeUInt16LE(value, at);
    else buffer.writeUInt32LE(value, at);
    at += size;
  }
  return buffer;
}

export function buildZip(entries: ZipSpec[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data, compressed = data, method = 0, flags = 0 } of entries) {
    const nameBytes = Buffer.from(name);
    const common: [number, number][] = [[flags, 2], [method, 2], [0, 2], [0, 2], [0, 4], [compressed.length, 4], [data.length, 4], [nameBytes.length, 2], [0, 2]];
    const local = Buffer.concat([zipHeader([[0x04034b50, 4], [20, 2], ...common]), nameBytes, compressed]);
    centrals.push(Buffer.concat([zipHeader([[0x02014b50, 4], [20, 2], [20, 2], ...common, [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]), nameBytes]));
    locals.push(local);
    offset += local.length;
  }
  const directory = Buffer.concat(centrals);
  const end = zipHeader([[0x06054b50, 4], [0, 2], [0, 2], [entries.length, 2], [entries.length, 2], [directory.length, 4], [offset, 4], [0, 2]]);
  return Buffer.concat([...locals, directory, end]);
}

export function writeHomeFile(home: string, rel: string, text: string | Buffer): void {
  const path = join(home, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export function readHomeFile(home: string, rel: string): string {
  return readFileSync(join(home, ...rel.split("/")), "utf8");
}

export function homeFileExists(home: string, rel: string): boolean {
  return existsSync(join(home, ...rel.split("/")));
}

export function homeFiles(home: string, dir = home): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? homeFiles(home, join(dir, entry.name)) : [relative(home, join(dir, entry.name)).replaceAll("\\", "/")]))
    .sort();
}
