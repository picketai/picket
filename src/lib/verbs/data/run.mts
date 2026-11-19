import { join } from "node:path";
import { action, done, failed, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { maskConnection } from "../../shared/data/connection.mts";
import { planRun } from "../../shared/data/plan.mts";
import { appendDataRun, type DataRun } from "../../shared/data/runs.mts";
import { failureCause, machineCheck, realRunner, runCompose, type EngineRunner } from "../../shared/env/engine.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import { COMPOSE_FILE, DATA_PROFILE, ENV_DIR, itemKey, stackName } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type RunInput = { id: WorkId; entry: string };
export type DataRunReport = { run: DataRun; service: string; cause: string | null };

const USAGE = "data run <id> <entry>";
const CONTAINER_FILE = "/picket/run.sql";

function stackFiles(root: string, stack: string): string[] {
  return readStacks(root)[stack]?.files ?? [join(root, ENV_DIR, COMPOSE_FILE)];
}

export function dataRunArgs(variable: string, abs: string, service: string): string[] {
  return ["--profile", DATA_PROFILE, "run", "--rm", "--no-deps", "-T", "-e", variable, "-v", `${abs}:${CONTAINER_FILE}:ro`, service];
}

export function runSqlEntry(ctx: Context, runner: EngineRunner, { id, entry: name }: RunInput) {
  const { root, env, cwd, now } = ctx;
  const plan = planRun(root, env, id, name);
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) throw new Refused(`data run needs a container engine: ${machine.missing.join("; ")}`, { id });
  const stack = stackName(itemKey(readState(root, id)));
  const result = runCompose(engine, root, stack, stackFiles(root, stack), dataRunArgs(plan.variable, plan.abs, plan.service));
  const run: DataRun = { at: now().toISOString(), item: id, entry: name, path: plan.path, sha256: plan.sha256, ...plan.target, status: result.status };
  appendDataRun(root, run);
  const cause = result.status === 0 ? null : maskConnection(failureCause(result), env[plan.variable] ?? "");
  const report: DataRunReport = { run, service: plan.service, cause };
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
