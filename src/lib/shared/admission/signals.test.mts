import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { forcedLane, mentionedPaths } from "./signals.mts";
import { withProject } from "#test/project.mts";

function existsIn(t: TestContext): (path: string) => boolean {
  const root = withProject(t, { host: true, picket: false });
  for (const p of ["src/http/handlers.ts", "src/config.ts", ".claude/settings.json"]) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), "");
  }
  return (path) => existsSync(join(root, path));
}

test("mentionedPaths keeps only paths that exist", (t) => {
  assert.deepEqual(mentionedPaths("see `src/config.ts` and `src/nope.ts` and src/http/handlers.ts:12", existsIn(t)), ["src/config.ts", "src/http/handlers.ts"]);
});

test("mentionedPaths finds an unbackticked dot-directory path that exists", (t) => {
  const exists = existsIn(t);
  assert.deepEqual(mentionedPaths("Edit .claude/settings.json.", exists), [".claude/settings.json"]);
  assert.deepEqual(mentionedPaths("Edit .claude/nope.json", exists), []);
  assert.deepEqual(mentionedPaths("Edit src/.claude/settings.json", exists), []);
});

test("a quoted or backticked lane directive is a mention and forces nothing", () => {
  assert.equal(forcedLane("lane: design. Rename a variable."), "design");
  assert.equal(forcedLane("Rename the helper.\nlane: fast"), "fast");
  assert.equal(forcedLane("Don't touch the tests. lane: order. It's small."), "order");
  for (const p of [
    "Say that only the user overrides it with `lane: fast`.",
    'The docs tell users to write "lane: design" on its own line.',
    "The docs tell users to write 'lane: research' on its own line.",
    "The docs tell users to write “lane: order” on its own line.",
    "Show the override:\n```\nlane: fast\n```",
  ]) assert.equal(forcedLane(p), undefined, p);
});
