import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { admit, verb } from "./index.mts";
import { NO_LANE } from "./lane.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { withProject, writeConfig } from "#test/project.mts";

const REPO_FILES = ["src/http/handlers.ts", "src/http/server.ts", "src/config.ts", "src/domain/money.ts", "src/domain/pricing.ts", "src/auth/login.ts", "data/config.json", ".claude/settings.json"];

function repo(t: TestContext): string {
  const root = withProject(t, { host: true, picket: false });
  for (const p of REPO_FILES) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), "");
  }
  return root;
}

const parse = (argv: string[], stdin?: () => string) => verb.parse(parseArgs(argv, stdin));

test("admit takes the text, a file, or standard input for -, and splits --touched", () => {
  assert.deepEqual(parse(["--text", "fix a typo", "--touched", "a.ts, b.ts"]), { text: "fix a typo", file: null, touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse(["--request", "req.md"]), { text: null, file: "req.md", touched: [] });
  assert.deepEqual(parse(["--request", "-"], () => "from stdin"), { text: "from stdin", file: null, touched: [] });
  assert.deepEqual(parse([]), { text: "", file: null, touched: [] });
  assert.throws(() => parse(["--text"]), UsageError);
});

test("a configured fast cap of one file keeps a two-file request out of the fast lane (T-5.3)", (t) => {
  const root = repo(t);
  const request = "fix the typo in `src/config.ts` and `src/http/server.ts`";
  assert.equal(admit(root, request).lane, "fast");
  writeConfig(root, { version: 1, lanes: { fast: { max_files: 1 } } });
  const capped = admit(root, request);
  assert.equal(capped.lane, "order");
  assert.ok(capped.reasons.some((r) => /more than the fast cap of 1/.test(r)));
});

test("the six fast-lane requests land in fast", (t) => {
  const root = repo(t);
  const prompts = [
    "GET /invoices?page=1&size=2 skips the two newest invoices. Fix the offset in the list handler and add a unit test.",
    "loadConfig() throws when data/config.json has no server block. Fix the loader and cover the empty-object case with a unit test.",
    "`applyStuff` in src/domain/pricing.ts computes the subtotal and discount. Rename it to something that describes what it returns.",
    "When the port is taken the service exits silently. In src/http/server.ts log the error to stderr before exiting.",
    "Change the default page size from 20 to 25 in the code default and data/config.json.",
    "An invoice at 7% tax shows 1.39; it should be 1.40. The helper in src/domain/money.ts truncates. Make it round half up.",
  ];
  for (const p of prompts) assert.equal(admit(root, p).lane, "fast", p);
});

test("new surfaces land in order, security and migrations in design, questions in research", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "Add an endpoint GET /invoices/:id/summary that returns the totals. Add unit tests.").lane, "order");
  assert.equal(admit(root, "Accounting wants a CSV of all invoices. Add GET /invoices.csv with a header row. Put the formatting in its own module.").lane, "order");
  assert.equal(admit(root, "Every endpoint must require an API key. Add an authentication layer under src/auth/.").lane, "design");
  assert.equal(admit(root, "Add a status field with a data migration that rewrites data/invoices.json once.").lane, "design");
  assert.equal(admit(root, "Before we touch pricing I need to understand it. Write a short report: how is an invoice total computed? No code changes.").lane, "research");
  assert.equal(admit(root, "Map the life of a POST /invoices request from the socket to the JSON file. Write it as a report. No code changes.").lane, "research");
});

const SPIKE_REQUEST = "Picket plugin spike: a research work item whose throwaway code lives only under `spike/`. Question: can a Claude Code plugin carry Picket? Check that a version bump arrives with one update command.";

test("a request that calls itself a research work item lands in research despite a bump (T-2.1)", (t) => {
  const r = admit(repo(t), SPIKE_REQUEST);
  assert.equal(r.lane, "research");
  assert.equal(r.signals.declared_research, true);
});

