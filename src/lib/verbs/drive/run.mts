import type { Context } from "../../shared/context.mts";
import { runShell } from "../../util/process.mts";

export type RunInput = { run: string; env: Record<string, string> };
export type RunReport = { ok: boolean; mode: "run"; command: string; exit_code: number; ms: number; output: string };

const OUTPUT_CHARS = 4000;

export function runMode({ run, env }: RunInput, ctx: Context, timeoutMs: number): RunReport {
  const result = runShell(run, { cwd: ctx.root, env: { ...ctx.env, ...env }, timeoutMs });
  return { ok: result.exitCode === 0, mode: "run", command: run, exit_code: result.exitCode, ms: result.ms, output: result.output.slice(-OUTPUT_CHARS) };
}
