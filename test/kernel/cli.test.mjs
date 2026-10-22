import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const BIN = resolve("dist/bin/picket.mjs");

function sessionEnv(root, session) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  delete env.CLAUDE_CODE_SESSION_ID;
  if (session !== undefined) env.CLAUDE_CODE_SESSION_ID = session;
  return env;
}

function runText(root, args, session) {
  return execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: sessionEnv(root, session) });
}

function run(root, args, session) {
  return JSON.parse(runText(root, args, session));
}

test("picket leave answers JSON with the recorded entry and close returns it under left", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  try {
    mkdirSync(join(root, ".claude"));
    const { id } = run(root, ["open","--lane", "fast", "--title", "Leave probe"]);
    const entry = run(root, ["leave", id, "--command", "git branch -D old-feature"]);
    assert.equal(entry.command, "git branch -D old-feature");
    assert.equal(entry.why, null);
    assert.match(entry.ts, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(run(root, ["close", id]).left.map((r) => r.command), ["git branch -D old-feature"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI walks a work item end to end and speaks JSON", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
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
  const unsettable = spawnSync("node", [BIN, "set", created.id, "lane=design", "--root", root], { encoding: "utf8" });
  assert.equal(unsettable.status, 2);
  assert.match(unsettable.stdout, /field lane is not settable/);

  const rs = run(root, ["summary", created.id, "--base", "HEAD"]);
  assert.equal(rs.size, "small");
  assert.deepEqual(rs.changed_files, []);
  rmSync(root, { recursive: true, force: true });
});

test("comment records an approval and needs both --path and --text (T-1.4)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  const { id } = run(root, ["open","--lane", "order", "--title", "Fee rounding"]);
  const fails = (args) => assert.throws(() => execFileSync("node", [BIN, "comment", ...args, "--root", root], { stdio: "pipe" }), (err) => err.status === 1 && /comment needs/.test(err.stderr));
  fails([id, "--text", "why"]);
  fails([id, "--path", "src/fee.ts"]);
  fails([id, "--path", "--text", "why"]);
  assert.throws(() => execFileSync("node", [BIN, "comment", "no-such-item", "--path", "a.ts", "--text", "t", "--root", root], { stdio: "pipe" }), (err) => err.status === 1 && /no work item/.test(err.stderr));

  const entry = run(root, ["comment", id, "--path", "src\\fee.ts", "--text", "half-up: the tariff table is published that way"]);
  assert.deepEqual([entry.path, entry.text], ["src/fee.ts", "half-up: the tariff table is published that way"]);
  const recorded = readFileSync(join(root, "work", id, "comments.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(recorded.length, 1);
  assert.deepEqual(Object.keys(recorded[0]), ["ts", "path", "text"]);
  assert.equal(recorded[0].path, "src/fee.ts");
  rmSync(root, { recursive: true, force: true });
});

test("waive records a waiver, needs exactly one of --text or --deleted, and refuses a closed item", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  try {
    mkdirSync(join(root, ".claude"));
    const { id } = run(root, ["open","--lane", "order", "--title", "Flaky fee test"]);
    const fails = (args, pattern) => assert.throws(() => execFileSync("node", [BIN, "waive", ...args, "--root", root], { stdio: "pipe" }), (err) => err.status === 1 && pattern.test(err.stderr));
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
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("next --latest prints the newest open item with the fixed key set; next alone exits 1", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  assert.equal(run(root, ["next", "--latest"]).action, "none");
  const { id } = run(root, ["open","--lane", "order", "--title", "Summary endpoint"]);
  const n = run(root, ["next", "--latest"]);
  assert.equal(n.id, id);
  assert.deepEqual(
    Object.keys(n).sort(),
    ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail", "title", "phases_approved", "phase_count", "blocked_reason", "since", "by", "session", "other_session"].sort(),
  );
  assert.throws(() => execFileSync("node", [BIN, "next", "--root", root], { stdio: "pipe" }), (err) => err.status === 1 && /next needs <id> or --latest/.test(err.stderr));
  rmSync(root, { recursive: true, force: true });
});

test("new takes --session over the environment, route claims for the environment's session, next --latest marks another's (T-2.6)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  try {
    mkdirSync(join(root, ".claude"));
    const { id } = run(root, ["open","--lane", "order", "--title", "Flagged", "--session", "flag"], "env");
    assert.equal(run(root, ["state", id]).session, "flag");
    writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
    run(root, ["route", id, "--verdict", "PHASE DONE", "--agent", "developer", "--phase", "1"], "s9");
    assert.equal(run(root, ["state", id]).session, "s9");
    assert.match(runText(root, ["next", "--latest", "--session", "drive-test", "--human"]).trim(), / \(other session\)$/);
    assert.doesNotMatch(runText(root, ["next", "--latest", "--session", "s9", "--human"]), /other session/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const ESCAPE = /\x1b\[[0-9;]*m/g;
const MINUTE = 60_000;

function statuslineInput() {
  const input = JSON.parse(readFileSync(resolve("test/kernel/statusline-input.json"), "utf8"));
  const now = Date.now();
  input.rate_limits.five_hour.resets_at = (now + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (now + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (now + 52 * MINUTE) / 1000;
  return JSON.stringify(input);
}

function statusline(input, env) {
  const root = mkdtempSync(join(tmpdir(), "picket-statusline-root-"));
  try {
    const result = spawnSync("node", [BIN, "statusline"], { input, encoding: "utf8", env: { ...env, CLAUDE_PROJECT_DIR: root } });
    return { status: result.status, stderr: result.stderr, lines: result.stdout.replace(ESCAPE, "").replace(/\n$/, "").split("\n") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function envWithout(name) {
  const env = { ...process.env };
  delete env[name];
  return env;
}

test("statusline prints the fixture on 2 lines at COLUMNS=150 and 3 lines without COLUMNS (T-1.8)", () => {
  const wide = statusline(statuslineInput(), { ...process.env, COLUMNS: "150" });
  assert.equal(wide.status, 0);
  assert.equal(wide.stderr, "");
  assert.equal(wide.lines.length, 2);
  const narrow = statusline(statuslineInput(), envWithout("COLUMNS"));
  assert.equal(narrow.status, 0);
  assert.equal(narrow.stderr, "");
  assert.equal(narrow.lines.length, 3);
});

test("statusline draws nerd icons when the user's Picket config asks for them (T-1.8)", () => {
  const home = mkdtempSync(join(tmpdir(), "picket-home-"));
  try {
    mkdirSync(join(home, ".picketai"));
    writeFileSync(join(home, ".picketai", "config.json"), '{"statusline":{"icons":"nerd"}}');
    const { status, stderr, lines } = statusline(statuslineInput(), { ...process.env, COLUMNS: "150", HOME: home, USERPROFILE: home });
    assert.equal(status, 0);
    assert.equal(stderr, "");
    assert.ok(lines.some((line) => line.includes("\u{F0450}")), lines.join("\n"));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("statusline reads input that is not JSON, and empty input, as no facts (T-1.8)", () => {
  for (const input of ["not json", ""]) {
    const { status, stderr, lines } = statusline(input, { ...process.env, COLUMNS: "150" });
    assert.equal(status, 0);
    assert.equal(stderr, "");
    assert.equal(lines[0], "  PICKETAI >_");
  }
});

function withTempHome(fn) {
  const home = mkdtempSync(join(tmpdir(), "picket-home-"));
  try {
    fn(home, { ...process.env, HOME: home, USERPROFILE: home });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("setup-terminal --dry-run --statusline-only prints the plan and writes nothing (T-2.6)", () => {
  withTempHome((home, env) => {
    const result = spawnSync("node", [BIN, "setup-terminal", "--dry-run", "--statusline-only"], { encoding: "utf8", env });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /planned\s+statusline: set statusLine to "picket statusline"/);
    assert.deepEqual(readdirSync(home), []);
  });
});

test("setup-terminal rejects a component flag it does not know (T-2.6)", () => {
  withTempHome((home, env) => {
    const result = spawnSync("node", [BIN, "setup-terminal", "--bogus-only"], { encoding: "utf8", env });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--bogus-only/);
    assert.deepEqual(readdirSync(home), []);
  });
});

function writeManifest(home, items) {
  mkdirSync(join(home, ".picketai"));
  const manifest = { version: 1, created: "2026-10-17T12:00:00.000Z", updated: "2026-10-17T12:00:00.000Z", items };
  writeFileSync(join(home, ".picketai", "styling-manifest.json"), JSON.stringify(manifest));
}

function fontItem(files) {
  return { id: "font", component: "font", kind: "external", data: { preexisting: false, via: "files", files, registry: [] }, installedAt: "2026-10-17T12:00:00.000Z" };
}

test("uninstall without a terminal keeps everything and names the commands that remove Picket (T-8.7)", () => {
  withTempHome((home, env) => {
    const font = join(home, "JetBrainsMonoNerdFontMono-Regular.ttf");
    writeFileSync(font, "font");
    writeManifest(home, [fontItem([font])]);
    const before = readFileSync(join(home, ".picketai", "styling-manifest.json"), "utf8");
    const result = spawnSync("node", [BIN, "uninstall"], { encoding: "utf8", env, input: "" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /kept\s+font/);
    assert.match(result.stdout, /claude plugin uninstall picket@picketai/);
    assert.equal(readFileSync(join(home, ".picketai", "styling-manifest.json"), "utf8"), before);
    assert.equal(readFileSync(font, "utf8"), "font");
  });
});

test("uninstall --yes exits 2 when a chosen removal fails (T-8.6)", () => {
  withTempHome((home, env) => {
    const stuck = join(home, "JetBrainsMonoNerdFontMono-Regular.ttf");
    mkdirSync(stuck);
    writeFileSync(join(stuck, "keep"), "x");
    writeManifest(home, [fontItem([stuck])]);
    const result = spawnSync("node", [BIN, "uninstall", "--yes"], { encoding: "utf8", env, input: "" });
    assert.equal(result.status, 2, result.stdout);
    assert.match(result.stdout, /failed\s+font/);
  });
});

const USAGE_LINE = "usage: picket <verb> [args] [--pretty | --human]";
const VERBS_NAMED = ["init", "admit", "open", "next", "verify", "route", "drive", "check", "statusline", "setup-terminal", "uninstall", "source"];

function picket(args, options = {}) {
  return spawnSync("node", [BIN, ...args], { encoding: "utf8", ...options });
}

function assertUsage(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.split("\n")[0], USAGE_LINE);
  for (const verb of VERBS_NAMED) assert.match(result.stdout, new RegExp(`\\b${verb}\\b`), verb);
}

test("--version prints the plugin manifest version alone, also outside any project", () => {
  const outside = mkdtempSync(join(tmpdir(), "picket-outside-"));
  try {
    const expected = `${JSON.parse(readFileSync(resolve("src/.claude-plugin/plugin.json"), "utf8")).version}\n`;
    for (const cwd of [process.cwd(), outside]) {
      const result = picket(["--version"], { cwd });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, expected);
      assert.equal(result.stderr, "");
    }
  } finally {
    rmSync(outside, { recursive: true, force: true });
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
  ];
  for (const [args, message] of answers) {
    const result = picket(args);
    assert.equal(result.status, 1, args.join(" "));
    assert.equal(result.stderr.trim(), message);
  }
});

test("usage errors exit 1 with a message on stderr", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  assert.throws(() => execFileSync("node", [BIN, "bogus", "--root", root], { stdio: "pipe" }), /unknown verb/);
  assert.throws(() => execFileSync("node", [BIN, "open", "--lane", "order", "--root", root], { stdio: "pipe" }), /needs --lane and --title/);
  rmSync(root, { recursive: true, force: true });
});
