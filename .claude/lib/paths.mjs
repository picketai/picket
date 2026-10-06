import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const HOST_DIR = ".claude";
export const TETHER_DIR = ".tether";
export const WORK_DIR = "work";

const STATE_REL = `${TETHER_DIR}/state`;
const CONFIG_REL = `${TETHER_DIR}/config.json`;

export const STATE_FILES = Object.freeze({
  ledger: "ledger.jsonl",
  driveLog: "drive-log.jsonl",
  guardLog: "guard.log",
  branchingManifest: "branching.yaml",
});

export const MODEL_WRITABLE_STATE_FILES = Object.freeze([STATE_FILES.branchingManifest]);

export const LEGACY = Object.freeze({
  stateDir: `${HOST_DIR}/ledger`,
  guardLog: "guard-bash.log",
  branchingDir: `${HOST_DIR}/branching`,
  branchingManifest: `${HOST_DIR}/branching/manifest.yaml`,
  config: `${HOST_DIR}/harness.json`,
});

export const LEGACY_LOCATIONS = Object.freeze([LEGACY.stateDir, LEGACY.branchingManifest, LEGACY.config]);

export const BOOKKEEPING_PREFIXES = Object.freeze([`${WORK_DIR}/`, `${HOST_DIR}/`, `${TETHER_DIR}/`]);

const ROOT_MARKERS = [TETHER_DIR, HOST_DIR];

function posixJoin(...segments) {
  return segments.filter((s) => s !== "").join("/");
}

function underRoot(root, rel) {
  return join(root, ...rel.split("/"));
}

function isMarkedRoot(dir) {
  return ROOT_MARKERS.some((marker) => existsSync(join(dir, marker)));
}

export function projectRoot(from = process.cwd()) {
  if (process.env.CLAUDE_PROJECT_DIR) return resolve(process.env.CLAUDE_PROJECT_DIR);
  const start = resolve(from);
  for (let dir = start; ; dir = dirname(dir)) {
    if (isMarkedRoot(dir)) return dir;
    if (dirname(dir) === dir) return start;
  }
}

function insideRootIgnoringCase(abs, root) {
  const a = abs.replaceAll("\\", "/").toLowerCase();
  const r = root.replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
  return a.startsWith(r + "/");
}

export function repoRelative(event, filePath) {
  const root = projectRoot(event?.cwd);
  const base = event?.cwd ?? root;
  const abs = isAbsolute(filePath) ? filePath : resolve(base, filePath);
  let rel = relative(root, abs);
  if (isAbsolute(rel) && process.platform === "win32" && insideRootIgnoringCase(abs, root)) {
    rel = abs.slice(root.length).replace(/^[\\/]/, "");
  }
  rel = rel.replaceAll("\\", "/").replace(/^\.\//, "");
  const outside = rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel);
  return { root, abs, rel, outside };
}

export function stateRel(name) {
  return posixJoin(STATE_REL, name);
}

export function stateDir(root) {
  return underRoot(root, STATE_REL);
}

export function statePath(root, name) {
  return join(stateDir(root), name);
}

export function configRel() {
  return CONFIG_REL;
}

export function configPath(root) {
  return underRoot(root, CONFIG_REL);
}

export function branchingManifestPath(root) {
  return statePath(root, STATE_FILES.branchingManifest);
}

export function legacyPath(root, rel) {
  return underRoot(root, rel);
}

export function hostRel(...segments) {
  return posixJoin(HOST_DIR, ...segments);
}

export function hostPath(root, ...segments) {
  return join(root, HOST_DIR, ...segments);
}

export function workRoot(root = projectRoot()) {
  return join(root, WORK_DIR);
}
