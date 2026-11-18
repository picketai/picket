import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { Invoice } from "../src/domain/invoice.js";
import { buildRouter } from "../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const invoice: Invoice = {
  id: "INV-1001",
  customer: "Acme",
  currency: "EUR",
  createdAt: "2026-08-01T00:00:00.000Z",
  lines: [{ description: "x", quantity: 1, unitPriceCents: 1000 }],
};

async function credit(id: string, body: unknown) {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([invoice]), config: DEFAULT_CONFIG });
  const res = await router.handle({ method: "POST", url: `/invoices/${id}/credit`, headers: {}, body });
  return { status: res.status, body: JSON.parse(res.body) };
}

describe("POST /invoices/:id/credit", () => {
  it("creates a credit note with 201", async () => {
    const { status, body } = await credit("INV-1001", { amountCents: 300, reason: "damaged" });
    expect(status).toBe(201);
    expect(body).toEqual({ id: "CN-1", invoiceId: "INV-1001", amountCents: 300, reason: "damaged" });
  });

  it("answers 404 for an unknown invoice", async () => {
    expect((await credit("INV-9999", { amountCents: 300, reason: "damaged" })).status).toBe(404);
  });

  it("refuses an amount of 0 and names the field", async () => {
    const { status, body } = await credit("INV-1001", { amountCents: 0, reason: "damaged" });
    expect(status).toBe(400);
    expect(body.error.field).toBe("amountCents");
  });

  it("refuses an empty reason and names the field", async () => {
    const { status, body } = await credit("INV-1001", { amountCents: 300, reason: "" });
    expect(status).toBe(400);
    expect(body.error.field).toBe("reason");
  });
});
