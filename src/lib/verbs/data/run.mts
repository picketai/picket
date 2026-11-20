import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { action, done, failed, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { sha256Hex, takeConfirmation, type Confirmation } from "../../shared/data/confirm.mts";
import { maskConnection, type ConnectionTarget } from "../../shared/data/connection.mts";
import { planRun } from "../../shared/data/plan.mts";
import { appendDataRun, type ConfirmedDataRun } from "../../shared/data/runs.mts";
import { failureCause, machineCheck, realRunner, runCompose, type EngineRunner } from "../../shared/env/engine.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import { statePath } from "../../shared/paths.mts";
import { COMPOSE_FILE, DATA_PROFILE, ENV_DIR, itemKey, stackName } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { str, UsageError, type Args } from "../../util/args.mts";

export type RunInput = { id: WorkId; entry: string; confirmation: string | null };
export type DataRunReport = { run: ConfirmedDataRun; service: string; cause: string | null };

const USAGE = "data run <id> <entry>";
const CONTAINER_FILE = "/picket/run.sql";
const CONFIRMATION_FLAG = "confirmation";
const NONCE = /^[0-9a-f]{64}$/;

function stackFiles(root: string, stack: string): string[] {
  return readStacks(root)[stack]?.files ?? [join(root, ENV_DIR, COMPOSE_FILE)];
}

export function dataRunArgs(variable: string, abs: string, service: string): string[] {
  return ["--profile", DATA_PROFILE, "run", "--rm", "--no-deps", "-T", "-e", variable, "-v", `${abs}:${CONTAINER_FILE}:ro`, service];
}

function snapshotPath(root: string, confirmation: Confirmation): string {
  const abs = statePath(root, confirmation.snapshot);
  if (!existsSync(abs) || sha256Hex(readFileSync(abs)) !== confirmation.sha256) throw new Refused(`the snapshot of ${confirmation.path} no longer matches the confirmed digest ${confirmation.sha256}; ask again`);
  return abs;
}

function pairText({ server, database }: ConnectionTarget): string {
  return `server ${server}, database ${database}`;
}

function sameTarget(read: ConnectionTarget, confirmation: Confirmation): void {
  if (read.server === confirmation.server && read.database === confirmation.database) return;
  throw new Refused(`the connection now reads ${pairText(read)}, but the dialog confirmed ${pairText(confirmation)}; ask again`);
}

export function runSqlEntry(ctx: Context, runner: EngineRunner, { id, entry: name, confirmation: nonce }: RunInput) {
  const { root, env, cwd, now } = ctx;
  const confirmation = takeConfirmation(root, { session: ctx.session, item: id, entry: name, nonce }, now());
  const plan = planRun(root, env, id, name, { sha256: confirmation.sha256 });
  const snapshot = snapshotPath(root, confirmation);
  sameTarget(plan.target, confirmation);
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) throw new Refused(`data run needs a container engine: ${machine.missing.join("; ")}`, { id });
  const stack = stackName(itemKey(readState(root, id)));
  const result = runCompose(engine, root, stack, stackFiles(root, stack), dataRunArgs(plan.variable, snapshot, plan.service));
  const run: ConfirmedDataRun = { at: now().toISOString(), item: id, entry: name, path: plan.path, sha256: confirmation.sha256, ...plan.target, status: result.status, confirmation: confirmation.id, approved_at: plan.approval.at };
  appendDataRun(root, run);
  const cause = result.status === 0 ? null : maskConnection(failureCause(result), env[plan.variable] ?? "");
  const report: DataRunReport = { run, service: plan.service, cause };
  return result.status === 0 ? done(report) : failed(report);
}

export function renderRun({ run, service, cause }: DataRunReport): string {
  const line = `ran ${run.path} on server ${run.server}, database ${run.database} through ${service}: exit ${run.status}`;
  return cause === null ? line : `${line}\ncause: ${cause}`;
}

function confirmationOf(args: Args): string | null {
  const value = str(args, CONFIRMATION_FLAG);
  if (value === undefined) return null;
  if (!NONCE.test(value)) throw new UsageError(`--${CONFIRMATION_FLAG} needs 64 lowercase hex characters`);
  return value;
}

function parseRun(args: Args): RunInput {
  const [id, entry, ...rest] = args.pos;
  if (!id || !entry || rest.length) throw new UsageError(USAGE);
  return { id: workId(id), entry, confirmation: confirmationOf(args) };
}

export const verb: VerbSpec<RunInput, DataRunReport> = {
  usage: USAGE,
  output: "text",
  parse: parseRun,
  run: action(async (input, ctx) => runSqlEntry(ctx, realRunner, input)),
  render: renderRun,
};
