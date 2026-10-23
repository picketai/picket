import { mkdirSync, writeFileSync } from "node:fs";
import { runShell, type ShellResult } from "../util/process.mts";
import { stateDir, statePath, stateRel } from "./paths.mts";

export const STEP_NAMES = ["test", "lint", "build", "command"] as const;

export type StepName = (typeof STEP_NAMES)[number];
export type StepStatus = "passed" | "failed" | "timed out" | "none detected";
export type StepResult = { name: StepName; command: string | null; status: StepStatus; exit_code: number | null; ms: number; log: string | null; tail: string };
export type StepOptions = { env: NodeJS.ProcessEnv; timeoutMs: number; logPrefix: string };

const TAIL_LINES = 30;

function statusOf({ exitCode, timedOut }: ShellResult): StepStatus {
  if (timedOut) return "timed out";
  return exitCode === 0 ? "passed" : "failed";
}

function tailOf(output: string): string {
  return output.trim().split(/\r?\n/).slice(-TAIL_LINES).join("\n");
}

export function runStep(root: string, name: StepName, command: string | null, { env, timeoutMs, logPrefix }: StepOptions): StepResult {
  if (!command) return { name, command: null, status: "none detected", exit_code: null, ms: 0, log: null, tail: "" };
  // No CI=1: under CI, Jest refuses to write new snapshots and fails instead, so a test that passes
  // for the developer would fail here. Watch-mode runners are the project's problem, not ours.
  const result = runShell(command, { cwd: root, env, timeoutMs });
  const logName = `${logPrefix}-${name}.log`;
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, logName), result.output);
  const status = statusOf(result);
  return { name, command, status, exit_code: result.exitCode, ms: result.ms, log: stateRel(logName), tail: status === "passed" ? "" : tailOf(result.output) };
}
