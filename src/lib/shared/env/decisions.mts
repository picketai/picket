import { Refused } from "../action.mts";
import { PROFILES } from "./profiles.mts";
import type { EntryChoice, Scan, ScannedEntry, ScannedService, ServiceChoice } from "./scan.mts";
import { ENV_DIR, COMPOSE_FILE } from "./standard.mts";

export type HostChoice = "mock" | "dependency" | "shared";
export type OutsideHost = { id: string; host: string; label: string; choices: HostChoice[]; default: HostChoice };
export type DecidedService = ScannedService & { choice: ServiceChoice };
export type DecidedEntry = ScannedEntry & { choice: EntryChoice };
export type DecidedHost = OutsideHost & { choice: HostChoice };
export type Decided = { services: DecidedService[]; entries: DecidedEntry[]; hosts: DecidedHost[] };
export type RequestMode = "setup" | "update";

type Row = { id: string; choices: readonly string[]; default: string };

const HOST_CHOICES: HostChoice[] = ["mock", "dependency", "shared"];
const UNPLACED: readonly ServiceChoice[] = ["shared", "ignore"];
const PAIR = /^([SCH]\d+)=([a-z]+)$/;

export const SETUP_TITLE = "Set up the test environment";
export const UPDATE_TITLE = "Bring the test environment in step";

function hostOf(entry: ScannedEntry): string | null {
  return entry.target?.kind === "outside" ? entry.target.host : null;
}

function placedService(scan: Scan, entry: ScannedEntry): boolean {
  const service = scan.services.find((s) => s.name === entry.service);
  return service === undefined || !UNPLACED.includes(service.default);
}

export function outsideHosts(scan: Scan): OutsideHost[] {
  const hosts = [...new Set(scan.entries.filter((e) => placedService(scan, e)).flatMap((e) => hostOf(e) ?? []))].sort();
  return hosts.map((host, i) => ({ id: `H${i + 1}`, host, label: host.split(".")[0], choices: HOST_CHOICES, default: "mock" }));
}

function parsedPairs(text: string): Map<string, string> {
  const pairs = new Map<string, string>();
  for (const part of text.split(",").map((p) => p.trim()).filter((p) => p !== "")) {
    const match = part.match(PAIR);
    if (!match) throw new Refused(`"${part}" is not <id>=<choice>`);
    pairs.set(match[1], match[2]);
  }
  return pairs;
}

function checked(pairs: Map<string, string>, rows: Row[]): void {
  for (const [id, choice] of pairs) {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Refused(`unknown id ${id}; the ids are ${rows.map((r) => r.id).join(", ")}`, { ids: rows.map((r) => r.id) });
    if (!row.choices.includes(choice)) throw new Refused(`${id} takes one of ${row.choices.join(", ")}, not ${choice}`, { choices: [...row.choices] });
  }
}

function chosen<T extends Row>(rows: T[], pairs: Map<string, string>): (T & { choice: T["default"] })[] {
  return rows.map((row) => ({ ...row, choice: (pairs.get(row.id) ?? row.default) as T["default"] }));
}

export function applyDecisions(scan: Scan, text: string): Decided {
  const hosts = outsideHosts(scan);
  const pairs = parsedPairs(text);
  checked(pairs, [...scan.services, ...scan.entries, ...hosts]);
  return { services: chosen(scan.services, pairs), entries: chosen(scan.entries, pairs), hosts: chosen(hosts, pairs) };
}

export function narrowed(decided: Decided, services: ScannedService[], entries: ScannedEntry[]): Decided {
  const keptEntries = decided.entries.filter((e) => entries.some((x) => x.id === e.id));
  const hosts = new Set(keptEntries.flatMap((e) => hostOf(e) ?? []));
  return { services: decided.services.filter((s) => services.some((x) => x.id === s.id)), entries: keptEntries, hosts: decided.hosts.filter((h) => hosts.has(h.host)) };
}

function code(text: string): string {
  return `\`${text.replaceAll("`", "").replace(/[\r\n]+/g, " ")}\``;
}

