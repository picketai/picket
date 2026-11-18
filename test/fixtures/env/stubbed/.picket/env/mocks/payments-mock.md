---
replaces: payments
source: recorded
recorded: 2026-11-18
format: 1
---
when POST /charges
  status 201
  header Content-Type: application/json
  body {"id":"ch_1","state":"authorised"}
when GET /charges/*
  status 200
  header Content-Type: application/json
  body {"id":"ch_9","state":"captured"}
