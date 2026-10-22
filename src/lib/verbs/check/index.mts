import { action, done, failed } from "../../shared/action.mts";
import { check, renderCheck } from "../../shared/checks.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { list, seconds, str, type Args } from "../../util/args.mts";

export type CheckInput = { steps: string[] | undefined; only: string | undefined; timeoutMs: number | undefined };
export type CheckReport = { ok: boolean } & Record<string, unknown>;

type Check = (options: CheckInput & { root: string }) => CheckReport;

const checkTyped = check as unknown as Check;

export const runChecks = action<CheckInput, CheckReport>(async (input, { root }) => {
  const report = checkTyped({ ...input, root });
  return report.ok ? done(report) : failed(report);
});

function parseCheck(args: Args): CheckInput {
  const steps = list(args, "steps");
  return { steps: steps.length ? steps : undefined, only: str(args, "only"), timeoutMs: seconds(args, "timeout") };
}

export const verb: VerbSpec<CheckInput, CheckReport> = {
  usage: 'check [--steps test,lint,build] [--only "<command>"] [--timeout <s>]',
  output: "json",
  parse: parseCheck,
  run: runChecks,
  render: renderCheck,
};
