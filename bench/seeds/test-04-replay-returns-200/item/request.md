Clients retry POST /invoices after a timeout and create the same invoice twice.

Accept an `Idempotency-Key` header on POST /invoices. The first request with a key creates the invoice as today, 201. A later request with the same key creates nothing and answers 200 with the invoice the first request created, so a client can tell a replay from a creation by the status. A request without the header creates an invoice every time, as today. Keys are kept in memory while the service runs.
