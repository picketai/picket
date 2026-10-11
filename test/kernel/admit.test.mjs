import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { admit, recheck, mentionedPaths, forcedLane } from "../../core/lib/admit.mjs";
import { writeConfig } from "./config-fixture.mjs";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "harness-admit-"));
  mkdirSync(join(root, ".claude"));
  for (const p of ["src/http/handlers.ts", "src/http/server.ts", "src/config.ts", "src/domain/money.ts", "src/domain/pricing.ts", "data/config.json", ".claude/settings.json"]) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), "");
  }
  return root;
}

test("a configured fast cap of one file keeps a two-file request out of the fast lane (T-5.3)", () => {
  const root = repo();
  const request = "fix the typo in `src/config.ts` and `src/http/server.ts`";
  assert.equal(admit(request, { root }).lane, "fast");
  writeConfig(root, { version: 1, lanes: { fast: { max_files: 1 } } });
  const capped = admit(request, { root });
  assert.equal(capped.lane, "order");
  assert.ok(capped.reasons.some((r) => /more than the fast cap of 1/.test(r)));
  rmSync(root, { recursive: true, force: true });
});

test("mentionedPaths keeps only paths that exist", () => {
  const root = repo();
  assert.deepEqual(mentionedPaths("see `src/config.ts` and `src/nope.ts` and src/http/handlers.ts:12", root), ["src/config.ts", "src/http/handlers.ts"]);
  rmSync(root, { recursive: true, force: true });
});

test("the six fast-lane requests land in fast", () => {
  const root = repo();
  const prompts = [
    "GET /invoices?page=1&size=2 skips the two newest invoices. Fix the offset in the list handler and add a unit test.",
    "loadConfig() throws when data/config.json has no server block. Fix the loader and cover the empty-object case with a unit test.",
    "`applyStuff` in src/domain/pricing.ts computes the subtotal and discount. Rename it to something that describes what it returns.",
    "When the port is taken the service exits silently. In src/http/server.ts log the error to stderr before exiting.",
    "Change the default page size from 20 to 25 in the code default and data/config.json.",
    "An invoice at 7% tax shows 1.39; it should be 1.40. The helper in src/domain/money.ts truncates. Make it round half up.",
  ];
  for (const p of prompts) assert.equal(admit(p, { root }).lane, "fast", p);
  rmSync(root, { recursive: true, force: true });
});

test("new surfaces land in order, security and migrations in design, questions in research", () => {
  const root = repo();
  assert.equal(admit("Add an endpoint GET /invoices/:id/summary that returns the totals. Add unit tests.", { root }).lane, "order");
  assert.equal(admit("Accounting wants a CSV of all invoices. Add GET /invoices.csv with a header row. Put the formatting in its own module.", { root }).lane, "order");
  assert.equal(admit("Every endpoint must require an API key. Add an authentication layer under src/auth/.", { root }).lane, "design");
  assert.equal(admit("Add a status field with a data migration that rewrites data/invoices.json once.", { root }).lane, "design");
  assert.equal(admit("Before we touch pricing I need to understand it. Write a short report: how is an invoice total computed? No code changes.", { root }).lane, "research");
  assert.equal(admit("Map the life of a POST /invoices request from the socket to the JSON file. Write it as a report. No code changes.", { root }).lane, "research");
  rmSync(root, { recursive: true, force: true });
});

const SPIKE_REQUEST = "Picket plugin spike: a research work item whose throwaway code lives only under `spike/`. Question: can a Claude Code plugin carry Picket? Check that a version bump arrives with one update command.";

test("a request that calls itself a research work item lands in research despite a bump (T-2.1)", () => {
  const root = repo();
  const r = admit(SPIKE_REQUEST, { root });
  assert.equal(r.lane, "research");
  assert.equal(r.signals.declared_research, true);
  rmSync(root, { recursive: true, force: true });
});

test("a declared research work item that adds a surface still lands in order (T-2.2)", () => {
  const root = repo();
  assert.equal(admit("This is a research work item: add an endpoint GET /invoices/:id/summary.", { root }).lane, "order");
  rmSync(root, { recursive: true, force: true });
});

test("a heading rename that mentions a verdict token lands in fast without the security signal (T-2.3)", () => {
  const root = repo();
  const r = admit("Rename the research lane's closing block heading in `.claude/skills/researching/SKILL.md` from '## Report: <id>' to '## Research closed: <id>', so the lead's closing block no longer matches the analyst contract heading that guard.block treats as a hand-back needing a verdict token.", { root });
  assert.equal(r.lane, "fast");
  assert.equal(r.signals.security, false);
  rmSync(root, { recursive: true, force: true });
});

