import { expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config.js";
import { buildRouter } from "../../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

it("answers a page far past the last with 200 and an empty list, as the story says", async () => {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([]), config: DEFAULT_CONFIG });
  const res = await router.handle({ method: "GET", url: "/invoices?page=99", headers: {} });
  expect(res.status).toBe(200);
  expect(JSON.parse(res.body).items).toEqual([]);
});
