import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { laneOf } from "./lane.mts";
import { forcedLane, mentionedPaths, signalsOf } from "./signals.mts";
import { DEFAULT_SECURITY_PATHS } from "../config.mjs";
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

const admittedLane = (text: string) => laneOf(signalsOf(text, [], [], []), { fast: { max_files: 3 } });

test("a check that also asks to create something is an order, not research (T-2.1)", () => {
  assert.equal(admittedLane("Check whether the CSV export works and create a test for it.").lane, "order");
});

test("a check whether an irreversible step is safe keeps the design lane (T-2.2)", () => {
  const admission = admittedLane("See if we can drop table legacy_users safely.");
  assert.equal(admission.lane, "design");
  assert.ok(admission.reasons.includes("an irreversible step"), admission.reasons.join("; "));
});

test("a check whether migration work ran keeps the design lane (T-2.3)", () => {
  const admission = admittedLane("Verify whether the migration backfill ran on all rows.");
  assert.equal(admission.lane, "design");
  assert.ok(admission.reasons.includes("schema or data migration work"), admission.reasons.join("; "));
});

test("a plain check and an explanation of migration work stay research (T-2.4)", () => {
  assert.equal(admittedLane("Check whether the CSV export works.").lane, "research");
  assert.equal(admittedLane("Explain how the migration backfill works.").lane, "research");
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

const securityOf = (request: string) => signalsOf(request, [], [], DEFAULT_SECURITY_PATHS).security;

test("a verdict token beside a session word in the same sentence is not a credential (T-4.1)", () => {
  assert.equal(securityOf("Fix the verdict token check in route.verdict so a session that stops without one is bounced."), false);
});

test("a token beside a credential word, and a one-word quoted identifier, still raise security (T-4.2)", () => {
  for (const request of [
    "Store the token in a cookie after login.",
    "Store the session token in an httpOnly cookie.",
    "Rotate the access token the server uses to call the tax service every hour.",
    "Rename `password` to `passwordHash` in src/config.ts.",
  ]) {
    assert.equal(securityOf(request), true, request);
  }
});

test("a token count is not a credential when only another sentence holds a credential word", () => {
  assert.equal(securityOf("Show the token count per agent. The session page is unchanged."), false);
  assert.equal(securityOf("Cap the access token count at five."), true);
});

test("beside a verdict token, a token without a credential qualifier is a verdict token", () => {
  assert.equal(securityOf("Name the verdict token and check that the token sits alone on the last line."), false);
  assert.equal(securityOf("Name the verdict token in the docs and validate the bearer token in the middleware."), true);
});

test("a token beside a verdict token and a credential word in the same sentence is still a credential", () => {
  assert.equal(signalsOf("Rename the verdict token constant, and store the token in a cookie after login.", [], [], ["src/auth/"]).security, true);
  assert.equal(securityOf("Rename the verdict token constant. Store the token in a cookie after login."), true);
});

test("a quoted span that holds a security word is kept", () => {
  assert.equal(securityOf('Fix "the login password check" in the form.'), true);
  assert.equal(securityOf("Fix the bug in `password reset` flow."), true);
});

test("a bare token is still a credential", () => {
  assert.equal(securityOf("Expire the token after 15 minutes of inactivity."), true);
});

test("quoted prose is not migration work, while an unquoted irreversible step still is (T-4.3)", () => {
  assert.equal(signalsOf('Document the example "run the migration and backfill the schema" in the admit tests.', [], [], []).migration, false);
  assert.equal(signalsOf("See if we can drop table legacy_users safely.", [], [], []).irreversible, true);
});
