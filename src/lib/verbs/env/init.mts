import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { action, done, failed, Refused, type Outcome } from "../../shared/action.mts";
import { admit } from "../../shared/admission/admit.mts";
import type { Context } from "../../shared/context.mts";
import { applyDecisions, narrowed, outsideHosts, requestText, SETUP_TITLE, UPDATE_TITLE, type Decided, type OutsideHost, type RequestMode } from "../../shared/env/decisions.mts";
import { machineCheck, readModelJson, realRunner, type Engine, type EngineRunner, type MachineReport } from "../../shared/env/engine.mts";
import { outOfStep } from "../../shared/env/instep.mts";
import { readModel } from "../../shared/env/model.mts";
import { scanUmbrella, type EntryTarget, type Scan, type ScannedEntry, type ScannedService } from "../../shared/env/scan.mts";
import { COMPOSE_FILE, ENV_DIR } from "../../shared/env/standard.mts";
import { STATE_FILES, statePath } from "../../shared/paths.mts";
import { recordBases } from "../../shared/repos.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { createItem, LANES, type Lane } from "../../shared/work/state.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";
import { readJson } from "../../util/io.mts";

export type InitInput = { create: boolean; decide: string };
export type CreatedItem = { id: string; lane: Lane; title: string; mode: RequestMode };
export type InitReport = { ok: boolean; machine: MachineReport; scan_file: string | null; scan: Scan | null; hosts: OutsideHost[]; created: CreatedItem | null };

const NEXT_LINE = 'Show this list to the user; pass changes to the defaults with picket env init --create --decide "<id>=<choice>,..."';

function saveScan(root: string, scan: Scan): string {
  const path = statePath(root, STATE_FILES.envScan);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(scan, null, 2)}\n`);
  return relative(root, path).replaceAll("\\", "/");
}

function isLane(lane: string): lane is Lane {
  return (LANES as readonly string[]).includes(lane);
}

function currentScan(root: string): Scan {
  const saved = readJson<Scan>(statePath(root, STATE_FILES.envScan));
  if (saved === null) throw new Refused("no scan yet; run picket env init");
  const scan = scanUmbrella(root);
  if (scan.fingerprint !== saved.fingerprint) throw new Refused("the umbrella changed since the scan; run picket env init again");
  return scan;
}

function scoped(engine: Engine, root: string, scan: Scan, decided: Decided): { mode: RequestMode; decided: Decided } {
  if (!existsSync(join(root, ENV_DIR, COMPOSE_FILE))) return { mode: "setup", decided };
  const { services, entries } = outOfStep(scan, readModel(readModelJson(engine, root)), root);
  if (services.length === 0 && entries.length === 0) throw new Refused("the environment is in step; nothing to do");
  return { mode: "update", decided: narrowed(decided, services, entries) };
}

function createSetupItem({ root, now, session }: Context, engine: Engine, decide: string): CreatedItem {
  const scan = currentScan(root);
  const { mode, decided } = scoped(engine, root, scan, applyDecisions(scan, decide));
  const at = now();
  const request = requestText(decided, mode, at.toISOString().slice(0, 10));
  const { lane, reasons } = admit(root, request);
  if (!isLane(lane)) throw new Refused(`admit gives no lane for the request (${reasons.join("; ")})`);
  const title = mode === "setup" ? SETUP_TITLE : UPDATE_TITLE;
  const created = createItem(root, { lane, title, request, session }, at);
  recordBases(root, created.id);
  return { id: created.id, lane, title, mode };
}

export function initEnvironment(ctx: Context, runner: EngineRunner, input: InitInput = { create: false, decide: "" }): Outcome<InitReport> {
  const { engine, machine } = machineCheck(ctx.env, ctx.cwd, ctx.root, runner);
  const report: InitReport = { ok: false, machine, scan_file: null, scan: null, hosts: [], created: null };
  if (!engine || !machine.ok) return failed(report);
  if (input.create) return done({ ...report, ok: true, created: createSetupItem(ctx, engine, input.decide) });
  const scan = scanUmbrella(ctx.root);
  return done({ ...report, ok: true, scan_file: saveScan(ctx.root, scan), scan, hosts: outsideHosts(scan) });
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

function hostLine(h: OutsideHost): string {
  return `${h.id} ${h.host} · outside host · default ${h.default} · choices ${h.choices.join(", ")}`;
}

export function renderInit(report: InitReport): string {
  if (report.created) return [`created ${report.created.id} (${report.created.mode}) in the ${report.created.lane} lane`, `picket next ${report.created.id}`].join("\n");
  if (!report.scan) return report.machine.missing.map((line) => `missing: ${line}`).join("\n");
  return [...report.scan.services.map(serviceLine), ...report.scan.entries.map(entryLine), ...report.hosts.map(hostLine), NEXT_LINE].join("\n");
}

function parseInit(args: Args): InitInput {
  const create = flag(args, "create");
  const decide = str(args, "decide");
  if (decide !== undefined && !create) throw new UsageError("--decide goes with --create");
  return { create, decide: decide ?? "" };
}

export const verb: VerbSpec<InitInput, InitReport> = {
  usage: 'env init [--create [--decide "<id>=<choice>,..."]]',
  output: "text",
  parse: parseInit,
  run: action(async (input, ctx) => initEnvironment(ctx, realRunner, input)),
  render: renderInit,
};
