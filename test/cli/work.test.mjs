import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

function envWithSession(session) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  if (session !== undefined) env.CLAUDE_CODE_SESSION_ID = session;
  return env;
}

function open(root, args, env = process.env) {
  const r = runCli(root, ["open", ...args, "--root", root], { env: { ...env, CLAUDE_PROJECT_DIR: root } });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("harness new saves --text and --request byte for byte as request.md, and nothing without them (T-1.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const text = 'Add a "fee" rule\nline two, with a trailing space ';
  const a = open(root, ["--lane", "order", "--title", "With text", "--text", text]);
  assert.equal(readFileSync(join(root, "work", a.id, "request.md"), "utf8"), text);
  const file = join(root, "req.txt");
  writeFileSync(file, "from a file\r\nkept CRLF\r\n");
  const b = open(root, ["--lane", "order", "--title", "With file", "--request", file]);
  assert.deepEqual(readFileSync(join(root, "work", b.id, "request.md")), readFileSync(file));
  const c = open(root, ["--lane", "order", "--title", "Without"]);
  assert.equal(existsSync(join(root, "work", c.id, "request.md")), false);
});

test("picket open stamps the session from CLAUDE_CODE_SESSION_ID and writes no session line without it (T-2.1)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const create = (title, session) => open(root, ["--lane", "fast", "--title", title], envWithSession(session)).id;
  const stamped = create("Stamped", "s1");
  assert.match(readFileSync(join(root, "work", stamped, "state.yaml"), "utf8"), /^session: s1$/m);
  const unstamped = create("Unstamped", undefined);
  assert.doesNotMatch(readFileSync(join(root, "work", unstamped, "state.yaml"), "utf8"), /^session:/m);
  assert.equal(JSON.parse(runCli(root, ["state", unstamped, "--root", root]).stdout).session, undefined);
});
