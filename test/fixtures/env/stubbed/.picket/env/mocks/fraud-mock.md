---
replaces: fraud
source: recorded
recorded: 2026-11-18
format: 1
---
when POST /checks
  status 200
  header Content-Type: application/json
  body {"verdict":"clear"}
