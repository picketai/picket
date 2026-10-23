import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { codeLines } from "#test/kernel-sources.mts";
import { isGroup, VERB_NAMES } from "../../src/lib/verbs.mts";

const ROOT = resolve(".");
const SRC = join(ROOT, "src");
const SKILLS_DIR = join(SRC, "skills");
const LIB_DIR = join(SRC, "lib");
const SKIPPED_DIRS = new Set(["examples", "vendor"]);

const SKILLS = readdirSync(SKILLS_DIR).filter((name) => existsSync(join(SKILLS_DIR, name, "SKILL.md")));
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
  assert.equal(markdownViolations("Read `.claude/skills/shared/procedures/phase-loop.md`.").length, 1);
  assert.equal(markdownViolations("Use `picket:designing`, then /picket:ordering and `picket next <id>`.").length, 0);
  assert.equal(markdownViolations("Read `shared/procedures/phase-loop.md` relative to the skills folder.").length, 0);
  assert.equal(markdownViolations("Load `picket:ordering` first.").length, 0);
});

const PICKET_COMMAND = /^(?:!\s*|\$\s+)?picket\s+(\S+)(?:\s+(\S+))?/;
const FENCE = /^\s*(```|~~~)/;
const NOT_A_VERB = new Set(["help", "--help", "--version"]);
const PLACEHOLDER = /^</;

function commandCandidates(markdown) {
  const candidates = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) fenced = !fenced;
    else if (fenced) candidates.push(line.trim());
    else for (const m of line.matchAll(/`([^`]+)`/g)) candidates.push(m[1].trim());
  }
  return candidates;
}

function commandProblem(candidate) {
  const m = candidate.match(PICKET_COMMAND);
  if (!m || NOT_A_VERB.has(m[1]) || PLACEHOLDER.test(m[1])) return null;
  const [, verb, subverb = ""] = m;
  const entry = VERB_NAMES[verb];
  if (!entry) return `unknown verb: ${candidate}`;
  if (!isGroup(entry)) return null;
  return subverb.split("|").every((name) => Object.hasOwn(entry.subverbs, name)) ? null : `group verb without a known subverb: ${candidate}`;
}

function commandProblems(markdown) {
  return commandCandidates(markdown).map(commandProblem).filter(Boolean);
}

const ENTRY_HEADING = /^## /m;

function newestEntry(changelog) {
  const [, newest = ""] = changelog.split(ENTRY_HEADING);
  return newest;
}

test("every picket command in src/ Markdown, CLAUDE.md, README.md, CONTRIBUTING.md, docs/ and the newest CHANGELOG.md entry names a verb, and a group verb its subverb", () => {
  const files = [...filesUnder(SRC, ".md"), join(ROOT, "CLAUDE.md"), join(ROOT, "README.md"), join(ROOT, "CONTRIBUTING.md"), ...filesUnder(join(ROOT, "docs"), ".md")];
  assert.deepEqual(offenders(files, commandProblems), []);
  assert.deepEqual(commandProblems(newestEntry(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"))).map((problem) => `CHANGELOG.md: ${problem}`), []);
  const commands = files.flatMap((file) => commandCandidates(readFileSync(file, "utf8")).filter((c) => PICKET_COMMAND.test(c)));
  assert.ok(commands.length > 100, `${commands.length} picket commands scanned`);
});

test("only the newest changelog entry is read, so an older one keeps its old verb names", () => {
  const changelog = "# Changelog\n\nIntro `picket nope`.\n\n## 2.0.0\n\nRun `picket frobnicate`.\n\n## 1.0.0\n\nRun `picket oldverb`.\n";
  assert.deepEqual(commandProblems(newestEntry(changelog)), ["unknown verb: picket frobnicate"]);
  assert.deepEqual(commandProblems(newestEntry("# Changelog\n\n## 2.0.0\n\nRun `picket list`.\n\n## 1.0.0\n\nRun `picket frobnicate`.\n")), []);
});

test("the command scan flags an unknown verb and a bare group verb, and accepts help and a prefixed command", () => {
  assert.deepEqual(commandProblems("Run `picket frobnicate <id>`."), ["unknown verb: picket frobnicate <id>"]);
  assert.deepEqual(commandProblems("Run `picket source` first."), ["group verb without a known subverb: picket source"]);
  assert.deepEqual(commandProblems("```\n$ picket source\n```"), ["group verb without a known subverb: $ picket source"]);
  assert.deepEqual(commandProblems("`picket help` lists them; !`picket list --human`; `!picket list --human`; `picket source find|grep`."), []);
  assert.deepEqual(commandProblems("```\n! picket list --human\n$ picket next <id>\n```"), []);
  assert.deepEqual(commandProblems("`picket --version`, `picket --help` and the usage line `picket <verb> [args]`."), []);
});

const UNIT_TEST = /\.test\.mts$/;

function untestedVerbFolders(names, filesOf) {
  return names.filter((name) => !filesOf(name).some((file) => UNIT_TEST.test(file)));
}

test("every verb's folder holds at least one *.test.mts beside its code (T-4.3)", () => {
  const verbsDir = join(LIB_DIR, "verbs");
  const filesOf = (name) => readdirSync(join(verbsDir, name));
  assert.deepEqual(untestedVerbFolders(Object.keys(VERB_NAMES), filesOf), []);
  assert.deepEqual(untestedVerbFolders(["a", "b"], (name) => (name === "a" ? ["index.mts", "index.test.mts"] : ["index.mts", "index.test.mjs"])), ["b"]);
});

test("the kernel scan flags a harness verb in a string and skips comment lines", () => {
  assert.equal(libViolations('const hint = "run harness route <id>";').length, 1);
  assert.equal(libViolations("// harness route is the old name").length, 0);
  assert.equal(libViolations('const hint = "run picket route <id>";').length, 0);
});
