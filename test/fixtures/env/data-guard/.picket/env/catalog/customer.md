---
kind: sql
need: a customer with orders
file: data/customer.sql
service: orders-sql
format: 1
---
request GET {orders}/customers?name=PKT-seed
capture id json 0.id
