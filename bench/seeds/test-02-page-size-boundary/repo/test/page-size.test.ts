import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { Invoice } from "../src/domain/invoice.js";
import { buildRouter } from "../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const seed: Invoice[] = Array.from({ length: 3 }, (_, i) => ({
  id: `INV-${1001 + i}`,
  customer: `Customer ${i}`,
  currency: "EUR",
  createdAt: `2026-08-0${i + 1}T00:00:00.000Z`,
  lines: [{ description: "x", quantity: 1, unitPriceCents: 1000 }],
}));

async function list(query: string) {
  const router = buildRouter({ repo: new MemoryInvoiceRepository(seed), config: DEFAULT_CONFIG });
  return router.handle({ method: "GET", url: `/invoices${query}`, headers: {} });
}

describe("GET /invoices page size", () => {
  it("serves the largest allowed size", async () => {
    const res = await list("?page=0&size=100");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).size).toBe(100);
  });

  it("refuses a size far above the maximum and names the field", async () => {
    const res = await list("?size=500");
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.field).toBe("size");
  });

  it("refuses a size of 0", async () => {
    expect((await list("?size=0")).status).toBe(400);
  });

  it("refuses a size that is not a number", async () => {
    expect((await list("?size=abc")).status).toBe(400);
  });
});
