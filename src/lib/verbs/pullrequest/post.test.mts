import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { anchorsOf, verb, type Posted } from "./post.mts";
import { buildThreads, parseFindings } from "./threads.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

const REVIEW = ["## Review", "Two findings.", "- [Major] src/a.ts:2: y is wrong", "- [Minor] src/a.ts:9: past the end", "CHANGES REQUIRED"].join("\n");
const FILES: Record<string, string> = { "src/a.ts": "x\ny\n" };
const read = (path: string) => FILES[path] ?? null;

test("pullrequest prepare needs a url and post needs a url and a file", () => {
  assert.deepEqual(parse(["https://h/pr/1", "--file", "r.md", "--dry-run"]), { url: "https://h/pr/1", file: "r.md", dryRun: true, repo: undefined });
  assert.throws(() => parse(["https://h/pr/1"]), (err) => err instanceof UsageError && err.message.includes("--file"));
});

test("post takes the clone from --repo", () => {
  assert.equal(parse(["https://h/pr/1", "--file", "r.md", "--repo", "r"]).repo, "r");
});

test("an anchor carries the line of the file at head, or null when the line or the file is missing", () => {
  const finding = (path: string, line: number) => ({ severity: "Major" as const, path, line, end_line: line, text: "t" });
  assert.deepEqual(anchorsOf([finding("src/a.ts", 2), finding("src/a.ts", 9), finding("src/none.ts", 1)], read), [
    { path: "src/a.ts", line: 2, code: "y" },
    { path: "src/a.ts", line: 9, code: null },
    { path: "src/none.ts", line: 1, code: null },
  ]);
});

test("a finding without a line has no anchor", () => {
  assert.deepEqual(anchorsOf([{ severity: "Nit", path: "README.md", line: null, end_line: null, text: "t" }], read), []);
});

test("a dry run prints the code at each anchor under its thread line, and says when the line is missing", () => {
  const posted: Posted = { posted: 0, threads: buildThreads(REVIEW), dry_run: true, pull_request: "7", anchors: anchorsOf(parseFindings(REVIEW), read) };
  const lines = verb.render(posted).split("\n");
  const at = (prefix: string) => lines.findIndex((l) => l.startsWith(prefix));
  assert.equal(lines[at("- /src/a.ts:2 ") + 1], "    y");
  assert.equal(lines[at("- /src/a.ts:9 ") + 1], "    (no line 9 at head)");
});

test("a real post prints the posted count", () => {
  const posted: Posted = { posted: 3, threads: buildThreads(REVIEW), dry_run: false, pull_request: "7", anchors: [] };
  assert.equal(verb.render(posted), "posted 3 thread(s) to PR 7");
});
