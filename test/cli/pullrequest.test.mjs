import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { PICKET_BIN } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

const MARKER_PAT = "pat-marker-04d";

function basic(pat) {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

async function deniedServer(body) {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push(req.headers.authorization);
    req.resume();
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(body(req));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { server, seen, url: `http://127.0.0.1:${server.address().port}/c/p/_git/r/pullrequest/7` };
}

function withoutPatVars() {
  const env = { ...process.env };
  for (const name of ["AZDO_PAT", "AZURE_DEVOPS_EXT_PAT", "CLAUDE_PROJECT_DIR"]) delete env[name];
  return env;
}

function postCli(url, root, env) {
  const file = join(root, "review.md");
  writeFileSync(file, "## Review: pr-7 · pr\n\nChanges required: one finding.\n\n- [Major] src/a.ts:3 — wrong. Fix it.\n\nCHANGES REQUIRED\n");
  const child = spawn(process.execPath, [PICKET_BIN, "pullrequest", "post", url, "--file", file, "--root", root], { cwd: tmpdir(), env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (chunk) => (out += chunk));
  child.stderr.on("data", (chunk) => (out += chunk));
  return new Promise((done) => child.on("close", (code) => done({ code, out })));
}

function pullRequestRoot(t) {
  return withProject(t, { host: true, picket: false });
}

test("a refused post never prints the PAT or its Basic form, while the server saw it in the header", async (t) => {
  const root = pullRequestRoot(t);
  const { server, seen, url } = await deniedServer(() => JSON.stringify({ message: "denied" }));
  try {
    const { code, out } = await postCli(url, root, { ...withoutPatVars(), AZDO_PAT: MARKER_PAT });
    assert.notEqual(code, 0);
    assert.match(out, /401/);
    assert.ok(!out.includes(MARKER_PAT), "the PAT is not printed");
    assert.ok(!out.includes(Buffer.from(`:${MARKER_PAT}`).toString("base64")), "its Basic form is not printed");
    assert.equal(seen[0], basic(MARKER_PAT));
  } finally {
    server.close();
  }
});

test("a server that echoes the Authorization header back still never gets the PAT printed", async (t) => {
  const root = pullRequestRoot(t);
  const { server, url } = await deniedServer((req) => JSON.stringify({ message: "denied", saw: req.headers.authorization }));
  try {
    const { code, out } = await postCli(url, root, { ...withoutPatVars(), AZDO_PAT: MARKER_PAT });
    assert.notEqual(code, 0);
    assert.ok(!out.includes(MARKER_PAT) && !out.includes(Buffer.from(`:${MARKER_PAT}`).toString("base64")), "the echoed header is redacted");
  } finally {
    server.close();
  }
});

test("the PAT in <root>/.claude/settings.local.json reaches the header when the process starts elsewhere", async (t) => {
  const root = pullRequestRoot(t);
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ env: { AZDO_PAT: MARKER_PAT } }));
  const { server, seen, url } = await deniedServer(() => JSON.stringify({ message: "denied" }));
  try {
    const { code } = await postCli(url, root, withoutPatVars());
    assert.notEqual(code, 0);
    assert.equal(seen[0], basic(MARKER_PAT));
  } finally {
    server.close();
  }
});
