// The one reader of `.claude/harness.json`, the project's tracked harness config.
//
//   { "security_paths": ["src/auth/"],                       optional; the defaults below otherwise
//     "sources": { "analysis": { "env": "HARNESS_SOURCE_ANALYSIS" } } }
//
// A source is a read-only repository outside the project (requirements, analysis documents). Its
// root differs per machine, so the tracked file names only the env var that holds it; the value is
// set in the `env` block of the untracked `.claude/settings.local.json`. Cheap by design: no git
// process, so the SessionStart hook can call it inside its budget.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** Paths whose change always means the heavy lane. Extend per project with `security_paths`. */
export const DEFAULT_SECURITY_PATHS = ["src/auth/", "src/crypto/", "src/security/", "Authentication/", "Authorization/"];

export const CONFIG_FILE = join(".claude", "harness.json");

/**
 * @typedef {{ name: string, env: string|null, root: string|null, reason: string|null }} Source
 * @returns {{ security_paths: string[], sources: Source[], error: string|null }}
 *   A malformed file keeps the defaults and sets `error`, so preflight can say so instead of the
 *   config silently vanishing.
 */
export function loadConfig(root, env = process.env) {
  const file = join(root, CONFIG_FILE);
  let raw = {};
  let error = null;
  if (existsSync(file)) {
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("top level is not an object");
    } catch (err) {
      raw = {};
      error = `${CONFIG_FILE.replaceAll("\\", "/")} is malformed: ${err.message}`;
    }
  }
  const security_paths = Array.isArray(raw.security_paths) ? raw.security_paths : DEFAULT_SECURITY_PATHS;
  const sources = Object.entries(raw.sources ?? {}).map(([name, decl]) => resolveSource(name, decl, env));
  return { security_paths, sources, error };
}

function resolveSource(name, decl, env) {
  const envName = typeof decl?.env === "string" && decl.env ? decl.env : null;
  if (!envName) return { name, env: null, root: null, reason: `source ${name} declares no env var` };
  const value = env[envName];
  if (!value) return { name, env: envName, root: null, reason: `${envName} is not set (set it in the env block of .claude/settings.local.json)` };
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
