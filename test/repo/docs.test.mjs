import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
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
