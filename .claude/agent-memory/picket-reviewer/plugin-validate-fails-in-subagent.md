---
name: plugin-validate-fails-in-subagent
description: claude plugin validate --strict dist fails in a reviewer subagent shell with "No digest ... hooks/mods/index.tsx is not a code file"; not a code signal
metadata:
  type: reference
---

On Claude Code 2.1.319, `claude plugin validate --strict dist` run from a reviewer subagent shell printed "No digest: its hooks module hooks/mods/index.tsx is not a code file in the folder" and "Validation failed", while the developer's block reported it passing (2026-11-08). Order plans name this as a subagent limit (OQ-002 style: `claude plugin test` refuses with "hooks modules are turned off in this process").

**How to apply:** do not grade a validate/plugin-test criterion FAIL on this output alone; ask the lead to rerun it in the main session. Do not grep the claude binary with a wide ugrep regex: it hits complexity limits or times out; use `python3 -I` with `bytes.find`. Related: [[picket-verify-runs-npm-test]].
