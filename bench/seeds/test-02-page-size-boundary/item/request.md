GET /invoices quietly cuts a page size above `listing.maxPageSize` down to the maximum, so a client asking for 500 invoices gets 100 and never learns why.

Refuse instead: a `size` above `listing.maxPageSize` (100 by default) answers 400 with `{ "error": { "field": "size", "message" } }`, and so does a `size` that is not a whole number of at least 1. Every size from 1 to the maximum is served as today, 200 with the page.
