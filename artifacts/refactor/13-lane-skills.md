# 13: The lane skills

Status: approved (2026-10-29).

Step 4, first group, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: the four lane skills (`expediting`, `ordering`, `designing`, `researching`) in bundle 2's shape, and the end of `skills/shared/` (bundles 3 and 6). After this item the lead's whole loop is three kernel outputs: `picket next` (what to send), `picket packet` (what to print at a gate) and `picket reply` (what a gate reply does), plus `picket close --human` for the closing block. The other groups (reviewing; documenting and consulting; the rest) follow as drafts 14 to 16.

## Today

| Fact | Value |
|---|---|
| Lane skills | 4 `SKILL.md`, 72 to 100 lines with their steps; each sets `user-invocable: true` and opens with the same 49-word "no `picket admit` answer yet" paragraph (the one repeat `skills.test.mjs` finds) |
| Their shape | `## Steps` is a table from `picket next` action to a file, not an ordered list; `expediting` has `## Step 1` to `## Step 3`, `## Escalation`; closing blocks are hand-written per lane |
| Step files | `expediting/steps/10-check.md`, `ordering/steps/10-order.md`, `designing/steps/{10-design,20-crosscheck}.md`, `researching/steps/{10-outline,20-deep}.md`; all in the skills test's `names` and `headers` `PENDING` |
| `skills/shared/procedures/` | `phase-loop.md` 7 lines, `amend.md` 9, `jira-intake.md` 5, `cumulative-review.md` 40, `gate.md` 55; after step 3 they hold only the lead's half |
| What the kernel already does | `next` prints `send[]` with `<tag>-<role>` names (items 11 and B); `reply` applies every gate reply in `gate.md`'s table; `packet` prints its fence; `close` commits and returns `left`, `left_staged`, `repeats` but not the block |
| Gaps seen in this session | after `AMENDED` from a cross-check drift, `next` says `implement_phase` and never sends the delta re-check (the lead sent it by hand twice); the checkpoint and cumulative procedures still name bare instances and `step:` |
| CLAUDE.md | rule 3 "named by role", rule 4 "The gate packet is `picket next` rendered"; 2,055 of 2,560 bytes |

## Target

### The lead's loop, in CLAUDE.md

Rules 3 and 4 of the Picket block become:

3. Agents are `picket:analyst`, `picket:architect`, `picket:developer`, `picket:reviewer`. Send exactly what `picket next <id>` prints: the tool, the instance name, the type and the message.
4. At a user gate print `picket packet <id>` verbatim and end the turn. Pass the reply to `picket reply <id> "<reply>"` and send what it prints. Never two stops in a row.

Each lane skill then carries only what is that lane's own. "Wait for X" lines become "end the turn; the notification brings the block; then run `picket next`" (bundle 4.6), stated once in rule 4's neighbourhood, not per skill.

### Each lane skill

Frontmatter: `description` says what the lane does, `when_to_use` takes the trigger phrases, `user-invocable: true` goes. Body: a purpose paragraph, `## Steps` as one ordered list, `## Rules`, `## Output`. The lane check paragraph goes from all four (bundle 6.1); `picket open` enforces the lane instead.

- `expediting`: steps inline (open, read the touch set, implement under `picket:implementing`, re-admit with `--touched`, check and drive, stage, block, apply the reply); `steps/10-check.md` folds into `## Steps` and `## Rules`. The fast lane has no `picket reply` (no phase), so its reply table stays in `## Rules`.
- `ordering`, `designing`: `## Steps` is the loop for that lane, five to eight items, each "send what `picket next` prints" with the lane's specifics (the design lane's phase 1 starts the developer and the cross-check together; a checkpoint before the phase after the midpoint). `steps/10-order.md` and `steps/10-design.md` keep only the opening (Jira pull, open, preflight, sources gate) as `steps/open.md`; `20-crosscheck.md` folds into `designing`'s steps.
- `researching`: `steps/outline.md`, `steps/deep.md`; the packet sample stays in `## Output`.

### `skills/shared/` removed

