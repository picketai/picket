import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { codeLines, isKernelSource } from "#test/kernel-sources.mts";

const SOURCE_ROOT = "src";
const LIB_PREFIX = "src/lib/";

const PROCESS_READS = ["projectRoot(", "process.cwd(", "process.env", "homedir(", "new Date("];
const PROCESS_READ_EXEMPT = ["src/lib/shared/context.mts", "src/lib/shared/paths.mts", "src/lib/cli/", "src/lib/hooks/run-hook.mts"];

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

function offenders(scan, sources) {
  return sources().flatMap((file) => {
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

const TYPED = { label: "typed source under src/", files: () => typedSources(resolve(SOURCE_ROOT)) };
const MODULES = { label: "module under src/lib or a skill's scripts", files: () => directionSources() };

const SCANS = [
  { name: "process reads", scan: processReads, samples: PROCESS_READ_SAMPLES, path: "src/lib/util/io.mts", exempt: PROCESS_READ_EXEMPT, sources: TYPED },
  { name: "shell calls", scan: shellCalls, samples: SHELL_SAMPLES, path: "src/lib/util/git.mts", exempt: SHELL_EXEMPT, sources: TYPED },
  { name: "work path templates", scan: workPathTemplates, samples: WORK_PATH_SAMPLES, path: "src/lib/util/io.mts", exempt: WORK_PATH_EXEMPT, sources: TYPED },
  { name: "built-name imports", scan: builtNameImports, samples: BUILT_NAME_SAMPLES, path: "src/lib/util/args.mts", exempt: [], sources: MODULES },
];

for (const { name, scan, samples, path, exempt, sources } of SCANS) {
  test(`the ${name} scan reports one line per banned form, none on a comment line and none under its exempt paths (T-2.1)`, () => {
    for (const sample of samples) assert.deepEqual(scan(path, sample), [sample], sample);
    assert.equal(scan(path, samples.join("\n")).length, samples.length);
    assert.deepEqual(scan(path, asComments(samples)), []);
    for (const exemptPath of exempt) assert.deepEqual(scan(exemptPath, samples.join("\n")), [], exemptPath);
  });

  test(`no ${sources.label} breaks the ${name} rule (T-2.1)`, () => {
    assert.deepEqual(offenders(scan, sources.files), []);
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

test("the built-name scan reads .mjs modules too: an .mjs import of a typed sibling is reported, of an .mjs sibling not (T-1.1)", () => {
  assert.deepEqual(builtNameImports("src/lib/shared/a.mjs", 'import { x } from "./paths.mjs";'), ['import { x } from "./paths.mjs";']);
  assert.deepEqual(builtNameImports("src/lib/shared/a.mjs", 'import { VERDICTS } from "./verdicts.mjs";'), []);
  const scanned = directionSources().map(repoPath);
  assert.ok(scanned.includes("src/lib/shared/config.mjs") && scanned.includes("src/skills/documenting/scripts/filename.mjs"), scanned.join(", "));
});

test("the process-read scan covers src/lib only", () => {
  assert.deepEqual(processReads("src/bin/picket.mts", "const v = process.env.X;"), []);
  assert.deepEqual(processReads("src/other/x.mts", "const v = process.env.X;"), []);
});

test("the scans read typed sources only, never declaration files", () => {
  const sources = typedSources(resolve(SOURCE_ROOT)).map(repoPath);
  assert.equal(sources.includes("src/lib/shared/action.mts"), true);
  assert.deepEqual(sources.filter((path) => !path.endsWith(".mts") || path.endsWith(".d.mts") || path.endsWith(".test.mts")), []);
});

const SKILL_SCRIPTS = /^src\/skills\/[^/]+\/scripts\//;
const IMPORT_SPECIFIER = /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s+["']([^"']+)["']/g;

const ALLOWED_ZONES = {
  util: ["util"],
  shared: ["shared", "util"],
  cli: ["cli", "verbs.mts", "verbs/", "shared", "util"],
  "verbs.mts": [],
  "hooks.mts": [],
  "mods.mts": [],
};
const IMPORT_FREE_ZONES = new Set(["verbs.mts", "hooks.mts", "mods.mts"]);

const HOOKS_PREFIX = "src/lib/hooks/";
const HOOK_FRAME = ["hook-spec.mts", "output.mts"];
const HOOK_OUTSIDE_ZONES = ["shared", "util", "verbs.mts"];
const VERB_ENTRY = /^src\/lib\/verbs\/[^/]+\/index\.m[jt]s$/;

function hookImportAllowed(path, targetPath) {
  const from = path.slice(HOOKS_PREFIX.length).split("/");
  if (!targetPath.startsWith(HOOKS_PREFIX)) {
    const target = zoneOf(targetPath);
    if (target === "hooks.mts") return from.length === 1;
    return HOOK_OUTSIDE_ZONES.includes(target) || VERB_ENTRY.test(targetPath);
  }
  const to = targetPath.slice(HOOKS_PREFIX.length).split("/");
  if (from.length === 1) return to.length === 1;
  if (to.length === 1) return HOOK_FRAME.includes(to[0]);
  if (to.length === 2) return to[0] === from[0];
  return from.length > 2 && to[0] === from[0] && to[1] === from[1];
}

function zoneOf(path) {
  if (SKILL_SCRIPTS.test(path)) return path.match(SKILL_SCRIPTS)[0];
  if (!path.startsWith(LIB_PREFIX)) return null;
  const [first, second] = path.slice(LIB_PREFIX.length).split("/");
  if (first === "verbs.mts") return first;
  return first === "verbs" ? `verbs/${second}` : first;
}

function allowedZones(zone) {
  if (zone.startsWith("verbs/")) return [zone, "shared", "util", "mods.mts"];
  if (SKILL_SCRIPTS.test(zone)) return [zone, "shared", "util"];
  return ALLOWED_ZONES[zone] ?? [];
}

function importSpecifiers(text) {
  return [...codeLines(text).join("\n").matchAll(IMPORT_SPECIFIER)].map((m) => m[1] ?? m[2] ?? m[3]);
}

function crossesBoundary(zone, specifier, path) {
  if (!specifier.startsWith(".")) return IMPORT_FREE_ZONES.has(zone);
  const targetPath = posix.join(posix.dirname(path), specifier);
  if (zone === "hooks") return !hookImportAllowed(path, targetPath);
  const target = zoneOf(targetPath);
  return target === null || !allowedZones(zone).some((allowed) => (allowed.endsWith("/") ? target.startsWith(allowed) : target === allowed));
}

function importViolations(path, text) {
  const zone = zoneOf(path);
  if (zone === null) return [];
  return importSpecifiers(text)
    .filter((specifier) => crossesBoundary(zone, specifier, path))
    .map((specifier) => `${path}: imports ${specifier}`);
}

function directionSources() {
  const lib = sourcesUnder(resolve("src/lib"));
  const scripts = readdirSync(resolve("src/skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve("src/skills", entry.name, "scripts")))
    .flatMap((entry) => sourcesUnder(resolve("src/skills", entry.name, "scripts")));
  return [...lib, ...scripts];
}

function sourcesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesUnder(full);
    return isKernelSource(entry.name) ? [full] : [];
  });
}

test("the direction scan reports each import that crosses the layer rules (T-3.2)", () => {
  const reported = (path, text) => importViolations(path, text).length;
  assert.equal(reported("src/lib/shared/a.mjs", 'import { route } from "../verbs/route/route.mjs";'), 1);
  assert.equal(reported("src/lib/util/a.mts", 'import { WORK_DIR } from "../shared/paths.mts";'), 1);
  assert.equal(reported("src/lib/verbs/a/index.mts", 'import { verb } from "../b/index.mts";'), 1);
  assert.equal(reported("src/lib/verbs.mts", 'import { x } from "./verbs/leave/index.mts";'), 1);
  assert.equal(reported("src/lib/verbs.mts", 'import { readFileSync } from "node:fs";'), 1);
  assert.equal(reported("src/lib/shared/a.mjs", 'import { main } from "../cli/main.mts";'), 1);
  assert.equal(reported("src/lib/shared/a.mjs", 'import {\n  route,\n  VERDICTS,\n} from "../verbs/route/route.mjs";'), 1);
  assert.equal(reported("src/lib/shared/a.mjs", 'const { verb } = await import("../verbs/x/index.mts");'), 1);
  assert.equal(reported("src/lib/shared/a.mjs", 'export { route } from "../verbs/route/route.mjs";'), 1);
  assert.equal(reported("src/skills/x/scripts/a.mjs", 'import { route } from "../../../lib/verbs/route/route.mjs";'), 1);
});

test("the direction scan keeps each hook in its folder and the hook list import-free (T-5.3)", () => {
  const reported = (path, text) => importViolations(path, text).length;
  assert.equal(reported("src/lib/hooks/observe/drive/index.mts", 'import { readPowerShell } from "../../guard/bash/powershell.mts";'), 1);
  assert.equal(reported("src/lib/hooks.mts", 'import { readFileSync } from "node:fs";'), 1);
  assert.equal(reported("src/lib/mods.mts", 'import { readFileSync } from "node:fs";'), 1);
  assert.equal(reported("src/lib/mods.mts", 'import { HOOKS } from "./hooks.mts";'), 1);
  assert.equal(reported("src/lib/shared/a.mts", 'import { MODS } from "../mods.mts";'), 1);
  assert.equal(reported("src/lib/verbs/init/init.mjs", 'import { MODS } from "../../mods.mts";'), 0);
  assert.equal(reported("src/lib/hooks/route/verdict/index.mts", 'import { route } from "../../../verbs/route/route.mts";'), 1);
  assert.equal(reported("src/lib/hooks/guard/comments/index.mts", 'import { runHook } from "../../run-hook.mts";'), 1);
  assert.equal(reported("src/lib/hooks/guard/edit-target.mts", 'import { hook } from "./scope/index.mts";'), 1);
  assert.equal(reported("src/lib/hooks/guard/comments/index.mts", 'import { editTarget } from "../edit-target.mts";'), 0);
  assert.equal(reported("src/lib/hooks/route/verdict/index.mts", 'import { route } from "../../../verbs/route/index.mts";\nimport { context } from "../../output.mts";\nimport type { HookSpec } from "../../hook-spec.mts";'), 0);
  assert.equal(reported("src/lib/hooks/guard/bash/kernel.mts", 'import { VERB_NAMES } from "../../../verbs.mts";\nimport { x } from "./rules.mts";'), 0);
  assert.equal(reported("src/lib/hooks/run-hook.mts", 'import type { HookName } from "../hooks.mts";\nimport type { HookSpec } from "./hook-spec.mts";'), 0);
});

test("the direction scan allows each layer its own imports (T-3.2)", () => {
  const reported = (path, text) => importViolations(path, text).length;
  assert.equal(reported("src/lib/hooks/route/verdict/index.mts", 'import { route } from "../../../verbs/route/index.mts";'), 0);
  assert.equal(reported("src/lib/verbs/a/index.mts", 'import { b } from "./b.mts";\nimport { done } from "../../shared/action.mts";\nimport { str } from "../../util/args.mts";'), 0);
  assert.equal(reported("src/lib/cli/main.mts", 'import { REGISTRY } from "./registry.mts";\nimport { VERB_NAMES } from "../verbs.mts";'), 0);
  assert.equal(reported("src/lib/shared/a.mjs", 'import { join } from "node:path";\nimport { parse } from "../util/yaml-lite.mjs";'), 0);
  assert.equal(reported("src/skills/x/scripts/a.mjs", 'import { b } from "./b.mjs";\nimport { comments } from "../../../lib/shared/comments.mjs";'), 0);
  assert.equal(reported("src/lib/shared/a.mjs", '// import { route } from "../verbs/route/route.mjs";'), 0);
});

test("no module under src/lib or a skill's scripts crosses the layer rules (T-3.2)", () => {
  const files = directionSources().map(repoPath);
  assert.ok(files.includes("src/lib/hooks/route/verdict/index.mts") && files.includes("src/skills/reviewing/scripts/lint.craft.mjs"), files.join(", "));
  const violations = directionSources().flatMap((file) => importViolations(repoPath(file), readFileSync(file, "utf8")));
  assert.deepEqual(violations, []);
});

const ONE_WORD = /^[a-z]+$/;

function verbNameViolations(names) {
  return Object.entries(names).flatMap(([name, entry]) => {
    const subverbs = "subverbs" in entry ? Object.keys(entry.subverbs).map((sub) => `${name} ${sub}`) : [];
    return [name, ...subverbs].filter((command) => !command.split(" ").every((word) => ONE_WORD.test(word)));
  });
}

test("the verb-name scan reports a name that is not one lowercase word (scan 4)", () => {
  const plain = { summary: "x", readOnly: true };
  assert.deepEqual(verbNameViolations({ "review-summary": plain, setupTerminal: plain, state: plain }), ["review-summary", "setupTerminal"]);
  assert.deepEqual(verbNameViolations({ source: { summary: "x", subverbs: { find: plain, "find-all": plain } } }), ["source find-all"]);
});

test("every verb and subverb name is one lowercase word (scan 4)", async () => {
  const { VERB_NAMES } = await import("../../dist/lib/verbs.mjs");
  assert.deepEqual(verbNameViolations(VERB_NAMES), []);
});