test("a declared research work item that adds a surface still lands in order (T-2.2)", (t) => {
  assert.equal(admit(repo(t), "This is a research work item: add an endpoint GET /invoices/:id/summary.").lane, "order");
});

test("a heading rename that mentions a verdict token lands in fast without the security signal (T-2.3)", (t) => {
  const r = admit(repo(t), "Rename the research lane's closing block heading in `.claude/skills/researching/SKILL.md` from '## Report: <id>' to '## Research closed: <id>', so the lead's closing block no longer matches the analyst contract heading that guard.block treats as a hand-back needing a verdict token.");
  assert.equal(r.lane, "fast");
  assert.equal(r.signals.security, false);
});

test("a credential token, alone or beside a verdict token, keeps the design lane (T-2.4)", (t) => {
  const root = repo(t);
  for (const p of [
    "Expire the token after 15 minutes of inactivity.",
    "Rotate the refresh token on every login.",
    "Name the verdict token in the docs and validate the bearer token in the middleware.",
  ]) {
    const r = admit(root, p);
    assert.equal(r.lane, "design", p);
    assert.equal(r.signals.security, true, p);
  }
});

test("a token count in a cost table is not a security concern (T-2.5)", (t) => {
  assert.equal(admit(repo(t), "Show the token count per agent in the cost table.").signals.security, false);
});

test("a credential context word keeps a token phrase flagged (T-1.1, T-1.2)", (t) => {
  const root = repo(t);
  for (const p of ["Limit the refresh token count per user to five.", "Invalidate cached tokens when the user logs out."]) {
    const r = admit(root, p);
    assert.equal(r.lane, "design", p);
    assert.equal(r.signals.security, true, p);
  }
});

test("a verdict token rename stays in fast without the security signal (T-1.3)", (t) => {
  const p = "Rename the verdict token heading in the skill";
  const r = admit(repo(t), p);
  assert.equal(r.lane, "fast", p);
  assert.equal(r.signals.security, false, p);
});

test("plural tokens and qualified token counts set the security signal (T-1.4)", (t) => {
  const root = repo(t);
  for (const p of ["Expire the tokens after 15 minutes of inactivity.", "Cap the access token count at five."]) {
    assert.equal(admit(root, p).signals.security, true, p);
  }
});

test("cached tokens in a cost table with no credential context are not a security concern (T-1.6)", (t) => {
  const p = "Show cached tokens per agent in the cost table.";
  assert.equal(admit(repo(t), p).signals.security, false, p);
});

test("the order fallback names the facts that decided it", (t) => {
  const r = admit(repo(t), "Improve the invoice list page");
  assert.equal(r.lane, "order");
  assert.deepEqual(r.reasons, ["no small-change word and no file named; order is the default"]);
});

test("removing keys, lines, entries, settings or hooks is a small change", (t) => {
  const root = repo(t);
  for (const p of ["Remove the broken hooks", "Delete three keys from the JSON file", "Fix or remove the broken hooks"]) {
    const r = admit(root, p);
    assert.equal(r.lane, "fast", p);
    assert.equal(r.signals.small_change, true, p);
  }
});

test("removing a module stays in order and deleting records stays in design", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "Remove the billing module").lane, "order");
  assert.equal(admit(root, "Remove the two stale broken hooks").signals.small_change, false);
  assert.equal(admit(root, "Delete the records older than a year").lane, "design");
});

test("a request naming .claude/settings.json without backticks lands in fast", (t) => {
  const r = admit(repo(t), "Drop the stale keys from .claude/settings.json");
  assert.equal(r.lane, "fast");
  assert.ok(r.signals.mentioned_paths.includes(".claude/settings.json"));
});

test("a request quoting the directive keeps its computed lane", (t) => {
  const r = admit(repo(t), "Add an endpoint GET /lanes that documents the `lane: fast` override.");
  assert.equal(r.lane, "order");
  assert.equal(r.signals.forced, null);
});

