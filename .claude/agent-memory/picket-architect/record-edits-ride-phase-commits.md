---
name: record-edits-ride-phase-commits
description: An approval commit takes everything under work/<id>/, so an architect's half-done record edit can land in a phase commit; lint.schema then compares markers against HEAD
metadata:
  type: reference
---

`picket route --verdict approved` commits `work/<id>/` with the phase (`src/lib/verbs/route/commit.mts`, `add: [workRel(id)]`). On 2026-10-18 the user approved phase 4 of 20261018-fix-follow-ups-from-the-two-items while I was mid-amendment. Commit 87fea42 took my D-005 heading bump to (r3) without its body or log line, and the phase I meant to amend was then approved.

`lint.schema` compares decision markers with the HEAD copy, so after that the next bump had to be (r4).

**How to apply:** at the start of any amendment, check `ls work/<id>/phases` and `git log -1 -- work/<id>/design.md`. Make the marker bump, body, log line and phase edits in as few saves as possible. Before replying, check the phases folder again for a new `.approved` marker. Related: [[block-format-couplings]], [[verify-grep-patterns]].
