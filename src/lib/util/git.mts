import { execFileSync } from "node:child_process";

export type GitReadOptions = { maxBuffer?: number; buffer?: boolean };
export type GitRunOptions = { input?: string; env?: NodeJS.ProcessEnv; maxBuffer?: number; okExitCodes?: readonly number[]; timeoutMs?: number };

type GitFailure = { stdout?: string | Buffer; stderr?: string | Buffer; status?: number | null; message: string };

export class GitFailed extends Error {
  readonly lastLine: string;

  constructor(message: string, lastLine = "") {
    super(message);
    this.lastLine = lastLine;
  }
}

export function gitRead(root: string, args: string[], options: GitReadOptions & { buffer: true }): Buffer | null;
export function gitRead(root: string, args: string[], options?: GitReadOptions & { buffer?: false }): string | null;
export function gitRead(root: string, args: string[], { maxBuffer, buffer = false }: GitReadOptions = {}): string | Buffer | null {
  try {
    const bytes = execFileSync("git", ["-C", root, ...args], { stdio: ["ignore", "pipe", "ignore"], maxBuffer });
    return buffer ? bytes : bytes.toString("utf8").trimEnd();
  } catch {
    return null;
  }
}

function subcommand(args: string[]): string {
  return args.find((arg) => !arg.startsWith("-")) ?? "";
}

function lastStderrLine(err: GitFailure): string {
  const text = String(err.stderr ?? "").trim() || err.message.trim();
  return text.split("\n").at(-1) ?? "";
}

function exitedWith(failure: GitFailure, codes: readonly number[]): boolean {
  return typeof failure.status === "number" && codes.includes(failure.status);
}

export function gitRun(root: string, args: string[], { input, env, maxBuffer, okExitCodes = [], timeoutMs }: GitRunOptions = {}): string {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      input,
      env,
      maxBuffer,
      timeout: timeoutMs,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
  } catch (err) {
    const failure = err as GitFailure;
    if (exitedWith(failure, okExitCodes)) return String(failure.stdout ?? "");
    const lastLine = lastStderrLine(failure);
    throw new GitFailed(`git ${subcommand(args)} failed: ${lastLine}`, lastLine);
  }
}
