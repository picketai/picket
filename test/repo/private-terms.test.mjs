import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const DENY_LIST = ".picket/private-terms.txt";
const BINARY = /\0/;

function patternsOf(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, source: line.trim() }))
    .filter(({ source }) => source && !source.startsWith("#"))
    .map(({ line, source }) => ({ line, regex: new RegExp(source, "iu") }));
}

function hitsIn(path, text, patterns) {
  return text.split(/\r?\n/).flatMap((content, index) =>
    patterns.filter(({ regex }) => regex.test(content)).map(({ line }) => `${path}:${index + 1}: deny-list line ${line}`),
  );
}

function repoFiles() {
  const listed = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  return listed.split("\0").filter((path) => path && existsSync(path));
}

test("no tracked or unignored file line matches a term of the local deny-list", (t) => {
  if (!existsSync(DENY_LIST)) return t.skip(`${DENY_LIST} is missing`);
  const patterns = patternsOf(readFileSync(DENY_LIST, "utf8"));
  const hits = repoFiles().flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return BINARY.test(text) ? [] : hitsIn(path, text, patterns);
  });
  assert.deepEqual(hits, []);
});

test("the scan names path, line and deny-list line, never the matched text", () => {
  const patterns = patternsOf("# a note\n\nacme\\d+\n");
  const hits = hitsIn("docs/a.md", "clean line\nsee ACME42 here\n", patterns);
  assert.deepEqual(hits, ["docs/a.md:2: deny-list line 3"]);
  assert.equal(hits.join("\n").includes("ACME42"), false);
});

test("the deny-list is ignored by git, so it never reaches a commit", () => {
  assert.equal(execFileSync("git", ["check-ignore", DENY_LIST], { encoding: "utf8" }).trim(), DENY_LIST);
});
