import { action, done, failed, Refused } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, str, type Args } from "../../util/args.mts";
import { init, initRoot, InitRefused, renderInit } from "./init.mjs";

export type InitInput = { root: string | null; install: boolean };
export type InitStep = { result: string } & Record<string, unknown>;
export type InitReport = { steps: InitStep[] } & Record<string, unknown>;

type InitRoot = (options: { root: string | undefined }) => string;

const initRootTyped = initRoot as unknown as InitRoot;

function chosenRoot(root: string | null): string {
  try {
    return initRootTyped({ root: root ?? undefined });
  } catch (err) {
    if (err instanceof InitRefused) throw new Refused(err.message, { root: null });
    throw err;
  }
}

export const initProject = action<InitInput, InitReport>(async ({ root, install }, { home }) => {
  const report = init(chosenRoot(root), { install, home }) as InitReport;
  return report.steps.some((step) => step.result === "failed") ? failed(report) : done(report);
});

function parseInit(args: Args): InitInput {
  return { root: str(args, "root") ?? null, install: !flag(args, "no-install") };
}

export const verb: VerbSpec<InitInput, InitReport> = {
  usage: "init [--root <dir>] [--no-install]",
  output: "json",
  parse: parseInit,
  run: initProject,
  render: renderInit,
};
