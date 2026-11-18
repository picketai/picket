import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { buildRouter } from "../src/http/handlers.js";
import { newInvoiceError } from "../src/http/validation.js";
import { MemoryInvoiceRepository } from "../src/storage/jsonRepository.js";

const good = { customer: "Acme", currency: "EUR", lines: [{ description: "a", quantity: 2, unitPriceCents: 500 }] };

async function post(body: unknown) {
  const repo = new MemoryInvoiceRepository([]);
  const router = buildRouter({ repo, config: DEFAULT_CONFIG, now: () => new Date("2026-09-01T00:00:00.000Z") });
  const res = await router.handle({ method: "POST", url: "/invoices", headers: {}, body });
  return { res, repo };
}

describe("new invoice validation", () => {
  it("accepts a valid body", () => {
    expect(newInvoiceError(good)).toBeNull();
  });

  it("names an empty customer", () => {
    expect(newInvoiceError({ ...good, customer: " " })?.field).toBe("customer");
  });

  it("names a lower-case currency", () => {
    expect(newInvoiceError({ ...good, currency: "eur" })?.field).toBe("currency");
  });

  it("names an empty line list", () => {
    expect(newInvoiceError({ ...good, lines: [] })?.field).toBe("lines");
  });

  it("names a fractional quantity", () => {
    expect(newInvoiceError({ ...good, lines: [{ description: "a", quantity: 1.5, unitPriceCents: 500 }] })?.field).toBe("lines[0].quantity");
  });

  it("names a negative unit price", () => {
    expect(newInvoiceError({ ...good, lines: [{ description: "a", quantity: 1, unitPriceCents: -1 }] })?.field).toBe("lines[0].unitPriceCents");
  });
});

describe("POST /invoices", () => {
  it("creates a valid invoice with 201", async () => {
    const { res, repo } = await post(good);
    expect(res.status).toBe(201);
    expect(repo.all()).toHaveLength(1);
  });

  it("refuses an invalid body with 400, names the field and stores nothing", async () => {
    const { res, repo } = await post({ ...good, customer: "" });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error.field).toBe("customer");
    expect(repo.all()).toHaveLength(0);
  });
});
