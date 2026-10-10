import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { portOpen, parseHit } from "../../core/lib/drive.mjs";
import { statePath, stateRel, STATE_FILES } from "../../core/lib/paths.mjs";

const BIN = resolve("core/bin/picket.mjs");

function run(root, args, env = {}) {
  try {
    const out = execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env } });
    return { code: 0, json: JSON.parse(out) };
  } catch (err) {
    return { code: err.status, json: err.stdout ? JSON.parse(err.stdout) : null, stderr: err.stderr };
  }
}

const SERVER = `
import http from "node:http";
const port = Number(process.env.PORT);
http.createServer((req, res) => {
  if (req.url === "/boom") { res.statusCode = 500; return res.end("no"); }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ url: req.url, method: req.method }));
}).listen(port, "127.0.0.1", () => console.log("listening on " + port));
`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-drive-"));
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, "server.mjs"), SERVER);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", type: "module", scripts: { start: "node server.mjs", test: "node -e 0" } }));
  return root;
}

test("drive starts the detected app on a free port, hits it, stops it, and logs the evidence", async () => {
  const root = fixture();
  const r = run(root, ["drive", "--hit", "GET /items?page=2", "--hit", "POST /items {\"a\":1}"]);
  assert.equal(r.code, 0, r.stderr);
  const v = r.json;
  assert.equal(v.ok, true);
  assert.equal(v.mode, "server");
  assert.equal(v.start, "npm start");
  assert.equal(v.hits.length, 2);
  assert.equal(v.hits[0].status, 200);
  assert.match(v.hits[0].body, /"url":"\/items\?page=2"/);
  assert.equal(v.hits[1].status, 200);
  assert.match(v.hits[1].body, /"method":"POST"/);
  assert.equal(v.stopped, true);
  assert.equal(await portOpen(v.port), false, "server must be gone after the drive");
  const log = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(log.length, 1);
  assert.equal(log[0].kind, "drive");
  assert.equal(log[0].source, "picket drive");
  assert.deepEqual(log[0].hits.map((h) => h.status), [200, 200]);
});

test("drive honours PORT from the environment and an explicit --start, and reports a 500 without hiding it", () => {
  const root = fixture();
  // --human prints one screen of text; a 500 is reported, not treated as a failed drive (the developer judges)
  const text = execFileSync("node", [BIN, "drive", "--start", "node server.mjs", "--hit", "/boom", "--human", "--root", root], {
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, PORT: "8177" },
  });
  const lines = text.trim().split(/\r?\n/);
  assert.match(lines[0], /^node server\.mjs on :8177 · up in \d+ ms$/);
  assert.match(lines[1], /^GET \/boom → 500 \(\d+ ms\) no$/);
  assert.equal(lines.at(-2), "server stopped");
  assert.equal(lines.at(-1), "DRIVE OK");
});

test("drive --run captures a CLI command and fails fast on a non-zero exit", () => {
  const root = fixture();
  const ok = run(root, ["drive", "--run", "node -e \"console.log(42)\""]);
  assert.equal(ok.code, 0);
  assert.equal(ok.json.mode, "run");
  assert.match(ok.json.output, /42/);
  const bad = run(root, ["drive", "--run", "node -e \"process.exit(3)\""]);
  assert.equal(bad.code, 2);
  assert.equal(bad.json.ok, false);
  assert.equal(bad.json.exit_code, 3);
  const log = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n");
  assert.equal(log.length, 2);
});

test("drive fails fast when the app never answers, and says why", () => {
  const root = fixture();
  writeFileSync(join(root, "dead.mjs"), "console.error('config missing'); process.exit(7);");
  const r = run(root, ["drive", "--start", "node dead.mjs", "--hit", "/health", "--timeout", "5"]);
  assert.equal(r.code, 2);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.server_exit, 7);
  assert.match(r.json.server_log_tail, /config missing/);
  assert.ok(r.json.wait_ms < 5000, "exits as soon as the process dies, not at the timeout");
});

