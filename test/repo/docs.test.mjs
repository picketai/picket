import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { cliPage, hooksPage, modsPage, referencePages, REFERENCE_DIR, withLineFeeds } from "../../scripts/docs.mjs";
import { isGroup, VERB_NAMES } from "../../src/lib/verbs.mts";

const ROOT = resolve(".");
const EXIT = { done: 0 };

function staleMessage(path) {
  return `${path} is not what git has; run npm run docs and stage it`;
}

function stalePages(pages, readCommitted) {
  return pages.filter(({ path, text }) => {
    const committed = readCommitted(path);
    return committed === null || withLineFeeds(committed) !== text;
  }).map(({ path }) => staleMessage(path));
}

function readFromIndex(path) {
  try {
    return execFileSync("git", ["show", `:${path}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function command(overrides) {
  return { command: "route", summary: "apply a verdict", usage: "route <id>", leadOnly: false, ...overrides };
}

function headings(markdown, level) {
  return markdown.split("\n").filter((line) => line.startsWith(`${level} picket `)).map((line) => line.slice(level.length + " picket ".length));
}

async function cliText() {
  const pages = await referencePages();
  return pages.find(({ path }) => path === `${REFERENCE_DIR}/cli.md`).text;
}

test("a group verb renders its summary under ## and each subverb under ###", () => {
  const page = cliPage([command({ command: "source find", summary: "list files", usage: "source find <name>", groupSummary: "search a source" })], EXIT);
  assert.match(page, /\n## picket source\n\nSearch a source\.\n\n### picket source find\n\nList files\.\n\n```sh\npicket source find <name>\n```\n/);
});

test("a summary becomes a sentence and a lead-only verb gets the lead line", () => {
  const page = cliPage([command({ command: "waive", summary: "record a thing", leadOnly: true }), command({ summary: "done already." })], EXIT);
  assert.match(page, /## picket waive\n\nRecord a thing\.\n\nOnly the lead runs it; the Bash guard denies it to agents\.\n/);
  assert.match(page, /## picket route\n\nDone already\.\n\n```sh/);
  assert.equal(page.match(/Only the lead runs it/g).length, 1);
});

test("a hook row writes each event once and escapes the pipe in its matcher", () => {
  const page = hooksPage({ "guard.x": { summary: "denies a|b", on: [{ event: "PostToolUse", matcher: "a|b" }, { event: "PostToolUseFailure", matcher: "a|b" }] } });
  assert.match(page, /\| `guard\.x` \| PostToolUse, PostToolUseFailure \| `a\\\|b` \| denies a\\\|b \|/);
});

test("an opt-in mod gets its install command and a default mod does not", () => {
  const page = modsPage({ one: { plugin: "picket-one", summary: "s", description: "d", install: "default" }, two: { plugin: "picket-two", summary: "s", description: "d", install: "opt-in" } });
  assert.match(page, /\| one \| `picket-one` \| by `picket init` \| s \|/);
  assert.match(page, /\| two \| `picket-two` \| on request \| s \|/);
  assert.ok(page.includes("claude plugin install picket-two@picketai --scope project"));
  assert.ok(!page.includes("picket-one@picketai"));
});

test("cli.md has one ## section per verb and one ### section per subverb", async () => {
  const text = await cliText();
  const subverbs = Object.entries(VERB_NAMES).flatMap(([name, entry]) => (isGroup(entry) ? Object.keys(entry.subverbs).map((sub) => `${name} ${sub}`) : []));
  assert.deepEqual(headings(text, "##"), Object.keys(VERB_NAMES));
  assert.deepEqual(headings(text, "###"), subverbs);
});

test("the generated pages are what git has (npm run docs, then stage them)", async () => {
  assert.deepEqual(stalePages(await referencePages(), readFromIndex), []);
});

test("stalePages names npm run docs for a changed page and a missing one, and reads CRLF as LF", () => {
  const pages = [
    { path: "docs/reference/a.md", text: "same\n" },
    { path: "docs/reference/b.md", text: "new\n" },
    { path: "docs/reference/c.md", text: "gone\n" },
  ];
  const committed = { "docs/reference/a.md": "same\r\n", "docs/reference/b.md": "old\n" };
  const read = (path) => committed[path] ?? null;
  assert.deepEqual(stalePages(pages, read), [staleMessage("docs/reference/b.md"), staleMessage("docs/reference/c.md")]);
  assert.match(staleMessage("docs/reference/b.md"), /run npm run docs and stage it/);
});

const ROOT_DOCS = ["README.md", "CONTRIBUTING.md", "CHANGELOG.md"];
const DOC_FOLDERS = ["docs", REFERENCE_DIR];
const SECTION = /^## picket:([a-z-]+)\s*$/gm;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;
const SLASH_COMMAND = /\/picket:([a-z-]+)/g;

function skillNames() {
  const dir = join(ROOT, "src", "skills");
  return readdirSync(dir).filter((name) => existsSync(join(dir, name, "SKILL.md")));
}

function agentNames() {
  return readdirSync(join(ROOT, "src", "agents")).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -".md".length));
}

