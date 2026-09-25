---
paths:
  - "work/**"
---
# Work items

A work item is the directory `work/<id>/`. Its files are the state; nothing about it is remembered elsewhere.

`state.yaml` carries only `id`, `lane`, `title`, `status` (open | blocked | done | abandoned), `created`, `updated`, and `blocked_reason` when blocked. Change it through `harness state` and `harness route`, never by hand.

The lane artifact is `order.md` (order lane), `design.md` (design lane) or `research.md` (research lane, a document of kind `report`); the fast lane has none. Order and design artifacts follow `.claude/skills/documenting/templates/{order,design}.md`: a YAML frontmatter block whose `phases:` list carries one entry per phase with `n`, `files`, optional `greps`, `tests`, `drive`; these are the must_haves that `harness verify <id> <n>` checks. The body carries `## Decisions` with `### D-###` entries, then `## Phase N: <title>` headings in execution order, each with `**Touch set:**`, `**Changes:**` and `**Done when:**` bullets numbered `T-N.1`, `T-N.2`.

Phase progress is marker files under `phases/`: `N.done` (developer finished), `N.approved` (user approved), `N.reviewed` (reviewer passed), `N.block.md` (the developer's block, saved by the hook for the gate packet). `harness route` writes them; `harness next` and `harness packet` read them.

Nothing is committed by an agent. The developer stages a phase and proposes a message; `harness route … --verdict approved` commits the index with it, work item state included, so `git log -1 --format=%h -- work/<id>/phases/N.approved` names the phase commit. A rejected phase stays staged for the fix and never reaches history.

Amend a decision in place: edit the `### D-###` body, bump its marker (`### D-002 (r2): Name`), and append one line to `## Revision log`: `- YYYY-MM-DD: D-002 (r2): what changed; why`. Withdrawn decisions keep their ID with `[withdrawn]`. Never renumber a published ID.

Caps, numeric: order lane at most 3 phases and 5 decisions; design lane 1 to 10 phases and at most 8 decisions; 3 to 8 `T-N.x` criteria per phase; a phase body at most 80 lines; a revision log line at most 30 words.
