import { action, done, failed, refuse } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { destructiveCommand, destructiveRefusal } from "../../shared/destructive.mts";
import { appendDriveRow, driveTarget, type DriveRow } from "../../shared/drive-log.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, many, pairs, seconds, str, type Args } from "../../util/args.mts";
import { runMode, type RunReport } from "./run.mts";
import { parseHit, serverMode, type Hit, type ServerReport } from "./server.mts";
import { restoreSideEffects, treeSnapshot, type SideEffects } from "./side-effects.mts";

export type DriveInput = {
  env: Record<string, string>;
  run: string | undefined;
  start: string | undefined;
  hits: Hit[];
  port: string | undefined;
  wait: string | undefined;
  timeoutMs: number | undefined;
  keepChanges: boolean;
  work: string | undefined;
  phase: string | undefined;
};
export type DriveReport = (RunReport | ServerReport) & SideEffects;

const DEFAULT_TIMEOUT_MS = 20_000;
const LOGGED_COMMAND_CHARS = 200;
const RENDERED_BODY_CHARS = 160;
const RUN_TAIL_LINES = 15;

function destructiveIn({ run, start }: DriveInput): { command: string; match: string } | null {
  for (const command of [run, start]) {
    const match = command ? destructiveCommand(command) : null;
    if (command && match) return { command, match };
  }
  return null;
}

type RowBase = Omit<DriveRow, "command">;

export function driveRow(input: DriveInput, ctx: Context): RowBase {
  const target = input.work ? { work_id: input.work, phase: null } : driveTarget(ctx.root, { session: ctx.session });
  const phase = input.phase !== undefined ? Number(input.phase) : target.phase;
  return { ts: ctx.now().toISOString(), kind: "drive", source: "picket drive", work_id: target.work_id, phase, env: Object.keys(input.env) };
}

function serverCommand(start: string, hits: Hit[]): string {
  return `picket drive --start "${start}" ${hits.map((hit) => `--hit "${hit.method} ${hit.path}"`).join(" ")}`;
}

async function driveOnce(input: DriveInput, ctx: Context, row: RowBase): Promise<DriveReport> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const before = treeSnapshot(ctx.root);
  if (input.run) {
    const report = runMode({ run: input.run, env: input.env }, ctx, timeoutMs);
    const side = restoreSideEffects(ctx.root, before, input.keepChanges);
    appendDriveRow(ctx.root, { ...row, command: `picket drive --run ${input.run}`.slice(0, LOGGED_COMMAND_CHARS), ok: report.ok, exit_code: report.exit_code });
    return { ...report, ...side };
  }
  const report = await serverMode(input, ctx, timeoutMs);
  const side = restoreSideEffects(ctx.root, before, input.keepChanges);
  appendDriveRow(ctx.root, {
    ...row,
    command: serverCommand(report.start, input.hits).slice(0, LOGGED_COMMAND_CHARS),
    port: report.port,
    ok: report.ok,
    hits: report.hits.map(({ method, path, status, ms }) => ({ method, path, status, ms })),
  });
  return { ...report, ...side };
}

export const driveApp = action<DriveInput, DriveReport>(async (input, ctx) => {
  const destructive = destructiveIn(input);
  if (destructive) return refuse(destructiveRefusal("drive", destructive.match), { command: destructive.command });
  const report = await driveOnce(input, ctx, driveRow(input, ctx));
  return report.ok ? done(report) : failed(report);
});

function parseDrive(args: Args): DriveInput {
  return {
    env: pairs(args, "env"),
    run: str(args, "run"),
    start: str(args, "start"),
    hits: many(args, "hit").map(parseHit),
    port: str(args, "port"),
    wait: str(args, "wait"),
    timeoutMs: seconds(args, "timeout"),
    keepChanges: flag(args, "keep-changes"),
    work: str(args, "work"),
    phase: str(args, "phase"),
  };
}

function oneLine(text: string | undefined): string {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, RENDERED_BODY_CHARS);
}

function sideEffectLines(v: SideEffects): string[] {
  return [
    ...(v.restored.length ? [`restored ${v.restored.join(", ")} (changed by the drive, not by you)`] : v.dirtied.length ? [`left dirty: ${v.dirtied.join(", ")}`] : []),
    ...(v.removed.length ? [`removed ${v.removed.join(", ")} (created by the drive, not by you)`] : v.created.length ? [`left in place: ${v.created.join(", ")}`] : []),
  ];
}

function runLines(v: RunReport): string[] {
  const tail = v.output.trim().split(/\r?\n/).slice(-RUN_TAIL_LINES).join("\n");
  return [`${v.command} → exit ${v.exit_code} (${v.ms} ms)`, tail];
}

function serverLines(v: ServerReport): string[] {
  const lines =
    v.hits.length || v.ok
      ? [`${v.start} on :${v.port} · up in ${v.wait_ms} ms`]
      : [`${v.start} on :${v.port} · no answer on ${v.wait} within ${v.wait_ms} ms${v.server_exit !== null ? ` (exited ${v.server_exit})` : ""}`];
  for (const hit of v.hits) lines.push(`${hit.method} ${hit.path} → ${hit.status ?? hit.error} (${hit.ms} ms) ${oneLine(hit.body)}`);
  if (!v.ok && v.server_log_tail) lines.push("--- server log", v.server_log_tail.trim());
  lines.push(v.stopped ? "server stopped" : `server still listening on :${v.port}`);
  return lines;
}

export function renderDrive(v: DriveReport): string {
  const body = v.mode === "run" ? runLines(v) : serverLines(v);
  return [...body, ...sideEffectLines(v), v.ok ? "DRIVE OK" : "DRIVE FAILED"].join("\n");
}

export const verb: VerbSpec<DriveInput, DriveReport> = {
  usage: 'drive --run "<command>" | drive [--start "<command>"] --hit "<METHOD /path [json]>"... [--env NAME=VALUE]... [--port <n>] [--wait <path>] [--timeout <s>] [--keep-changes] [--work <id>] [--phase <n>]',
  output: "json",
  parse: parseDrive,
  run: driveApp,
  render: renderDrive,
};
