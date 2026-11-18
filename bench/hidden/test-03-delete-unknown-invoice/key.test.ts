import { expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config.js";
import { buildRouter } from "../../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

it("answers 404 for an id the store does not hold", async () => {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([]), config: DEFAULT_CONFIG });
  const res = await router.handle({ method: "DELETE", url: "/invoices/INV-9999", headers: {} });
  expect(res.status).toBe(404);
});
