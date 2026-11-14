import { existsSync } from "node:fs";
import { join } from "node:path";
import type { EnvModel, WiringRow } from "./model.mts";
import type { Finding } from "./rules.mts";
import type { Scan, ScannedEntry, ScannedService } from "./scan.mts";

export type OutOfStep = { services: ScannedService[]; entries: ScannedEntry[] };

type Gap = { finding: Finding; service: ScannedService | null; entry: ScannedEntry | null; path: string | null };
export type LocatedFinding = { finding: Finding; path: string | null };
export type SplitFindings = { caused: LocatedFinding[]; other: LocatedFinding[] };

const RULE = "E9";

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

function builtFrom(model: EnvModel, path: string): boolean {
  return model.services.some((s) => s.build !== null && (posix(s.build.context) === path || posix(s.build.context).endsWith(`/${path}`)));
}

function levelFor(service: string | null, pending: Set<string>): Finding["level"] {
  return service !== null && pending.has(service) ? "pending" : "error";
}

type GapRows = { service?: ScannedService; entry?: ScannedEntry; path?: string | null };

function gap(service: string | null, pending: Set<string>, message: string, rows: GapRows = {}): Gap {
  const path = rows.path ?? rows.service?.path ?? rows.entry?.file ?? null;
  return { finding: { rule: RULE, service, level: levelFor(service, pending), message }, service: rows.service ?? null, entry: rows.entry ?? null, path };
}

function serviceGaps(scan: Scan, model: EnvModel, pending: Set<string>): Gap[] {
  const picket = model.picket;
  const placed = (s: ScannedService) => builtFrom(model, s.path) || Object.hasOwn(picket?.shared ?? {}, s.name) || (picket?.ignored ?? []).includes(s.path) || pending.has(s.name);
  return scan.services.filter((s) => !placed(s)).map((s) => gap(s.name, pending, `${s.path} is not in the environment: add a service, or list it as shared, ignored or pending`, { service: s }));
}

function wiringFor(rows: WiringRow[], entry: ScannedEntry): WiringRow | undefined {
  return rows.find((row) => row.file === entry.file && row.key === entry.key);
}

function entryGaps(scan: Scan, model: EnvModel, pending: Set<string>): Gap[] {
  const picket = model.picket;
  const outside = (service: string | null) => service !== null && (Object.hasOwn(picket?.shared ?? {}, service) || scan.services.some((s) => s.name === service && (picket?.ignored ?? []).includes(s.path)));
  return scan.entries
    .filter((entry) => entry.key !== null && !outside(entry.service) && !wiringFor(picket?.wiring ?? [], entry))
    .map((entry) => gap(entry.service, pending, `${entry.file} ${entry.key} has no wiring row`, { entry }));
}

function rowMessage(row: WiringRow, model: EnvModel, root: string): string | null {
  if (row.by === "env") {
    const environment = model.services.find((s) => s.name === row.service)?.environment ?? {};
    return row.variable !== null && Object.hasOwn(environment, row.variable) ? null : `variable ${row.variable ?? "(none)"} for ${row.file} ${row.key ?? ""} is not in the environment of ${row.service}`;
  }
  if (row.by === "file") return row.replaced !== null && existsSync(join(root, row.replaced)) ? null : `replaced file ${row.replaced ?? "(none)"} for ${row.file} is missing`;
  return null;
}

function rowGaps(scan: Scan, model: EnvModel, root: string, pending: Set<string>): Gap[] {
  return (model.picket?.wiring ?? []).flatMap((row) => {
    const message = rowMessage(row, model, root);
    if (message === null) return [];
    const entry = scan.entries.find((e) => e.file === row.file && e.key === row.key);
    return [gap(row.service, pending, message, { entry, path: row.file })];
  });
}

function gaps(scan: Scan, model: EnvModel, root: string): Gap[] {
  const pending = new Set((model.picket?.pending ?? []).map((row) => row.service));
  const rows = (model.picket?.pending ?? []).map((row) => gap(row.service, pending, row.what, { service: scan.services.find((s) => s.name === row.service) }));
  return [...rows, ...serviceGaps(scan, model, pending), ...entryGaps(scan, model, pending), ...rowGaps(scan, model, root, pending)];
}

export function inStepFindings(scan: Scan, model: EnvModel, root: string): Finding[] {
  return gaps(scan, model, root).map(({ finding }) => finding);
}

export function locatedFindings(scan: Scan, model: EnvModel, root: string): LocatedFinding[] {
  return gaps(scan, model, root).map(({ finding, path }) => ({ finding, path }));
}

function under(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder.replace(/\/$/, "")}/`);
}

export function splitByChange(findings: LocatedFinding[], changed: string[]): SplitFindings {
  const caused = (path: string | null) => path !== null && changed.some((c) => under(path, c) || under(c, path));
  return { caused: findings.filter((f) => caused(f.path)), other: findings.filter((f) => !caused(f.path)) };
}

export function outOfStep(scan: Scan, model: EnvModel, root: string): OutOfStep {
  const errors = gaps(scan, model, root).filter(({ finding }) => finding.level === "error");
  const services = scan.services.filter((s) => errors.some((g) => g.service === s));
  const entries = scan.entries.filter((e) => errors.some((g) => g.entry === e));
  return { services, entries };
}
