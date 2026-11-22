---
icon: lucide/drafting-compass
---

# The design lane

The design lane is for a change that is risky or too large for an order. It runs like the order lane, with a fuller plan and more checks on the way.

## When Picket picks it

Any one of these is enough:

- the change touches a security path;
- it needs a schema or data migration;
- it has a step that cannot be undone;
- it touches a second repository;
- it is more than an order holds.

The plan can have up to `lanes.design.max_phases` phases and `lanes.design.max_decisions` decisions (10 and 8 by default).

## What happens

1. The architect writes the plan to `work/<id>/design.md`, decisions first.
2. A reviewer checks the plan against its own decisions while the developer starts phase 1.
3. The developer stops at a [gate](../gates.md) after each phase.
4. When every phase is approved, a fresh reviewer runs the [final review](../review-and-testing.md).
5. The [test stage](../review-and-testing.md#the-test-stage) follows, when the project has a test environment.

!!! warning "Checks only this lane has"

    - A phase marked security-sensitive always stops at its own gate, even inside a run you granted.
    - A step that cannot be undone needs an extra confirmation: its gate offers `[i]` in place of `[a]`.
    - A plan of 6 or more phases gets a checkpoint review before the phase after the midpoint.

## When the plan and the work disagree

If the reviewer finds that the plan drifts from its own decisions, the architect amends the decision in place and the developer's work is checked again, not thrown away.

## What it leaves

- The plan, in `work/<id>/design.md`.
- One commit for each phase, with a message you saw at the gate.
- A closing block, as in the [order lane](order.md#what-it-leaves), with a `Tested:` line that says what the tester found.
