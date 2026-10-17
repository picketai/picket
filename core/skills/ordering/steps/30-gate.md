# Ordering, step 3: the user gate

`picket next <id>` said `approve_phase` by user, with `phase: n` and `options`. This is the one place the lane stops. Print the packet, send a push notification when the tool exists, and end the turn.

The packet is rendered by code from the developer's saved block, so it has the same shape and width every time:

```
picket packet <id>
```

Print its output verbatim inside one ```` ```text ```` code fence, so the terminal keeps its two columns (plain lines are joined by the Markdown renderer), and nothing before or after the fence: no summary of the plan, no restatement of the contract, no advice on which option to pick. It looks like this:

```
▶ phase 1/2 done · 20260914-shop-412-stop-sync-write
  The nightly stock sync can no longer write RESERVED_QTY on either cycle.

  tests     passed (374/374)
  lint      none detected
  verified  no drivable surface (background worker); HandleAsync driven against an InMemory context
  files     StockSyncColumnEvaluator.cs, StockSyncColumnChanges.cs, +7 more
  decisions · followed the Changes paragraph over T-1.1's grep list where they contradict
            · re-seeded three LowStock tests that computed units from the deleted write
  commit    3f9c2a1

[a] approve   [r] run through 2   [x] reject: <why>
```

Apply the reply, then continue in the same turn:

| Reply | Command | Then |
|---|---|---|
| `a`, `approved`, `ok`, `yes` | `picket route <id> --verdict approved --agent user --phase <n>` (this commits the staged phase with the developer's proposed message; the output names the sha) | `picket next`: next phase or review |
| `r <m>`, `approved through <m>`, `run to <m>` | `picket route <id> --verdict approved --agent user --phase <n> --through <m>` | continue the developer with `run through <m>` |
| `x <why>`, `reject: <why>`, anything else with a reason | `picket route <id> --verdict rejected --agent user --phase <n> --reason "<why>"` (nothing is committed; the staged work stays in the index for the developer to fix) | `SendMessage` the developer: `work: <id>`, `phase: <n>`, `rejected: <why verbatim>` |
| `k <n>`, `keep <n>` | `picket comment <id> --path <p> --text "<t>"` with proposal n's path and text from the block's `Comments:` line | `SendMessage` the developer: `work: <id>`, `phase: <n>`, `comment approved: <path>:<line> "<text>"`; its next `PHASE DONE` brings a fresh packet |
| a question | answer it | re-render the packet |

An `a` reply with comment proposals pending drops them: no comment is the default.

A reply that is neither an approval, a run grant, a rejection with a reason, nor a question is asked back once: "approve, run through, or reject with a reason?" Silence is not approval.

Never two packets in a row without a reply in between, and never a packet for a phase whose `PHASE DONE` block you have not seen.
