import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { edgeContext } from "../../dist/lib/context.mjs";

function withSessionEnv(value, fn) {
  const saved = process.env.CLAUDE_CODE_SESSION_ID;
  if (value === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
  else process.env.CLAUDE_CODE_SESSION_ID = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
    else process.env.CLAUDE_CODE_SESSION_ID = saved;
  }
}

test("edgeContext reads the root, environment, home folder and clock of the process", () => {
  const context = withSessionEnv("s-1", () => edgeContext("/project"));
  assert.equal(context.root, "/project");
  assert.equal(context.env, process.env);
  assert.equal(context.home, homedir());
  assert.equal(context.session, "s-1");
  const before = Date.now();
  assert.ok(context.now().getTime() >= before);
});

test("edgeContext gives a null session when CLAUDE_CODE_SESSION_ID is unset", () => {
  assert.equal(withSessionEnv(undefined, () => edgeContext("/project")).session, null);
});
