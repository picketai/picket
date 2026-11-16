---
name: artifact-amended-mid-run
description: A design or order can gain criteria between phases of a granted run; re-read the phase section from disk at every phase
metadata:
  type: feedback
---

Re-read the current phase's section of the artifact from disk at the start of every phase, even inside a run grant, and compare its `**Done when:**` list with what you remember.

**Why:** on 2026-11-16 (item 20261116-guard-closure-checks-derive-their-spellings), the architect added T-4.6 and D-004 (r2) after a gate ruling, before phase 4 started. Phase 4 was built from the version read at phase 1, so T-4.6 was missed, and the cumulative review came back CHANGES REQUIRED with a critical finding.

**How to apply:** at each phase, Read the design or order again (at least the phase section and `## Revision log`) before editing. A revision log line dated today means the plan changed. See also [[base-red-via-archive]].
