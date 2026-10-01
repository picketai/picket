# Ordering, step 1: open the work item and get the order written

Open the item (skip when a `--id` from an escalating lane already exists):

```
node .claude/bin/harness.mjs new --lane order --title "<six-word title>" --text "<the request, verbatim>"
node .claude/bin/harness.mjs preflight <id> --human
```

The kernel saves the request as `work/<id>/request.md`, which the cumulative review traces against. A request with quotes or newlines goes in a scratchpad file passed as `--request <file>` instead.

Preflight `fail` lines stop you here; print them and ask. `warn` lines are passed to the architect verbatim.

Spawn the architect once, named `architect`, with this message followed by the Architect section below pasted verbatim (it is in your context already; pasting it saves the architect a round trip):

```
work: <id>
lane: order
request: <the user's request, verbatim>
preflight: <the warn lines, or none>
step: .claude/skills/ordering/steps/10-order.md, architect section follows
```

Wait for `ARTIFACT WRITTEN`. The hook records it; `harness next <id>` now says `implement_phase`. Continue to `steps/20-phase.md` in the same turn. If the architect answers `exceeds order caps`, run `harness set <id> status=abandoned` and start `designing` with the same request.

## Architect section

Read `.claude/skills/documenting/templates/order.md` and the source files the request names. Write `work/<id>/order.md`:

1. Frontmatter with `lane: order` and one `phases:` entry per phase carrying `n`, `files` (every path the phase creates or edits), `greps` where a criterion is grep-checkable, `tests: true`, and `drive: true` when the phase touches a runtime surface.
2. `## Decisions`: at most five `### D-###` entries. Each: the decision in one paragraph, `**Instead of:**` the strongest alternative and the one reason it lost, `**Risks:**` numbered `RISK-###` with a mitigation, or omitted.
3. `## Phase N: <title>` sections, at most three, in execution order, each independently shippable, each with `**Touch set:**` (exact repo-relative paths, one per line, with a three-to-six-word reason), `**Changes:**`, and `**Done when:**` with 3 to 8 observable criteria `T-N.1`, `T-N.2`.
4. `## Open questions`: `OQ-###` entries with an owner, or `none`.

Verify a premise about existing code by reading it, not by recalling it. Over three phases or five decisions: do not write the file; reply with the single line `exceeds order caps: <what>` and no verdict token, so the lead escalates to the design lane.

End with the architect output block and `ARTIFACT WRITTEN`.
