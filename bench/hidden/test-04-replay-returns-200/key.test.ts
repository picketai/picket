import { expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config.js";
import { buildRouter } from "../../src/http/handlers.js";
import { MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

it("answers a replayed key with 200, as the story says", async () => {
  const router = buildRouter({ repo: new MemoryInvoiceRepository([]), config: DEFAULT_CONFIG });
  const body = { customer: "Acme", currency: "EUR", lines: [{ description: "a", quantity: 1, unitPriceCents: 500 }] };
  const send = () => router.handle({ method: "POST", url: "/invoices", headers: { "idempotency-key": "replay" }, body });
  await send();
  const replay = await send();
  expect(replay.status).toBe(200);
});
