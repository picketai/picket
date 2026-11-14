import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { failureCause, machineCheck, realRunner, runCompose, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import { itemKey, stackName } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type StopInput = { id: WorkId };
export type StopReport = { ok: boolean; machine: MachineReport; stack: string | null };

export function stopEnvironment(ctx: Context, runner: EngineRunner, id: WorkId): Outcome<StopReport> {
  const { root } = ctx;
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, stack: null });
  const stack = stackName(itemKey(readState(root, id)));
  const entry = readStacks(root)[stack];
  if (!entry) throw new Refused(`no stack ${stack} is recorded; run picket env start ${id}`);
  const result = runCompose(engine, root, stack, entry.files, ["stop"]);
  if (result.status !== 0) throw new Refused(`compose stop failed: ${failureCause(result)}`);
  return done({ ok: true, machine, stack });
}

export function renderStop(report: StopReport): string {
  if (!report.ok) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  return `stopped ${report.stack}; its containers and volumes stay until the item closes`;
}

function parseStop(args: Args): StopInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("env stop needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<StopInput, StopReport> = {
  usage: "env stop <id>",
  output: "text",
  parse: parseStop,
  run: action(async ({ id }, ctx) => stopEnvironment(ctx, realRunner, id)),
  render: renderStop,
};