test("an explicit lane wins and a touch set past the cap leaves the fast lane", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "lane: design. Rename a variable.").lane, "design");
  const request = "Fix the pagination offset in the list handler.";
  assert.equal(admit(root, request, ["src/http/handlers.ts", "src/http/router.ts", "src/config.ts", "src/domain/money.ts"]).lane, "order");
  assert.equal(admit(root, request, ["src/http/handlers.ts"]).lane, "fast");
});

const LOGIN_TYPO = "lane: fast. Fix the typo in the login helper.";
const OVERRIDE_REASONS = ["lane forced by request (lane: fast)", "a security path wins over the forced lane: src/auth/login.ts"];

test("a touched or mentioned security path overrides a forced fast or order lane (T-1.1)", (t) => {
  const root = repo(t);
  const r = admit(root, LOGIN_TYPO, ["src/auth/login.ts"]);
  assert.equal(r.lane, "design");
  assert.equal(r.signals.forced, "fast");
  assert.deepEqual(r.signals.security_path_hits, ["src/auth/login.ts"]);
  assert.deepEqual(r.reasons, OVERRIDE_REASONS);
  assert.equal(admit(root, "lane: order. Fix the typo in the login helper.", ["src/auth/login.ts"]).lane, "design");
  assert.equal(admit(root, "lane: fast. Fix the typo in src/auth/login.ts.").lane, "design");
});

test("a security word or a mentioned security directory does not override a forced lane (T-1.3)", (t) => {
  const root = repo(t);
  const word = admit(root, "lane: fast. Fix the permission prompt wording in src/config.ts.");
  assert.equal(word.lane, "fast");
  assert.equal(word.signals.security, true);
  assert.deepEqual(word.signals.security_path_hits, []);
  const dir = admit(root, "lane: fast. Name src/auth/ in the docs table.");
  assert.equal(dir.lane, "fast");
  assert.deepEqual(dir.signals.security_path_hits, []);
});

test("backslash and dot-slash touched paths match a security path (T-1.4)", (t) => {
  const root = repo(t);
  for (const p of ["src\\auth\\login.ts", "./src/auth/login.ts"]) {
    const forced = admit(root, LOGIN_TYPO, [p]);
    assert.equal(forced.lane, "design", p);
    assert.deepEqual(forced.signals.security_path_hits, ["src/auth/login.ts"], p);
    assert.equal(admit(root, "Fix the typo in the login helper.", [p]).signals.security, true, p);
  }
});

test("a forced design or research lane holds with a security path touched (T-1.5)", (t) => {
  const root = repo(t);
  const design = admit(root, "lane: design. Fix the typo in the login helper.", ["src/auth/login.ts"]);
  assert.equal(design.lane, "design");
  assert.deepEqual(design.reasons, ["lane forced by request (lane: design)"]);
  assert.equal(admit(root, "lane: research. Explain the login helper.", ["src/auth/login.ts"]).lane, "research");
});

test("a configured security path overrides a forced fast lane (T-1.7)", (t) => {
  const root = repo(t);
  writeConfig(root, { version: 1, security_paths: ["lib/secure/"] });
  const r = admit(root, "lane: fast. Fix the typo.", ["lib/secure/keys.ts"]);
  assert.equal(r.lane, "design");
  assert.deepEqual(r.signals.security_path_hits, ["lib/secure/keys.ts"]);
});

test("a mentioned file under a configured glob entry is a security path hit", (t) => {
  const root = repo(t);
  mkdirSync(join(root, "src", "payments"));
  writeFileSync(join(root, "src", "payments", "fees.ts"), "");
  writeConfig(root, { version: 1, security_paths: ["src/payments/**"] });
  const r = admit(root, "Tidy the rounding in src/payments/fees.ts");
  assert.equal(r.lane, "design");
  assert.deepEqual(r.signals.security_path_hits, ["src/payments/fees.ts"]);
});

