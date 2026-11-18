---
replaces: payments
source: recorded
recorded: 2026-11-18
format: 1
---
when POST /payments
  status 201
  header Content-Type: application/json
  body {"id":"pay-1","state":"authorised"}
when GET /payments/*
  status 200
  header Content-Type: application/json
  body {"id":"pay-1","state":"captured"}
