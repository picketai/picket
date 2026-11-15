import { test } from "node:test";
import assert from "node:assert/strict";
import { newRunKey, relativeDate, resolveText, userVariable, type ValueScope } from "./values.mts";

const SCOPE: ValueScope = { run: "7f3a", captures: { order_id: "PKT-7f3a-1" }, env: {}, today: "2026-11-15" };

test("relative dates count UTC days from the run day (T-2.1)", () => {
  assert.deepEqual(resolveText("{date:+7d}", SCOPE), { text: "2026-11-22" });
  assert.deepEqual(resolveText("{date:-1d}", SCOPE), { text: "2026-11-14" });
  assert.equal(relativeDate("2026-12-30", 3), "2027-01-02");
});

test("the run key and a captured value fill their placeholders in place (T-2.1)", () => {
  assert.deepEqual(resolveText('{"sku":"PKT-{run}-1"}', SCOPE), { text: '{"sku":"PKT-7f3a-1"}' });
  assert.deepEqual(resolveText("/orders/{order_id}?x=1", SCOPE), { text: "/orders/PKT-7f3a-1?x=1" });
  assert.deepEqual(resolveText('{"a":{"b":1}}', SCOPE), { text: '{"a":{"b":1}}' });
});

test("a run key is four lower-case hex characters from two bytes (T-2.1)", () => {
  assert.equal(newRunKey(new Uint8Array([127, 58])), "7f3a");
  assert.equal(newRunKey(new Uint8Array([0, 10, 255])), "000a");
});

test("a test user reads its PICKET_USER_ variable, and an unset one blocks naming it (T-2.2)", () => {
  const env = { PICKET_USER_ADMIN_PASSWORD: "fixture-secret-9" };
  assert.deepEqual(resolveText("{user:admin.password}", { ...SCOPE, env }), { text: "fixture-secret-9" });
  assert.deepEqual(resolveText("x {user:admin.password}", SCOPE), { blocked: "test user admin has no PICKET_USER_ADMIN_PASSWORD" });
  assert.equal(userVariable("read-only", "token"), "PICKET_USER_READ_ONLY_TOKEN");
});

test("a placeholder with no value blocks naming the placeholder only", () => {
  assert.deepEqual(resolveText("/orders/{missing}", SCOPE), { blocked: "{missing} has no value" });
});
