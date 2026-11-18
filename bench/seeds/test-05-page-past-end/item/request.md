A client paging through GET /invoices cannot tell how many pages there are, and the first page is skipped when it sends no `page`.

Add `pages` to the GET /invoices answer: the number of pages at the requested size. Pages count from 0 and `page` defaults to 0. A page at or past the last answers 200 with an empty `items` list and the same `total` and `pages`, so a client looping over pages stops on the first empty list; it is not an error. A `page` that is negative or not a whole number answers 400 with `{ "error": { "field": "page", "message" } }`.
