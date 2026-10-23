import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { GitFailed, gitRead, gitRun } from "./git.mts";
import { gitIn, gitOut, gitRepo } from "#test/git.mts";
import { withProject } from "#test/project.mts";

test("gitRead is null outside a repo and gitRun throws there, naming the subcommand (T-1.5)", (t) => {
  const root = withProject(t, { picket: false });
  assert.equal(gitRead(root, ["rev-parse", "--show-toplevel"]), null);
  assert.throws(() => gitRun(root, ["--literal-pathspecs", "rev-parse", "--show-toplevel"]), /^Error: git rev-parse failed: .+/);
});

test("gitRead end-trims its answer and gitRun returns the raw output inside a repo (T-1.5)", (t) => {
  const root = gitRepo(t);
  assert.equal(gitRead(root, ["rev-parse", "--abbrev-ref", "HEAD"]), "main");
  assert.equal(gitRun(root, ["rev-parse", "--abbrev-ref", "HEAD"]), "main\n");
  assert.equal(gitRun(root, ["hash-object", "--stdin"], { input: "one\n" }).trim(), gitOut(root, "rev-parse", "HEAD:a.txt"));
  const env = { ...process.env, GIT_AUTHOR_NAME: "Env Author", GIT_AUTHOR_EMAIL: "env@example.com" };
  assert.match(gitRun(root, ["var", "GIT_AUTHOR_IDENT"], { env }), /^Env Author <env@example\.com> /);
});

test("gitRead with buffer returns a CRLF blob byte for byte, and null for a missing path (T-2.4)", (t) => {
  const root = withProject(t, { picket: false });
  gitIn(root, "init", "-q");
  writeFileSync(join(root, "a.txt"), "one\r\ntwo\r\n\r\n");
  gitIn(root, "-c", "core.autocrlf=false", "add", "-A");
  gitIn(root, "commit", "-q", "-m", "crlf");
  const bytes = gitRead(root, ["cat-file", "blob", "HEAD:a.txt"], { buffer: true });
  assert.ok(Buffer.isBuffer(bytes));
  assert.deepEqual(bytes, Buffer.from("one\r\ntwo\r\n\r\n"));
  assert.equal(gitRead(root, ["cat-file", "blob", "HEAD:missing.txt"], { buffer: true }), null);
});

test("gitRun returns the output of an allowed exit code and throws GitFailed on any other (T-4.4)", (t) => {
  const root = gitRepo(t);
  assert.equal(gitRun(root, ["grep", "-e", "zzz"], { okExitCodes: [0, 1] }), "");
  assert.throws(() => gitRun(root, ["grep", "-e", "rate["], { okExitCodes: [0, 1] }), (err) => err instanceof GitFailed && err.message.startsWith("git grep failed:"));
});
