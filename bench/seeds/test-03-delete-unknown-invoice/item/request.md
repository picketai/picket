There is no way to remove an invoice entered by mistake.

Add DELETE /invoices/:id. It removes the invoice from the store and answers 204 with no body; the invoice is then gone from GET /invoices/:id and GET /invoices. An id the store does not hold answers 404 with `{ "error": { "message" } }`, as GET /invoices/:id does.
