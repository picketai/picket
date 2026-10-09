import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { loadConfig } from "./config.mjs";
import { TETHER_DIR, configPath } from "./paths.mjs";
import { VERDICTS } from "./route.mjs";

export const SUPPORTED_SCHEMAS = Object.freeze([1]);
export const MANIFEST_FILE = "extension.json";
export const MANIFEST_KEYS = Object.freeze(["name", "version", "schema", "description", "rules", "agents", "review_steps", "preflight"]);
export const AGENT_ROLES = Object.freeze(["lead", "analyst", "architect", "developer", "reviewer"]);
export const REVIEW_SIZES = Object.freeze(["small", "medium", "large"]);
export const PREFLIGHT_KINDS = Object.freeze(["path_exists", "env_set", "command_on_path"]);
export const PREFLIGHT_LEVELS = Object.freeze(["warn", "fail"]);

const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const VERDICT_LINES = new Set(Object.keys(VERDICTS));
const PREFLIGHT_KEYS = ["id", "kind", "value", "level", "message"];

class Refusal extends Error {}

function refuse(reason) {
  throw new Refusal(reason);
}

export function extensionsDir(root) {
  return join(root, TETHER_DIR, "extensions");
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function inside(child, parent) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function posix(path) {
  return path.split(sep).join("/");
}

function readManifest(dir) {
  const file = join(dir, MANIFEST_FILE);
  if (!existsSync(file)) refuse(`no ${MANIFEST_FILE} in its folder`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return refuse(`${MANIFEST_FILE} is not valid JSON: ${err.message}`);
  }
}

function checkHeader(manifest, name) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) refuse(`${MANIFEST_FILE} is not an object`);
  const unknown = Object.keys(manifest).filter((key) => !MANIFEST_KEYS.includes(key));
  if (unknown.length) refuse(`unknown key "${unknown[0]}"`);
  if (typeof manifest.name !== "string" || !NAME.test(manifest.name)) refuse(`name must match ${NAME.source}`);
  if (manifest.name !== name) refuse(`name "${manifest.name}" differs from its folder "${name}"`);
  if (typeof manifest.version !== "string" || !SEMVER.test(manifest.version)) refuse(`version ${JSON.stringify(manifest.version)} is not a SemVer string`);
  if (!SUPPORTED_SCHEMAS.includes(manifest.schema)) refuse(`schema ${JSON.stringify(manifest.schema)} is not supported by this Tether (supports ${SUPPORTED_SCHEMAS.join(", ")})`);
  if (manifest.description !== undefined && typeof manifest.description !== "string") refuse("description must be a string");
}

function confinedFile(root, dir, listed) {
  if (typeof listed !== "string" || !listed) refuse("a listed path is not a non-empty string");
  if (isAbsolute(listed)) refuse(`path ${listed} is absolute`);
  const target = resolve(dir, listed);
  if (!inside(target, dir)) refuse(`path ${listed} leaves the extension folder`);
  if (!existsSync(target)) refuse(`path ${listed} does not exist`);
  if (isDirectory(target)) refuse(`path ${listed} is a folder, not a file`);
  if (!inside(realpathSync(target), realpathSync(dir))) refuse(`path ${listed} resolves outside the extension folder`);
  return { file: target, path: posix(relative(root, target)) };
}

function readText(root, dir, listed) {
  const { file, path } = confinedFile(root, dir, listed);
  const text = readFileSync(file, "utf8");
  const verdict = text.split(/\r?\n/).find((line) => VERDICT_LINES.has(line.trim()));
  if (verdict !== undefined) refuse(`${listed} holds a verdict line "${verdict.trim()}"`);
  return { path, text };
}

function list(value, key) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) refuse(`${key} must be a list`);
  return value;
}

function loadAgents(root, dir, value) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) refuse("agents must be an object keyed by role");
  const agents = {};
  for (const [role, files] of Object.entries(value)) {
    if (!AGENT_ROLES.includes(role)) refuse(`agents.${role} is not one of ${AGENT_ROLES.join(", ")}`);
    agents[role] = list(files, `agents.${role}`).map((listed) => readText(root, dir, listed));
  }
  return agents;
}

function loadReviewStep(root, dir, step) {
  if (!step || typeof step !== "object") refuse("a review step must be { path, min_size }");
  if (!REVIEW_SIZES.includes(step.min_size)) refuse(`review step ${step.path} has min_size ${JSON.stringify(step.min_size)}, not one of ${REVIEW_SIZES.join(", ")}`);
  return { path: readText(root, dir, step.path).path, min_size: step.min_size };
}

