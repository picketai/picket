import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Invoice } from "../../src/domain/invoice.js";
import { JsonInvoiceRepository, MemoryInvoiceRepository } from "../../src/storage/jsonRepository.js";

const invoice = (id: string): Invoice => ({ id, customer: "c", currency: "EUR", createdAt: "2026-08-01T00:00:00.000Z", lines: [] });

describe("hidden: a non-INV id never breaks the next id", () => {
  it("the memory repository counts on from the highest INV- number", () => {
    const repo = new MemoryInvoiceRepository([invoice("INV-1004"), invoice("LEGACY-7"), invoice("INV-1002")]);
    expect(repo.nextId()).toBe("INV-1005");
    expect(repo.nextId()).toBe("INV-1006");
  });

  it("the JSON repository counts on from the highest INV- number", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-ids-"));
    try {
      const file = join(dir, "invoices.json");
      writeFileSync(file, JSON.stringify({ invoices: [invoice("INV-1006"), invoice("LEGACY-7")] }));
      const repo = new JsonInvoiceRepository(file);
      expect(repo.nextId()).toBe("INV-1007");
      repo.save(invoice(repo.nextId()));
      expect(repo.nextId()).toBe("INV-1008");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("only legacy ids start the count at INV-1001", () => {
    expect(new MemoryInvoiceRepository([invoice("LEGACY-7")]).nextId()).toBe("INV-1001");
  });
});