test("drive restores tracked files its own requests changed and removes files it created", () => {
  const root = fixture();
  writeFileSync(
    join(root, "store.mjs"),
    `import http from "node:http"; import { writeFileSync } from "node:fs";
http.createServer((req, res) => { writeFileSync("data.json", "[1]"); writeFileSync("new.log", "x"); res.end("ok"); }).listen(Number(process.env.PORT), "127.0.0.1");`,
  );
  writeFileSync(join(root, "data.json"), "[]");
  writeFileSync(join(root, ".gitignore"), `${stateRel("")}/\n`);
  const git = (args) => execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
  git(["init", "-q"]);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"]);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "mine.txt"), "developer's work");
  const r = run(root, ["drive", "--start", "node store.mjs", "--hit", "POST /invoices"]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.restored, ["data.json"]);
  assert.equal(readFileSync(join(root, "data.json"), "utf8"), "[]", "the drive's write is undone");
  assert.deepEqual(r.json.removed, ["new.log"]);
  assert.equal(existsSync(join(root, "new.log")), false, "the file the drive created is gone");
  assert.equal(existsSync(join(root, "mine.txt")), true, "an untracked file from before the drive stays");
  const kept = run(root, ["drive", "--start", "node store.mjs", "--hit", "POST /invoices", "--keep-changes"]);
  assert.deepEqual(kept.json.restored, []);
  assert.deepEqual(kept.json.removed, []);
  assert.deepEqual(kept.json.dirtied, ["data.json"]);
  assert.deepEqual(kept.json.created, ["new.log"]);
  assert.equal(readFileSync(join(root, "data.json"), "utf8"), "[1]");
});

test("drive restores and removes non-ASCII paths by their real names", () => {
  const root = fixture();
  writeFileSync(
    join(root, "store.mjs"),
    `import http from "node:http"; import { writeFileSync } from "node:fs";
http.createServer((req, res) => { writeFileSync("données.json", "[1]"); writeFileSync("café.log", "x"); res.end("ok"); }).listen(Number(process.env.PORT), "127.0.0.1");`,
  );
  writeFileSync(join(root, "données.json"), "[]");
  writeFileSync(join(root, ".gitignore"), `${stateRel("")}/\n`);
  const git = (args) => execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
  git(["init", "-q"]);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"]);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base"]);
  const r = run(root, ["drive", "--start", "node store.mjs", "--hit", "POST /invoices"]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.restored, ["données.json"]);
  assert.deepEqual(r.json.removed, ["café.log"]);
  assert.equal(readFileSync(join(root, "données.json"), "utf8"), "[]");
  assert.equal(existsSync(join(root, "café.log")), false);
});

test("parseHit reads method, path and body", () => {
  assert.deepEqual(parseHit("/x"), { method: "GET", path: "/x", body: undefined });
  assert.deepEqual(parseHit("DELETE /x/1"), { method: "DELETE", path: "/x/1", body: undefined });
  assert.deepEqual(parseHit('POST /x {"a": 1}'), { method: "POST", path: "/x", body: '{"a": 1}' });
  assert.equal(existsSync(BIN), true);
});

test("drive --env passes the variable to the run and logs only its name", () => {
  const root = fixture();
  mkdirSync(join(root, ".picket", "state", "scratch"), { recursive: true });
  writeFileSync(join(root, ".picket", "state", "scratch", "env-probe.mjs"), 'process.exit(process.env.PROBE === "secret-probe-42" ? 0 : 1);\n');
  const r = run(root, ["drive", "--run", "node .picket/state/scratch/env-probe.mjs", "--env", "PROBE=secret-probe-42"]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.ok, true);
  const log = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8");
  const row = JSON.parse(log.trim().split("\n").at(-1));
  assert.deepEqual(row.env, ["PROBE"]);
  assert.equal(log.includes("secret-probe-42"), false);
});

test("drive --env refuses a bad name or a missing equals sign with a usage error", () => {
  const root = fixture();
  for (const bad of ["1BAD=x", "NOEQUALS"]) {
    const r = run(root, ["drive", "--run", "node -e 0", "--env", bad]);
    assert.equal(r.code, 1, bad);
    assert.match(r.stderr, /--env needs NAME=VALUE/);
  }
});
