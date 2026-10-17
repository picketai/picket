import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const BIN = resolve("core/bin/picket.mjs");

function run(root, args) {
  const out = execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  return JSON.parse(out);
}

test("picket leave answers JSON with the recorded entry and close returns it under left", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  try {
    mkdirSync(join(root, ".claude"));
    const { id } = run(root, ["new", "--lane", "fast", "--title", "Leave probe"]);
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

  const created = run(root, ["new", "--lane", "order", "--title", "Summary endpoint"]);
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
  assert.throws(() => execFileSync("node", [BIN, "set", created.id, "lane=design", "--root", root], { stdio: "pipe" }), /not settable/);

  const rs = run(root, ["review-summary", created.id, "--base", "HEAD"]);
  assert.equal(rs.size, "small");
  assert.deepEqual(rs.changed_files, []);
  rmSync(root, { recursive: true, force: true });
});

test("comment records an approval and needs both --path and --text (T-1.4)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  const { id } = run(root, ["new", "--lane", "order", "--title", "Fee rounding"]);
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

test("next --latest prints the newest open item with the fixed key set; next alone exits 1", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  assert.equal(run(root, ["next", "--latest"]).action, "none");
  const { id } = run(root, ["new", "--lane", "order", "--title", "Summary endpoint"]);
  const n = run(root, ["next", "--latest"]);
  assert.equal(n.id, id);
  assert.deepEqual(
    Object.keys(n).sort(),
    ["id", "lane", "status", "phase", "options", "own_gate", "action", "actor", "detail", "title", "phases_approved", "phase_count", "blocked_reason", "since", "by"].sort(),
  );
  assert.throws(() => execFileSync("node", [BIN, "next", "--root", root], { stdio: "pipe" }), (err) => err.status === 1 && /next needs <id> or --latest/.test(err.stderr));
  rmSync(root, { recursive: true, force: true });
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
  const result = spawnSync("node", [BIN, "statusline"], { input, encoding: "utf8", env });
  return { status: result.status, stderr: result.stderr, lines: result.stdout.replace(ESCAPE, "").replace(/\n$/, "").split("\n") };
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

test("usage errors exit 1 with a message on stderr", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-cli-"));
  mkdirSync(join(root, ".claude"));
  assert.throws(() => execFileSync("node", [BIN, "bogus", "--root", root], { stdio: "pipe" }), /unknown verb/);
  assert.throws(() => execFileSync("node", [BIN, "new", "--lane", "order", "--root", root], { stdio: "pipe" }), /needs --lane and --title/);
  rmSync(root, { recursive: true, force: true });
});
