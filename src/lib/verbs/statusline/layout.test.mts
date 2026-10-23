import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheLeft, compactTokens, contextColor } from "./layout.mts";
import { factsOf } from "./facts.mts";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;

function cachePiece(promptCache: unknown) {
  return cacheLeft(factsOf({ prompt_cache: promptCache } as Parameters<typeof factsOf>[0], { now: NOW, skill: null }).cache, NOW);
}

test("compactTokens reads whole k below 100k, one decimal k below a million, one decimal M from it (T-1.5)", () => {
  const cases: [number, string][] = [[999, "999"], [46_000, "46k"], [99_400, "99k"], [99_600, "99.6k"], [200_000, "200.0k"], [999_960, "1.0M"], [1_500_000, "1.5M"]];
  for (const [tokens, text] of cases) assert.equal(compactTokens(tokens), text, String(tokens));
});

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
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", warm: false, expires_at: (NOW + 2 * MINUTE) / 1000 }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: null }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW - MINUTE) / 1000 }), { cold: true });
  assert.equal(cachePiece({ ...warm, caching_observed: false, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), null);
  assert.equal(cachePiece(undefined), null);
});
