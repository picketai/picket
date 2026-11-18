import { Config } from "../config.js";
import { NewInvoice, computeTotals, createInvoice } from "../domain/invoice.js";
import { InvoiceRepository } from "../storage/jsonRepository.js";
import { Router, json } from "./router.js";

export interface Deps {
  repo: InvoiceRepository;
  config: Config;
  now?: () => Date;
}

const IDEMPOTENCY_HEADER = "idempotency-key";

export function buildRouter(deps: Deps): Router {
  const now = deps.now ?? (() => new Date());
  const router = new Router();
  const createdByKey = new Map<string, unknown>();

  router.add("GET", "/health", () => json(200, { ok: true }));

  router.add("GET", "/invoices", ({ query }) => {
    const page = Number(query.get("page") ?? "1");
    const requested = Number(query.get("size") ?? deps.config.listing.defaultPageSize);
    const size = Math.min(requested, deps.config.listing.maxPageSize);
    const all = deps.repo.all();
    const items = all.slice(page * size, (page + 1) * size).map((inv) => ({
      ...inv,
      totals: computeTotals(inv, deps.config.tax.ratePercent),
    }));
    return json(200, { page, size, total: all.length, items });
  });

  router.add("GET", "/invoices/:id", ({ params }) => {
    const inv = deps.repo.byId(params.id);
    if (!inv) return json(404, { error: { message: `invoice ${params.id} not found` } });
    return json(200, { ...inv, totals: computeTotals(inv, deps.config.tax.ratePercent) });
  });

  router.add("POST", "/invoices", ({ req }) => {
    const key = req.headers[IDEMPOTENCY_HEADER];
    if (key !== undefined && createdByKey.has(key)) return json(200, createdByKey.get(key));
    const invoice = createInvoice(req.body as NewInvoice, deps.repo.nextId(), now());
    deps.repo.save(invoice);
    const created = { ...invoice, totals: computeTotals(invoice, deps.config.tax.ratePercent) };
    if (key !== undefined) createdByKey.set(key, created);
    return json(201, created);
  });

  return router;
}
