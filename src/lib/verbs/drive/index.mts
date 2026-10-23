import { action, done, failed } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, many, pairs, seconds, str, type Args } from "../../util/args.mts";
import { drive, renderDrive } from "./drive.mjs";

export type DriveInput = {
  env: Record<string, string>;
  run: string | undefined;
  start: string | undefined;
  hits: string[];
  port: string | undefined;
  wait: string | undefined;
  timeoutMs: number | undefined;
  keepChanges: boolean;
  work: string | undefined;
  phase: string | undefined;
};
export type DriveReport = { ok: boolean } & Record<string, unknown>;

type Drive = (options: Omit<DriveInput, "work"> & { root: string; id: string | undefined; session: string | null }) => Promise<DriveReport>;

const driveTyped = drive as unknown as Drive;

export const driveApp = action<DriveInput, DriveReport>(async ({ work, ...options }, { root, session }) => {
  const report = await driveTyped({ ...options, id: work, root, session });
  return report.ok ? done(report) : failed(report);
});

function parseDrive(args: Args): DriveInput {
  return {
    env: pairs(args, "env"),
    run: str(args, "run"),
    start: str(args, "start"),
    hits: many(args, "hit"),
    port: str(args, "port"),
    wait: str(args, "wait"),
    timeoutMs: seconds(args, "timeout"),
    keepChanges: flag(args, "keep-changes"),
    work: str(args, "work"),
    phase: str(args, "phase"),
  };
}

export const verb: VerbSpec<DriveInput, DriveReport> = {
  usage: 'drive --run "<command>" | drive [--start "<command>"] --hit "<METHOD /path [json]>"... [--env NAME=VALUE]... [--port <n>] [--wait <path>] [--timeout <s>] [--keep-changes] [--work <id>] [--phase <n>]',
  output: "json",
  parse: parseDrive,
  run: driveApp,
  render: renderDrive,
};
