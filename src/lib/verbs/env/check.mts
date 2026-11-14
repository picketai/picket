import { action, done, failed, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { findEngine, machineReport, realRunner, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type CheckInput = Record<string, never>;

const GIB = 1024 ** 3;

export function checkMachine({ env, cwd, root }: Context, runner: EngineRunner): Outcome<MachineReport> {
  const report = machineReport(findEngine(env, cwd, runner), root);
  return report.ok ? done(report) : failed(report);
}

function sizeText(bytes: number | null): string {
  return bytes === null ? "unknown" : `${(bytes / GIB).toFixed(1)} GiB`;
}

export function renderMachine(report: MachineReport): string {
  if (!report.ok) return report.missing.map((line) => `missing: ${line}`).join("\n");
  return [
    `engine: ${report.engine?.program} (Linux containers, Compose ${report.compose})`,
    `memory: ${sizeText(report.memory_bytes)} · free disk: ${sizeText(report.free_disk_bytes)}`,
  ].join("\n");
}

export const verb: VerbSpec<CheckInput, MachineReport> = {
  usage: "env check",
  output: "text",
  parse: () => ({}),
  run: action(async (_input, ctx) => checkMachine(ctx, realRunner)),
  render: renderMachine,
};
