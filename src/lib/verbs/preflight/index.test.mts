import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { preflight, verb } from "./index.mts";
import { gitRepo, writeIn } from "#test/git.mts";
import { openItem, writeArtifact } from "#test/project.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("state, preflight and packet need a valid work item id", () => {
  assert.throws(() => parse([]), UsageError);
  assert.throws(() => parse(["../etc"]), UsageError);
  assert.equal(parse([ID]).id, ID);
});

test("preflight saves its warn lines to preflight.txt and removes the file once none remain", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "package.json": '{ "scripts": { "test": "node -e 0" } }\n', ".claude/PROJECT-MAP.md": "# Map\n" } });
  const id = openItem(root, { lane: "order", title: "Warned" }).id;
  writeArtifact(root, id, "order.md", "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  const saved = join(root, "work", id, "preflight.txt");
  const machine = { home: root, env: {}, platform: process.platform };
  writeIn(root, "loose.txt", "uncommitted\n");
  const warned = preflight(root, id, machine);
  const warnLines = readFileSync(saved, "utf8").trimEnd().split("\n");
  assert.deepEqual(warnLines, warned.checks.filter((c) => c.level === "warn").map((c) => `warn ${c.name}: ${c.detail}`));
  assert.ok(warnLines.some((line) => line.startsWith("warn tree: ")), warnLines.join("\n"));
  rmSync(join(root, "loose.txt"));
  const clean = preflight(root, id, machine);
  assert.deepEqual(clean.checks.filter((c) => c.level === "warn"), []);
  assert.equal(existsSync(saved), false);
});

test("a preflight.txt it cannot write becomes a warn line and leaves ok to the other checks", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "package.json": '{ "scripts": { "test": "node -e 0" } }\n', ".claude/PROJECT-MAP.md": "# Map\n" } });
  const id = openItem(root, { lane: "order", title: "Unwritable" }).id;
  writeArtifact(root, id, "order.md", "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  mkdirSync(join(root, "work", id, "preflight.txt"));
  writeIn(root, "loose.txt", "uncommitted\n");
  const report = preflight(root, id, { home: root, env: {}, platform: process.platform });
  const unsaved = report.checks.find((c) => c.name === "preflight_file");
  assert.equal(unsaved?.level, "warn");
  assert.match(unsaved?.detail ?? "", new RegExp(`^work/${id}/preflight\\.txt not written: `));
  assert.equal(report.ok, !report.checks.some((c) => c.level === "fail"));
  assert.match(verb.render(report), /^warn preflight_file: /m);
});
