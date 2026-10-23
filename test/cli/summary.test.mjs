import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { readBases } from "../../dist/lib/shared/repos.mjs";
import { runCli } from "#test/cli.mts";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";

test("picket open records each nested repo's HEAD in repos.yaml (T-3.4)", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "README.md": "umbrella\n" }, message: "root" });
  const orders = join(root, "src", "Orders");
  mkdirSync(orders, { recursive: true });
  gitIn(orders, "init", "-q", "-b", "main");
  writeIn(orders, "pricing.cs", "class Pricing {}\n");
  gitIn(orders, "add", "-A");
  gitIn(orders, "commit", "-q", "-m", "orders");
  const r = runCli(root, ["open", "--lane", "order", "--title", "x", "--root", root]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readBases(root, r.json.id), { "src/Orders": gitOut(orders, "rev-parse", "HEAD") });
});
