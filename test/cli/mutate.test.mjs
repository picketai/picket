import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_FILES, statePath } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { gitRepo, writeIn } from "#test/git.mts";
import { openItem, writeConfig } from "#test/project.mts";

const SOURCE = "export function same(a, b) {\n  return 0;\n}\n";
const CHANGED = "export function same(a, b) {\n  if (a === b) return 1;\n  return 0;\n}\n";

test("a mutant the tests do not catch survives, is saved to mutation.json, and the file is restored byte for byte (T-6.1)", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": SOURCE } });
  writeConfig(root, { version: 1, commands: { test: "node -e 0" } });
  const { id } = openItem(root, { lane: "order", title: "Same" });
  writeIn(root, "src/same.js", CHANGED);
  const r = runCli(root, ["mutate", id, "--root", root, "--human"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "mutant src/same.js:2 === -> !==: survived");
  const saved = JSON.parse(readFileSync(join(root, "work", id, "mutation.json"), "utf8"));
  assert.deepEqual([saved.outcome, saved.mutant], ["survived", { path: "src/same.js", line: 2, from: "===", to: "!==" }]);
  assert.equal(saved.command, "node -e 0");
  assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
  assert.equal(existsSync(statePath(root, STATE_FILES.mutationRestore)), false);
});
