import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const UNIT_TESTS = "src/**/*.test.mts";
const PRODUCT_ROOTS = ["test", "bench/test"];
const TIMING_ROOT = join("test", "timing");
const TEST_FILE = /\.test\.mjs$/;
const MODS = ["status", "session", "markdown"];

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

function claudeOnPath() {
  return spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
}

function mods() {
  if (!claudeOnPath()) {
    console.log("mods: skipped, claude not on PATH");
    return 0;
  }
  for (const dir of MODS) {
    const status = run("claude", ["plugin", "validate", "--strict", dir]) || run("claude", ["plugin", "test", dir]);
    if (status !== 0) return status;
  }
  return 0;
}

const STEPS = {
  unit: () => nodeTest([UNIT_TESTS]),
  build: () => run(process.execPath, ["scripts/build.mjs"]),
  product: () => nodeTest(PRODUCT_ROOTS.flatMap(testFiles).sort()),
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
  const code = STEPS[name]();
  console.log(`${name}: exit ${code} in ${Date.now() - started} ms`);
  if (code !== 0) process.exit(1);
}
