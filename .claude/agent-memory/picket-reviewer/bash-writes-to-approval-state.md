---
name: bash-writes-to-approval-state
description: guard.bash lets a spawned developer append to .picket/state/** and work/<id>/comments.jsonl via Bash; guard.scope covers Edit/Write only
metadata:
  type: project
---

As of 2026-11-18, guardOutput as `abcd-developer` allows `echo x >> .picket/state/data/approvals.jsonl`, `tee -a`, `cp` and `node -e appendFileSync` into state, and `echo x >> work/<id>/comments.jsonl`. The tester is denied (it runs only its verbs). Any new approval ledger a design says "guard.scope protects" is protected only from Edit/Write.

**Why:** a design decision resting on guard.scope for an approval file overstates the protection; this was a Se4 finding on the picket data approvals.
**How to apply:** when a change adds trust state, probe the Bash write forms as a developer (see [[in-place-probe-from-scratch-file]], [[probe-guards-directly]]) before grading the guard.
