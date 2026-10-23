import net from "node:net";
import type { ChildProcess } from "node:child_process";
import { Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { detectTooling } from "../../shared/tooling.mts";
import { UsageError } from "../../util/args.mts";
import { killTree, startShell } from "../../util/process.mts";

export type Hit = { method: string; path: string; body: string | undefined };
export type HitResult = { method: string; path: string; status: number | null; ms: number; body?: string; error?: string };
export type ServerInput = { start: string | undefined; hits: Hit[]; port: string | undefined; wait: string | undefined; env: Record<string, string> };
export type ServerReport = {
  ok: boolean;
  mode: "server";
  start: string;
  port: number;
  wait: string;
  wait_ms: number;
  hits: HitResult[];
  server_exit: number | null;
  stopped: boolean;
  server_log_tail: string;
};

const HIT_SPEC = /^(?:([A-Z]+)\s+)?(\S+)(?:\s+([\s\S]+))?$/;
const PROBE_TIMEOUT_MS = 1000;
const PROBE_INTERVAL_MS = 250;
const PORT_CHECK_TIMEOUT_MS = 300;
const STOP_WAIT_MS = 3000;
const STOP_POLL_MS = 100;
const BODY_CHARS = 2000;
const CAPTURE_CHARS = 4000;
const LOG_TAIL_CHARS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function parseHit(spec: string): Hit {
  const m = spec.trim().match(HIT_SPEC);
  if (!m) throw new UsageError(`bad --hit "${spec}"; use "GET /path" or "POST /path <json body>"`);
  return { method: m[1] ?? "GET", path: m[2], body: m[3] };
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(PORT_CHECK_TIMEOUT_MS);
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("timeout", () => (socket.destroy(), resolve(false)));
    socket.once("error", () => resolve(false));
  });
}

function failureCode(err: unknown): string {
  const failure = err as { cause?: { code?: string }; name?: string; message?: string };
  return failure.cause?.code ?? failure.name ?? String(failure.message);
}

async function request(base: string, hit: Hit, timeoutMs: number): Promise<HitResult> {
  const started = Date.now();
  const url = /^https?:/.test(hit.path) ? hit.path : base + hit.path;
  try {
    const res = await fetch(url, {
      method: hit.method,
      body: hit.body,
      headers: hit.body ? { "content-type": "application/json" } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    return { method: hit.method, path: hit.path, status: res.status, ms: Date.now() - started, body: text.slice(0, BODY_CHARS) };
  } catch (err) {
    return { method: hit.method, path: hit.path, status: null, ms: Date.now() - started, error: failureCode(err) };
  }
}

type Server = { child: ChildProcess; log: () => string; exitCode: () => number | null };

function watch(child: ChildProcess): Server {
  let captured = "";
  let exited: number | null = null;
  const capture = (data: Buffer) => (captured = (captured + data.toString()).slice(-CAPTURE_CHARS));
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
  child.on("exit", (code) => (exited = code ?? -1));
  return { child, log: () => captured, exitCode: () => exited };
}

async function waitUntilUp(server: Server, base: string, wait: string, timeoutMs: number): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs && server.exitCode() === null) {
    const probe = await request(base, { method: "GET", path: wait, body: undefined }, PROBE_TIMEOUT_MS);
    if (probe.status !== null) return true;
    await sleep(PROBE_INTERVAL_MS);
  }
  return false;
}

async function stop(server: Server, port: number, platform: NodeJS.Platform): Promise<boolean> {
  const { child } = server;
  if (child.exitCode === null && child.pid !== undefined) killTree(child.pid, platform);
  const started = Date.now();
  while (Date.now() - started < STOP_WAIT_MS && (await portOpen(port))) await sleep(STOP_POLL_MS);
  return !(await portOpen(port));
}

export async function serverMode(input: ServerInput, ctx: Context, timeoutMs: number): Promise<ServerReport> {
  if (!input.hits.length) throw new Refused('drive needs at least one --hit "GET /path", or --run "<command>" for a CLI');
  const start = input.start ?? detectTooling(ctx.root).tooling.run;
  if (!start) throw new Refused('no start command detected: pass --start "<command>"');
  const port = Number(input.port ?? ctx.env.PORT ?? (await freePort()));
  const wait = input.wait ?? input.hits[0].path;
  const base = `http://127.0.0.1:${port}`;

  const server = watch(startShell(start, { cwd: ctx.root, env: { ...ctx.env, PORT: String(port), ...input.env }, platform: ctx.platform }));
  const started = Date.now();
  const up = await waitUntilUp(server, base, wait, timeoutMs);
  const waitMs = Date.now() - started;
  const serverExit = server.exitCode();
  const hits: HitResult[] = [];
  if (up) for (const hit of input.hits) hits.push(await request(base, hit, timeoutMs));
  const stopped = await stop(server, port, ctx.platform);
  return {
    ok: up && hits.every((hit) => hit.status !== null),
    mode: "server",
    start,
    port,
    wait,
    wait_ms: waitMs,
    hits,
    server_exit: serverExit,
    stopped,
    server_log_tail: server.log().slice(-LOG_TAIL_CHARS),
  };
}
