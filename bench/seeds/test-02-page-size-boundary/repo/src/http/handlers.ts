import { Config } from "../config.js";
import { NewInvoice, computeTotals, createInvoice } from "../domain/invoice.js";
import { InvoiceRepository } from "../storage/jsonRepository.js";
import { Router, json } from "./router.js";

export interface Deps {
  repo: InvoiceRepository;
  config: Config;
  now?: () => Date;
}

function pageSizeError(size: number, maxPageSize: number): string | null {
  const firstRefused = maxPageSize + 1;
  if (!Number.isInteger(size) || size < 1) return "must be a whole number of at least 1";
  if (size > firstRefused) return `must be at most ${maxPageSize}`;
  return null;
}

export function buildRouter(deps: Deps): Router {
  const now = deps.now ?? (() => new Date());
  const router = new Router();

  router.add("GET", "/health", () => json(200, { ok: true }));

  router.add("GET", "/invoices", ({ query }) => {
    const page = Number(query.get("page") ?? "1");
    const size = Number(query.get("size") ?? deps.config.listing.defaultPageSize);
    const error = pageSizeError(size, deps.config.listing.maxPageSize);
    if (error) return json(400, { error: { field: "size", message: error } });
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
    const input = req.body as NewInvoice;
    const invoice = createInvoice(input, deps.repo.nextId(), now());
    deps.repo.save(invoice);
    return json(201, { ...invoice, totals: computeTotals(invoice, deps.config.tax.ratePercent) });
  });

  return router;
}
