import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const HOST_DIR = ".claude";
export const PICKET_DIR = ".picket";
export const WORK_DIR = "work";

const STATE_REL = `${PICKET_DIR}/state`;
const CONFIG_REL = `${PICKET_DIR}/config.json`;
const PLUGIN_MANIFEST = [".claude-plugin", "plugin.json"] as const;
const USER_CONFIG_REL = ".picketai/config.json";

export const STATE_FILES = Object.freeze({
  ledger: "ledger.jsonl",
  driveLog: "drive-log.jsonl",
  guardLog: "guard.log",
  branchingManifest: "branching.yaml",
  sessions: "sessions",
  mutationRestore: "mutation-restore.json",
});

const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const MODEL_WRITABLE_STATE_FILES = Object.freeze([STATE_FILES.branchingManifest]);

export const LEGACY = Object.freeze({
  stateDir: `${HOST_DIR}/ledger`,
  guardLog: "guard-bash.log",
  branchingDir: `${HOST_DIR}/branching`,
  branchingManifest: `${HOST_DIR}/branching/manifest.yaml`,
  config: `${HOST_DIR}/harness.json`,
});

export const LEGACY_LOCATIONS = Object.freeze([LEGACY.stateDir, LEGACY.branchingManifest, LEGACY.config]);

export const BOOKKEEPING_PREFIXES = Object.freeze([`${WORK_DIR}/`, `${HOST_DIR}/`, `${PICKET_DIR}/`]);

const ROOT_MARKERS = [PICKET_DIR, HOST_DIR];

export type RepoPath = { root: string; abs: string; rel: string; outside: boolean };

function posixJoin(...segments: string[]): string {
  return segments.filter((s) => s !== "").join("/");
}

function underRoot(root: string, rel: string): string {
  return join(root, ...rel.split("/"));
}

function isMarkedRoot(dir: string): boolean {
  return ROOT_MARKERS.some((marker) => existsSync(join(dir, marker)));
}

export function projectRoot(from: string = process.cwd()): string {
  if (process.env.CLAUDE_PROJECT_DIR) return resolve(process.env.CLAUDE_PROJECT_DIR);
  const start = resolve(from);
  for (let dir = start; ; dir = dirname(dir)) {
    if (isMarkedRoot(dir)) return dir;
    if (dirname(dir) === dir) return start;
  }
}

export function workspaceRoot(dir: string | null, fallback: string): string {
  return dir === null ? fallback : projectRoot(dir);
}

export function userConfigPath(home: string): string {
  return join(home, USER_CONFIG_REL);
}

function insideRootIgnoringCase(abs: string, root: string): boolean {
  const a = abs.replaceAll("\\", "/").toLowerCase();
  const r = root.replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
  return a.startsWith(r + "/");
}

export function repoRelative(event: { cwd?: string } | null | undefined, filePath: string, root: string = projectRoot(event?.cwd)): RepoPath {
  const base = event?.cwd ?? root;
  const abs = resolve(base, filePath);
  let rel = relative(root, abs);
  if (isAbsolute(rel) && process.platform === "win32" && insideRootIgnoringCase(abs, root)) {
    rel = abs.slice(root.length).replace(/^[\\/]/, "");
  }
  rel = rel.replaceAll("\\", "/").replace(/^\.\//, "");
  const outside = rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel);
  return { root, abs, rel, outside };
}

export function stateRel(name: string): string {
  return posixJoin(STATE_REL, name);
}

export function stateDir(root: string): string {
  return underRoot(root, STATE_REL);
}

export function statePath(root: string, name: string): string {
  return join(stateDir(root), name);
}

export function sessionCostPath(root: string, session: unknown): string | null {
  if (typeof session !== "string" || !SESSION_ID.test(session)) return null;
  return join(statePath(root, STATE_FILES.sessions), `${session}.json`);
}

export function configRel(): string {
  return CONFIG_REL;
}

export function configPath(root: string): string {
  return underRoot(root, CONFIG_REL);
}

export function branchingManifestPath(root: string): string {
  return statePath(root, STATE_FILES.branchingManifest);
}

export function legacyPath(root: string, rel: string): string {
  return underRoot(root, rel);
}

export function hostRel(...segments: string[]): string {
  return posixJoin(HOST_DIR, ...segments);
}

export function hostPath(root: string, ...segments: string[]): string {
  return join(root, HOST_DIR, ...segments);
}

export function workRoot(root: string = projectRoot()): string {
  return join(root, WORK_DIR);
}

function holdsPluginManifest(dir: string): boolean {
  return existsSync(join(dir, ...PLUGIN_MANIFEST));
}

export function pluginRoot(from: string = import.meta.dirname): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (holdsPluginManifest(dir)) return dir;
    if (dirname(dir) === dir) throw new Error(`no ${PLUGIN_MANIFEST.join("/")} at or above ${from}`);
  }
}

export function pluginManifestPath(): string {
  return join(pluginRoot(), ...PLUGIN_MANIFEST);
}

export function rulesDir(): string {
  return join(pluginRoot(), "rules");
}
