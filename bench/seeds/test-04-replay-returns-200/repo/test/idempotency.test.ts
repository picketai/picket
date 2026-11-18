import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { buildRouter } from "../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const body = { customer: "Acme", currency: "EUR", lines: [{ description: "a", quantity: 1, unitPriceCents: 500 }] };

function app() {
  const repo = new MemoryInvoiceRepository([]);
  return { repo, router: buildRouter({ repo, config: DEFAULT_CONFIG, now: () => new Date("2026-09-01T00:00:00.000Z") }) };
}

const post = (router: ReturnType<typeof buildRouter>, headers: Record<string, string>) => router.handle({ method: "POST", url: "/invoices", headers, body });

describe("POST /invoices with an Idempotency-Key", () => {
  it("creates once with 201 and answers a replay with 200 and the original invoice", async () => {
    const { router, repo } = app();
    const first = await post(router, { "idempotency-key": "k1" });
    const replay = await post(router, { "idempotency-key": "k1" });
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(JSON.parse(replay.body)).toEqual(JSON.parse(first.body));
    expect(repo.all()).toHaveLength(1);
  });

  it("creates a new invoice for another key", async () => {
    const { router, repo } = app();
    await post(router, { "idempotency-key": "k1" });
    const other = await post(router, { "idempotency-key": "k2" });
    expect(other.status).toBe(201);
    expect(repo.all()).toHaveLength(2);
  });

  it("creates every time without a key", async () => {
    const { router, repo } = app();
    await post(router, {});
    await post(router, {});
    expect(repo.all()).toHaveLength(2);
  });
});
