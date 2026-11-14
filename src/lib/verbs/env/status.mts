import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { failureCause, jsonRecords, machineCheck, realRunner, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { itemStatus } from "../../shared/env/stacks.mts";
import { ITEM_LABEL } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type StatusInput = Record<string, never>;
export type StackRow = { stack: string; item: string; item_status: string; state: "running" | "stopped" };
export type StatusReport = { ok: boolean; machine: MachineReport; stacks: StackRow[] };

type Container = { project: string; item: string; running: boolean };

const PROJECT_LABEL = "com.docker.compose.project";
const RUNNING = "running";

function labelsOf(value: unknown): Record<string, string> {
  if (typeof value === "string") {
    return Object.fromEntries(
      value
        .split(",")
        .filter((pair) => pair.includes("="))
        .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
    );
  }
  return value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v)])) : {};
}

function containerOf(record: unknown): Container | null {
  const fields = record !== null && typeof record === "object" ? (record as Record<string, unknown>) : {};
  const labels = labelsOf(fields.Labels);
  const item = labels[ITEM_LABEL];
  const project = labels[PROJECT_LABEL];
  if (!item || !project) return null;
  return { project, item, running: String(fields.State ?? "").toLowerCase() === RUNNING };
}

export function stackRows(root: string, records: unknown[]): StackRow[] {
  const byProject = new Map<string, Container[]>();
  for (const container of records.map(containerOf)) {
    if (container) byProject.set(container.project, [...(byProject.get(container.project) ?? []), container]);
  }
  return [...byProject.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([stack, containers]) => ({ stack, item: containers[0].item, item_status: itemStatus(root, containers[0].item), state: containers.some((c) => c.running) ? "running" : "stopped" }));
}

export function environmentStatus({ env, cwd, root }: Context, runner: EngineRunner): Outcome<StatusReport> {
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) return failed({ ok: false, machine, stacks: [] });
  const listed = engine.run(["ps", "-a", "--format", "json", "--filter", `label=${ITEM_LABEL}`]);
  if (listed.status !== 0) throw new Refused(`ps failed: ${failureCause(listed)}`);
  return done({ ok: true, machine, stacks: stackRows(root, jsonRecords(listed.stdout)) });
}

export function renderStatus(report: StatusReport): string {
  if (!report.ok) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  if (report.stacks.length === 0) return "no stacks";
  return report.stacks.map((row) => `${row.stack} · item ${row.item} (${row.item_status}) · ${row.state}`).join("\n");
}

export const verb: VerbSpec<StatusInput, StatusReport> = {
  usage: "env status",
  output: "text",
  parse: () => ({}),
  run: action(async (_input, ctx) => environmentStatus(ctx, realRunner)),
  render: renderStatus,
};
