import { test } from "node:test";
import assert from "node:assert/strict";
import { browserAdapter, type BrowserCommand } from "./browser.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "./http.mts";

const DRIVER = "http://127.0.0.1:49200";
const FILL: BrowserCommand = { session: "7f3a", timeoutMs: 20000, word: "fill", label: "Email", value: "PKT-7f3a@example.com" };
const COMMANDS: BrowserCommand[] = [
  { session: "7f3a", timeoutMs: 20000, word: "open", url: "http://web:3000/login" },
  FILL,
  { session: "7f3a", timeoutMs: 20000, word: "click", name: "Sign in" },
  { session: "7f3a", timeoutMs: 20000, word: "see", text: "Welcome" },
  { session: "7f3a", timeoutMs: 20000, word: "close" },
];

function answering(answer: HttpAnswer): { http: HttpAdapter; seen: HttpRequest[] } {
  const seen: HttpRequest[] = [];
  const http: HttpAdapter = async (request) => {
    seen.push(request);
    return answer;
  };
  return { http, seen };
}

function ok(text: string): HttpAnswer {
  return { status: 200, headers: {}, text, error: null };
}

test("each command goes as one JSON POST to the driver's step path, and a 200 answer comes back as it is (T-1.4)", async () => {
  for (const sent of [{ ok: true, detail: "" }, { ok: false, detail: "no field labelled Email" }, { ok: null, detail: "no page open" }]) {
    const { http, seen } = answering(ok(JSON.stringify(sent)));
    assert.deepEqual(await browserAdapter(http, DRIVER)(FILL), sent);
    assert.deepEqual(seen, [{ method: "POST", url: `${DRIVER}/__picket/step`, headers: { "content-type": "application/json" }, body: JSON.stringify(FILL), timeoutMs: 25000 }]);
  }
  for (const command of COMMANDS) {
    const { http, seen } = answering(ok('{"ok":true,"detail":""}'));
    await browserAdapter(http, DRIVER)(command);
    assert.deepEqual(JSON.parse(seen[0].body ?? ""), command);
  }
});

test("another status, an unreadable body or no answer gives no answer with its cause (T-1.4)", async () => {
  const cases: [HttpAnswer, string][] = [
    [{ status: 500, headers: {}, text: '{"ok":true,"detail":""}', error: null }, "the browser service answered 500"],
    [ok("not json"), "the browser service sent an unreadable answer"],
    [ok('{"ok":"yes","detail":""}'), "the browser service sent an unreadable answer"],
    [ok('{"ok":true}'), "the browser service sent an unreadable answer"],
    [ok("null"), "the browser service sent an unreadable answer"],
    [{ status: null, headers: {}, text: "", error: "ECONNREFUSED" }, "the browser service did not answer: ECONNREFUSED"],
  ];
  for (const [answer, detail] of cases) {
    assert.deepEqual(await browserAdapter(answering(answer).http, DRIVER)(FILL), { ok: null, detail }, detail);
  }
});

test("with no driver every command gives no answer, naming the missing browser service, and nothing is sent (T-1.4)", async () => {
  const { http, seen } = answering(ok('{"ok":true,"detail":""}'));
  const adapter = browserAdapter(http, null);
  for (const command of COMMANDS) assert.deepEqual(await adapter(command), { ok: null, detail: "the environment has no browser service" });
  assert.equal(seen.length, 0);
});
