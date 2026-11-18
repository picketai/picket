import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { Invoice } from "../src/domain/invoice.js";
import { buildRouter } from "../src/http/handlers.js";
import { JsonInvoiceRepository, MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const invoice: Invoice = {
  id: "INV-1001",
  customer: "Acme",
  currency: "EUR",
  createdAt: "2026-08-01T00:00:00.000Z",
  lines: [{ description: "x", quantity: 1, unitPriceCents: 1000 }],
};

describe("DELETE /invoices/:id", () => {
  it("removes the invoice and answers 204", async () => {
    const repo = new MemoryInvoiceRepository([invoice]);
    const router = buildRouter({ repo, config: DEFAULT_CONFIG });
    const res = await router.handle({ method: "DELETE", url: "/invoices/INV-1001", headers: {} });
    expect(res.status).toBe(204);
    expect(repo.byId("INV-1001")).toBeUndefined();
  });

  it("a deleted invoice is no longer served", async () => {
    const router = buildRouter({ repo: new MemoryInvoiceRepository([invoice]), config: DEFAULT_CONFIG });
    await router.handle({ method: "DELETE", url: "/invoices/INV-1001", headers: {} });
    const res = await router.handle({ method: "GET", url: "/invoices/INV-1001", headers: {} });
    expect(res.status).toBe(404);
  });
});

describe("JsonInvoiceRepository.remove", () => {
  let dir = "";
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("removes a stored invoice and reports whether one was removed", () => {
    dir = mkdtempSync(join(tmpdir(), "ledgerlite-"));
    const repo = new JsonInvoiceRepository(join(dir, "invoices.json"));
    repo.save(invoice);
    expect(repo.remove("INV-1001")).toBe(true);
    expect(repo.remove("INV-1001")).toBe(false);
    expect(repo.all()).toEqual([]);
  });
});
