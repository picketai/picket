import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { machineCheck, realRunner, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { labelledItem, purgeStack, type Purged } from "../../shared/env/purge.mts";
import { itemStatus, readStacks } from "../../shared/env/stacks.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type PurgeInput = { stack: string };
export type PurgeReport = { ok: boolean; machine: MachineReport; stack: string; item: string | null; purged: Purged | null };

const ACTIVE = ["open", "blocked"];
const STACK_NAME = /^picket-[a-z0-9][a-z0-9-]*$/;

function refuseActive(root: string, stack: string, item: string | null): void {
  if (item === null) return;
  const status = itemStatus(root, item);
  if (ACTIVE.includes(status)) throw new Refused(`${stack} belongs to ${item}, which is ${status}; close it first`);
}

export function purgeEnvironment(ctx: Context, runner: EngineRunner, stack: string): Outcome<PurgeReport> {
  const { root } = ctx;
  const recorded = readStacks(root)[stack]?.item ?? null;
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, stack, item: recorded, purged: null });
  const item = recorded ?? labelledItem(engine, stack);
  refuseActive(root, stack, item);
  return done({ ok: true, machine, stack, item, purged: purgeStack(engine, root, stack, item, ctx.now()) });
}

export function renderPurge(report: PurgeReport): string {
  if (!report.purged) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  const { resources, evidence } = report.purged;
  if (evidence === null) return "nothing to remove";
  const lines = Object.entries(resources).map(([kind, list]) => `${kind}: ${list.length ? list.join(", ") : "none"}`);
  return [...lines, `recorded in ${evidence}`, "removed"].join("\n");
}

function parsePurge(args: Args): PurgeInput {
  const [stack] = args.pos;
  if (!stack) throw new UsageError("env purge needs <stack>");
  if (!STACK_NAME.test(stack)) throw new UsageError(`${stack} is not a stack name; stacks are named picket-<key>`);
  return { stack };
}

export const verb: VerbSpec<PurgeInput, PurgeReport> = {
  usage: "env purge <stack>",
  output: "text",
  parse: parsePurge,
  run: action(async ({ stack }, ctx) => purgeEnvironment(ctx, realRunner, stack)),
  render: renderPurge,
};