test("a default folder-name entry matches at any depth and only as a whole folder name", (t) => {
  const root = repo(t);
  assert.deepEqual(admit(root, "Fix the typo.", ["src/Api/Authentication/Login.cs"]).signals.security_path_hits, ["src/Api/Authentication/Login.cs"]);
  assert.deepEqual(admit(root, "Fix the typo.", ["src/authx/a.ts"]).signals.security_path_hits, []);
});

for (const request of [
  "Debug why GET /invoices returns 500 after the page size change",
  "debug the flaky invoice test",
  "Why does loadConfig throw on an empty file?",
]) {
  test(`a diagnosis request answers no lane and the debugging skill: ${request} (T-2.1)`, (t) => {
    const r = admit(repo(t), request);
    assert.deepEqual([r.lane, r.skill], [NO_LANE, "debugging"]);
    assert.equal(r.signals.diagnosis, true);
    assert.match(r.reasons[0], /diagnosis, not a change: run picket:debugging/);
  });
}

test("a fix verb, a security path with a fix verb and a forced lane keep today's routing (T-2.2)", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "Fix the bug where the CSV export crashes on an empty list").lane, "fast");
  assert.equal(admit(root, "Find why the CSV export crashes on an empty list and fix it").lane, "fast");
  assert.equal(admit(root, "Fix the crash in `src/auth/login.ts` when the password is empty").lane, "design");
  assert.equal(admit(root, "lane: order. Debug why the export crashes").lane, "order");
  assert.equal(admit(root, "When the port is taken the service exits silently, which is hard to diagnose. Log the error in `src/http/server.ts`.").lane, "fast");
  assert.equal(admit(root, "How does pricing pick the tier discount?").lane, "research");
});

test("a diagnosis that touches a security path takes the design lane", (t) => {
  const root = repo(t);
  const touched = admit(root, "debug the flaky invoice test", ["src/auth/login.ts"]);
  assert.equal(touched.lane, "design");
  assert.equal(touched.signals.diagnosis, true);
  assert.equal(admit(root, "Debug why login fails when the password has a space.").lane, "design");
});

test("a declared research item, a no-code-changes report and a change verb each keep a diagnosis phrase out of the skill", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "A research item: why does the nightly import fail on large files? Measure and report, product code untouched.").lane, "research");
  assert.equal(admit(root, "Why does the cache fail after restart? Write a report, no code changes.").lane, "research");
  for (const request of ["Find the root cause and patch it.", "Debug the retry and make the retry configurable.", "Find why it fails, then write a regression test and correct the handler.", "The invoice test is flaky. Make it pass."]) {
    assert.notEqual(admit(root, request).lane, NO_LANE, request);
  }
});

test("adding a skill, hook or verb is new surface and leaves the fast lane (T-3.1)", (t) => {
  const root = repo(t);
  for (const request of ["Add a debugging skill, picket:debugging, to the core.", "Add a hook that denies shell writes", "Add a new `picket mutate` verb", "Create a release agent", "adds a new `picket statusline` verb", "Introduce a subcommand for source pick"]) {
    const r = admit(root, request);
    assert.equal(r.lane, "order", request);
    assert.equal(r.signals.new_surface, true, request);
    assert.ok(r.reasons.includes("adds a new surface (endpoint, module, or handler)"), request);
  }
});

test("naming a surface without adding one keeps its lane, and diagnosis requests still answer none (T-3.2)", (t) => {
  const root = repo(t);
  assert.equal(admit(root, "Fix the typo in the hook table of `src/hooks/README.md`").lane, "fast");
  assert.equal(admit(root, "Rename the `--deleted` flag of the waive verb in one file").lane, "fast");
  assert.equal(admit(root, "how is a new hook registered?").lane, "research");
  assert.equal(admit(root, "How does a new skill get added? Write a report, no code changes.").lane, "research");
  for (const request of ["Debug why GET /invoices returns 500 after the page size change", "debug the flaky invoice test", "Why does loadConfig throw on an empty file?"]) {
    assert.equal(admit(root, request).lane, NO_LANE, request);
  }
});
