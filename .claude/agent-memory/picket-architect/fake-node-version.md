---
name: fake-node-version
description: process.versions.node is configurable on Node 24.22.1, so a test can fake an old Node with a --import preload that calls Object.defineProperty
metadata:
  type: reference
---

Probed 2026-10-22 on Node 24.22.1: `Object.getOwnPropertyDescriptor(process.versions, "node")` is `{ writable: false, configurable: true }`, and `node --import ./fake.mjs -e "console.log(process.versions.node)"` prints `20.11.1` when `fake.mjs` holds `Object.defineProperty(process.versions, "node", { value: "20.11.1" })`.

Writing that preload from Bash is blocked by guard.bash (a shell write of a code file); write it with the Write tool.

**How to apply:** a runtime version check can be driven end to end through the real entry point (CLI or hook bundle) without installing an old Node. Related: [[guard-log-replay]].
