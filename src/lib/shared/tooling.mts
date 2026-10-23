import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readText } from "../util/io.mts";
import { loadConfig } from "./config.mjs";

export type Stack = "node" | "dotnet" | "python";
export type Tooling = { test: string | null; lint: string | null; build: string | null; run: string | null; stack: Stack | null };

type Scripts = Record<string, unknown>;

const NO_TOOLING: Tooling = { test: null, lint: null, build: null, run: null, stack: null };
const SOLUTION_FILE = /\.slnx?$/i;
const DOTNET_MARKERS = ["Directory.Build.props", "global.json"];
const PYTHON_MARKERS = ["pyproject.toml", "pytest.ini"];
const NPM_PLACEHOLDER_TEST = /no test specified/;

export function detectTooling(root: string): { tooling: Tooling; warnings: string[] } {
  const warnings: string[] = [];
  const scripts = npmScripts(root, warnings);
  const detected = scripts ? nodeTooling(scripts) : dotnetTooling(root) ?? pythonTooling(root) ?? NO_TOOLING;
  return { tooling: { ...detected, ...loadConfig(root).commands }, warnings };
}

function npmScripts(root: string, warnings: string[]): Scripts | null {
  let text: string | null;
  try {
    text = readText(join(root, "package.json"));
  } catch (err) {
    warnings.push(`package.json cannot be read (${(err as Error).message}); no npm scripts detected`);
    return {};
  }
  if (text === null) return null;
  let pkg: unknown;
  try {
    pkg = JSON.parse(text);
  } catch (err) {
    warnings.push(`package.json is not valid JSON (${(err as Error).message}); no npm scripts detected`);
    return {};
  }
  if (!isObject(pkg)) {
    warnings.push("package.json is not a JSON object; no npm scripts detected");
    return {};
  }
  return isObject(pkg.scripts) ? pkg.scripts : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeTooling(scripts: Scripts): Tooling {
  const has = (name: string) => typeof scripts[name] === "string" && scripts[name] !== "";
  return {
    test: has("test") && !NPM_PLACEHOLDER_TEST.test(scripts.test as string) ? "npm test" : null,
    lint: has("lint") ? "npm run lint" : null,
    build: has("build") ? "npm run build" : null,
    run: has("start") ? "npm start" : null,
    stack: "node",
  };
}

function dotnetTooling(root: string): Tooling | null {
  const hasSolution = existsSync(root) && readdirSync(root).some((name) => SOLUTION_FILE.test(name));
  if (!hasSolution && !anyExists(root, DOTNET_MARKERS)) return null;
  return { ...NO_TOOLING, test: "dotnet test", build: "dotnet build", stack: "dotnet" };
}

function pythonTooling(root: string): Tooling | null {
  return anyExists(root, PYTHON_MARKERS) ? { ...NO_TOOLING, test: "pytest", stack: "python" } : null;
}

function anyExists(root: string, names: string[]): boolean {
  return names.some((name) => existsSync(join(root, name)));
}
