import { join } from "node:path";
import { action, done, failed, refuse } from "../../shared/action.mts";
import { appendCheckRow } from "../../shared/check-log.mts";
import { workingCheckout } from "../../shared/checkouts.mts";
import { extOf, LANGS } from "../../shared/comments.mjs";
import { dirtyPaths, isNonProduct } from "../../shared/git.mts";
import { isTestPath } from "../../shared/silenced.mjs";
import { runStep, type StepName, type StepOptions, type StepResult } from "../../shared/checks.mts";
import type { Context } from "../../shared/context.mts";
import { destructiveCommand, destructiveRefusal } from "../../shared/destructive.mts";
import { driveTarget } from "../../shared/drive-log.mts";
import { detectTooling, type Tooling } from "../../shared/tooling.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { list, seconds, str, type Args } from "../../util/args.mts";

export const CHECK_ORDER = ["test", "lint", "build"] as const;

export type CheckInput = { steps: string[] | undefined; only: string | undefined; timeoutMs: number | undefined };
export type CheckReport = { ok: boolean; steps: StepResult[]; skipped: StepName[]; checkout: string; warnings?: string[] };
type StepRun = Omit<CheckReport, "checkout" | "warnings">;

type PlannedStep = { name: StepName; command: string | null };

const DEFAULT_STEPS: readonly string[] = ["test", "lint"];
const DEFAULT_TIMEOUT_MS = 300_000;
const RED: readonly string[] = ["failed", "timed out"];

function planOf({ steps, only }: CheckInput, tooling: Tooling): PlannedStep[] {
  if (only) return [{ name: "command", command: only }];
  const wanted = steps?.length ? steps : DEFAULT_STEPS;
  return CHECK_ORDER.filter((name) => wanted.includes(name)).map((name) => ({ name, command: tooling[name] }));
}

function isRed(step: StepResult): boolean {
  return RED.includes(step.status);
}

function runUntilRed(root: string, plan: PlannedStep[], options: StepOptions): StepRun {
  const steps: StepResult[] = [];
  for (const { name, command } of plan) {
    const step = runStep(root, name, command, options);
    steps.push(step);
    if (isRed(step)) break;
  }
  return { ok: !steps.some(isRed), steps, skipped: plan.slice(steps.length).map((step) => step.name) };
}

function logPrefix(checkout: string): string {
  return checkout ? `check-${checkout.replaceAll("/", "-")}` : "check";
}

function isProductCode(path: string): boolean {
  return Object.hasOwn(LANGS, extOf(path)) && !isTestPath(path) && !isNonProduct(path);
}

function productChanged(dir: string): boolean {
  return dirtyPaths(dir).some(isProductCode);
}

function logCheck({ root, session, now }: Context, { ok, steps, checkout }: CheckReport): void {
  const { work_id, phase } = driveTarget(root, { session });
  if (work_id === null) return;
  const product_changed = productChanged(join(root, checkout));
  appendCheckRow(root, { ts: now().toISOString(), session, work_id, phase, checkout, ok, product_changed, steps: steps.map(({ name, status }) => ({ name, status })) });
}

export const runChecks = action<CheckInput, CheckReport>(async (input, context) => {
  const { root, cwd, env } = context;
  const match = input.only ? destructiveCommand(input.only) : null;
  if (match) return refuse(destructiveRefusal("check", match), { command: input.only });
  const checkout = workingCheckout(root, cwd);
  const dir = join(root, checkout);
  const { tooling, warnings } = detectTooling(dir);
  const report = { ...runUntilRed(root, planOf(input, tooling), { env, timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS, logPrefix: logPrefix(checkout), cwd: dir }), checkout };
  logCheck(context, report);
  const withWarnings = warnings.length ? { ...report, warnings } : report;
  return report.ok ? done(withWarnings) : failed(withWarnings);
});

function parseCheck(args: Args): CheckInput {
  const steps = list(args, "steps");
  return { steps: steps.length ? steps : undefined, only: str(args, "only"), timeoutMs: seconds(args, "timeout") };
}

function stepLine({ name, status, command, ms }: StepResult): string {
  return `${name}: ${status}${command ? ` · ${command}` : ""}${ms ? ` · ${(ms / 1000).toFixed(1)} s` : ""}`;
}

export function renderCheck(v: CheckReport): string {
  const lines = [...(v.checkout ? [`checkout: ${v.checkout}`] : []), ...v.steps.map(stepLine)];
  for (const step of v.steps) if (step.tail) lines.push(`--- ${step.log} (last lines)`, step.tail);
  if (v.skipped.length) lines.push(`not run: ${v.skipped.join(", ")}`);
  for (const warning of v.warnings ?? []) lines.push(`warning: ${warning}`);
  lines.push(v.ok ? "CHECK OK" : "CHECK FAILED");
  return lines.join("\n");
}

export const verb: VerbSpec<CheckInput, CheckReport> = {
  usage: 'check [--steps test,lint,build] [--only "<command>"] [--timeout <s>]',
  output: "json",
  parse: parseCheck,
  run: runChecks,
  render: renderCheck,
};
