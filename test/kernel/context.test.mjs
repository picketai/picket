import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { edgeContext } from "../../dist/lib/shared/context.mjs";

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

test("edgeContext reads the root, environment, home folder, clock and session of the process (T-1.8)", () => {
  const context = withSessionEnv("s-1", () => edgeContext("/r"));
  assert.equal(context.root, "/r");
  assert.equal(context.env, process.env);
  assert.equal(context.home, homedir());
  assert.equal(context.session, "s-1");
  assert.ok(Math.abs(context.now().getTime() - Date.now()) < 1000);
});

test("edgeContext takes the working folder of the process", () => {
  assert.equal(edgeContext("/r").cwd, process.cwd());
});

test("edgeContext takes the platform of the process", () => {
  assert.equal(edgeContext("/r").platform, process.platform);
});

test("edgeContext gives a null session when CLAUDE_CODE_SESSION_ID is unset (T-1.8)", () => {
  assert.equal(withSessionEnv(undefined, () => edgeContext("/r")).session, null);
});