function docFiles() {
  const inFolders = DOC_FOLDERS.flatMap((folder) => readdirSync(join(ROOT, folder)).filter((name) => name.endsWith(".md")).map((name) => `${folder}/${name}`));
  return [...ROOT_DOCS, ...inFolders];
}

function readDoc(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function sectionProblems(names, page, kind) {
  const sections = [...page.matchAll(SECTION)].map(([, name]) => name);
  const missing = names.filter((name) => !sections.includes(name)).map((name) => `${kind} ${name} has no ## picket:${name} section`);
  const extra = sections.filter((name) => !names.includes(name)).map((name) => `## picket:${name} names no ${kind}`);
  return [...missing, ...extra];
}

function linkTargets(markdown) {
  return [...markdown.matchAll(MARKDOWN_LINK)].map(([, target]) => target).filter((target) => !target.startsWith("#") && !EXTERNAL.test(target));
}

function brokenLinks(file, markdown, exists) {
  return linkTargets(markdown)
    .map((target) => ({ target, path: posix.normalize(posix.join(posix.dirname(file), target.replace(/#.*$/, ""))) }))
    .filter(({ path }) => !exists(path))
    .map(({ target }) => `${file}: ${target}`);
}

function unknownSlashCommands(markdown, skills) {
  return [...markdown.matchAll(SLASH_COMMAND)].map(([, name]) => name).filter((name) => !skills.includes(name)).map((name) => `/picket:${name}`);
}

test("every skill and agent has its reference section, and every section has its skill or agent", () => {
  assert.deepEqual(sectionProblems(skillNames(), readDoc(`${REFERENCE_DIR}/skills.md`), "skill"), []);
  assert.deepEqual(sectionProblems(agentNames(), readDoc(`${REFERENCE_DIR}/agents.md`), "agent"), []);
});

test("the section check flags a skill folder with no section and a section with no folder", () => {
  const page = "# Skills\n\n## picket:ordering\n\ntext\n\n## picket:gone\n";
  assert.deepEqual(sectionProblems(["ordering", "designing"], page, "skill"), ["skill designing has no ## picket:designing section", "## picket:gone names no skill"]);
});

test("every relative link in the docs resolves to a file", () => {
  const exists = (path) => existsSync(join(ROOT, path));
  assert.deepEqual(docFiles().flatMap((file) => brokenLinks(file, readDoc(file), exists)), []);
  assert.ok(docFiles().includes(`${REFERENCE_DIR}/skills.md`));
});

test("the link check flags a missing file and skips anchors and web links", () => {
  const markdown = "[a](missing.md) [b](../how-to.md#the-daily-loop) [c](#local) [d](https://example.com/x.md)";
  const exists = (path) => path === "docs/how-to.md";
  assert.deepEqual(brokenLinks("docs/reference/skills.md", markdown, exists), ["docs/reference/skills.md: missing.md"]);
});

test("every /picket: command in the docs names a skill", () => {
  const skills = skillNames();
  assert.deepEqual(docFiles().flatMap((file) => unknownSlashCommands(readDoc(file), skills).map((name) => `${file}: ${name}`)), []);
});

test("the slash command check flags /picket:nope", () => {
  assert.deepEqual(unknownSlashCommands("Run `/picket:resuming` or /picket:nope.", ["resuming"]), ["/picket:nope"]);
});
