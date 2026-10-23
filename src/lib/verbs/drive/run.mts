import type { Context } from "../../shared/context.mts";
import { runShell, type ShellResult } from "../../util/process.mts";

export type RunInput = { run: string; env: Record<string, string> };
export type RunReport = { ok: boolean; mode: "run"; command: string; exit_code: number; ms: number; output: string };

const OUTPUT_CHARS = 4000;

function outputOf({ output, timedOut, ms }: ShellResult): string {
  return timedOut ? `${output}${output && !output.endsWith("\n") ? "\n" : ""}timed out after ${ms} ms` : output;
}

export function runMode({ run, env }: RunInput, ctx: Context, timeoutMs: number): RunReport {
  const result = runShell(run, { cwd: ctx.root, env: { ...ctx.env, ...env }, timeoutMs });
  return { ok: result.exitCode === 0, mode: "run", command: run, exit_code: result.exitCode, ms: result.ms, output: outputOf(result).slice(-OUTPUT_CHARS) };
}
