---
icon: lucide/milestone
---

# The four lanes

A lane is the amount of process a request gets. The kernel picks it from your words and from the files the change touches; you never pick one by hand.

## The lanes side by side

| Lane | For | Who works | Where it stops for you |
|---|---|---|---|
| [Fast](fast.md) | a small change in a few files | the main session alone | once, before the commit |
| [Order](order.md) | a bounded feature in a few phases | architect, developer, reviewer | after each phase, then once at the end |
| [Design](design.md) | a risky or large change | architect, developer, reviewer, and the tester when the project has a test environment | after each phase; security phases always stop |
| [Research](research.md) | a question that needs a report | analyst | after the outline, then after the deep pass |

A plain question ("what does `refreshToken` do?") takes no lane; Claude just answers it.

## The lane can change on the way

The kernel re-checks the lane against the files a change really touches. A request that looked small but grows past `lanes.fast.max_files` files (3 by default) moves from fast to order on its own, and a change under a security path always moves to design.

## Choosing the lane yourself

Add a line with the lane you want to your request, and the kernel honours it:

``` text
Rename the page_size option to per_page.
lane: fast
```

The line takes `fast`, `order`, `design` or `research`. A change under a security path still takes the design lane.
