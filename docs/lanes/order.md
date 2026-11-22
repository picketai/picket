---
icon: lucide/list-ordered
---

# The order lane

The order lane is for a bounded feature, such as a new endpoint or module. An architect writes a short plan, a developer builds it one phase at a time, and you approve each phase.

## When Picket picks it

A feature that fits in up to `lanes.order.max_phases` phases and `lanes.order.max_decisions` decisions (3 and 5 by default), with no security path, migration or second repository. An order that outgrows these caps moves to the [design lane](design.md).

## What happens

1. The architect writes the plan to `work/<id>/order.md`: numbered decisions with the reason for each, then phases, each with the files it touches and the checks that prove it done.
2. The developer implements one phase and stops at a [gate](../gates.md).
3. You approve, and the next phase starts.
4. When every phase is approved, a fresh reviewer runs the [final review](../review-and-testing.md).
5. With the `testing` setting on `all`, the [test stage](../review-and-testing.md#the-test-stage) follows.

## What it leaves

- The plan, in `work/<id>/order.md`.
- One commit for each phase, with a message you saw at the gate.
- A closing block that sums the work up:

``` text
## Order closed: 20261010-csv-export
Phases: 2 · commits 3f2a9c1d..8be4a07e · review: APPROVED
Tested: off for the order lane (testing: design)
Audit: order · phases 2 · tokens architect 1.2M, developer 2.4M, reviewer 0.9M · bounces 0 · blocks 2
```
