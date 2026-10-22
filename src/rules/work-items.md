# Work items

A work item is the directory `work/<id>/`. Its files are the state; nothing about it is remembered elsewhere.

`state.yaml` carries only `id`, `lane`, `title`, `status` (open | blocked | done | abandoned), `created`, `updated`, and `blocked_reason` when blocked. Change it through `picket state` and `picket route`, never by hand.

The lane artifact is `order.md` (order lane), `design.md` (design lane) or `research.md` (research lane, a document of kind `report`); the fast lane has none. Order and design artifacts follow `documenting/templates/{order,design}.md`: a YAML frontmatter block whose `phases:` list carries one entry per phase with `n`, `files`, optional `greps`, `tests`, `drive`, and `security` (required in design records; `true` gives the phase its own gate, so no run grant crosses it). `files` to `drive` are the must_haves that `picket verify <id> <n>` checks. The body carries `## Decisions` with `### D-###` entries, then `## Phase N: <title>` headings in execution order, each with `**Touch set:**`, `**Changes:**` and `**Done when:**` bullets numbered `T-N.1`, `T-N.2`.

Phase progress is marker files under `phases/`: `N.done` (developer finished), `N.approved` (user approved), `N.reviewed` (reviewer passed), `N.block.md` (the developer's block, saved by the hook for the gate packet). `picket route` writes them; `picket next` and `picket packet` read them.

Nothing is committed by an agent. The developer stages a phase and proposes a message; `picket route … --verdict approved` commits with it only the phase's own staged paths (its plan paths, the files its block lists, and the work item state), leaving anything else staged, so `git log -1 --format=%h -- work/<id>/phases/N.approved` names the phase commit. A rejected phase stays staged for the fix and never reaches history.

Amend a decision in place: edit the `### D-###` body, bump its marker (`### D-002 (r2): Name`), and append one line to `## Revision log`: `- YYYY-MM-DD: D-002 (r2): what changed; why`. Withdrawn decisions keep their ID with `[withdrawn]`. Never renumber a published ID.

Caps, numeric: order lane at most 3 phases and 5 decisions; design lane 1 to 10 phases and at most 8 decisions; 3 to 8 `T-N.x` criteria per phase; a phase body at most 80 lines; a revision log line at most 30 words.
