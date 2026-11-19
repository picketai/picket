import type { CatalogEntry } from "../catalog/entry.mts";
import type { Finding } from "../env/rules.mts";
import { configRel } from "../paths.mts";
import type { ConnectionTarget } from "./connection.mts";

export type DataTargets = Readonly<Record<string, readonly ConnectionTarget[]>>;

const TARGET_RULE = "E14";
const SQL_KIND = "sql";
const UNDECLARED = `picket data run refuses it until data_targets in ${configRel()} lists its server and database`;

export function declaredTargets(targets: DataTargets, service: string): readonly ConnectionTarget[] {
  return Object.hasOwn(targets, service) ? targets[service] : [];
}

export function isDeclared(targets: DataTargets, service: string, target: ConnectionTarget): boolean {
  return declaredTargets(targets, service).some((declared) => declared.server === target.server && declared.database === target.database);
}

function sqlServices(entries: readonly CatalogEntry[]): string[] {
  const services = entries.flatMap((entry) => (entry.kind === SQL_KIND && entry.service !== null ? [entry.service] : []));
  return [...new Set(services)];
}

export function targetFindings(entries: readonly CatalogEntry[], targets: DataTargets): Finding[] {
  return sqlServices(entries)
    .filter((service) => declaredTargets(targets, service).length === 0)
    .map((service) => ({ rule: TARGET_RULE, service, level: "error", message: UNDECLARED }));
}
