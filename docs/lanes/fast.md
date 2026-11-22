---
icon: lucide/zap
---

# The fast lane

The fast lane is for a small, low-risk change. Claude makes it in the main session, with no plan and no agents, and stops once before the commit.

## When Picket picks it

A few files (`lanes.fast.max_files`, 3 by default), nothing new to design, and no security path or migration.

## What happens

1. Claude makes the change in the main session.
2. It runs your tests and linter.
3. It drives the changed code through its real entry point.
4. It stages the result and shows one block.

## What you see

``` text
## Expedited: 20261010-page-size-option

GET /books accepts page_size from 1 to 100, default 20.

Files: src/routes/books.ts, test/books.test.ts
Tests: passed
Lint: passed
Verified: picket drive --hit "GET /books?page_size=5" → 200, 5 items
Comments: none
Commit: feat(books): page_size query option   (staged; your answer commits it)

[c] commit   [x] discard: <why>
```

| Reply | Effect |
|---|---|
| `c` | commits the change |
| `x` with a reason | the change stays staged for you to decide |

## What it leaves

One commit. There is no plan to keep; the work item's state is in `work/<id>/`.
