# Researching, step 2: the deep pass

Continue the analyst (never respawn):

```
work: <id>
deep pass
redirect: <the user's redirect, verbatim, or none>
```

Wait for `REPORT WRITTEN`, render the packet without the `[d]` option, stop. `a` closes the item; `x <what>` sends one more bounded pass with the redirect. A third redirect is a signal the question is not a research question: say so and offer `consulting` or `ordering`.

## Analyst section

Read every source listed under `## Sources for the deep pass`, adjusted by the redirect. Coverage rules from your agent file apply: full reads, entry-point reachability with a 60-file cap for large directories, one confidence marker per finding, IDs kept from the outline and extended in encounter order.

Fill every section of the report. Replace each `pending deep pass` line. Keep `## Summary` to five sentences; move detail into `## Findings`. Cite `path:line` or URL for every finding. Reconcile sources that disagree and say which you trust and why. Record what you could not read under `## Risks and unknowns` as `[UNKNOWN]`.

Flag findings that need a decision `[ARCHITECT REVIEW NEEDED]` and repeat the flag on the output block's line. Do not propose the decision.

End with the analyst output block and `REPORT WRITTEN`.
