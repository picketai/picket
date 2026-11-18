import { expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config.js";
import { buildRouter } from "../../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

it("refuses a negative quantity with 400 naming lines[0].quantity", async () => {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([]), config: DEFAULT_CONFIG });
  const body = { customer: "Acme", currency: "EUR", lines: [{ description: "a", quantity: -1, unitPriceCents: 500 }] };
  const res = await router.handle({ method: "POST", url: "/invoices", headers: {}, body });
  expect(res.status).toBe(400);
  expect(JSON.parse(res.body).error.field).toBe("lines[0].quantity");
});
