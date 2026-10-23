# Gate: the user decides

`picket next <id>` said `approve_phase`, `resolve_block` or `resolve_rejections`, by user, with `options`. These are the places a lane stops. Print the packet, send a push notification when the tool exists, and end the turn.

The packet is rendered by code from the developer's saved block and the kernel's options, so it has the same shape and width every time:

```
picket packet <id>
```

Print its output verbatim inside one ```` ```text ```` code fence, so the terminal keeps its two columns (plain lines are joined by the Markdown renderer), and nothing before or after the fence: no summary of the plan, no restatement of the contract, no advice on which option to pick. Never add, drop or reword an option; the last line is what `picket next` returned. It looks like this:

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

Apply the reply, then continue in the same turn.

At `approve_phase`:

| Reply | Command | Then |
|---|---|---|
| `a`, `approved`, `ok`, `yes` | `picket route <id> --verdict approved --agent user --phase <n>` (this commits the staged phase with the developer's proposed message; the output names the sha) | `picket next`: next phase or review |
| `i`, `confirm` (`[i]`, offered for an irreversible phase) | `picket route <id> --verdict approved --agent user --phase <n>` | as `a` |
| `r <m>`, `approved through <m>`, `run to <m>` | `picket route <id> --verdict approved --agent user --phase <n> --through <m>` | continue the developer with `run through <m>` |
| `x <why>`, `reject: <why>`, anything else with a reason | `picket route <id> --verdict rejected --agent user --phase <n> --reason "<why>"` (nothing is committed; the staged work stays in the index for the developer to fix) | `SendMessage` the developer: `work: <id>`, `phase: <n>`, `rejected: <why verbatim>` |
| `k <n>`, `keep <n>` | `picket comment <id> --path <p> --text "<t>"` with proposal n's path and text from the block's `Comments:` line | `SendMessage` the developer: `work: <id>`, `phase: <n>`, `comment approved: <path>:<line> "<text>"`; its next `PHASE DONE` brings a fresh packet |
| `w <n>`, `waive <n>` | `picket waive <id> --path <p> --text "<t>"` with proposal n's path and text from the block's `Waivers:` line; for a `<path> deleted` proposal, `picket waive <id> --path <p> --deleted` | `SendMessage` the developer: `work: <id>`, `phase: <n>`, `waiver approved: <path> "<text>"` (or `waiver approved: <path> deleted`); its next `PHASE DONE` brings a fresh packet |
| a question | answer it | re-render the packet |

At `resolve_block` or `resolve_rejections`:

| Reply | Command | Then |
|---|---|---|
| `c`, `continue` | `picket set <id> status=open` | at a stall (`[c] continue with a fresh developer`), spawn a fresh developer (type `picket:developer`) with the phase loop's first message, plus `review: <the last findings verbatim>` after rejections; otherwise `picket next` and your lane's table |
| `d`, `redesign` | order lane: `picket set <id> status=abandoned`, then `picket:designing` with the same request; design lane: continue the architect with `work: <id>`, `amend: <the diagnosis verbatim>`, `step: shared/procedures/amend.md` | the lane resumes from `picket next` |
| `x`, `abandon` | `picket set <id> status=abandoned` | stop |
| a question | answer it | re-render the packet |

An `a` or `i` reply with comment or waiver proposals pending drops them: no comment and no silenced check is the default.

A reply that matches no option and carries no reason is asked back once, naming the options the packet showed. Silence is not approval.

Never two packets in a row without a reply in between, and never a packet for a phase whose `PHASE DONE` block you have not seen. After the reply, run `picket next <id>` and follow your lane's table.