function sharedVariable(name: string): string {
  return `PICKET_SHARED_${name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function serviceStep(s: DecidedService): string {
  const where = `${code(s.path)} (${s.runtime})`;
  const app = `add the Compose service ${code(s.name)} with role ${code("app")}`;
  if (s.choice === "use") return `${where}: ${app}, built from its Dockerfile ${code(s.dockerfile ?? `${s.path}/Dockerfile`)}.`;
  if (s.choice === "write") {
    const step = PROFILES.find((p) => p.name === s.runtime)?.dockerfileStep ?? "a Dockerfile";
    return `${where}: write ${code(`${ENV_DIR}/docker/${s.name}/Dockerfile`)} as ${step}, and ${app} built from it.`;
  }
  if (s.choice === "user") return `${where}: add an ${code("x-picket.pending")} row for ${code(s.name)} saying its Dockerfile is left to the project; it gets role ${code("app")} once built.`;
  if (s.choice === "shared") return `${where}: add ${code(`x-picket.shared.${s.name}.address`)} naming the variable ${code(sharedVariable(s.name))}; it is never started.`;
  return `${where}: add ${code(s.path)} to ${code("x-picket.ignored")}.`;
}

function targetText(e: DecidedEntry, hosts: DecidedHost[]): string {
  const target = e.target;
  if (target === null) return "its target";
  if (target.kind === "service") return `the Compose service ${code(target.name)}`;
  if (target.kind === "local") return "the Compose service it means (it names this machine now)";
  const host = hosts.find((h) => h.host === target.host);
  return host ? `the service decided for ${code(target.host)} (${host.id})` : code(target.host);
}

function entryStep(e: DecidedEntry, hosts: DecidedHost[]): string {
  const where = e.key === null ? code(e.file) : `${code(e.file)} ${code(e.key)} (now ${code(e.value ?? "")})`;
  const owner = e.service ?? "its service";
  if (e.choice === "env") return `${where}: set the variable ${code(e.variable ?? "")} on ${code(owner)} to ${targetText(e, hosts)}, and add a ${code("wiring")} row with ${code("by: env")}.`;
  if (e.choice === "file") return `${where}: write the replaced file under ${code(`${ENV_DIR}/config/${owner}/`)} pointing at ${targetText(e, hosts)}, and add a ${code("wiring")} row with ${code("by: file")} and ${code("replaced")}.`;
  return `${where}: add a ${code("wiring")} row with ${code("by: keep")}; the value stays as it is.`;
}

function hostStep(h: DecidedHost): string {
  const where = `${code(h.host)} (${h.id})`;
  if (h.choice === "mock") return `${where}: add a ${code("mock")} service ${code(`${h.label}-mock`)}; until Picket's stub server exists, it is a container the project picks, pinned by digest.`;
  if (h.choice === "dependency") return `${where}: add a ${code("dependency")} service ${code(h.label)} on a ready image pinned by digest.`;
  return `${where}: add ${code(`x-picket.shared.${h.label}.address`)} naming the variable ${code(sharedVariable(h.label))}.`;
}

function steps(decided: Decided, mode: RequestMode): string[] {
  const placed = new Set(decided.services.filter((s) => !UNPLACED.includes(s.choice)).map((s) => s.name));
  const known = new Set(decided.services.map((s) => s.name));
  const entries = decided.entries.filter((e) => e.service === null || placed.has(e.service) || !known.has(e.service));
  const first = mode === "setup" ? [`Write ${code(`${ENV_DIR}/${COMPOSE_FILE}`)} with ${code("x-picket.version: 1")} so that it passes rules E1 to E8.`] : [];
  const last = `Run ${code("picket env check")} until it exits 0, then ${code("picket env trial")} until it passes.`;
  const hosts = decided.hosts.filter((h) => entries.some((e) => hostOf(e) === h.host));
  return [...first, ...decided.services.map(serviceStep), ...entries.map((e) => entryStep(e, hosts)), ...hosts.map(hostStep), last];
}

export function requestText(decided: Decided, mode: RequestMode, date: string): string {
  const title = mode === "setup" ? SETUP_TITLE : UPDATE_TITLE;
  const opening = `${title} to the Picket standard (SDR 00004 D-003), as decided with the user on ${date}.`;
  const numbered = steps(decided, mode).map((step, i) => `${i + 1}. ${step}`);
  return [opening, "", "## Steps", "", ...numbered, ""].join("\n");
}
