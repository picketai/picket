import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { Invoice } from "../src/domain/invoice.js";
import { buildRouter } from "../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const seed: Invoice[] = Array.from({ length: 5 }, (_, i) => ({
  id: `INV-${1001 + i}`,
  customer: `Customer ${i}`,
  currency: "EUR",
  createdAt: `2026-08-0${i + 1}T00:00:00.000Z`,
  lines: [{ description: "x", quantity: 1, unitPriceCents: 1000 }],
}));

async function list(query: string) {
  const router = buildRouter({ repo: new MemoryInvoiceRepository(seed), config: DEFAULT_CONFIG });
  const res = await router.handle({ method: "GET", url: `/invoices${query}`, headers: {} });
  return { status: res.status, body: JSON.parse(res.body) };
}

describe("GET /invoices pages", () => {
  it("reports the page count at the requested size", async () => {
    const { status, body } = await list("?page=0&size=2");
    expect(status).toBe(200);
    expect(body.pages).toBe(3);
    expect(body.items).toHaveLength(2);
  });

  it("starts at page 0 by default", async () => {
    const { body } = await list("?size=2");
    expect(body.page).toBe(0);
    expect(body.items.map((i: Invoice) => i.id)).toEqual(["INV-1005", "INV-1004"]);
  });

  it("answers the last page with what is left", async () => {
    const { body } = await list("?page=2&size=2");
    expect(body.items).toHaveLength(1);
  });

  it("answers a page past the last with 200 and an empty list", async () => {
    const { status, body } = await list("?page=3&size=2");
    expect(status).toBe(200);
    expect(body).toMatchObject({ total: 5, pages: 3, items: [] });
  });

  it("refuses a negative page and names the field", async () => {
    const { status, body } = await list("?page=-1");
    expect(status).toBe(400);
    expect(body.error.field).toBe("page");
  });
});
