import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXED_NOW, fixedContext } from "#test/context.mts";
import type { Prompt } from "../../util/prompt.mts";
import { hostFrom } from "./host.mts";

const ANSWER = "yes";

function answering(): Prompt {
  return { interactive: true, ask: async () => ANSWER };
}

test("hostFrom carries the context's home, env, platform and clock and the prompt's question", async () => {
  const context = fixedContext("/project", { home: "/home/ana", env: { TERM_PROGRAM: "Apple_Terminal" }, platform: "darwin" });
  const host = hostFrom(context, answering());
  assert.equal(host.home, "/home/ana");
  assert.deepEqual(host.env, { TERM_PROGRAM: "Apple_Terminal" });
  assert.equal(host.platform, "darwin");
  assert.equal(host.now().toISOString(), FIXED_NOW);
  assert.equal(host.interactive, true);
  assert.equal(await host.ask("Go ahead?", { fallback: "no" }), ANSWER);
});

test("the host's exec of a missing program returns status null without throwing", () => {
  const host = hostFrom(fixedContext("/project"), answering());
  const run = host.exec("picket-no-such-program", ["--version"]);
  assert.equal(run.status, null);
  assert.notEqual(run.stderr, "");
});
