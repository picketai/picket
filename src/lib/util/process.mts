import { spawnSync } from "node:child_process";

export type ShellOptions = { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number };
export type ShellResult = { exitCode: number; output: string; ms: number; timedOut: boolean };

export function runShell(command: string, { cwd, env, timeoutMs }: ShellOptions): ShellResult {
  const started = Date.now();
  const r = spawnSync(command, { cwd, env, shell: true, encoding: "utf8", timeout: timeoutMs, windowsHide: true });
  const timedOut = (r.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
  return { exitCode: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}`, ms: Date.now() - started, timedOut };
}
