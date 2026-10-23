import { spawn, spawnSync, type ChildProcess } from "node:child_process";

export type ShellOptions = { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number };
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
