import { existsSync } from "node:fs";
import { join } from "node:path";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { machineCheck, readModelJson, realRunner, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { readModel } from "../../shared/env/model.mts";
import { hasError, staticFindings } from "../../shared/env/rules.mts";
import { COMPOSE_FILE, ENV_DIR } from "../../shared/env/standard.mts";
import { recordTrial, runTrial, trialSources, type TrialResult } from "../../shared/env/trial.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type TrialInput = Record<string, never>;
export type TrialReport = { ok: boolean; machine: MachineReport; trial: TrialResult | null };

export function trialEnvironment(ctx: Context, runner: EngineRunner): Outcome<TrialReport> {
  const { root, env, now } = ctx;
  const { engine, machine } = machineCheck(env, ctx.cwd, root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, trial: null });
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) throw new Refused(`no environment: ${ENV_DIR}/${COMPOSE_FILE} is missing`);
  const modelJson = readModelJson(engine, root);
  const model = readModel(modelJson);
  const errors = staticFindings(model);
  if (hasError(errors)) throw new Refused(`the environment fails ${[...new Set(errors.map((f) => f.rule))].join(", ")}; run picket env check`);
  const trial = runTrial(engine, root, model, trialSources(root, model, env));
  recordTrial(root, modelJson, trial.passed, now());
  const report = { ok: trial.passed, machine, trial };
  return trial.passed ? done(report) : failed(report);
}

export function renderTrial(report: TrialReport): string {
  if (report.trial === null) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  const removed = `removed ${report.trial.removed_images} trial image(s)`;
  return report.trial.passed ? `trial passed twice; ${removed}` : `trial failed in ${report.trial.failure}; ${removed}`;
}

export const verb: VerbSpec<TrialInput, TrialReport> = {
  usage: "env trial",
  output: "text",
  parse: () => ({}),
  run: action(async (_input, ctx) => trialEnvironment(ctx, realRunner)),
  render: renderTrial,
};
