---
icon: lucide/shield-check
---

# Review and testing

A change in the order or design lane is checked twice after its last phase: a reviewer reads the whole change, and the tester tries the finished item from the outside when the project allows it.

## The final review

When every phase is approved, a fresh reviewer that has not seen the plan reviews the whole change against your original request.

| Verdict | Effect |
|---|---|
| `APPROVED` | closes the work item, or starts the test stage when one is due |
| `CHANGES REQUIRED` | sends findings back to the developer |

## The test stage

After the final review passes, the tester checks the finished item the way its users will meet it: on a running copy of the system, against what you asked for, without reading the change.

!!! note "When an item is tested"

    All three must hold:

    - the `testing` [setting](customization.md#settings) covers the lane: `design` (the default) tests design items, `all` adds order items, `off` tests none;
    - the plan declares at least one check against an HTTP endpoint;
    - the project has a test environment in `.picket/env/compose.yaml`; [How to set up testing](set-up-testing.md) builds it.

What the tester does:

1. It writes one case for each risk and runs it on the item's own stack.
2. It replays the saved scenarios.
3. It classifies every failure as a product, test or environment problem, with the answer it saw.
4. It asks you at most three questions, each a choice.

The kernel, not the tester, counts the results, writes `work/<id>/test.md` and derives the verdict. The same tester retests after each fix round.

## What the closing block says

The closing block's `Tested:` line says what came of it:

``` text
Tested: APPROVED in round 2 · 5 passed, 1 not covered
```

When an item was not tested, the line says why, such as `no environment`. A `Not verified end to end:` line names each real service a mock stood in for.
