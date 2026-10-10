import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const TEST_ROOTS = ["test", "bench/test"];
const TEST_FILE = /\.test\.mjs$/;

function testFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return TEST_FILE.test(entry.name) ? [path] : [];
  });
}

const files = TEST_ROOTS.flatMap(testFiles).sort();
const run = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...files], { stdio: "inherit" });
process.exit(run.status ?? 1);
