import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeContext } from "../../shared/context.mts";
import { writeIn } from "#test/git.mts";
import { withProject } from "#test/project.mts";
import { freePort, parseHit, serverMode } from "./server.mts";

test("parseHit reads method, path and body", () => {
  assert.deepEqual(parseHit("/x"), { method: "GET", path: "/x", body: undefined });
  assert.deepEqual(parseHit("DELETE /x/1"), { method: "DELETE", path: "/x/1", body: undefined });
  assert.deepEqual(parseHit('POST /x {"a": 1}'), { method: "POST", path: "/x", body: '{"a": 1}' });
});

const LONG_BODY_SERVER = [
  "import { createServer } from 'node:http';",
  "const body = 'x'.repeat(2900) + 'paid' + 'y'.repeat(96);",
  "createServer((req, res) => res.end(body)).listen(Number(process.env.PORT), '127.0.0.1');",
].join("\n");

async function hitLongBody(t: Parameters<typeof withProject>[0], contains: string[]) {
  const dir = withProject(t, { picket: false });
  writeIn(dir, "server.mjs", LONG_BODY_SERVER);
  const port = String(await freePort());
  const input = { start: "node server.mjs", hits: [parseHit("GET /")], port, wait: undefined, env: {}, contains };
  const report = await serverMode(input, { ...edgeContext(dir), cwd: dir }, dir, 10_000);
  assert.equal(report.ok, true, JSON.stringify(report));
  return report.hits[0];
}

test("a hit maps each declared string against the whole body, past the 2000-character cut", async (t) => {
  const hit = await hitLongBody(t, ["paid", "pending"]);
  assert.equal(hit.body?.length, 2000);
  assert.deepEqual(hit.contains, { paid: true, pending: false });
});

test("a hit with no declared strings carries no contains map", async (t) => {
  const hit = await hitLongBody(t, []);
  assert.equal(Object.hasOwn(hit, "contains"), false);
});
