import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { forcedLane, mentionedPaths, signalsOf } from "./signals.mts";
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

test("a dotted identifier such as lint.schema is not migration work", () => {
  assert.equal(signalsOf("Trim the report Summary to the 3 ids lint.schema allows.", [], [], []).migration, false);
  assert.equal(signalsOf("Rename `lint.schema` to lint.report.", [], [], []).migration, false);
  assert.equal(signalsOf("Change the schema of the orders table.", [], [], []).migration, true);
  assert.equal(signalsOf("Add a schema for the export file.", [], [], []).migration, true);
  assert.equal(signalsOf("Run alter table on orders.", [], [], []).migration, true);
});

test("schema inside a work item id, a path or the phrase JSON schema is not migration work (T-1.2)", () => {
  const migration = (text: string) => signalsOf(text, [], [], []).migration;
  assert.equal(migration("Fix the typo in the title of work item 20261109-fix-budget-schema-session-admit-findings."), false);
  assert.equal(migration("Remove the stale cost_usd field from bench/schema/ledger-v2.schema.json; the ledger no longer writes it."), false);
  assert.equal(migration("Remove the stale cost_usd field from the ledger JSON schema; the ledger no longer writes it."), false);
  assert.equal(migration("Migrate the invoices file to one invoice per line."), true);
});

const REVIEW_PARAGRAPH = "With all the changes that we've currently done, I want to see if there are things that we need to adjust in our Picket solution. My main concern is consistency, determinism, and performance. I want to see if we messed with any of these in our changes so far.";

test("a request that only asks to see or check whether something holds is research; one that also asks for a change is not (T-2.3)", () => {
  const research = (text: string) => signalsOf(text, [], [], []).research;
  assert.equal(research(REVIEW_PARAGRAPH), true);
  assert.equal(research("Check whether the pagination change regressed the page count."), true);
  assert.equal(research("Check whether the pagination change regressed the page count and fix it."), false);
  assert.equal(research("Check if the CSV export still sorts newest first, and update the test."), false);
});

test("numbered_items counts the lines that open with a number, a dot or bracket and a space (T-2.1)", () => {
  const count = (text: string) => signalsOf(text, [], [], []).numbered_items;
  assert.equal(count("Fix these:\n1. a\n2. b\n3. c"), 3);
  assert.equal(count("1) a\n 2) b\n3) c"), 3);
  assert.equal(count("2.1.319 is the version\n1. x"), 1);
  assert.equal(count("Bump vitest from 1.5 to 1.6"), 0);
  assert.equal(count("Fix 3. the typo"), 0);
});

test("a request that opens with a change verb is not research because it mentions a report", () => {
  assert.equal(signalsOf("Implement the lint over artifacts/reports and the report template.", [], [], []).research, false);
  assert.equal(signalsOf("Update the report schema check to cap findings at 50.", [], [], []).research, false);
  assert.equal(signalsOf("Write a report on how pricing picks the tier.", [], [], []).research, true);
  assert.equal(signalsOf("How does the report get its findings count?", [], [], []).research, true);
});
