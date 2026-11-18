import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMock } from "./definition.mts";
import { compileDefinition } from "./stub.mts";
import { answerFor, startStub } from "./stub-server.mjs";

const FIXTURE = resolve("test/fixtures/env/stubbed/.picket/env/mocks/payments-mock.md");

function fixtureDefinition() {
  const { definition, problems } = parseMock(readFileSync(FIXTURE, "utf8"), "payments-mock");
  assert.deepEqual(problems, []);
  assert.ok(definition);
  return compileDefinition(definition);
}

async function reply(response: Response): Promise<{ status: number; type: string | null; body: string }> {
  return { status: response.status, type: response.headers.get("content-type"), body: await response.text() };
}

test("the stub answers from the fixture definition, matches * on one segment, ignores the query and logs what it received (T-2.1, T-2.2)", async (t) => {
  const stub = await startStub({ definition: fixtureDefinition(), host: "127.0.0.1", port: 0 });
  t.after(() => stub.close());
  const base = `http://127.0.0.1:${stub.port}`;
  assert.deepEqual(await reply(await fetch(`${base}/charges`, { method: "POST", body: "{}" })), { status: 201, type: "application/json", body: '{"id":"ch_1","state":"authorised"}' });
  assert.deepEqual(await reply(await fetch(`${base}/charges/ch_9?x=1`)), { status: 200, type: "application/json", body: '{"id":"ch_9","state":"captured"}' });
  assert.deepEqual(await reply(await fetch(`${base}/charges/ch_9/refunds`)), { status: 501, type: "text/plain", body: "payments-mock has no answer for GET /charges/ch_9/refunds" });
  assert.equal((await fetch(`${base}/__picket/health`)).status, 200);
  const received = await fetch(`${base}/__picket/received`);
  assert.deepEqual(await received.json(), [
    { method: "POST", path: "/charges", answered: true },
    { method: "GET", path: "/charges/ch_9", answered: true },
    { method: "GET", path: "/charges/ch_9/refunds", answered: false },
  ]);
});

test("answerFor takes the first answer in file order whose method and every segment match", () => {
  const answers = [
    { method: "GET", path: "/charges/*", status: 200, headers: [], body: "any" },
    { method: "GET", path: "/charges/ch_1", status: 200, headers: [], body: "one" },
  ];
  assert.equal(answerFor(answers, "GET", "/charges/ch_1")?.body, "any");
  assert.equal(answerFor(answers, "GET", "/charges/"), null);
  assert.equal(answerFor(answers, "GET", "/charges"), null);
  assert.equal(answerFor(answers, "POST", "/charges/ch_1"), null);
});