test("a credential token, alone or beside a verdict token, keeps the design lane (T-2.4)", () => {
  const root = repo();
  for (const p of [
    "Expire the token after 15 minutes of inactivity.",
    "Rotate the refresh token on every login.",
    "Name the verdict token in the docs and validate the bearer token in the middleware.",
  ]) {
    const r = admit(p, { root });
    assert.equal(r.lane, "design", p);
    assert.equal(r.signals.security, true, p);
  }
  rmSync(root, { recursive: true, force: true });
});

test("a token count in a cost table is not a security concern (T-2.5)", () => {
  const root = repo();
  assert.equal(admit("Show the token count per agent in the cost table.", { root }).signals.security, false);
  rmSync(root, { recursive: true, force: true });
});

test("a credential context word keeps a token phrase flagged (T-1.1, T-1.2)", () => {
  const root = repo();
  for (const p of ["Limit the refresh token count per user to five.", "Invalidate cached tokens when the user logs out."]) {
    const r = admit(p, { root });
    assert.equal(r.lane, "design", p);
    assert.equal(r.signals.security, true, p);
  }
  rmSync(root, { recursive: true, force: true });
});

test("a verdict token rename stays in fast without the security signal (T-1.3)", () => {
  const root = repo();
  const p = "Rename the verdict token heading in the skill";
  const r = admit(p, { root });
  assert.equal(r.lane, "fast", p);
  assert.equal(r.signals.security, false, p);
  rmSync(root, { recursive: true, force: true });
});

test("plural tokens and qualified token counts set the security signal (T-1.4)", () => {
  const root = repo();
  for (const p of ["Expire the tokens after 15 minutes of inactivity.", "Cap the access token count at five."]) {
    assert.equal(admit(p, { root }).signals.security, true, p);
  }
  rmSync(root, { recursive: true, force: true });
});

test("cached tokens in a cost table with no credential context are not a security concern (T-1.6)", () => {
  const root = repo();
  const p = "Show cached tokens per agent in the cost table.";
  assert.equal(admit(p, { root }).signals.security, false, p);
  rmSync(root, { recursive: true, force: true });
});

test("the order fallback names the facts that decided it", () => {
  const root = repo();
  const r = admit("Improve the invoice list page", { root });
  assert.equal(r.lane, "order");
  assert.deepEqual(r.reasons, ["no small-change word and no file named; order is the default"]);
  rmSync(root, { recursive: true, force: true });
});

test("removing keys, lines, entries, settings or hooks is a small change", () => {
  const root = repo();
  for (const p of ["Remove the broken hooks", "Delete three keys from the JSON file", "Fix or remove the broken hooks"]) {
    const r = admit(p, { root });
    assert.equal(r.lane, "fast", p);
    assert.equal(r.signals.small_change, true, p);
  }
  rmSync(root, { recursive: true, force: true });
});

test("removing a module stays in order and deleting records stays in design", () => {
  const root = repo();
  assert.equal(admit("Remove the billing module", { root }).lane, "order");
  assert.equal(admit("Remove the two stale broken hooks", { root }).signals.small_change, false);
  assert.equal(admit("Delete the records older than a year", { root }).lane, "design");
  rmSync(root, { recursive: true, force: true });
});

test("mentionedPaths finds an unbackticked dot-directory path that exists", () => {
  const root = repo();
  assert.deepEqual(mentionedPaths("Edit .claude/settings.json.", root), [".claude/settings.json"]);
  assert.deepEqual(mentionedPaths("Edit .claude/nope.json", root), []);
  assert.deepEqual(mentionedPaths("Edit core/.claude/settings.json", root), []);
  rmSync(root, { recursive: true, force: true });
});

test("a request naming .claude/settings.json without backticks lands in fast", () => {
  const root = repo();
  const r = admit("Drop the stale keys from .claude/settings.json", { root });
  assert.equal(r.lane, "fast");
  assert.ok(r.signals.mentioned_paths.includes(".claude/settings.json"));
  rmSync(root, { recursive: true, force: true });
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

test("a request quoting the directive keeps its computed lane", () => {
  const root = repo();
  const r = admit("Add an endpoint GET /lanes that documents the `lane: fast` override.", { root });
  assert.equal(r.lane, "order");
  assert.equal(r.signals.forced, null);
  rmSync(root, { recursive: true, force: true });
});

test("an explicit lane wins and a recheck escalates on overrun", () => {
  const root = repo();
  assert.equal(admit("lane: design. Rename a variable.", { root }).lane, "design");
  const r = recheck("fast", "Fix the pagination offset in the list handler.", ["src/http/handlers.ts", "src/http/router.ts", "src/config.ts", "src/domain/money.ts"], { root });
  assert.equal(r.escalate, true);
  assert.equal(r.lane, "order");
  const ok = recheck("fast", "Fix the pagination offset in the list handler.", ["src/http/handlers.ts"], { root });
  assert.equal(ok.escalate, false);
  rmSync(root, { recursive: true, force: true });
});
