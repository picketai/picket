---
kind: create
need: a customer of its own, made for this run
format: 1
---
request POST {payments-mock}/customers
  header Content-Type: application/json
  body {"name":"PKT-{run}-customer"}
expect status 201
capture id json id
