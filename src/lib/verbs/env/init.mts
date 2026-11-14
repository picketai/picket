import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { action, done, failed, type Outcome } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { findEngine, machineReport, realRunner, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { scanUmbrella, type EntryTarget, type Scan, type ScannedEntry, type ScannedService } from "../../shared/env/scan.mts";
import { STATE_FILES, statePath } from "../../shared/paths.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type InitInput = Record<string, never>;
export type InitReport = { ok: boolean; machine: MachineReport; scan_file: string | null; scan: Scan | null };

const NEXT_LINE = 'Show this list to the user; pass changes to the defaults with picket env init --create --decide "<id>=<choice>,..."';

function saveScan(root: string, scan: Scan): string {
  const path = statePath(root, STATE_FILES.envScan);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(scan, null, 2)}\n`);
  return relative(root, path).replaceAll("\\", "/");
}

export function initEnvironment({ env, cwd, root }: Context, runner: EngineRunner): Outcome<InitReport> {
  const machine = machineReport(findEngine(env, cwd, runner), root);
  if (!machine.ok) return failed({ ok: false, machine, scan_file: null, scan: null });
  const scan = scanUmbrella(root);
  return done({ ok: true, machine, scan_file: saveScan(root, scan), scan });
}

function targetText(target: EntryTarget): string {
  if (target === null) return "none";
  if (target.kind === "service") return `service ${target.name}`;
  if (target.kind === "outside") return `outside ${target.host}`;
  return "local";
}

function serviceLine(s: ScannedService): string {
  const runtime = s.linux ? s.runtime : `${s.runtime}, not Linux`;
  return `${s.id} ${s.path || "."} · ${runtime} · default ${s.default} · choices ${s.choices.join(", ")}`;
}

function entryLine(e: ScannedEntry): string {
  const setting = e.key === null ? "not read" : `${e.key} = ${e.value}`;
  const variable = e.variable === null ? "" : ` · variable ${e.variable}`;
  return `${e.id} ${e.file} · ${setting} · target ${targetText(e.target)}${variable} · default ${e.default} · choices ${e.choices.join(", ")}`;
}

export function renderInit(report: InitReport): string {
  if (!report.scan) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  return [...report.scan.services.map(serviceLine), ...report.scan.entries.map(entryLine), NEXT_LINE].join("\n");
}

export const verb: VerbSpec<InitInput, InitReport> = {
  usage: "env init",
  output: "text",
  parse: () => ({}),
  run: action(async (_input, ctx) => initEnvironment(ctx, realRunner)),
  render: renderInit,
};
