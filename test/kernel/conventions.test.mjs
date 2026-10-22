import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { codeLines, isKernelSource } from "./kernel-sources.mjs";

const SOURCE_ROOT = "src";
const LIB_PREFIX = "src/lib/";

const PROCESS_READS = ["projectRoot(", "process.cwd(", "process.env", "homedir(", "new Date("];
const PROCESS_READ_EXEMPT = ["src/lib/shared/context.mts", "src/lib/shared/paths.mts", "src/lib/cli/"];

const SHELL_FORMS = [/\bexecSync\(/, /\bshell:\s*true\b/, /\b(?:exec|execFile|execFileSync|spawn|spawnSync)\(\s*`/];
const SHELL_EXEMPT = ["src/lib/util/process.mts"];

const WORK_PATH_TEMPLATE = "`work/${";
const WORK_PATH_EXEMPT = ["src/lib/shared/work/files.mts"];

const RELATIVE_MJS_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)["'](\.\.?\/[^"']+)\.mjs["']/g;

function isExempt(path, exempt) {
  return exempt.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
}

function processReads(path, text) {
  if (!path.startsWith(LIB_PREFIX) || isExempt(path, PROCESS_READ_EXEMPT)) return [];
  return codeLines(text).filter((line) => PROCESS_READS.some((form) => line.includes(form)));
}

function shellCalls(path, text) {
  if (isExempt(path, SHELL_EXEMPT)) return [];
  return codeLines(text).filter((line) => SHELL_FORMS.some((form) => form.test(line)));
}

function workPathTemplates(path, text) {
  if (isExempt(path, WORK_PATH_EXEMPT)) return [];
  return codeLines(text).filter((line) => line.includes(WORK_PATH_TEMPLATE));
}

function namesTypedSiblingAsBuilt(path, line) {
  return [...line.matchAll(RELATIVE_MJS_IMPORT)].some(([, stem]) => existsSync(resolve(dirname(path), `${stem}.mts`)));
}

function builtNameImports(path, text) {
  return codeLines(text).filter((line) => namesTypedSiblingAsBuilt(path, line));
}

function typedSources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return typedSources(full);
    return entry.name.endsWith(".mts") && isKernelSource(entry.name) ? [full] : [];
  });
}

function repoPath(file) {
  return relative(resolve("."), file).replaceAll("\\", "/");
}

function offenders(scan) {
  return typedSources(resolve(SOURCE_ROOT)).flatMap((file) => {
    const path = repoPath(file);
    return scan(path, readFileSync(file, "utf8")).map((line) => `${path}: ${line.trim()}`);
  });
}

const PROCESS_READ_SAMPLES = ["const r = projectRoot();", "const d = process.cwd();", "const v = process.env.X;", "const h = homedir();", "const t = new Date();"];
const SHELL_SAMPLES = ['execSync("ls");', 'spawnSync("ls", { shell: true });', "execFileSync(`git ${args}`);"];
const WORK_PATH_SAMPLES = ["const dir = `work/${id}`;"];
const BUILT_NAME_SAMPLES = ['import { x } from "./io.mjs";', "import type { Args } from './args.mjs';", 'export { y } from "./process.mjs";', 'const m = await import("./io.mjs");', 'import "./io.mjs";'];

function asComments(lines) {
  return lines.map((line) => `// ${line}`).join("\n");
}

const SCANS = [
  { name: "process reads", scan: processReads, samples: PROCESS_READ_SAMPLES, path: "src/lib/util/io.mts", exempt: PROCESS_READ_EXEMPT },
  { name: "shell calls", scan: shellCalls, samples: SHELL_SAMPLES, path: "src/lib/util/git.mts", exempt: SHELL_EXEMPT },
  { name: "work path templates", scan: workPathTemplates, samples: WORK_PATH_SAMPLES, path: "src/lib/util/io.mts", exempt: WORK_PATH_EXEMPT },
  { name: "built-name imports", scan: builtNameImports, samples: BUILT_NAME_SAMPLES, path: "src/lib/util/args.mts", exempt: [] },
];

for (const { name, scan, samples, path, exempt } of SCANS) {
  test(`the ${name} scan reports one line per banned form, none on a comment line and none under its exempt paths (T-2.1)`, () => {
    for (const sample of samples) assert.deepEqual(scan(path, sample), [sample], sample);
    assert.equal(scan(path, samples.join("\n")).length, samples.length);
    assert.deepEqual(scan(path, asComments(samples)), []);
    for (const exemptPath of exempt) assert.deepEqual(scan(exemptPath, samples.join("\n")), [], exemptPath);
  });

  test(`no typed source under src/ breaks the ${name} rule (T-2.1)`, () => {
    assert.deepEqual(offenders(scan), []);
  });
}

test("each scan reports the sample for an ordinary module and nothing for its exempt module (T-2.2)", () => {
  assert.deepEqual(processReads("src/lib/util/io.mts", "const t = new Date();"), ["const t = new Date();"]);
  assert.deepEqual(processReads("src/lib/shared/context.mts", "const t = new Date();"), []);
  assert.deepEqual(processReads("src/lib/cli/main.mts", "const r = projectRoot();"), []);
  assert.deepEqual(shellCalls("src/lib/util/git.mts", 'execSync("ls")'), ['execSync("ls")']);
  assert.deepEqual(shellCalls("src/lib/util/process.mts", 'execSync("ls")'), []);
  assert.deepEqual(workPathTemplates("src/lib/util/io.mts", "`work/${id}`"), ["`work/${id}`"]);
  assert.deepEqual(workPathTemplates("src/lib/shared/work/files.mts", "`work/${id}`"), []);
});

test("the built-name scan reports an .mjs import of a typed sibling and nothing for a module that is still .mjs (T-1.7)", () => {
  assert.deepEqual(builtNameImports("src/lib/util/args.mts", 'import { x } from "./io.mjs";'), ['import { x } from "./io.mjs";']);
  assert.deepEqual(builtNameImports("src/lib/cli/main.mts", 'const loadLegacy = () => import("./legacy.mjs");'), []);
  assert.deepEqual(builtNameImports("src/lib/util/args.mts", 'import { x } from "./io.mts";'), []);
  assert.deepEqual(builtNameImports("src/lib/util/args.mts", 'import { x } from "node:fs";'), []);
});

test("the process-read scan covers src/lib only", () => {
  assert.deepEqual(processReads("src/bin/picket.mts", "const v = process.env.X;"), []);
  assert.deepEqual(processReads("src/hooks/x.mts", "const v = process.env.X;"), []);
});

test("the scans read typed sources only, never declaration files", () => {
  const sources = typedSources(resolve(SOURCE_ROOT)).map(repoPath);
  assert.equal(sources.includes("src/lib/shared/action.mts"), true);
  assert.deepEqual(sources.filter((path) => !path.endsWith(".mts") || path.endsWith(".d.mts") || path.endsWith(".test.mts")), []);
});
