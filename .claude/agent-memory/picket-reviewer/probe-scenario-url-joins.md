---
name: probe-scenario-url-joins
description: saved-scenario runner joins base URL + resolved path with no slash check; probe host escapes with new Request in node -e
metadata:
  type: reference
---

`src/lib/shared/scenarios/runner.mts` builds `base + resolvedPath`, and rule 1 (`rules.mts`) only checks the leading `{service}` token, not that the rest starts with `/`. Probe escapes with `node -e 'new Request("http://127.0.0.1:49153@evil.example/x")'`: Node's fetch throws on URLs with credentials, and `\@` stays on the original host, so the `{orders}@host` spelling was closed on 2026-11-15. Re-probe if the adapter stops using fetch. Related: [[probe-guards-from-node-e]].
