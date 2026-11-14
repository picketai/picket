import { existsSync } from "node:fs";
import { join } from "node:path";
import { action, done, failed, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { findEngine, machineReport, readModelJson, realRunner, type Engine, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { inStepFindings } from "../../shared/env/instep.mts";
import { readModel } from "../../shared/env/model.mts";
import { scanUmbrella } from "../../shared/env/scan.mts";
import { hasError, staticFindings, type Finding } from "../../shared/env/rules.mts";
import { COMPOSE_FILE, ENV_DIR } from "../../shared/env/standard.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type CheckInput = Record<string, never>;
export type EnvCheckReport = { ok: boolean; machine: MachineReport; environment: "present" | "missing" | null; findings: Finding[] };

const GIB = 1024 ** 3;
const COMPOSE_PATH = `${ENV_DIR}/${COMPOSE_FILE}`;

function environmentReport(engine: Engine, machine: MachineReport, root: string): EnvCheckReport {
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) return { ok: false, machine, environment: "missing", findings: [] };
  const model = readModel(readModelJson(engine, root));
  const findings = [...staticFindings(model), ...inStepFindings(scanUmbrella(root), model, root)];
  return { ok: !hasError(findings), machine, environment: "present", findings };
}

export function checkEnvironment({ env, cwd, root }: Context, runner: EngineRunner): Outcome<EnvCheckReport> {
  const engine = findEngine(env, cwd, runner);
  const machine = machineReport(engine, root);
  const report: EnvCheckReport = engine && machine.ok ? environmentReport(engine, machine, root) : { ok: false, machine, environment: null, findings: [] };
  return report.ok ? done(report) : failed(report);
}

function sizeText(bytes: number | null): string {
  return bytes === null ? "unknown" : `${(bytes / GIB).toFixed(1)} GiB`;
}

export function renderMachine(report: MachineReport): string[] {
  if (!report.ok) return report.missing.map((line) => `missing: ${line}`);
  return [
    `engine: ${report.engine?.program} (Linux containers, Compose ${report.compose})`,
    `memory: ${sizeText(report.memory_bytes)} · free disk: ${sizeText(report.free_disk_bytes)}`,
  ];
}

function findingLine({ rule, service, level, message }: Finding): string {
  if (level === "pending") return `pending: ${service ?? rule}: ${message}`;
  return service === null ? `${rule}: ${message}` : `${rule} ${service}: ${message}`;
}

function environmentLines(report: EnvCheckReport): string[] {
  if (report.environment === "missing") return [`no environment: ${COMPOSE_PATH} is missing`];
  if (report.environment === null) return [];
  const passed = hasError(report.findings) ? [] : ["rules passed"];
  return [...passed, ...report.findings.map(findingLine)];
}

export function renderCheck(report: EnvCheckReport): string {
  return [...renderMachine(report.machine), ...environmentLines(report)].join("\n");
}

export const verb: VerbSpec<CheckInput, EnvCheckReport> = {
  usage: "env check",
  output: "text",
  parse: () => ({}),
  run: action(async (_input, ctx) => checkEnvironment(ctx, realRunner)),
  render: renderCheck,
};
