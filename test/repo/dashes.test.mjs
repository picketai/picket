import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { codeLines } from "#test/kernel-sources.mts";

const ROOT = resolve(".");
const MARKDOWN_DIRS = ["src/skills", "src/agents", "src/rules", "src/output-styles", "docs"];
const MARKDOWN_FILES = ["README.md"];
const CODE_DIRS = ["src/lib", "src/bin", "src/mods"];
const CODE_FILE = /\.(mjs|mts|js|ts|tsx)$/;
const TEST_FILE = /\.test\.[a-z]+$/;
const SKIPPED_DIRS = new Set(["node_modules", "vendor"]);
const DASH = /[\u{2013}\u{2014}]/u;
const EM_DASH = String.fromCodePoint(0x2014);

function filesUnder(dir, keep) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : filesUnder(full, keep);
    return keep(entry.name) ? [full] : [];
  });
}

function markdownDashes(text) {
  return text.split(/\r?\n/).filter((line) => DASH.test(line));
}

function codeDashes(text) {
  return codeLines(text).filter((line) => DASH.test(line));
}

function offenders(files, scan) {
  return files.flatMap((file) => scan(readFileSync(file, "utf8")).map((line) => `${relative(ROOT, file)}: ${line.trim().slice(0, 100)}`));
}

function markdownFiles() {
  const underDirs = MARKDOWN_DIRS.flatMap((dir) => filesUnder(resolve(dir), (name) => name.endsWith(".md")));
  return [...underDirs, ...MARKDOWN_FILES.map((file) => resolve(file))];
}

function codeModules() {
  return CODE_DIRS.flatMap((dir) => filesUnder(resolve(dir), (name) => CODE_FILE.test(name) && !TEST_FILE.test(name)));
}

test("no Markdown under the instructions, docs/ or README.md holds an en or em dash", () => {
  assert.deepEqual(offenders(markdownFiles(), markdownDashes), []);
});

test("no code line of a non-test module under src/lib, src/bin or src/mods holds an en or em dash", () => {
  assert.deepEqual(offenders(codeModules(), codeDashes), []);
});

test("the dash scans flag a planted dash in Markdown and in a code line, and skip a comment line", () => {
  assert.equal(markdownDashes(`# Title\n\nOne ${EM_DASH} two.\n`).length, 1);
  assert.equal(markdownDashes("# Title\n\nOne, two.\n").length, 0);
  assert.equal(codeDashes(`const label = "a ${EM_DASH} b";\n`).length, 1);
  assert.equal(codeDashes(`// a ${EM_DASH} b\nconst label = "a: b";\n`).length, 0);
  assert.equal(codeDashes(` * a ${EM_DASH} b\n`).length, 0);
});

test("the module scan reads code under src/mods and leaves test files out", () => {
  const modules = codeModules().map((file) => relative(ROOT, file).replaceAll("\\", "/"));
  assert.ok(modules.includes("src/mods/session/hooks/sessions.ts"));
  assert.equal(modules.some((file) => TEST_FILE.test(file)), false);
});
