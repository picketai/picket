Support staff cannot record a refund against an invoice.

Add POST /invoices/:id/credit with a body `{ "amountCents", "reason" }`. It issues a credit note for the invoice and answers 201 with `{ "id", "invoiceId", "amountCents", "reason" }`; credit note ids are `CN-1`, `CN-2` and so on. `amountCents` is whole cents of at least 1 and `reason` a non-empty string; a body that breaks either answers 400 with `{ "error": { "field", "message" } }`. An invoice the store does not hold answers 404. Credit notes are kept in memory for now.
