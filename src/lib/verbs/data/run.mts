import { join } from "node:path";
import { action, done, failed, Refused } from "../../shared/action.mts";
import { listEntries, type CatalogEntry } from "../../shared/catalog/entry.mts";
import type { Context } from "../../shared/context.mts";
import { approvalStatus, fileDigest, sqlFile, type SqlFile } from "../../shared/data/approvals.mts";
import { connectionTarget, maskConnection } from "../../shared/data/connection.mts";
import { appendDataRun, type DataRun } from "../../shared/data/runs.mts";
import { failureCause, machineCheck, realRunner, runCompose, type EngineRunner } from "../../shared/env/engine.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import { COMPOSE_FILE, DATA_PROFILE, dataVariable, ENV_DIR, itemKey, stackName } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState, type WorkState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type RunInput = { id: WorkId; entry: string };
export type DataRunReport = { run: DataRun; service: string; cause: string | null };

const USAGE = "data run <id> <entry>";
const CLOSED_STATUSES = ["done", "abandoned"];
const SQL_KIND = "sql";
const CONTAINER_FILE = "/picket/run.sql";

type ApprovedFile = SqlFile & { sha256: string };

function openState(root: string, id: WorkId): WorkState {
  const state = readState(root, id);
  if (CLOSED_STATUSES.includes(state.status)) throw new Refused(`${id} is ${state.status}; data run runs only for an open or blocked item`, { id });
  return state;
}

function sqlEntry(root: string, name: string): CatalogEntry & { file: string; service: string } {
  const found = listEntries(root).find((file) => file.name === name);
  if (found === undefined) throw new Refused(`no catalog entry ${name}`);
  const { entry } = found;
  if (entry === null) throw new Refused(`the catalog entry ${name} has problems; run picket env check`);
  if (entry.kind !== SQL_KIND || entry.file === null || entry.service === null) throw new Refused(`${name} is a ${entry.kind} entry; only a sql entry has a file to run`);
  return { ...entry, file: entry.file, service: entry.service };
}

function approvedFile(root: string, path: string): ApprovedFile {
  const file = sqlFile(root, path);
  const sha256 = fileDigest(file.abs);
  const status = approvalStatus(root, file, sha256);
  if (status === "not approved") throw new Refused(`${file.path} is not approved; the user reads it with picket data show ${file.path} and approves it`);
  if (status === "changed since approval") throw new Refused(`${file.path} changed since approval; the user reads it again with picket data show ${file.path}`);
  return { ...file, sha256 };
}

function connection(env: NodeJS.ProcessEnv, variable: string): string {
  const value = env[variable];
  if (value === undefined || value === "") throw new Refused(`${variable} is unset; set it to the connection string in the shell that starts Claude Code. Picket never stores it`);
  return value;
}

function stackFiles(root: string, stack: string): string[] {
  return readStacks(root)[stack]?.files ?? [join(root, ENV_DIR, COMPOSE_FILE)];
}

export function dataRunArgs(variable: string, abs: string, service: string): string[] {
  return ["--profile", DATA_PROFILE, "run", "--rm", "--no-deps", "-T", "-e", variable, "-v", `${abs}:${CONTAINER_FILE}:ro`, service];
}

export function runSqlEntry(ctx: Context, runner: EngineRunner, { id, entry: name }: RunInput) {
  const { root, env, cwd, now } = ctx;
  const state = openState(root, id);
  const entry = sqlEntry(root, name);
  const file = approvedFile(root, entry.file);
  const variable = dataVariable(entry.service);
  const value = connection(env, variable);
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) throw new Refused(`data run needs a container engine: ${machine.missing.join("; ")}`, { id });
  const stack = stackName(itemKey(state));
  const result = runCompose(engine, root, stack, stackFiles(root, stack), dataRunArgs(variable, file.abs, entry.service));
  const target = connectionTarget(value);
  const run: DataRun = { at: now().toISOString(), item: id, entry: name, path: file.path, sha256: file.sha256, ...target, status: result.status };
  appendDataRun(root, run);
  const report: DataRunReport = { run, service: entry.service, cause: result.status === 0 ? null : maskConnection(failureCause(result), value) };
  return result.status === 0 ? done(report) : failed(report);
}

export function renderRun({ run, service, cause }: DataRunReport): string {
  const line = `ran ${run.path} on server ${run.server}, database ${run.database} through ${service}: exit ${run.status}`;
  return cause === null ? line : `${line}\ncause: ${cause}`;
}

function parseRun(args: Args): RunInput {
  const [id, entry, ...rest] = args.pos;
  if (!id || !entry || rest.length) throw new UsageError(USAGE);
  return { id: workId(id), entry };
}

export const verb: VerbSpec<RunInput, DataRunReport> = {
  usage: USAGE,
  output: "text",
  parse: parseRun,
  run: action(async (input, ctx) => runSqlEntry(ctx, realRunner, input)),
  render: renderRun,
};
