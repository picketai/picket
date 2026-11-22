---
icon: lucide/search
---

# The research lane

The research lane answers a question with a report, not a change. Use it to understand a part of the system before you touch it.

## When Picket picks it

The request is a question that needs a report: "how does checkout compute tax?", "map the order lifecycle", "before we touch this I need to understand it". A plain question with a one-paragraph answer needs no lane.

## What happens

1. The analyst returns an outline: a summary, the section headings and the sources it will read.
2. You redirect it if it is off, or accept.
3. On a deeper pass, it fills every section and stops again.

## What you see

The outline ends with your replies:

``` text
[a] accept   [p] accept and publish to artifacts/reports/<slug>.md   [d] deeper pass   [x] reject: <why>
```

| Reply | Effect |
|---|---|
| `a` | accepts the report |
| `p` | accepts it and copies it to `artifacts/reports/`, named from the item's title |
| `d` | asks for the deep pass |
| `x` with a reason | rejects it |

## What it leaves

The report, in `work/<id>/research.md`. No code changes. The analyst never proposes a design; a finding that needs one is flagged, and the closing line offers the order or design lane.
