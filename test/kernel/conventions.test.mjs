import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { codeLines, isKernelSource } from "./kernel-sources.mjs";

const SOURCE_ROOT = "src";
const LIB_PREFIX = "src/lib/";

const PROCESS_READS = ["projectRoot(", "process.cwd(", "process.env", "homedir(", "new Date("];
const PROCESS_READ_EXEMPT = ["src/lib/context.mts", "src/lib/paths.mts"];

const SHELL_FORMS = [/\bexecSync\(/, /\bshell:\s*true\b/, /\b(?:exec|execFile|execFileSync|spawn|spawnSync)\(\s*`/];
const SHELL_EXEMPT = ["src/lib/process.mts"];

const WORK_PATH_TEMPLATE = "`work/${";
const WORK_PATH_EXEMPT = ["src/lib/work-files.mts"];

function processReads(path, text) {
  if (!path.startsWith(LIB_PREFIX) || PROCESS_READ_EXEMPT.includes(path)) return [];
  return codeLines(text).filter((line) => PROCESS_READS.some((form) => line.includes(form)));
}

function shellCalls(path, text) {
  if (SHELL_EXEMPT.includes(path)) return [];
  return codeLines(text).filter((line) => SHELL_FORMS.some((form) => form.test(line)));
}

function workPathTemplates(path, text) {
  if (WORK_PATH_EXEMPT.includes(path)) return [];
  return codeLines(text).filter((line) => line.includes(WORK_PATH_TEMPLATE));
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

function asComments(lines) {
  return lines.map((line) => `// ${line}`).join("\n");
}

const SCANS = [
  { name: "process reads", scan: processReads, samples: PROCESS_READ_SAMPLES, path: "src/lib/io.mts", exempt: PROCESS_READ_EXEMPT },
  { name: "shell calls", scan: shellCalls, samples: SHELL_SAMPLES, path: "src/lib/git.mts", exempt: SHELL_EXEMPT },
  { name: "work path templates", scan: workPathTemplates, samples: WORK_PATH_SAMPLES, path: "src/lib/io.mts", exempt: WORK_PATH_EXEMPT },
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
  assert.deepEqual(processReads("src/lib/io.mts", "const t = new Date();"), ["const t = new Date();"]);
  assert.deepEqual(processReads("src/lib/context.mts", "const t = new Date();"), []);
  assert.deepEqual(shellCalls("src/lib/git.mts", 'execSync("ls")'), ['execSync("ls")']);
  assert.deepEqual(shellCalls("src/lib/process.mts", 'execSync("ls")'), []);
  assert.deepEqual(workPathTemplates("src/lib/io.mts", "`work/${id}`"), ["`work/${id}`"]);
  assert.deepEqual(workPathTemplates("src/lib/work-files.mts", "`work/${id}`"), []);
});

test("the process-read scan covers src/lib only", () => {
  assert.deepEqual(processReads("src/bin/picket.mts", "const v = process.env.X;"), []);
  assert.deepEqual(processReads("src/hooks/x.mts", "const v = process.env.X;"), []);
});

test("the scans read typed sources only, never declaration files", () => {
  const sources = typedSources(resolve(SOURCE_ROOT)).map(repoPath);
  assert.equal(sources.includes("src/lib/action.mts"), true);
  assert.deepEqual(sources.filter((path) => !path.endsWith(".mts") || path.endsWith(".d.mts") || path.endsWith(".test.mts")), []);
});
