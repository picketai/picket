import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";

export type ShellOptions = { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number };
export type ProgramOptions = { cwd: string; timeoutMs: number };

type ProgramFailure = { stderr?: string | Buffer; message: string };

export class ProgramFailed extends Error {
  readonly lastLine: string;

  constructor(message: string, lastLine: string) {
    super(message);
    this.lastLine = lastLine;
  }
}

function lastLineOf(failure: ProgramFailure): string {
  const text = String(failure.stderr ?? "").trim() || failure.message.trim();
  return text.split("\n").at(-1)?.trim() ?? "";
}

export function runProgram(program: string, args: string[], { cwd, timeoutMs }: ProgramOptions): string {
  try {
    return execFileSync(program, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, windowsHide: true });
  } catch (err) {
    const lastLine = lastLineOf(err as ProgramFailure);
    throw new ProgramFailed(`${program} failed: ${lastLine}`, lastLine);
  }
}
export type ShellResult = { exitCode: number; output: string; ms: number; timedOut: boolean };
export type StartOptions = { cwd: string; env: NodeJS.ProcessEnv; platform: NodeJS.Platform };

export function runShell(command: string, { cwd, env, timeoutMs }: ShellOptions): ShellResult {
  const started = Date.now();
  const r = spawnSync(command, { cwd, env, shell: true, encoding: "utf8", timeout: timeoutMs, windowsHide: true });
  const timedOut = (r.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
  return { exitCode: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}`, ms: Date.now() - started, timedOut };
}

export function startShell(command: string, { cwd, env, platform }: StartOptions): ChildProcess {
  return spawn(command, { cwd, env, shell: true, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: platform !== "win32" });
}

function isGone(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === "ESRCH";
}

export function killTree(pid: number, platform: NodeJS.Platform): void {
  if (platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}
