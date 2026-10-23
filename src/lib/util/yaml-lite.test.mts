import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, readValue, stringify, frontmatter, type YamlMap } from "./yaml-lite.mts";
import { branchingManifestPath } from "../shared/paths.mts";
import { nestedRepos } from "../shared/repos.mts";
import { withProject } from "#test/project.mts";

type CorpusDocument = { path: string; text: string; expected: YamlMap };

test("parses scalars, inline lists and nested maps", () => {
  const doc = parse(`
# comment
id: 20260907-pagination
lane: fast
count: 3
flag: true
empty:
tags: [a, "b c", 7]
server:
  port: 8080
  host: "127.0.0.1"
`);
  assert.deepEqual(doc, {
    id: "20260907-pagination",
    lane: "fast",
    count: 3,
    flag: true,
    empty: null,
    tags: ["a", "b c", 7],
    server: { port: 8080, host: "127.0.0.1" },
  });
});

test("parses block lists of maps and of scalars", () => {
  const doc: any = parse(`
phases:
  - n: 1
    title: Add the route
    files: [src/http/handlers.ts]
    drive: false
  - n: 2
    title: Tests
    files: []
steps:
  - first
  - second
`);
  assert.equal(doc.phases.length, 2);
  assert.deepEqual(doc.phases[0], { n: 1, title: "Add the route", files: ["src/http/handlers.ts"], drive: false });
  assert.deepEqual(doc.phases[1].files, []);
  assert.deepEqual(doc.steps, ["first", "second"]);
});

test("round-trips through stringify", () => {
  const obj = { id: "x-1", lane: "order", title: "Add: a thing, with commas", n: 2, ok: false, tags: ["a", "b"], phases: [{ n: 1, files: ["a.ts"] }, { n: 2, files: [] }] };
  const text = stringify(obj);
  assert.deepEqual(parse(text), obj);
});

test("rejects malformed input instead of guessing", () => {
  assert.throws(() => parse("key without colon"));
  assert.throws(() => parse("a: 1\n   b: 2"));
});

test("quoted scalars unescape, so a regex written in double quotes reaches RegExp intact", () => {
  // seen live: the architect wrote pattern: "lines\\[0\\]\\.quantity" and the grep must_have could never match
  const doc: any = parse('greps:\n  - path: test/v.test.ts\n    pattern: "lines\\\\[0\\\\]\\\\.quantity"\n  - path: a\n    pattern: \'it\'\'s\'\n  - path: b\n    pattern: plain\\.csv\n');
  assert.equal(doc.greps[0].pattern, "lines\\[0\\]\\.quantity");
  assert.equal(new RegExp(doc.greps[0].pattern).test("expect(res.body.error.field).toBe('lines[0].quantity')"), true);
  assert.equal(doc.greps[1].pattern, "it's");
  assert.equal(doc.greps[2].pattern, "plain\\.csv");
  assert.equal(parse('s: "a\\"b\\n"').s, 'a"b\n');
});

test("a trailing comment ends the value", () => {
  assert.deepEqual(parse("n: 1 # one"), { n: 1 });
});

const VALUES: [string, unknown][] = [
  ["1 # one", 1],
  ["{path: src/a.ts, pattern: foo}", { path: "src/a.ts", pattern: "foo" }],
  ['[{path: a.ts, pattern: "x, y"}, {path: b.ts, pattern: z}]', [{ path: "a.ts", pattern: "x, y" }, { path: "b.ts", pattern: "z" }]],
  ["[src/a.ts, src/b.ts] # two files", ["src/a.ts", "src/b.ts"]],
  ['"a #b"', "a #b"],
  ["https://x.example/y#z", "https://x.example/y#z"],
  ['"lines\\\\[0\\\\]"', "lines\\[0\\]"],
];

const REFUSED: [string, string][] = [
  ["|", "yaml-lite: unsupported value at line 7: |"],
  ["&x 1", "yaml-lite: unsupported value at line 7: &x 1"],
  ["{path: a, more: {b: 1}}", "yaml-lite: nested {...} or [...] inside {...} at line 7"],
  ["{path: a", "yaml-lite: unsupported value at line 7: {path: a"],
];

for (const [raw, expected] of VALUES) {
  test(`readValue reads ${raw}`, () => {
    assert.deepEqual(readValue(raw, 7), expected);
  });
}

for (const [raw, message] of REFUSED) {
  test(`readValue refuses ${raw}`, () => {
    assert.throws(() => readValue(raw, 7), { message });
  });
}

test("every work item document in the corpus reads as the parser at 3206f31 read it", () => {
  const corpus: CorpusDocument[] = JSON.parse(readFileSync(new URL("./yaml-lite-corpus.test.json", import.meta.url), "utf8"));
  assert.ok(corpus.length >= 152, `${corpus.length} documents`);
  for (const { path, text, expected } of corpus) assert.deepEqual(parse(text), expected, path);
});

test("frontmatter names the line in the file when it refuses a value", () => {
  const text = "---\nkind: design\nlane: design\ntitle: x\nnotes: |\n  line one\n---\nbody";
  assert.throws(() => frontmatter(text), { message: /at line 5: \|$/ });
});

test("a key whose value is only a comment opens a block", () => {
  assert.deepEqual(parse("files: # later\n  - a"), { files: ["a"] });
});

test("a branching manifest path with a trailing comment names the nested repository", (t) => {
  const root = withProject(t, { picket: false });
  mkdirSync(dirname(branchingManifestPath(root)), { recursive: true });
  writeFileSync(branchingManifestPath(root), "version: 1\nrepos:\n  - path: src/Orders # the orders repo\n    default_branch: main\n");
  assert.deepEqual(nestedRepos(root), [{ path: "src/Orders", default_branch: "main" }]);
});

test("strings holding a hash or a brace survive a round trip", () => {
  const obj = { a: "x #y", u: "https://x.example/y#z", m: "{x", n: 3 };
  assert.deepEqual(parse(stringify(obj)), obj);
});

test("frontmatter splits and tolerates its absence", () => {
  const { front, body } = frontmatter("---\nlane: order\n---\n# Title\nbody");
  assert.deepEqual(front, { lane: "order" });
  assert.equal(body, "# Title\nbody");
  assert.deepEqual(frontmatter("# no front").front, {});
});
