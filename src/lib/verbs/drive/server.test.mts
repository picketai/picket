import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHit } from "./server.mts";

test("parseHit reads method, path and body", () => {
  assert.deepEqual(parseHit("/x"), { method: "GET", path: "/x", body: undefined });
  assert.deepEqual(parseHit("DELETE /x/1"), { method: "DELETE", path: "/x/1", body: undefined });
  assert.deepEqual(parseHit('POST /x {"a": 1}'), { method: "POST", path: "/x", body: '{"a": 1}' });
});
