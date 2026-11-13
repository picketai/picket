import type { Context } from "../../shared/context.mts";
import { containsMap } from "../../shared/work/declared-checks.mts";
import { runShell, type ShellResult } from "../../util/process.mts";

export type RunInput = { run: string; env: Record<string, string>; contains: string[] };
export type RunReport = { ok: boolean; mode: "run"; command: string; exit_code: number; ms: number; output: string; contains?: Record<string, boolean> };

const OUTPUT_CHARS = 4000;

function outputOf({ output, timedOut, ms }: ShellResult): string {
  return timedOut ? `${output}${output && !output.endsWith("\n") ? "\n" : ""}timed out after ${ms} ms` : output;
}

export function runMode({ run, env, contains }: RunInput, ctx: Context, dir: string, timeoutMs: number): RunReport {
  const result = runShell(run, { cwd: dir, env: { ...ctx.env, ...env }, timeoutMs });
  const output = outputOf(result);
  const report: RunReport = { ok: result.exitCode === 0, mode: "run", command: run, exit_code: result.exitCode, ms: result.ms, output: output.slice(-OUTPUT_CHARS) };
  return contains.length ? { ...report, contains: containsMap(output, contains) } : report;
}
