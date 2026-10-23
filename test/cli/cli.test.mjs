import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const REPO = process.cwd();

function sessionEnv(root, session) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  delete env.CLAUDE_CODE_SESSION_ID;
  if (session !== undefined) env.CLAUDE_CODE_SESSION_ID = session;
  return env;
}

function runText(root, args, session) {
  const r = runCli(root, [...args, "--root", root], { env: sessionEnv(root, session) });
  assert.equal(r.status, 0, `${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

function run(root, args, session) {
  return JSON.parse(runText(root, args, session));
}

function hostProject(t) {
  return withProject(t, { host: true, picket: false });
}

function assertUsageError(r, pattern) {
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, pattern);
}

test("picket leave answers JSON with the recorded entry and close returns it under left", (t) => {
  const root = hostProject(t);
  const { id } = run(root, ["open","--lane", "fast", "--title", "Leave probe"]);
  const entry = run(root, ["leave", id, "--command", "git branch -D old-feature"]);
  assert.equal(entry.command, "git branch -D old-feature");
  assert.equal(entry.why, null);
  assert.match(entry.ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(run(root, ["close", id]).left.map((r) => r.command), ["git branch -D old-feature"]);
});

test("the CLI walks a work item end to end and speaks JSON", (t) => {
  const root = hostProject(t);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), "");

  const adm = run(root, ["admit", "--text", "Fix the typo in `src/a.ts`."]);
  assert.equal(adm.lane, "fast");

  const created = run(root, ["open","--lane", "order", "--title", "Summary endpoint"]);
  assert.match(created.id, /^\d{8}-summary-endpoint$/);
  assert.equal(created.next.action, "write_artifact");

  writeFileSync(join(root, "work", created.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Phase 1: A\n\nt\n");
  assert.equal(run(root, ["next", created.id]).action, "implement_phase");

  const pf = run(root, ["preflight", created.id]);
  assert.equal(pf.ok, true);
  assert.ok(pf.checks.some((c) => c.name === "artifact" && c.level === "ok"));

  const v = run(root, ["verify", created.id, "1", "--no-tests"]);
  assert.equal(v.ok, true);

  const r1 = run(root, ["route", created.id, "--verdict", "PHASE DONE", "--agent", "developer", "--phase", "1"]);
  assert.equal(r1.next.action, "approve_phase");
  const r2 = run(root, ["route", created.id, "--verdict", "approved", "--agent", "user", "--phase", "1"]);
  assert.equal(r2.next.action, "review_cumulative");

  const list = run(root, ["list"]);
  assert.equal(list.length, 1);
  assert.equal(list[0].phases, "1/1");

  const c = run(root, ["cost"]);
  assert.equal(c.rows, 0);

  const blocked = run(root, ["set", created.id, "status=blocked", "blocked_reason=waiting on PO"]);
  assert.equal(blocked.next.action, "resolve_block");
  const reopened = run(root, ["set", created.id, "status=open"]);
  assert.equal(reopened.blocked_reason, undefined);
  const unsettable = runCli(root, ["set", created.id, "lane=design", "--root", root]);
  assert.equal(unsettable.status, 2);
  assert.match(unsettable.stdout, /field lane is not settable/);

  const rs = run(root, ["summary", created.id, "--base", "HEAD"]);
  assert.equal(rs.size, "small");
  assert.deepEqual(rs.changed_files, []);
});

test("comment records an approval and needs both --path and --text (T-1.4)", (t) => {
  const root = hostProject(t);
  const { id } = run(root, ["open","--lane", "order", "--title", "Fee rounding"]);
  const fails = (args) => assertUsageError(runCli(root, ["comment", ...args, "--root", root]), /comment needs/);
  fails([id, "--text", "why"]);
  fails([id, "--path", "src/fee.ts"]);
  fails([id, "--path", "--text", "why"]);
  assertUsageError(runCli(root, ["comment", "no-such-item", "--path", "a.ts", "--text", "t", "--root", root]), /no work item/);

  const entry = run(root, ["comment", id, "--path", "src\\fee.ts", "--text", "half-up: the tariff table is published that way"]);
  assert.deepEqual([entry.path, entry.text], ["src/fee.ts", "half-up: the tariff table is published that way"]);
  const recorded = readFileSync(join(root, "work", id, "comments.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(recorded.length, 1);
  assert.deepEqual(Object.keys(recorded[0]), ["ts", "path", "text"]);
  assert.equal(recorded[0].path, "src/fee.ts");
});

test("waive records a waiver, needs exactly one of --text or --deleted, and refuses a closed item", (t) => {
  const root = hostProject(t);
  const { id } = run(root, ["open","--lane", "order", "--title", "Flaky fee test"]);
  const fails = (args, pattern) => assertUsageError(runCli(root, ["waive", ...args, "--root", root]), pattern);
  fails([id, "--text", "it.skip("], /waive needs/);
  fails([id, "--path", "test/fee.test.ts"], /waive needs/);
  fails([id, "--path", "test/fee.test.ts", "--text", "it.skip(", "--deleted"], /waive needs/);

  const line = run(root, ["waive", id, "--path", "test\\fee.test.ts", "--text", 'it.skip("rounds", () => {});']);
  assert.deepEqual([line.path, line.text, line.deleted], ["test/fee.test.ts", 'it.skip("rounds", () => {});', false]);
  const gone = run(root, ["waive", id, "--path", "test/old.test.ts", "--deleted"]);
  assert.deepEqual([gone.text, gone.deleted], [null, true]);
  const recorded = readFileSync(join(root, "work", id, "waivers.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(recorded.map((r) => Object.keys(r)), [["ts", "path", "text", "deleted"], ["ts", "path", "text", "deleted"]]);

  run(root, ["set", id, "status=done"]);
  fails([id, "--path", "test/fee.test.ts", "--text", "it.skip("], /open or blocked item only/);
});

test("next --latest prints the newest open item with the fixed key set; next alone exits 1", (t) => {
  const root = hostProject(t);
  assert.equal(run(root, ["next", "--latest"]).action, "none");
  const { id } = run(root, ["open","--lane", "order", "--title", "Summary endpoint"]);
  const n = run(root, ["next", "--latest"]);
  assert.equal(n.id, id);
  assert.deepEqual(
    Object.keys(n).sort(),
    ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail", "title", "phases_approved", "phase_count", "blocked_reason", "since", "by", "session", "other_session"].sort(),
  );
  assertUsageError(runCli(root, ["next", "--root", root]), /next needs <id> or --latest/);
});

test("new takes --session over the environment, route claims for the environment's session, next --latest marks another's (T-2.6)", (t) => {
  const root = hostProject(t);
  const { id } = run(root, ["open","--lane", "order", "--title", "Flagged", "--session", "flag"], "env");
  assert.equal(run(root, ["state", id]).session, "flag");
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  run(root, ["route", id, "--verdict", "PHASE DONE", "--agent", "developer", "--phase", "1"], "s9");
  assert.equal(run(root, ["state", id]).session, "s9");
  assert.match(runText(root, ["next", "--latest", "--session", "drive-test", "--human"]).trim(), / \(other session\)$/);
  assert.doesNotMatch(runText(root, ["next", "--latest", "--session", "s9", "--human"]), /other session/);
});

const ESCAPE = /\x1b\[[0-9;]*m/g;
const MINUTE = 60_000;

function statuslineInput() {
  const input = JSON.parse(readFileSync(resolve("src/lib/verbs/statusline/statusline-input.test.json"), "utf8"));
  const now = Date.now();
  input.rate_limits.five_hour.resets_at = (now + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (now + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (now + 52 * MINUTE) / 1000;
  return JSON.stringify(input);
}

function statusline(t, input, env) {
  const root = withProject(t, { picket: false });
  const result = runCli(REPO, ["statusline"], { input, env: { ...env, CLAUDE_PROJECT_DIR: root } });
  return { status: result.status, stderr: result.stderr, lines: result.stdout.replace(ESCAPE, "").replace(/\n$/, "").split("\n") };
}

function envWithout(name) {
  const env = { ...process.env };
  delete env[name];
  return env;
}

test("statusline prints the fixture on 2 lines at COLUMNS=150 and 3 lines without COLUMNS (T-1.8)", (t) => {
  const wide = statusline(t, statuslineInput(), { ...process.env, COLUMNS: "150" });
  assert.equal(wide.status, 0);
  assert.equal(wide.stderr, "");
  assert.equal(wide.lines.length, 2);
  const narrow = statusline(t, statuslineInput(), envWithout("COLUMNS"));
  assert.equal(narrow.status, 0);
  assert.equal(narrow.stderr, "");
  assert.equal(narrow.lines.length, 3);
});

test("statusline draws nerd icons when the user's Picket config asks for them (T-1.8)", (t) => {
  const home = withProject(t, { picket: false });
  mkdirSync(join(home, ".picketai"));
  writeFileSync(join(home, ".picketai", "config.json"), '{"statusline":{"icons":"nerd"}}');
  const { status, stderr, lines } = statusline(t, statuslineInput(), { ...process.env, COLUMNS: "150", HOME: home, USERPROFILE: home });
  assert.equal(status, 0);
  assert.equal(stderr, "");
  assert.ok(lines.some((line) => line.includes("\u{F0450}")), lines.join("\n"));
});

test("statusline reads input that is not JSON, and empty input, as no facts (T-1.8)", (t) => {
  for (const input of ["not json", ""]) {
    const { status, stderr, lines } = statusline(t, input, { ...process.env, COLUMNS: "150" });
    assert.equal(status, 0);
    assert.equal(stderr, "");
    assert.equal(lines[0], "  PICKETAI >_");
  }
});

function tempHome(t) {
  const home = withProject(t, { picket: false });
  return { home, env: { ...process.env, HOME: home, USERPROFILE: home } };
}

function style(args, env, input) {
  return runCli(REPO, ["style", ...args], { env, input });
}

test("style apply --dry-run --only statusline prints the plan and writes nothing (T-2.6)", (t) => {
  const { home, env } = tempHome(t);
  const result = style(["apply", "--dry-run", "--only", "statusline"], env);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /planned\s+statusline: set statusLine to "picket statusline"/);
  assert.deepEqual(readdirSync(home), []);
});

test("style apply rejects a component it does not know (T-2.6)", (t) => {
  const { home, env } = tempHome(t);
  const result = style(["apply", "--only", "bogus"], env);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bogus/);
  assert.deepEqual(readdirSync(home), []);
});

function writeManifest(home, items) {
  mkdirSync(join(home, ".picketai"));
  const manifest = { version: 1, created: "2026-10-17T12:00:00.000Z", updated: "2026-10-17T12:00:00.000Z", items };
  writeFileSync(join(home, ".picketai", "styling-manifest.json"), JSON.stringify(manifest));
}

function fontItem(files) {
  return { id: "font", component: "font", kind: "external", data: { preexisting: false, via: "files", files, registry: [] }, installedAt: "2026-10-17T12:00:00.000Z" };
}

test("style remove without a terminal keeps everything and names the commands that remove Picket (T-8.7)", (t) => {
  const { home, env } = tempHome(t);
  const font = join(home, "JetBrainsMonoNerdFontMono-Regular.ttf");
  writeFileSync(font, "font");
  writeManifest(home, [fontItem([font])]);
  const before = readFileSync(join(home, ".picketai", "styling-manifest.json"), "utf8");
  const result = style(["remove"], env, "");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /kept\s+font/);
  assert.match(result.stdout, /run picket uninstall in it/);
  assert.equal(readFileSync(join(home, ".picketai", "styling-manifest.json"), "utf8"), before);
  assert.equal(readFileSync(font, "utf8"), "font");
});

test("style remove --yes exits 2 when a chosen removal fails (T-8.6)", (t) => {
  const { home, env } = tempHome(t);
  const stuck = join(home, "JetBrainsMonoNerdFontMono-Regular.ttf");
  mkdirSync(stuck);
  writeFileSync(join(stuck, "keep"), "x");
  writeManifest(home, [fontItem([stuck])]);
  const result = style(["remove", "--yes"], env, "");
  assert.equal(result.status, 2, result.stdout);
  assert.match(result.stdout, /failed\s+font/);
});

function initializedProject(t) {
  const { home, env } = tempHome(t);
  const root = withProject(t, { host: true, picket: false });
  writeFileSync(join(root, "CLAUDE.md"), "# My project\n");
  writeFileSync(join(root, ".claude", "settings.json"), '{\n  "permissions": {\n    "allow": ["Bash(npm test)"]\n  }\n}\n');
  mkdirSync(join(root, "work", "x"), { recursive: true });
  writeFileSync(join(root, "work", "x", "state.yaml"), "id: x\n");
  const claudeEnv = { ...env, CLAUDE_CONFIG_DIR: join(home, "claude-config") };
  const init = runCli(root, ["init", "--root", root, "--no-install"], { env: claudeEnv });
  assert.equal(init.status, 0, init.stderr);
  return { root, env: claudeEnv };
}

test("uninstall --dry-run lists the groups and changes nothing; --yes removes Picket and keeps work/", (t) => {
  const { root, env } = initializedProject(t);
  const listing = () => readdirSync(root, { recursive: true }).map(String).sort();
  const before = listing();
  const dry = runCli(root, ["uninstall", "--root", root, "--dry-run"], { env });
  assert.equal(dry.status, 0, dry.stderr);
  for (const group of ["settings", "claude-md", "gitignore", "config"]) assert.match(dry.stdout, new RegExp(`planned\\s+${group}:`), group);
  assert.doesNotMatch(dry.stdout, /is now/);
  assert.deepEqual(listing(), before);
  const removed = runCli(root, ["uninstall", "--root", root, "--yes"], { env });
  assert.equal(removed.status, 0, removed.stderr);
  assert.match(removed.stdout, /Picket is removed from this project\.\n.*\n\s+picket style remove --all.*\n\s+npm uninstall -g @picketai\/picket/);
  assert.equal(readFileSync(join(root, "CLAUDE.md"), "utf8"), "# My project\n");
  assert.deepEqual(JSON.parse(readFileSync(join(root, ".claude", "settings.json"), "utf8")), { permissions: { allow: ["Bash(npm test)"] } });
  assert.deepEqual(readdirSync(root).sort(), [".claude", "CLAUDE.md", "work"]);
  assert.equal(readFileSync(join(root, "work", "x", "state.yaml"), "utf8"), "id: x\n");
});

test("uninstall without a terminal and without --yes changes nothing", (t) => {
  const { root, env } = initializedProject(t);
  const before = readdirSync(root).sort();
  const result = runCli(root, ["uninstall", "--root", root], { env, input: "" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /declined\s+settings/);
  assert.match(result.stdout, /pass --yes/);
  assert.deepEqual(readdirSync(root).sort(), before);
});

const USAGE_LINE = "usage: picket <verb> [args] [--pretty | --human]";
const VERBS_NAMED = ["init", "admit", "open", "next", "verify", "route", "drive", "check", "statusline", "style", "pullrequest", "source"];

function picket(args, cwd = REPO) {
  return runCli(cwd, args, { env: process.env });
}

function assertUsage(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.split("\n")[0], USAGE_LINE);
  for (const verb of VERBS_NAMED) assert.match(result.stdout, new RegExp(`\\b${verb}\\b`), verb);
}

test("--version prints the plugin manifest version alone, also outside any project", (t) => {
  const outside = withProject(t, { picket: false });
  const expected = `${JSON.parse(readFileSync(resolve("src/.claude-plugin/plugin.json"), "utf8")).version}\n`;
  for (const cwd of [REPO, outside]) {
    const result = picket(["--version"], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected);
    assert.equal(result.stderr, "");
  }
});

test("--help, help and a bare picket print the usage block on stdout and exit 0", () => {
  for (const args of [["--help"], ["help"], []]) assertUsage(picket(args));
});

test("--help after a verb or before one prints the usage without running the verb", () => {
  const next = picket(["next", "--help"]);
  const before = picket(["--help", "next"]);
  assertUsage(next);
  assert.equal(before.stdout, next.stdout);
  assert.equal(before.status, 0);
});

test("an unknown verb names the same verb list the usage block prints", () => {
  const result = picket(["bogus"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown verb "bogus"/);
  const listed = picket(["--help"]).stdout.match(/^verbs: (.+)$/m)[1];
  assert.ok(result.stderr.includes(`Verbs: ${listed}`), result.stderr);
});

test("a renamed or removed verb exits 1 naming its new form (T-7.1)", () => {
  const answers = [
    [["new", "--lane", "fast", "--title", "x"], 'picket: "new" is now "open"'],
    [["review-summary", "x"], 'picket: "review-summary" is now "summary"'],
    [["extensions"], 'picket: "extensions" is now "extension list"'],
    [["extension", "new", "local"], 'picket: "extension new" is now "extension add"'],
    [["find-verdict"], 'picket: "find-verdict" was removed'],
    [["setup-terminal"], 'picket: "setup-terminal" is now "style apply"'],
    [["pr", "x"], 'picket: "pr" is now "pullrequest prepare"'],
  ];
  for (const [args, message] of answers) {
    const result = picket(args);
    assert.equal(result.status, 1, args.join(" "));
    assert.equal(result.stderr.trim(), message);
  }
});

test("usage errors exit 1 with a message on stderr", (t) => {
  const root = hostProject(t);
  assertUsageError(runCli(root, ["bogus", "--root", root]), /unknown verb/);
  assertUsageError(runCli(root, ["open", "--lane", "order", "--root", root]), /needs --lane and --title/);
});
