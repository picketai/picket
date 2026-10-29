import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageError } from "../util/args.mts";
import { documentRel, documentRequest, documentSlug, nameDocument } from "./document-path.mts";
import { withProject } from "#test/project.mts";

test("a slug keeps the first five words of the subject, lowercased, without stopwords or a meta prefix", () => {
  assert.equal(documentSlug("report", "Report on invoice pricing"), "report-invoice-pricing");
  assert.equal(documentSlug("report", "Analysis of pricing"), "pricing");
  assert.equal(documentSlug("charter", "The billing context: its purpose and the people who own it"), "billing-context-its-purpose-people");
});

test("an api slug drops the HTTP method, the api segment and version markers", () => {
  assert.equal(documentSlug("api", "POST /v1/book-orders/confirm"), "book-orders-confirm");
  assert.equal(documentSlug("api", "GET /api/v2/summary"), "summary");
});

test("a subject of stopwords only has no slug", () => {
  assert.equal(documentSlug("report", "of the and"), null);
});

test("each kind lives in its own folder, with no kind suffix and no about- prefix", () => {
  assert.equal(documentRel("report", { subject: "Report on invoice pricing" }), "artifacts/reports/report-invoice-pricing.md");
  assert.equal(documentRel("charter", { subject: "billing" }), "artifacts/strategy/charters/billing.md");
  assert.equal(documentRel("context-map", { subject: "billing" }), "artifacts/strategy/context-maps/billing.md");
  assert.equal(documentRel("glossary", { subject: "invoice" }), "artifacts/strategy/glossary/invoice.md");
  assert.equal(documentRel("api", { subject: "GET /v1/summary" }), "artifacts/api/summary.md");
  assert.equal(documentRel("sdr", { subject: "pricing", sequence: 12 }), "artifacts/strategy/decisions/00012-pricing.md");
});

test("order and design name the work item file and need --work", () => {
  assert.equal(documentRel("design", { work: "20261029-x" }), "work/20261029-x/design.md");
  assert.equal(documentRel("order", { work: "20261029-x" }), "work/20261029-x/order.md");
  assert.throws(() => documentRel("design"), /design needs --work <id>/);
  assert.throws(() => documentRel("order", { work: "../etc" }), UsageError);
});

test("--work on an artifact kind, a missing subject and a stopword subject are usage errors", () => {
  assert.throws(() => documentRel("report", { subject: "pricing", work: "20261029-x" }), /--work is for order and design; a report lives under artifacts\/reports\//);
  assert.throws(() => documentRel("charter"), /charter needs a subject/);
  assert.throws(() => documentRel("report", { subject: "of the" }), /leaves no word for a name/);
});

test("an unknown kind is a usage error that lists the kinds", () => {
  for (const kind of ["adr", "plan", "progress"]) {
    assert.throws(() => documentRequest(kind, { subject: "pricing" }), (err: Error) => err instanceof UsageError && err.message.includes(`"${kind}" is not a document kind: order, design, report, charter, context-map, sdr, glossary, api`));
  }
});

test("nameDocument numbers an SDR after the highest sequence in the decisions folder", (t) => {
  const root = withProject(t);
  const decisions = join(root, "artifacts", "strategy", "decisions");
  mkdirSync(decisions, { recursive: true });
  writeFileSync(join(decisions, "00001-a.md"), "# a\n");
  writeFileSync(join(decisions, "00003-x.md"), "# x\n");
  writeFileSync(join(decisions, "notes.md"), "# notes\n");
  assert.deepEqual(nameDocument(root, { kind: "sdr", subject: "pricing" }), { path: "artifacts/strategy/decisions/00004-pricing.md", exists: false });
});

test("nameDocument starts SDRs at 00001 when the decisions folder is absent", (t) => {
  const root = withProject(t);
  assert.equal(nameDocument(root, { kind: "sdr", subject: "pricing" }).path, "artifacts/strategy/decisions/00001-pricing.md");
});

test("nameDocument says whether the file is already there", (t) => {
  const root = withProject(t);
  const request = { kind: "report", subject: "Report on invoice pricing" } as const;
  assert.deepEqual(nameDocument(root, request), { path: "artifacts/reports/report-invoice-pricing.md", exists: false });
  mkdirSync(join(root, "artifacts", "reports"), { recursive: true });
  writeFileSync(join(root, "artifacts", "reports", "report-invoice-pricing.md"), "# r\n");
  assert.deepEqual(nameDocument(root, request), { path: "artifacts/reports/report-invoice-pricing.md", exists: true });
});
