import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheLeft, contextColor } from "./layout.mts";
import { factsOf } from "./facts.mts";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;

function cachePiece(promptCache: unknown) {
  return cacheLeft(factsOf({ prompt_cache: promptCache } as Parameters<typeof factsOf>[0], { now: NOW, skill: null }).cache, NOW);
}

test("contextColor measures tokens against the compaction point of the window", () => {
  const compactAt = 0.83 * 200_000;
  assert.equal(contextColor(100_000, compactAt), "success");
  assert.equal(contextColor(120_000, compactAt), "warning");
  assert.equal(contextColor(145_000, compactAt), "error");
});

test("cacheLeft follows prompt_cache", () => {
  const warm = { warm: true, caching_observed: true };
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), { minutes: "2m", color: "warning" });
  assert.deepEqual(cachePiece({ ...warm, expires_at: (NOW + 3 * MINUTE) / 1000 }), { minutes: "~3m", color: "warning" });
  assert.deepEqual(cachePiece({ ...warm, ttl: "1h", expires_at: (NOW + 52 * MINUTE) / 1000 }), { minutes: "52m", color: "dim" });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW + 30_000) / 1000 }), { minutes: "1m", color: "warning" });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", warm: false, expires_at: (NOW + 2 * MINUTE) / 1000 }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: null }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW - MINUTE) / 1000 }), { cold: true });
  assert.equal(cachePiece({ ...warm, caching_observed: false, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), null);
  assert.equal(cachePiece(undefined), null);
});
