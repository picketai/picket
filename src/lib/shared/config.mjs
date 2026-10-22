import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { configPath, configRel, hostRel } from "./paths.mjs";
import { assertNotDestructive } from "./destructive.mjs";

/** Paths whose change always means the heavy lane. Extend per project with `security_paths`. */
export const DEFAULT_SECURITY_PATHS = ["src/auth/", "src/crypto/", "src/security/", "Authentication/", "Authorization/"];

export const CONFIG_FILE = configRel();

export const CONFIG_VERSION = 1;

export const KNOWN_KEYS = Object.freeze(["version", "security_paths", "sources", "lanes", "commands", "extensions", "quality"]);

export const DEFAULT_LANES = Object.freeze({
  fast: Object.freeze({ max_files: 3 }),
  order: Object.freeze({ max_phases: 3, max_decisions: 5 }),
  design: Object.freeze({ max_phases: 10, max_decisions: 8 }),
});

export const COMMAND_NAMES = Object.freeze(["test", "lint", "build", "run"]);

export const CONFIG_DEFAULTS = Object.freeze({
  version: CONFIG_VERSION,
  security_paths: DEFAULT_SECURITY_PATHS,
  sources: {},
  lanes: DEFAULT_LANES,
  commands: {},
  extensions: [],
  quality: {},
});

export const QUALITY_FIELDS = Object.freeze({
  coverage_min: { valid: (v) => typeof v === "number" && v >= 0 && v <= 100, rule: "must be a number from 0 to 100" },
  max_warnings: { valid: (v) => Number.isInteger(v) && v >= 0, rule: "must be an integer of 0 or more" },
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRaw(root) {
  const file = configPath(root);
  if (!existsSync(file)) return { raw: {}, error: null };
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (!isPlainObject(raw)) throw new Error("top level is not an object");
    return { raw, error: null };
  } catch (err) {
    return { raw: {}, error: `${CONFIG_FILE} is malformed: ${err.message}` };
  }
}

function checkTopLevel(raw, warn) {
  for (const key of Object.keys(raw)) if (!KNOWN_KEYS.includes(key)) warn(`unknown key "${key}"`);
  if ("version" in raw && raw.version !== CONFIG_VERSION) warn(`version ${JSON.stringify(raw.version)} is not ${CONFIG_VERSION}; reading it as version ${CONFIG_VERSION}`);
}

function checkSecurityPaths(value, warn) {
  if (value === undefined) return DEFAULT_SECURITY_PATHS;
  if (Array.isArray(value) && value.every((p) => typeof p === "string")) return value;
  warn("security_paths must be a list of strings; using the defaults");
  return DEFAULT_SECURITY_PATHS;
}

function checkSourceDeclarations(value, warn) {
  if (value === undefined) return {};
  if (isPlainObject(value)) return value;
  warn("sources must be an object; no sources declared");
  return {};
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function checkLane(lane, value, warn) {
  const defaults = DEFAULT_LANES[lane];
  if (value === undefined) return { ...defaults };
  if (!isPlainObject(value)) {
    warn(`lanes.${lane} must be an object; using its defaults`);
    return { ...defaults };
  }
  for (const field of Object.keys(value)) if (!(field in defaults)) warn(`unknown key "lanes.${lane}.${field}"`);
  const caps = {};
  for (const [field, fallback] of Object.entries(defaults)) {
    const configured = value[field];
    if (configured !== undefined && !isPositiveInteger(configured)) warn(`lanes.${lane}.${field} must be a positive integer; using ${fallback}`);
    caps[field] = isPositiveInteger(configured) ? configured : fallback;
  }
  return caps;
}

function checkLanes(value, warn) {
  if (value !== undefined && !isPlainObject(value)) {
    warn("lanes must be an object; using the default caps");
    value = undefined;
  }
  for (const lane of Object.keys(value ?? {})) if (!(lane in DEFAULT_LANES)) warn(`unknown lane "lanes.${lane}"`);
  return Object.fromEntries(Object.keys(DEFAULT_LANES).map((lane) => [lane, checkLane(lane, value?.[lane], warn)]));
}

function destructiveReason(command) {
  try {
    assertNotDestructive(command, "a configured command");
    return null;
  } catch (err) {
    return err.message;
  }
}

function checkCommands(value, warn) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    warn("commands must be an object; detection stands");
    return {};
  }
  const commands = {};
  for (const [name, command] of Object.entries(value)) {
    const problem = commandProblem(name, command);
    if (problem) warn(problem);
    else commands[name] = command;
  }
  return commands;
}

function checkExtensions(value, warn) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    warn("extensions must be a list of extension names; no extensions enabled");
    return [];
  }
  const names = value.filter((name) => typeof name === "string" && name);
  if (names.length !== value.length) warn("extensions holds an entry that is not a name; it is dropped");
  return names;
}

function checkQuality(value, warn) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    warn("quality must be an object; no quality bar set");
    return {};
  }
  const bar = {};
  for (const [field, configured] of Object.entries(value)) {
    const known = QUALITY_FIELDS[field];
    if (!known) warn(`unknown key "quality.${field}"`);
    else if (!known.valid(configured)) warn(`quality.${field} ${known.rule}; it is dropped`);
    else bar[field] = configured;
  }
  return bar;
}

function commandProblem(name, command) {
  if (!COMMAND_NAMES.includes(name)) return `unknown key "commands.${name}"`;
  if (typeof command !== "string" || !command.trim()) return `commands.${name} must be a non-empty string; detection stands`;
  const destructive = destructiveReason(command);
  return destructive ? `commands.${name} dropped: ${destructive}` : null;
}

/**
 * @typedef {{ name: string, env: string|null, root: string|null, reason: string|null }} Source
 */
export function loadConfig(root, env = process.env) {
  const { raw, error } = readRaw(root);
  const warnings = [];
  const warn = (text) => warnings.push(text);
  checkTopLevel(raw, warn);
  const security_paths = checkSecurityPaths(raw.security_paths, warn);
  const sources = Object.entries(checkSourceDeclarations(raw.sources, warn)).map(([name, decl]) => resolveSource(name, decl, env));
  const lanes = checkLanes(raw.lanes, warn);
  const commands = checkCommands(raw.commands, warn);
  const extensions = checkExtensions(raw.extensions, warn);
  const quality = checkQuality(raw.quality, warn);
  return { version: CONFIG_VERSION, security_paths, sources, lanes, commands, extensions, quality, error, warnings };
}

function resolveSource(name, decl, env) {
  const envName = typeof decl?.env === "string" && decl.env ? decl.env : null;
  if (!envName) return { name, env: null, root: null, reason: `source ${name} declares no env var` };
  const value = env[envName];
  if (!value) return { name, env: envName, root: null, reason: `${envName} is not set (set it in the env block of ${hostRel("settings.local.json")})` };
  const root = resolve(value);
  if (!isDirectory(root)) return { name, env: envName, root: null, reason: `${envName} points at ${root}, which is not a directory` };
  return { name, env: envName, root, reason: null };
}

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** The project's security path prefixes: the config's `security_paths`, else the defaults. */
export function securityPaths(root) {
  return loadConfig(root).security_paths;
}
