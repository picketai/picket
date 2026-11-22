---
icon: lucide/circle-pause
---

# Gates and replies

A gate is a point where Picket stops and waits for you. Nothing is committed, published or made permanent between two gates without your reply.

## The phase gate

In the order and design lanes the developer stops after each phase, and you get a gate packet:

``` text
▶ phase 1/2 done · 20261010-csv-export
  GET /orders/export returns the filtered orders as CSV.

  tests     passed (212/212)
  lint      none detected
  verified  picket drive --hit "GET /orders/export?status=paid" → 200, text/csv, 14 rows
  files     src/routes/orders.ts, src/csv.ts, +2 more
  decisions · quoted every field, since titles contain commas
  commit    feat(orders): CSV export of filtered orders

[a] approve   [r] run through 2   [x] reject: <why>
```

| Reply | Effect |
|---|---|
| `a` | commits the phase and starts the next one |
| `r 3` | approves and lets the developer continue through phase 3 without stopping, except at a phase marked security-sensitive, which always stops |
| `x the export must stream, not buffer` | nothing is committed; the developer fixes the staged work and shows a new packet |
| a question | Claude answers and shows the options again |

## When a phase stalls

Sometimes the developer cannot meet a check without changing a decision. It stops with `PHASE STALLED` and says why, and you choose:

``` text
[c] continue with a fresh developer · [d] redesign · [x] abandon
```

`d` sends the problem to the architect, who amends the plan in place (the decision keeps its number and gets a revision mark such as `D-002 (r2)`), and the developer carries on with the work it already has.

## Comments in code

Picket writes no new comments in code: names, types, small functions and tests carry the meaning. When a comment is the only way to say why a value is what it is, Claude proposes it on the packet's `Comments:` line with its path, line and text, and writes it only if you reply `k <n>` (keep comment n). A hook denies any other new comment.

## The other gates

| Gate | Where it is described |
|---|---|
| the fast lane's commit | [The fast lane](lanes/fast.md#what-you-see) |
| the research outline | [The research lane](lanes/research.md#what-you-see) |
| the branch for the worktrees, in an umbrella | [Worktrees in an umbrella](umbrella-worktrees.md) |
| the tester's questions | [Review and testing](review-and-testing.md#the-test-stage) |
