import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { codeLines } from "#test/kernel-sources.mts";
import { VERB_NAMES } from "../../src/lib/verbs.mts";

const ROOT = resolve(".");
const SRC = join(ROOT, "src");
const SKILLS_DIR = join(SRC, "skills");
const LIB_DIR = join(SRC, "lib");
const SKIPPED_DIRS = new Set(["examples", "vendor"]);

const SKILLS = readdirSync(SKILLS_DIR).filter((name) => statSync(join(SKILLS_DIR, name)).isDirectory());
const SKILL_ALTERNATION = SKILLS.join("|");

const OLD_CLI = { name: "old CLI path", pattern: /node \.claude\/bin\/harness\.mjs/ };
const HARNESS_VERB = { name: "harness verb", pattern: new RegExp(`\\bharness (?:${Object.keys(VERB_NAMES).join("|")})\\b`) };
const HOST_PROMPT_PATH = { name: "host skill or agent path", pattern: /\.claude\/(?:skills|agents)\// };
const SLASH_SKILL = { name: "unprefixed slash skill", pattern: new RegExp(`(?:^|[\\s(\`"'])\\/(?:${SKILL_ALTERNATION})\\b`, "m") };
const BACKTICKED_SKILL = { name: "unprefixed skill in backticks", pattern: new RegExp(`\`(?:${SKILL_ALTERNATION})(?=[\`\\s])`) };

const MARKDOWN_CHECKS = [OLD_CLI, HARNESS_VERB, HOST_PROMPT_PATH, SLASH_SKILL, BACKTICKED_SKILL];
const LIB_CHECKS = [OLD_CLI, HARNESS_VERB, HOST_PROMPT_PATH, SLASH_SKILL];

function filesUnder(dir, suffix) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : filesUnder(full, suffix);
    return entry.name.endsWith(suffix) ? [full] : [];
  });
}

function violations(lines, checks) {
  return lines.flatMap((line) => checks.filter(({ pattern }) => pattern.test(line)).map(({ name }) => `${name}: ${line.trim().slice(0, 120)}`));
}

function markdownViolations(text) {
  return violations(text.split(/\r?\n/), MARKDOWN_CHECKS);
}

function libViolations(text) {
  return violations(codeLines(text), LIB_CHECKS);
}

function offenders(files, check) {
  return files.flatMap((file) => check(readFileSync(file, "utf8")).map((v) => `${relative(ROOT, file)}: ${v}`));
}

test("every Markdown file under src/ and CLAUDE.md uses picket verbs and prefixed names", () => {
  const files = [...filesUnder(SRC, ".md"), join(ROOT, "CLAUDE.md")];
  assert.deepEqual(offenders(files, markdownViolations), []);
});

test("no kernel string names the old CLI or an unprefixed slash skill", () => {
  assert.deepEqual(offenders(filesUnder(LIB_DIR, ".mjs"), libViolations), []);
});

test("the Markdown scan flags each old name form", () => {
  assert.equal(markdownViolations("Run /ordering next.").length, 1);
  assert.equal(markdownViolations("Use `designing` for this.").length, 1);
  assert.equal(markdownViolations("node .claude/bin/harness.mjs next <id>").length, 1);
  assert.equal(markdownViolations("Read `.claude/skills/ordering/steps/20-phase.md`.").length, 1);
  assert.equal(markdownViolations("Use `picket:designing`, then /picket:ordering and `picket next <id>`.").length, 0);
  assert.equal(markdownViolations("Read `ordering/steps/20-phase.md` relative to the skills folder.").length, 0);
  assert.equal(markdownViolations("Load `picket:ordering` first.").length, 0);
});

test("the kernel scan flags a harness verb in a string and skips comment lines", () => {
  assert.equal(libViolations('const hint = "run harness route <id>";').length, 1);
  assert.equal(libViolations("// harness route is the old name").length, 0);
  assert.equal(libViolations('const hint = "run picket route <id>";').length, 0);
});
