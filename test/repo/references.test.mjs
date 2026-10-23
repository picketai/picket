import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(".");
const SKILLS_DIR = join(ROOT, "src", "skills");
const SCANNED_DIRS = ["src/skills", "src/agents", "src/rules", "src/output-styles"];
const SKIPPED_DIRS = new Set(["examples"]);
const ORDERED_FOLDERS = new Set(["steps", "checklists"]);
const RUN_IN_ORDER = "steps";
const STEP_NAME = /^(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const OWN_FOLDERS = ["steps", "templates", "references", "checklists", "examples", "scripts"];
const DOCUMENT_KIT = ["documenting/templates/", "documenting/scripts/"];
const PROCEDURES = "shared/procedures/";
const SKILL_ROOT_PREFIXES = ["${CLAUDE_PLUGIN_ROOT}/skills/", "src/skills/"];
const BASE_RELATIVE = "../";
const UNRESOLVED = /[{<*]/;
const FENCE = /^\s*(```|~~~)/;
const STEP_KEY = "step:";
const LEADING = /^["'([]+/;
const TRAILING = /["'),.;:\]]+$/;
const LOCATION = /(#.*|:\d+(-\d+)?)$/;

const EXCEPTIONS = [{ file: "src/agents/analyst.md", target: "ticketing/SKILL.md", why: "the analyst reads the ticketing skill for ticket work; F-1 removes it" }];

const SKILL_NAMES = [...readdirSync(SKILLS_DIR).filter((name) => existsSync(join(SKILLS_DIR, name, "SKILL.md"))), "shared"];

function posixRelative(path) {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function directoriesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => [join(dir, entry.name), ...directoriesUnder(join(dir, entry.name))]);
}

function orderedFolders() {
  return directoriesUnder(SKILLS_DIR)
    .filter((dir) => ORDERED_FOLDERS.has(dir.split(/[\\/]/).at(-1)))
    .map((dir) => ({ path: posixRelative(dir), kind: dir.split(/[\\/]/).at(-1), files: readdirSync(dir) }));
}

function nameProblems({ path, kind, files }) {
  const misnamed = files.filter((name) => !STEP_NAME.test(name)).map((name) => `${path}/${name}: not NN-<kebab>.md`);
  if (kind !== RUN_IN_ORDER) return misnamed;
  const prefixes = files.map((name) => name.match(STEP_NAME)?.[1]).filter(Boolean);
  const repeated = [...new Set(prefixes.filter((prefix, i) => prefixes.indexOf(prefix) !== i))];
  return [...misnamed, ...repeated.map((prefix) => `${path}: prefix ${prefix} names two steps`)];
}

function markdownUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : markdownUnder(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function frontmatterSkills(text) {
  const front = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return [...front.matchAll(/^\s+-\s+picket:([a-z-]+)\s*$/gm)].map((m) => m[1]);
}

function ownerOf(file, text) {
  if (file.startsWith(`src/skills/${PROCEDURES}`)) return { kind: "procedure" };
  const skill = file.match(/^src\/skills\/([^/]+)\//)?.[1];
  if (skill) return { kind: "skill", skill };
  if (file.startsWith("src/agents/")) return { kind: "agent", skills: frontmatterSkills(text) };
  return { kind: "rule" };
}

function candidates(markdown) {
  const found = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) fenced = !fenced;
    else if (fenced) found.push(line);
    else for (const m of line.matchAll(/`([^`]+)`/g)) found.push(m[1]);
  }
  return found;
}

function cleaned(word) {
  return word.replace(LEADING, "").replace(TRAILING, "").replace(LOCATION, "");
}

function startsWithSkill(path) {
  return SKILL_NAMES.some((name) => path.startsWith(`${name}/`));
}

function skillTarget(token, owner) {
  const rooted = SKILL_ROOT_PREFIXES.find((prefix) => token.startsWith(prefix));
  if (rooted) return token.slice(rooted.length);
  if (token.startsWith(BASE_RELATIVE)) return startsWithSkill(token.slice(BASE_RELATIVE.length)) ? token.slice(BASE_RELATIVE.length) : null;
  if (startsWithSkill(token)) return token;
  if (owner.kind === "skill" && OWN_FOLDERS.some((folder) => token.startsWith(`${folder}/`))) return `${owner.skill}/${token}`;
  return null;
}

function references(markdown, owner) {
  return candidates(markdown).flatMap((candidate) => {
    const words = candidate.split(/\s+/).filter(Boolean);
    return words.flatMap((word, i) => {
      const target = skillTarget(cleaned(word), owner);
      return target ? [{ target, step: words[i - 1] === STEP_KEY }] : [];
    });
  });
}

function existsInSkills(target) {
  return existsSync(join(SKILLS_DIR, target));
}

function isSkillFile(target) {
  return existsInSkills(target) && statSync(join(SKILLS_DIR, target)).isFile();
}

function withinReach(file, owner, target) {
  if (DOCUMENT_KIT.some((kit) => target.startsWith(kit))) return true;
  if (EXCEPTIONS.some((exception) => exception.file === file && exception.target === target)) return true;
  if (owner.kind === "skill") return target.startsWith(`${owner.skill}/`) || target.startsWith(PROCEDURES);
  if (owner.kind === "agent") return target.startsWith(PROCEDURES) || owner.skills.some((skill) => target.startsWith(`${skill}/`));
  return false;
}

function referenceProblems(file, markdown) {
  const owner = ownerOf(file, markdown);
  return references(markdown, owner).flatMap(({ target, step }) => {
    if (step) return UNRESOLVED.test(target) || isSkillFile(target) ? [] : [`${file}: step: ${target} names no skill file`];
    const missing = UNRESOLVED.test(target) || existsInSkills(target) ? [] : [`${file}: ${target} does not exist`];
    const reach = withinReach(file, owner, target) ? [] : [`${file}: ${target} is outside its reach`];
    return [...missing, ...reach];
  });
}

function scannedFiles() {
  return SCANNED_DIRS.flatMap((dir) => markdownUnder(resolve(dir))).map((path) => ({ file: posixRelative(path), text: readFileSync(path, "utf8") }));
}

test("every steps/ and checklists/ file is NN-<kebab>.md, with distinct prefixes in steps/", () => {
  assert.deepEqual(orderedFolders().flatMap(nameProblems), []);
});

test("checklists/ may repeat a load-tier prefix, as reviewing does with 40 and 50", () => {
  const reviewing = orderedFolders().find((folder) => folder.path === "src/skills/reviewing/checklists");
  const prefixes = reviewing.files.map((name) => name.slice(0, 2));
  assert.ok(prefixes.filter((p) => p === "40").length > 1 && prefixes.filter((p) => p === "50").length > 1);
});

test("the name check flags a one-digit prefix and two steps sharing a prefix", () => {
  assert.deepEqual(nameProblems({ path: "src/skills/x/steps", kind: "steps", files: ["5-x.md"] }), ["src/skills/x/steps/5-x.md: not NN-<kebab>.md"]);
  assert.deepEqual(nameProblems({ path: "src/skills/x/steps", kind: "steps", files: ["10-a.md", "10-b.md"] }), ["src/skills/x/steps: prefix 10 names two steps"]);
  assert.deepEqual(nameProblems({ path: "src/skills/x/checklists", kind: "checklists", files: ["40-a.md", "40-b.md"] }), []);
  assert.deepEqual(nameProblems({ path: "src/skills/x/steps", kind: "steps", files: ["10-Read_me.md"] }), ["src/skills/x/steps/10-Read_me.md: not NN-<kebab>.md"]);
});

test("every skill path in the instructions exists and stays within its file's reach", () => {
  assert.deepEqual(scannedFiles().flatMap(({ file, text }) => referenceProblems(file, text)), []);
});

test("the repository scan reads references in all three forms", () => {
  const targetsOf = (file) => {
    const { text } = scannedFiles().find((f) => f.file === file);
    return references(text, ownerOf(file, text)).map((ref) => ref.target);
  };
  assert.ok(targetsOf("src/agents/developer.md").includes("shared/procedures/prove.md"), "skills-root form");
  assert.ok(targetsOf("src/skills/ordering/SKILL.md").includes("shared/procedures/gate.md"), "base-relative form");
  assert.ok(targetsOf("src/skills/reviewing/SKILL.md").includes("reviewing/checklists/12-bar.md"), "own-folder form");
});

test("exactly one exception is listed, and the repository still uses it", () => {
  assert.equal(EXCEPTIONS.length, 1);
  const [{ file, target }] = EXCEPTIONS;
  const { text } = scannedFiles().find((f) => f.file === file);
  assert.ok(references(text, ownerOf(file, text)).some((ref) => ref.target === target));
});

test("the reference check flags a reach past the table and a missing file", () => {
  assert.deepEqual(referenceProblems("src/skills/ordering/steps/10-order.md", "Read `designing/steps/10-design.md` and `../designing/steps/20-crosscheck.md`."), [
    "src/skills/ordering/steps/10-order.md: designing/steps/10-design.md is outside its reach",
    "src/skills/ordering/steps/10-order.md: designing/steps/20-crosscheck.md is outside its reach",
  ]);
  assert.deepEqual(referenceProblems("src/skills/shared/procedures/gate.md", "See `reviewing/SKILL.md` and `../ordering/SKILL.md`."), [
    "src/skills/shared/procedures/gate.md: reviewing/SKILL.md is outside its reach",
    "src/skills/shared/procedures/gate.md: ordering/SKILL.md is outside its reach",
  ]);
  const architect = "---\nname: architect\nskills:\n  - picket:documenting\n---\nRead `ordering/steps/10-order.md`.";
  assert.deepEqual(referenceProblems("src/agents/architect.md", architect), ["src/agents/architect.md: ordering/steps/10-order.md is outside its reach"]);
  assert.deepEqual(referenceProblems("src/skills/ordering/SKILL.md", "Read `steps/99-nope.md`."), ["src/skills/ordering/SKILL.md: ordering/steps/99-nope.md does not exist"]);
  assert.deepEqual(referenceProblems("src/rules/prose.md", "Read `ordering/SKILL.md`."), ["src/rules/prose.md: ordering/SKILL.md is outside its reach"]);
});

test("the reference check accepts step: values, the document kit, own folders and the shared procedures", () => {
  assert.deepEqual(referenceProblems("src/agents/developer.md", "```\nwork: <id>\nstep: ordering/steps/10-order.md, architect section follows\n```"), []);
  assert.deepEqual(referenceProblems("src/skills/shared/procedures/cumulative-review.md", "`step: reviewing/checklists/15-traced.md`"), []);
  assert.deepEqual(referenceProblems("src/skills/shared/procedures/gate.md", "`step: shared/procedures/no-such.md`"), ["src/skills/shared/procedures/gate.md: step: shared/procedures/no-such.md names no skill file"]);
  assert.deepEqual(referenceProblems("src/skills/consulting/steps/20-ratify.md", 'Run `node "${CLAUDE_PLUGIN_ROOT}/skills/documenting/scripts/filename.mjs" --kind sdr` and read `../documenting/templates/sdr.md`.'), []);
  assert.deepEqual(referenceProblems("src/rules/work-items.md", "Artifacts follow `documenting/templates/{order,design}.md`."), []);
  assert.deepEqual(referenceProblems("src/skills/reviewing/SKILL.md", "```\nreviewing/\n  checklists/10-alignment.md   criteria to evidence\n```\nThen `../shared/procedures/gate.md`."), []);
});
