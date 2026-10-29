import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bodyOf, frontmatterFields, hasOrderedList, isOrderedItem, paragraphs, sections } from "#test/instructions.mts";

const SKILLS_DIR = "src/skills";
const AGENTS_DIR = "src/agents";
const INSTRUCTION_DIRS = ["src/skills", "src/agents", "src/rules"];
const SKIPPED_DIRS = ["examples"];
const NAMED_FOLDERS = ["steps", "checklists"];
const ALLOWED = ["name", "description", "when_to_use", "argument-hint", "disable-model-invocation", "user-invocable", "allowed-tools", "model", "effort", "context", "agent", "hooks", "paths", "shell"];
const SECTIONS = ["Steps", "Rules", "Output"];
const LISTING_CAP = 1536;
const STEP_FILE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.md$/;
const REPEAT_MIN_WORDS = 25;
const AGENT_NAMES = ["analyst", "architect", "developer", "reviewer"];
const AGENT = `(?:${AGENT_NAMES.join("|")})`;
const CLAIM = new RegExp(`\\bthe ${AGENT}(?:(?:,? (?:and|or) |, )(?:the )?${AGENT})* reads? it\\b`, "gi");
const TITLE_LINE = /^# /;
const CONTINUATION = /^\s+\S/;

const UNCONVERTED_SKILLS = ["benchmarking", "branching", "consulting", "debugging", "documenting", "explaining", "inspecting", "proofreading", "resuming", "reviewing", "summarizing", "ticketing", "understanding"].map((name) => `src/skills/${name}/SKILL.md`);

const PENDING = {
  frontmatter: UNCONVERTED_SKILLS,
  sections: UNCONVERTED_SKILLS,
  names: [
    "src/skills/branching/steps/10-create.md",
    "src/skills/branching/steps/20-remove.md",
    "src/skills/consulting/steps/10-discuss.md",
    "src/skills/consulting/steps/20-ratify.md",
    "src/skills/debugging/steps/10-reproduce.md",
    "src/skills/debugging/steps/20-localize.md",
    "src/skills/debugging/steps/30-diagnose.md",
    "src/skills/explaining/steps/10-gather.md",
    "src/skills/explaining/steps/20-walk.md",
    "src/skills/proofreading/steps/10-passes.md",
    "src/skills/proofreading/steps/20-apply.md",
    "src/skills/ticketing/steps/10-draft.md",
    "src/skills/ticketing/steps/20-jira.md",
    "src/skills/understanding/steps/10-prepare.md",
    "src/skills/understanding/steps/20-interview.md",
    "src/skills/understanding/steps/30-capture.md",
  ],
  headers: [
    "src/skills/consulting/steps/10-discuss.md",
    "src/skills/consulting/steps/20-ratify.md",
    "src/skills/debugging/steps/10-reproduce.md",
    "src/skills/debugging/steps/20-localize.md",
    "src/skills/debugging/steps/30-diagnose.md",
    "src/skills/explaining/steps/10-gather.md",
    "src/skills/explaining/steps/20-walk.md",
    "src/skills/understanding/steps/10-prepare.md",
    "src/skills/understanding/steps/20-interview.md",
    "src/skills/understanding/steps/30-capture.md",
  ],
  lists: [
    "src/skills/consulting/steps/10-discuss.md",
    "src/skills/consulting/steps/20-ratify.md",
    "src/skills/debugging/steps/20-localize.md",
    "src/skills/debugging/steps/30-diagnose.md",
    "src/skills/explaining/steps/20-walk.md",
    "src/skills/proofreading/steps/10-passes.md",
    "src/skills/understanding/steps/10-prepare.md",
    "src/skills/understanding/steps/30-capture.md",
  ],
  repeats: [],
  claims: ["src/skills/branching/SKILL.md", "src/skills/understanding/SKILL.md"],
};

function markdownUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return SKIPPED_DIRS.includes(entry.name) ? [] : markdownUnder(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function read(path) {
  return { path, text: readFileSync(path, "utf8") };
}

function skillNames() {
  return readdirSync(SKILLS_DIR).filter((name) => readdirSync(join(SKILLS_DIR, name)).includes("SKILL.md")).sort();
}

function skillFiles() {
  return skillNames().map((name) => read(`${SKILLS_DIR}/${name}/SKILL.md`));
}

function folderFiles(folder) {
  return markdownUnder(SKILLS_DIR)
    .filter((path) => path.split("/").at(-2) === folder)
    .sort()
    .map(read);
}

function stepFiles() {
  return folderFiles("steps");
}

function skillOf(path) {
  return path.split("/")[2];
}

function capitalised(word) {
  return word[0].toUpperCase() + word.slice(1);
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function frontmatterProblems(fields) {
  const unknown = Object.keys(fields).filter((key) => !ALLOWED.includes(key)).map((key) => `"${key}" is not a known skill frontmatter key`);
  const defaulted = fields["user-invocable"] === "true" ? ['"user-invocable: true" is the default; drop it'] : [];
  const listing = String(fields.description ?? "").length + String(fields.when_to_use ?? "").length;
  const long = listing > LISTING_CAP ? [`description and when_to_use are ${listing} characters; the cap is ${LISTING_CAP}`] : [];
  return [...unknown, ...defaulted, ...long];
}

function purposeProblems(lines, firstHeading) {
  const intro = lines.slice(0, firstHeading).filter((line) => !TITLE_LINE.test(line)).join("\n").trim();
  if (!intro) return ["the body does not open with a purpose paragraph"];
  return /\n\s*\n/.test(intro) ? ["the purpose paragraph is more than one paragraph"] : [];
}

function stepsListProblems(lines, steps) {
  if (!steps) return [];
  const content = lines.slice(steps.line + 1, steps.end).filter((line) => line.trim());
  const onlyList = content.length > 0 && isOrderedItem(content[0]) && content.every((line) => isOrderedItem(line) || CONTINUATION.test(line));
  return onlyList ? [] : ["## Steps holds something other than one ordered list"];
}

function sectionProblems(body) {
  const lines = body.split("\n");
  const parts = sections(body).filter((section) => section.level === 2);
  const titles = parts.map((section) => section.title);
  const extra = titles.filter((title) => !SECTIONS.includes(title)).map((title) => `"## ${title}" is not one of ${SECTIONS.join(", ")}`);
  const known = titles.filter((title) => SECTIONS.includes(title));
  const order = known.join(",") === SECTIONS.join(",") ? [] : [`the sections are ${known.join(", ") || "none"}; expected ${SECTIONS.join(", ")}`];
  const steps = stepsListProblems(lines, parts.find((section) => section.title === "Steps"));
  return [...purposeProblems(lines, parts[0]?.line ?? lines.length), ...extra, ...order, ...steps];
}

function nameProblems(path) {
  const name = path.split("/").at(-1);
  return STEP_FILE.test(name) ? [] : [`${name} is not kebab-case without a number prefix`];
}

function headerProblems(path, text) {
  const first = bodyOf(text).split("\n").find((line) => line.trim()) ?? "";
  const skill = capitalised(skillOf(path));
  return new RegExp(`^# ${skill}: \\S`).test(first) ? [] : [`"${first}" does not open "# ${skill}: <name>"`];
}

function listProblems(text) {
  return hasOrderedList(bodyOf(text)) ? [] : ["no ordered list line"];
}

function repeatedFiles(files) {
  const owners = new Map();
  for (const { path, text } of files) {
    for (const paragraph of paragraphs(bodyOf(text)).filter((p) => wordCount(p) >= REPEAT_MIN_WORDS)) {
      owners.set(paragraph, new Set([...(owners.get(paragraph) ?? []), path]));
    }
  }
  return [...new Set([...owners.values()].filter((paths) => paths.size > 1).flatMap((paths) => [...paths]))].sort();
}

function agentPreloads() {
  return Object.fromEntries(AGENT_NAMES.map((name) => [name, [frontmatterFields(readFileSync(`${AGENTS_DIR}/${name}.md`, "utf8")).skills ?? []].flat()]));
}

function claimProblems(path, text, preloads) {
  const skill = `picket:${skillOf(path)}`;
  return [...text.replace(/\s+/g, " ").matchAll(CLAIM)].flatMap(([claim]) =>
    claim
      .toLowerCase()
      .match(new RegExp(AGENT, "g"))
      .filter((agent) => !preloads[agent]?.includes(skill))
      .map((agent) => `"${claim}": the ${agent} does not preload ${skill}`),
  );
}

function instructionFiles() {
  return INSTRUCTION_DIRS.flatMap(markdownUnder).sort().map(read);
}

function skillTreeFiles() {
  return markdownUnder(SKILLS_DIR).sort().map(read);
}

function failing(files, problems) {
  return files.filter((file) => problems(file).length > 0).map(({ path }) => path).sort();
}

const FAILING = {
  frontmatter: () => failing(skillFiles(), ({ text }) => frontmatterProblems(frontmatterFields(text))),
  sections: () => failing(skillFiles(), ({ text }) => sectionProblems(bodyOf(text))),
  names: () => failing(NAMED_FOLDERS.flatMap(folderFiles), ({ path }) => nameProblems(path)),
  headers: () => failing(stepFiles(), ({ path, text }) => headerProblems(path, text)),
  lists: () => failing(stepFiles(), ({ text }) => listProblems(text)),
  repeats: () => repeatedFiles(instructionFiles()),
  claims: () => {
    const preloads = agentPreloads();
    return failing(skillTreeFiles(), ({ path, text }) => claimProblems(path, text, preloads));
  },
};

function assertPending(key, found, pending) {
  const fixed = pending.filter((path) => !found.includes(path));
  const fresh = found.filter((path) => !pending.includes(path));
  assert.deepEqual(found, [...pending].sort(), `PENDING.${key} must list exactly the failing files; fixed but listed: ${fixed.join(", ") || "none"}; failing but unlisted: ${fresh.join(", ") || "none"}`);
}

const PURPOSE = "# Sample\n\nDoes one thing.\n";
const SECTIONS_BODY = "\n## Steps\n\n1. Read it.\n   Then act.\n2. Stop.\n\n## Rules\n\nText.\n\n## Output\n\nText.\n";

test("a skill frontmatter key outside ALLOWED, a default user-invocable and a long listing fail", () => {
  assert.deepEqual(frontmatterProblems({ name: "x", description: "Use when y." }), []);
  assert.deepEqual(frontmatterProblems({ name: "x", description: "y", "user-invocable": "true" }), ['"user-invocable: true" is the default; drop it']);
  assert.deepEqual(frontmatterProblems({ name: "x", description: "y", foo: "z" }), ['"foo" is not a known skill frontmatter key']);
  assert.deepEqual(frontmatterProblems({ name: "x", description: "d".repeat(1000), when_to_use: "w".repeat(537) }), ["description and when_to_use are 1537 characters; the cap is 1536"]);
  assert.deepEqual(frontmatterProblems({ name: "x", description: "d".repeat(1000), when_to_use: "w".repeat(536) }), []);
});

test("every SKILL.md not in PENDING.frontmatter passes the frontmatter check", () => {
  for (const { path, text } of skillFiles().filter(({ path }) => !PENDING.frontmatter.includes(path))) assert.deepEqual(frontmatterProblems(frontmatterFields(text)), [], path);
});

test("a purpose paragraph, then Steps as one ordered list, Rules and Output pass", () => {
  assert.deepEqual(sectionProblems(PURPOSE + SECTIONS_BODY), []);
});

test("an extra section and a Steps section that is not one ordered list fail", () => {
  assert.deepEqual(sectionProblems(PURPOSE + SECTIONS_BODY.replace("## Rules", "## Registry")), [
    '"## Registry" is not one of Steps, Rules, Output',
    "the sections are Steps, Output; expected Steps, Rules, Output",
  ]);
  assert.deepEqual(sectionProblems(PURPOSE + SECTIONS_BODY.replace("1. Read it.", "| Step | File |\n1. Read it.")), ["## Steps holds something other than one ordered list"]);
  assert.deepEqual(sectionProblems("# Sample\n" + SECTIONS_BODY), ["the body does not open with a purpose paragraph"]);
});

test("every SKILL.md not in PENDING.sections passes the section check", () => {
  for (const { path, text } of skillFiles().filter(({ path }) => !PENDING.sections.includes(path))) assert.deepEqual(sectionProblems(bodyOf(text)), [], path);
});

test("a step file name is kebab-case with no number prefix", () => {
  assert.deepEqual(nameProblems("src/skills/sampling/steps/open.md"), []);
  assert.deepEqual(nameProblems("src/skills/sampling/steps/10-open.md"), ["10-open.md is not kebab-case without a number prefix"]);
  assert.deepEqual(nameProblems("src/skills/sampling/steps/Open_Step.md"), ["Open_Step.md is not kebab-case without a number prefix"]);
});

test("every step file opens # <Skill>: <name>", () => {
  assert.deepEqual(headerProblems("src/skills/sampling/steps/open.md", "# Sampling: open the work item\n"), []);
  assert.deepEqual(headerProblems("src/skills/sampling/steps/open.md", "# Sampling, step 1: x\n"), ['"# Sampling, step 1: x" does not open "# Sampling: <name>"']);
  for (const { path, text } of stepFiles().filter(({ path }) => !PENDING.headers.includes(path))) assert.deepEqual(headerProblems(path, text), [], path);
});

test("every step file carries an ordered list outside fences", () => {
  assert.deepEqual(listProblems("# Sampling: x\n\n1. Do it.\n"), []);
  assert.deepEqual(listProblems("# Sampling: x\n\nDo it.\n\n```\n1. fenced\n```\n"), ["no ordered list line"]);
});

test("a paragraph of 25 words in two files is a repeat; one of 24 words is not", () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
  const file = (path, paragraph) => ({ path, text: `# T\n\n${paragraph.replace("word12 ", "word12\n")}\n\nOwn text in ${path}.\n` });
  assert.deepEqual(repeatedFiles([file("a.md", words(25)), file("b.md", words(25))]), ["a.md", "b.md"]);
  assert.deepEqual(repeatedFiles([file("a.md", words(24)), file("b.md", words(24))]), []);
  assert.deepEqual(repeatedFiles([file("a.md", `\`\`\`\n${words(25)}\n\`\`\``), file("b.md", `\`\`\`\n${words(25)}\n\`\`\``)]), []);
});

test("a reads-it claim holds only when every named agent preloads the skill", () => {
  const preloads = { analyst: ["picket:documenting"], architect: ["picket:documenting"], developer: [], reviewer: ["picket:reviewing"] };
  assert.deepEqual(claimProblems("src/skills/sampling/SKILL.md", "The developer\nreads it at the first phase.", preloads), ['"The developer reads it": the developer does not preload picket:sampling']);
  assert.deepEqual(claimProblems("src/skills/reviewing/SKILL.md", "The reviewer reads it.", preloads), []);
  assert.deepEqual(claimProblems("src/skills/documenting/SKILL.md", "the analyst and the reviewer read it", preloads), ['"the analyst and the reviewer read it": the reviewer does not preload picket:documenting']);
});

test("PENDING has one list per check", () => {
  assert.deepEqual(Object.keys(PENDING), Object.keys(FAILING));
});

for (const [key, found] of Object.entries(FAILING)) {
  test(`PENDING.${key} names exactly the files that fail its check`, () => {
    assertPending(key, found(), PENDING[key]);
  });
}

test("a fixed file still in a PENDING list fails the PENDING check and is named", () => {
  assert.throws(() => assertPending("names", [], ["src/skills/x/steps/fixed.md"]), /fixed but listed: src\/skills\/x\/steps\/fixed\.md/);
});
