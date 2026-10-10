import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_VERSION } from "./config.mjs";
import { LEGACY, STATE_FILES, configPath, configRel, legacyPath, statePath, stateRel } from "./paths.mjs";

const APPENDABLE = /\.(jsonl|log)$/;
const REPLACEABLE = /^check-.*\.log$|\.review\.md$/;

function stateName(legacyName) {
  return legacyName === LEGACY.guardLog ? STATE_FILES.guardLog : legacyName;
}

function isNewer(path, than) {
  return statSync(path).mtimeMs > statSync(than).mtimeMs;
}

function stateFileAction(root, name) {
  const from = `${LEGACY.stateDir}/${name}`;
  const fromPath = legacyPath(root, from);
  const target = stateName(name);
  const to = stateRel(target);
  const toPath = statePath(root, target);
  const move = (how) => ({ how, from, to, fromPath, toPath });
  if (!statSync(fromPath).isFile()) return { skip: { from, reason: "not a file" } };
  if (!existsSync(toPath)) return move("renamed");
  if (REPLACEABLE.test(name)) return isNewer(fromPath, toPath) ? move("renamed") : move("dropped");
  if (APPENDABLE.test(name)) return move("appended");
  return { skip: { from, reason: `${to} exists` } };
}

function manifestAction(root) {
  const from = LEGACY.branchingManifest;
  const fromPath = legacyPath(root, from);
  if (!existsSync(fromPath)) return null;
  const to = stateRel(STATE_FILES.branchingManifest);
  const toPath = statePath(root, STATE_FILES.branchingManifest);
  if (existsSync(toPath)) return { skip: { from, reason: `${to} exists; keeping it` } };
  return { how: "renamed", from, to, fromPath, toPath };
}

function readLegacyConfig(path) {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function configAction(root) {
  const from = LEGACY.config;
  const fromPath = legacyPath(root, from);
  if (!existsSync(fromPath)) return null;
  const to = configRel();
  const toPath = configPath(root);
  if (existsSync(toPath)) return { skip: { from, reason: `${to} exists; keeping both, merge ${from} by hand` } };
  const legacy = readLegacyConfig(fromPath);
  if (!legacy) return { skip: { from, reason: "not a JSON object; fix it, then run picket migrate again" } };
  return { how: "converted", from, to, fromPath, toPath, config: { version: CONFIG_VERSION, ...legacy } };
}

function legacyEntries(root, dirRel) {
  const dir = legacyPath(root, dirRel);
  return existsSync(dir) ? readdirSync(dir) : null;
}

function planStateFolder(root) {
  const entries = legacyEntries(root, LEGACY.stateDir);
  if (!entries) return { actions: [], emptied: [] };
  const actions = entries.map((name) => stateFileAction(root, name));
  return { actions, emptied: actions.every((a) => !a.skip) ? [LEGACY.stateDir] : [] };
}

function planBranchingFolder(root) {
  const entries = legacyEntries(root, LEGACY.branchingDir);
  if (!entries) return { actions: [], emptied: [] };
  const manifest = manifestAction(root);
  const actions = manifest ? [manifest] : [];
  const nothingElseInside = entries.length === actions.filter((a) => !a.skip).length;
  return { actions, emptied: nothingElseInside ? [LEGACY.branchingDir] : [] };
}

function plan(root) {
  const state = planStateFolder(root);
  const branching = planBranchingFolder(root);
  const config = configAction(root);
  return { actions: [...state.actions, ...branching.actions, ...(config ? [config] : [])], emptied: [...state.emptied, ...branching.emptied] };
}

function writeConfig(toPath, config) {
  writeFileSync(toPath, JSON.stringify(config, null, 2) + "\n");
}

function appendLegacyRows(fromPath, toPath) {
  const live = readFileSync(toPath, "utf8");
  const separator = live.length && !live.endsWith("\n") ? "\n" : "";
  appendFileSync(toPath, separator + readFileSync(fromPath, "utf8"));
  unlinkSync(fromPath);
}

function apply({ how, fromPath, toPath, config }) {
  mkdirSync(dirname(toPath), { recursive: true });
  if (how === "renamed") renameSync(fromPath, toPath);
  else if (how === "appended") appendLegacyRows(fromPath, toPath);
  else if (how === "converted") {
    writeConfig(toPath, config);
    unlinkSync(fromPath);
  } else unlinkSync(fromPath);
}

export function migrate(root, { dryRun = false } = {}) {
  const { actions, emptied } = plan(root);
  const moves = actions.filter((a) => !a.skip);
  if (!dryRun) {
    for (const move of moves) apply(move);
    for (const dir of emptied) rmdirSync(legacyPath(root, dir));
  }
  return {
    dryRun,
    moved: moves.map(({ from, to, how }) => ({ from, to, how })),
    skipped: actions.filter((a) => a.skip).map((a) => a.skip),
    removed: emptied,
  };
}

export function renderMigrate(result) {
  const lines = [
    ...result.moved.map((m) => `${m.how} ${m.from} -> ${m.to}`),
    ...result.skipped.map((s) => `skipped ${s.from}: ${s.reason}`),
    ...result.removed.map((dir) => `removed ${dir}/`),
  ];
  if (!lines.length) return "nothing to migrate";
  return (result.dryRun ? lines.map((l) => `dry run: ${l}`) : lines).join("\n");
}
