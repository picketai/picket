import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { hostMismatchReport, hostTypeErrors } from "./mods-report.mjs";

const UNIT_TESTS = "src/**/*.test.mts";
const PRODUCT_ROOTS = ["test", "bench/test"];
const TIMING_ROOT = join("test", "timing");
const TEST_FILE = /\.test\.mjs$/;
const PLUGIN_DIR = "dist";
const ENGINE_MODULE = "lib/shared/env/engine.mjs";
const ENV_TESTS = join("test", "env");
const ENGINE_TEST_SUFFIX = ".engine.mjs";

function testFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === TIMING_ROOT ? [] : testFiles(path);
    return TEST_FILE.test(entry.name) ? [path] : [];
  });
}

function run(command, args) {
  return spawnSync(command, args, { stdio: "inherit" }).status ?? 1;
}

function nodeTest(patterns) {
  return run(process.execPath, ["--test", ...patterns]);
}

function claudeVersion() {
  const probe = spawnSync("claude", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (probe.status !== 0) return null;
  return probe.stdout.trim().split(/\s+/)[0] || null;
}

function parsedReport(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function nameHostTypeErrors(version) {
  const validation = spawnSync("claude", ["plugin", "validate", "--strict", "--json", PLUGIN_DIR], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const report = parsedReport(validation.stdout ?? "");
  const errors = report === null ? [] : hostTypeErrors(report, resolve(PLUGIN_DIR));
  if (errors.length > 0) console.log(hostMismatchReport(version, errors));
}

function mods() {
  const version = claudeVersion();
  if (version === null) {
    console.log("mods: skipped, claude not on PATH");
    return 0;
  }
  if (run("claude", ["plugin", "validate", "--strict", PLUGIN_DIR]) !== 0) {
    nameHostTypeErrors(version);
    return 1;
  }
  return run("claude", ["plugin", "test", PLUGIN_DIR]);
}

async function env() {
  const { findEngine, realRunner } = await import(pathToFileURL(resolve(PLUGIN_DIR, ENGINE_MODULE)).href);
  const engine = findEngine(process.env, process.cwd(), realRunner);
  if (engine === null || engine.kind === "other") {
    console.log("env: skipped, no container engine");
    return 0;
  }
  const files = readdirSync(ENV_TESTS).filter((name) => name.endsWith(ENGINE_TEST_SUFFIX));
  return nodeTest(files.map((name) => join(ENV_TESTS, name)).sort());
}

const STEPS = {
  unit: () => nodeTest([UNIT_TESTS]),
  build: () => run(process.execPath, ["scripts/build.mjs"]),
  product: () => nodeTest(PRODUCT_ROOTS.flatMap(testFiles).sort()),
  env,
  timing: () => nodeTest(testFiles(TIMING_ROOT).sort()),
  mods,
};

function unknownSteps(names) {
  return names.filter((name) => !(name in STEPS));
}

const requested = process.argv.slice(2);
const unknown = unknownSteps(requested);
if (unknown.length > 0) {
  console.error(`scripts/test.mjs: unknown step ${unknown.join(", ")}; steps are ${Object.keys(STEPS).join(", ")}`);
  process.exit(1);
}

for (const name of requested.length > 0 ? requested : Object.keys(STEPS)) {
  const started = Date.now();
  const code = await STEPS[name]();
  console.log(`${name}: exit ${code} in ${Date.now() - started} ms`);
  if (code !== 0) process.exit(1);
}
