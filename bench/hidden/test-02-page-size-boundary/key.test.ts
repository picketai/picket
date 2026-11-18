import { expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config.js";
import { buildRouter } from "../../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

it("refuses a size one above the maximum with 400", async () => {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([]), config: DEFAULT_CONFIG });
  const res = await router.handle({ method: "GET", url: "/invoices?size=101", headers: {} });
  expect(res.status).toBe(400);
});