| File | Goes to |
|---|---|
| `phase-loop.md` | rule 3 plus the lane's `## Steps` |
| `amend.md` | `picket next` (`amend` action, item 11) plus the delta re-check send below |
| `gate.md` | rule 4 plus `picket reply`; the sample packet goes to `docs/how-to.md` |
| `cumulative-review.md` | `picket next`'s `review_cumulative` and `review_checkpoint` sends (`first:` runs mutate and summary), and `picket close --human` for `Questions:` and `Repeats:` |
| `jira-intake.md` | `picket:ticketing --pull <KEY> --story`, run by name from each lane's open step; ticketing's pull writes the story file and prints the `picket open` flags |

`references.test.mjs` drops `"shared"` from `SKILL_NAMES`; `EXCEPTIONS` stays empty.

### Kernel

1. `picket open` calls `admit()` on the request and refuses a lane lighter than admit's answer (fast < order < design) or a research and change mismatch, exit 2 naming the lane; `--user-lane` lets a lighter lane through and records the override in the verdict log. Escalations and security-path upgrades pass.
2. `picket close <id> --human` prints the lane's whole closing block: phases and commit range, decisions and amended count (design), review verdict, the cumulative reviewer's `Questions:` from `reviews/cumulative.md`, research findings count and `[ARCHITECT REVIEW NEEDED]` ids, `Left for you`, `Left staged`, and one follow-up offer per repeat class. The lead adds one sentence on what shipped.
3. `picket next` sends the cross-check delta re-check after an `AMENDED` that answered a `DRIFT DETECTED`: reviewer, `scope: crosscheck`, `delta: <the amended D-### ids from the revision log>`.

## Decisions

- **D-1 The lead's loop lives in CLAUDE.md, not in a procedure.** Every lane runs the same loop; four copies trip the repeated-paragraph test, and one procedure file is what bundle 3 removes. CLAUDE.md is loaded in every session and is the one place both the lead and `picket init` users read; rule 4 grows by about 130 bytes, inside the 2,560 budget.
- **D-2 The fast lane keeps its reply table.** `picket reply` works on phases; giving it a phase-less form for one lane is more kernel for four rows that already work.
- **D-3 Ticketing's pull replaces the intake procedure in this item, not in the "rest" group.** The lane skills' open steps cite it; landing them first would leave a citation to a file this item deletes.
- **D-4 The delta re-check joins `next` here.** It is the one lead decision the procedures still made by hand after item 11, and `amend.md` is the file that described it.
- **D-5 The closing block is built by `close`.** Three of this session's four closes needed `Questions:` and `Left staged:` assembled by hand from two outputs.

## Migration

1. Kernel: `open` lane refusal, `close --human`, the delta re-check send, each with tests.
2. Ticketing's `--pull --story` writes the story file and prints the `open` flags; `jira-intake.md` goes.
3. CLAUDE.md block rules 3 and 4; `ordering` and `designing` rewritten; `phase-loop.md`, `amend.md`, `gate.md`, `cumulative-review.md` go.
4. `expediting` and `researching` rewritten; `skills/shared/` gone; `PENDING` entries for the four lane skills removed.
5. Bench after steps 3 and 4 runs once the last group lands, with the same four tasks.

## Risks

- Rule 4 is the lead's only description of the gate once `gate.md` goes. If the bench shows the lead adding prose around the packet again, the fix is a line in `picket packet`'s own output, not a new procedure.
- `picket open`'s refusal could block a legitimate user override that arrives without `--user-lane`. The refusal names the flag, and the lane skills say the user decides.
- This item changes the lead's instructions while the lead runs them. The item's own phases run under today's procedures until phase 3 commits; the lead reads `picket next` either way.

## Affects

`src/templates/claude-block.md`, `CLAUDE.md`, `src/skills/{expediting,ordering,designing,researching}/`, `src/skills/shared/` (removed), `src/skills/ticketing/` (pull), `src/lib/verbs/{open,close}/`, `src/lib/shared/work/{next-step,send}.mts`, `test/repo/{skills,references,descriptions}.test.mjs`, `test/repo/description-cases.json`, `docs/how-to.md`, `docs/reference/`.

## Open questions

None.
