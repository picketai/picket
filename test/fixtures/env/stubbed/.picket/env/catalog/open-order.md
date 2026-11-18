---
kind: find
need: an order that is still open
format: 1
---
request POST {payments-mock}/orders/search
  body {"state":"open"}
expect status 200
capture id json orders.0.id