function checkPreflight(root, check) {
  if (!check || typeof check !== "object") refuse("a preflight check must be an object");
  const unknown = Object.keys(check).filter((key) => !PREFLIGHT_KEYS.includes(key));
  if (unknown.length) refuse(`preflight check has unknown key "${unknown[0]}"`);
  if (typeof check.id !== "string" || !NAME.test(check.id)) refuse(`preflight id must match ${NAME.source}`);
  if (!PREFLIGHT_KINDS.includes(check.kind)) refuse(`preflight ${check.id} kind ${JSON.stringify(check.kind)} is not one of ${PREFLIGHT_KINDS.join(", ")}`);
  if (typeof check.value !== "string" || !check.value) refuse(`preflight ${check.id} needs a non-empty value`);
  if (!PREFLIGHT_LEVELS.includes(check.level)) refuse(`preflight ${check.id} level must be warn or fail`);
  if (typeof check.message !== "string" || !check.message) refuse(`preflight ${check.id} needs a message`);
  if (check.kind === "path_exists" && (isAbsolute(check.value) || /^\.\.(?:[\\/]|$)/.test(relative(root, resolve(root, check.value))))) refuse(`preflight ${check.id} path ${check.value} leaves the project`);
  return { id: check.id, kind: check.kind, value: check.value, level: check.level, message: check.message };
}

function loadOne(root, name) {
  const dir = join(extensionsDir(root), name);
  if (!NAME.test(name)) refuse(`name must match ${NAME.source}`);
  if (!isDirectory(dir)) refuse("no folder under the extensions directory");
  const manifest = readManifest(dir);
  checkHeader(manifest, name);
  return {
    name,
    version: manifest.version,
    schema: manifest.schema,
    dir,
    rules: list(manifest.rules, "rules").map((listed) => readText(root, dir, listed)),
    agents: loadAgents(root, dir, manifest.agents),
    review_steps: list(manifest.review_steps, "review_steps").map((step) => loadReviewStep(root, dir, step)),
    preflight: list(manifest.preflight, "preflight").map((check) => checkPreflight(root, check)),
  };
}

function folderNames(root) {
  const dir = extensionsDir(root);
  if (!isDirectory(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export function loadExtensions(root) {
  const names = loadConfig(root).extensions;
  const enabled = [];
  const refused = [];
  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) {
      refused.push({ name, reason: "listed twice in extensions" });
      continue;
    }
    seen.add(name);
    try {
      enabled.push(loadOne(root, name));
    } catch (err) {
      if (!(err instanceof Refusal)) throw err;
      refused.push({ name, reason: err.message });
    }
  }
  const unlisted = folderNames(root).filter((name) => !seen.has(name));
  return { enabled, refused, unlisted };
}

const SCAFFOLD_VERSION = "0.1.0";

function readRawConfig(root) {
  const file = configPath(root);
  if (!existsSync(file)) return { version: 1 };
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}); fix it before adding an extension`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${file} is not a JSON object; fix it before adding an extension`);
  return raw;
}

export function scaffoldExtension(root, name) {
  if (typeof name !== "string" || !NAME.test(name)) throw new Error(`extension name "${name ?? ""}" must match ${NAME.source}`);
  const dir = join(extensionsDir(root), name);
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  const config = readRawConfig(root);
  const listed = Array.isArray(config.extensions) ? config.extensions : [];
  if (listed.includes(name)) throw new Error(`${name} is already listed in extensions`);
  mkdirSync(dir, { recursive: true });
  const manifest = { name, version: SCAFFOLD_VERSION, schema: SUPPORTED_SCHEMAS.at(-1), rules: [] };
  writeFileSync(join(dir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  config.extensions = [...listed, name];
  writeFileSync(configPath(root), `${JSON.stringify(config, null, 2)}\n`);
  return { name, dir, manifest: join(dir, MANIFEST_FILE), extensions: config.extensions };
}

export function describeExtensions(report) {
  return {
    enabled: report.enabled.map((e) => ({
      name: e.name,
      version: e.version,
      schema: e.schema,
      rules: e.rules.map((f) => f.path),
      agents: Object.fromEntries(Object.entries(e.agents).map(([role, files]) => [role, files.map((f) => f.path)])),
      review_steps: e.review_steps,
      preflight: e.preflight.map((c) => c.id),
    })),
    refused: report.refused,
    unlisted: report.unlisted,
  };
}

export function renderExtensions(summary) {
  const lines = [];
  for (const e of summary.enabled) lines.push(`enabled  ${e.name} ${e.version} (schema ${e.schema}) · rules ${e.rules.length} · agents ${Object.keys(e.agents).join(",") || "-"} · review steps ${e.review_steps.length} · preflight ${e.preflight.length}`);
  for (const r of summary.refused) lines.push(`refused  ${r.name}: ${r.reason}`);
  for (const name of summary.unlisted) lines.push(`unlisted ${name} (folder present, not in extensions)`);
  return lines.length ? lines.join("\n") : "no extensions";
}
