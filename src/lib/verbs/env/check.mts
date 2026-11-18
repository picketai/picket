import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { action, done, failed, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { machineCheck, readModelJson, realRunner, type Engine, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { inStepFindings } from "../../shared/env/instep.mts";
import { readModel, type EnvModel } from "../../shared/env/model.mts";
import { scanUmbrella } from "../../shared/env/scan.mts";
import { hasError, type Finding } from "../../shared/env/rules.mts";
import { COMPOSE_FILE, ENV_DIR, SCENARIO_DIR } from "../../shared/env/standard.mts";
import { trialFinding } from "../../shared/env/trial.mts";
import { environmentStubs } from "../../shared/mocks/stub.mts";
import { listScenarios, type SavedScenario } from "../../shared/scenarios/files.mts";
import { scenarioProblems } from "../../shared/scenarios/rules.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type CheckInput = Record<string, never>;
export type ScenarioCount = { active: number; deprecated: number };
export type EnvCheckReport = { ok: boolean; machine: MachineReport; environment: "present" | "missing" | null; findings: Finding[]; scenarios: ScenarioCount | null };

const GIB = 1024 ** 3;
const COMPOSE_PATH = `${ENV_DIR}/${COMPOSE_FILE}`;
const SCENARIO_RULE = "E11";
const CARD_EXTENSION = ".md";

function scenarioFindings(scenario: SavedScenario, services: string[]): Finding[] {
  const problems = [...scenario.problems, ...(scenario.card ? scenarioProblems(scenario.card, services) : [])];
  const subject = basename(scenario.path, CARD_EXTENSION);
  return problems.map((message) => ({ rule: SCENARIO_RULE, service: subject, level: "error", message }));
}

function countByStatus(scenarios: SavedScenario[]): ScenarioCount {
  const statuses = scenarios.flatMap((scenario) => (scenario.card ? [scenario.card.header.status] : []));
  return { active: statuses.filter((status) => status === "active").length, deprecated: statuses.filter((status) => status === "deprecated").length };
}

function scenarioCheck(root: string, model: EnvModel): { findings: Finding[]; scenarios: ScenarioCount | null } {
  if (!existsSync(join(root, SCENARIO_DIR))) return { findings: [], scenarios: null };
  const services = model.services.map((service) => service.name);
  const scenarios = listScenarios(root);
  return { findings: scenarios.flatMap((scenario) => scenarioFindings(scenario, services)), scenarios: countByStatus(scenarios) };
}

function environmentReport(engine: Engine, machine: MachineReport, root: string): EnvCheckReport {
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) return { ok: false, machine, environment: "missing", findings: [], scenarios: null };
  const modelJson = readModelJson(engine, root);
  const model = readModel(modelJson);
  const trial = trialFinding(root, modelJson);
  const saved = scenarioCheck(root, model);
  const findings = [...environmentStubs(root, model).findings, ...inStepFindings(scanUmbrella(root), model, root), ...(trial ? [trial] : []), ...saved.findings];
  return { ok: !hasError(findings), machine, environment: "present", findings, scenarios: saved.scenarios };
}

export function checkEnvironment({ env, cwd, root }: Context, runner: EngineRunner): Outcome<EnvCheckReport> {
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  const report: EnvCheckReport = engine && machine.ok ? environmentReport(engine, machine, root) : { ok: false, machine, environment: null, findings: [], scenarios: null };
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
  const count = report.scenarios === null ? [] : [`scenarios: ${report.scenarios.active} active, ${report.scenarios.deprecated} deprecated`];
  return [...passed, ...report.findings.map(findingLine), ...count];
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
