import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { configFormat, masked, readConfigFile, type ConfigEntry } from "./config-entries.mts";
import { HOST_DIR, PICKET_DIR, WORK_DIR } from "../paths.mts";
import { profileFor, upperSnake, type RuntimeProfile } from "./profiles.mts";

export type ServiceChoice = "use" | "write" | "user" | "shared" | "ignore";
export type EntryChoice = "env" | "file" | "keep";
export type EntryTarget = { kind: "service"; name: string } | { kind: "local" } | { kind: "outside"; host: string } | null;

export type ScannedService = { id: string; path: string; name: string; runtime: string; linux: boolean; dockerfile: string | null; choices: ServiceChoice[]; default: ServiceChoice };
export type ScannedEntry = { id: string; service: string | null; file: string; key: string | null; value: string | null; target: EntryTarget; choices: EntryChoice[]; default: EntryChoice; variable: string | null };
export type Scan = { fingerprint: string; services: ScannedService[]; entries: ScannedEntry[] };

type Folder = { path: string; files: string[] };
type Candidate = { path: string; profile: RuntimeProfile; service: boolean; dockerfile: string | null };

const SKIPPED = new Set([".git", "node_modules", ".worktrees", "bin", "obj", "dist", "build", "out", "target", "vendor", PICKET_DIR, WORK_DIR, HOST_DIR]);
const DOCKERFILE = "Dockerfile";
const MAX_CONFIG_BYTES = 1024 * 1024;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const ENTRY_CHOICES: EntryChoice[] = ["env", "file", "keep"];
const PAIR_HOST = /(?:^|[;( ])\s*(?:server|data source|host|hostname|address|addr|network address|endpoint|accountendpoint|contact points)\s*=\s*([^;)\s]+)/i;

function folders(root: string, rel = ""): Folder[] {
  const entries = readdirSync(join(root, rel), { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const children = entries
    .filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) => folders(root, rel === "" ? name : `${rel}/${name}`));
  return [{ path: rel, files }, ...children];
}

function within(path: string, folder: string): boolean {
  return folder === "" || path === folder || path.startsWith(`${folder}/`);
}

function candidateIn(root: string, folder: Folder): Candidate | null {
  const read = (name: string) => readFileSync(join(root, folder.path, name), "utf8");
  const match = profileFor(folder.files, read);
  if (!match) return null;
  const dockerfile = folder.files.includes(DOCKERFILE) ? (folder.path === "" ? DOCKERFILE : `${folder.path}/${DOCKERFILE}`) : null;
  return { path: folder.path, profile: match.profile, service: match.profile.isService(read(match.marker)), dockerfile };
}

function folded(candidates: Candidate[]): Candidate[] {
  return candidates.filter((c) => !candidates.some((outer) => outer !== c && outer.profile === c.profile && within(c.path, outer.path)));
}

function serviceChoices(c: Candidate): ServiceChoice[] {
  const built: ServiceChoice[] = [...(c.dockerfile ? (["use"] as const) : []), ...(c.profile.dockerfileStep ? (["write"] as const) : [])];
  return [...built, "user", "shared", "ignore"];
}

function serviceDefault(c: Candidate, choices: ServiceChoice[]): ServiceChoice {
  if (!c.service) return "ignore";
  if (!c.profile.linux) return "shared";
  return choices[0];
}

function toService(c: Candidate, index: number): ScannedService {
  const choices = serviceChoices(c);
  const name = c.path === "" ? "root" : basename(c.path);
  return { id: `S${index + 1}`, path: c.path, name, runtime: c.profile.name, linux: c.profile.linux, dockerfile: c.dockerfile, choices, default: serviceDefault(c, choices) };
}

function configEntries(root: string, all: Folder[]): ConfigEntry[] {
  return all.flatMap((folder) =>
    folder.files.flatMap((name) => {
      const path = folder.path === "" ? name : `${folder.path}/${name}`;
      const abs = join(root, path);
      if (configFormat(name) === null || statSync(abs).size > MAX_CONFIG_BYTES) return [];
      return readConfigFile(path, readFileSync(abs, "utf8"));
    }),
  );
}

function hostOf(value: string): string | null {
  const url = value.match(/[a-z][a-z0-9+.-]*:\/\/(?:[^@/\s]*@)?(\[[^\]]+\]|[^:/;?\s,]+)/i);
  if (url) return url[1];
  const pair = value.match(PAIR_HOST);
  if (pair) return pair[1].replace(/^tcp:/i, "").split(/[,:\\]/)[0];
  const hostPort = value.trim().match(/^([^\s:/]+):\d{1,5}$/);
  return hostPort ? hostPort[1] : null;
}

function comparable(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, "");
}

function targetOf(value: string | null, services: ScannedService[]): EntryTarget {
  const host = value === null ? null : hostOf(value);
  if (host === null) return null;
  const service = services.find((s) => comparable(s.name) === comparable(host));
  if (service) return { kind: "service", name: service.name };
  if (LOCAL_HOSTS.has(host.toLowerCase())) return { kind: "local" };
  return { kind: "outside", host };
}

function owner(file: string, services: ScannedService[], candidates: Candidate[]): { service: ScannedService; profile: RuntimeProfile } | null {
  const owners = services.map((service, i) => ({ service, profile: candidates[i].profile })).filter(({ service }) => within(file, service.path));
  return owners.sort((a, b) => b.service.path.length - a.service.path.length)[0] ?? null;
}

function variableFor(entry: ConfigEntry, profile: RuntimeProfile | null): string | null {
  if (entry.key === null) return null;
  if (entry.format === "dotenv") return entry.key;
  return profile ? profile.variableFor(entry.key) : upperSnake(entry.key);
}

function toEntry(entry: ConfigEntry, index: number, services: ScannedService[], candidates: Candidate[]): ScannedEntry {
  const own = owner(entry.file, services, candidates);
  return {
    id: `C${index + 1}`,
    service: own?.service.name ?? null,
    file: entry.file,
    key: entry.key,
    value: masked(entry.key, entry.value),
    target: targetOf(entry.value, services),
    choices: ENTRY_CHOICES,
    default: entry.format === "xml" ? "file" : "env",
    variable: variableFor(entry, own?.profile ?? null),
  };
}

function ordinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function byFileThenKey(a: ConfigEntry, b: ConfigEntry): number {
  return ordinal(a.file, b.file) || ordinal(a.key ?? "", b.key ?? "");
}

function fingerprintOf(services: ScannedService[], entries: ScannedEntry[]): string {
  return createHash("sha256").update(JSON.stringify({ services, entries })).digest("hex");
}

export function scanUmbrella(root: string): Scan {
  const all = folders(root);
  const candidates = folded(all.map((folder) => candidateIn(root, folder)).filter((c): c is Candidate => c !== null)).sort((a, b) => ordinal(a.path, b.path));
  const services = candidates.map(toService);
  const listed = configEntries(root, all)
    .filter((entry) => entry.format === "unread" || entry.address)
    .sort(byFileThenKey);
  const entries = listed.map((entry, i) => toEntry(entry, i, services, candidates));
  return { fingerprint: fingerprintOf(services, entries), services, entries };
}
