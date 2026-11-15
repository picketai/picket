import { test } from "node:test";
import assert from "node:assert/strict";
import { httpAdapter } from "./http.mts";

const REQUEST = { method: "POST", url: "http://127.0.0.1:49153/orders", headers: { "content-type": "application/json" }, body: '{"sku":"PKT-7f3a-1"}', timeoutMs: 20000 };

test("the adapter sends method, headers, body and a timeout signal, and reads the answer (T-2.6)", async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return new Response('{"id":"PKT-7f3a-1"}', { status: 201, headers: { ETag: "v1" } });
  }) as typeof fetch;
  const answer = await httpAdapter(fetchImpl)(REQUEST);
  assert.deepEqual(answer, { status: 201, headers: { "content-type": "text/plain;charset=UTF-8", etag: "v1" }, text: '{"id":"PKT-7f3a-1"}', error: null });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, REQUEST.url);
  assert.equal(seen[0].init.method, "POST");
  assert.deepEqual(seen[0].init.headers, REQUEST.headers);
  assert.equal(seen[0].init.body, REQUEST.body);
  assert.ok(seen[0].init.signal instanceof AbortSignal);
});

test("a request with no body sends none", async () => {
  let body: unknown = "unset";
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    body = init.body;
    return new Response("ok");
  }) as typeof fetch;
  await httpAdapter(fetchImpl)({ ...REQUEST, method: "GET", body: null });
  assert.equal(body, undefined);
});

test("a thrown error maps to no status and its cause code, else its name (T-2.6)", async () => {
  const refused = (async () => {
    throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
  }) as typeof fetch;
  assert.deepEqual(await httpAdapter(refused)(REQUEST), { status: null, headers: {}, text: "", error: "ECONNREFUSED" });
  const timedOut = (async () => {
    throw new DOMException("timed out", "TimeoutError");
  }) as typeof fetch;
  assert.deepEqual(await httpAdapter(timedOut)(REQUEST), { status: null, headers: {}, text: "", error: "TimeoutError" });
});
