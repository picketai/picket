# 12: The agents

Status: approved (2026-10-29).

Step 3 of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: bundles 3 and 5 for the four agent shells. Each shell is rewritten into bundle 1's six parts and carries its own behaviour, so the lead stops pasting sections and messages lose `step:`. The developer goes first, as its own work item, and is shown to the user before the other three are touched. Lane skills keep their lead half until step 4.

## Today

| Fact | Value |
|---|---|
| Shells | analyst 52, architect 59, developer 69, reviewer 66 lines; all four in `agents.test.mjs` `PENDING` |
| Work sections | `## Two passes` (analyst), `## Amendment` (architect), `## Phase loop` (developer), none (reviewer); no `## Memory` anywhere |
| Pasted sections | developer half of `phase-loop.md`, architect half of `amend.md`, architect halves of `ordering/steps/10-order.md` and `designing/steps/10-design.md`, analyst halves of the researching steps; each shell's Entry says "read the file your `step:` line names when the message lacks the section" |
| What `picket next` sends | `send[]` since step 2 (`11dac1f`): `work`, `phase`, `artifact`, `scope`, `summary` path, `review` path, `amend`, `pass`; no `step:` line |
| `prove.md` | `src/skills/shared/procedures/prove.md`, cited by the developer shell, `expediting/SKILL.md`, `expediting/steps/10-check.md`, `debugging/steps/30-diagnose.md` |
| Block template | written out twice: the developer shell's `## Output` and `expediting/SKILL.md`'s `## Output` (the expedited block lacks `Decisions` and `Waivers`) |
| Test rules | the developer shell's "unit tests, plus architecture tests" paragraph and `reviewing` rows Ts1 to Ts4; no rule file |
| Analyst tools | 16, six of them Jira writes; 7 of 7 development spawns only read |
| Agent memory that is contract text | developer `claude-dir-edits-via-lead`, `deleting-files-in-a-phase`; reviewer `literal-criterion-misses-go-to-amendment` (step 4, with `reviewing`) |
| Agent memory a kernel fix replaced | reviewer `send-review-by-message` (step 2 saves reviews), `new-next-action-check-band` (step 2's `ACTION_TEXT`) |

## Target

### Shell shape (all four)

Identity paragraph, `## Entry`, `## Constraints`, `## Work` with `###` subsections, `## Memory`, `## Output`. Entry lists exactly the fields `picket next` sends that agent and the first tool batch. `## Memory` is the same three sentences in each: save repo, machine and tool facts; a workflow rule goes on the block's `Decisions:` line, never into memory; Write and Edit outside your write scope are for your memory folder only (the last clause only for analyst and reviewer). One line in Constraints: report only in your block, never a status-only turn (bundle 4.4).

### Developer (first work item)

- Shell about 79 lines. `### Phase loop` takes the developer half of `phase-loop.md` (artifact once per item, touch set reads, verify before and after, granted runs, the stall rule). Constraints gain two sentences from memory: a `.claude/` path in the touch set is sent to the lead with path, line and text; a deleted file is removed with an escalated `git rm` alone and listed as `(deleted)` on `Files:`. The drive reminder becomes a fact: "`picket verify` compares your `Verified:` line with the drive log" (bundle 4.2). The test paragraph becomes a citation of the `tests` rule.
- New skill `src/skills/implementing/` (`user-invocable: false`), preloaded by the developer, read by expediting, named in debugging's hand-off. `SKILL.md` holds `prove.md`'s content in bundle 2's shape (purpose, `## Steps`, `## Rules`, `## Output`) and the one block template with all ten lines for both headings, `## Phase <n> of <id>: <title>` and `## Expedited: <id>`. `prove.md` is deleted; its four citers point at `picket:implementing`. `BLOCK_FIELDS.expedited` gains `Decisions` and `Waivers`.
- New rule `src/rules/tests.md`, always injected, four facts: unit tests plus architecture tests only where the project has them; other kinds only when `**Done when:**` or the fast-lane request names the kind; no real infrastructure in a unit test; every test asserts the rule its name claims. The CLAUDE.md rules line gains `tests`.
- `phase-loop.md` keeps its lead half and drops the paste instruction and the Developer section.
- `agents.test.mjs` gains the Entry check (draft 10, D-3): every field the shell's Entry names appears in some `Send.message` that `buildSends` produces for that agent, and every field a send carries is named in Entry. `PENDING` loses `developer.md`. The `agents.test` block check reads the labels from `implementing/SKILL.md`'s template (R-039).

### Architect, analyst, reviewer (second work item, after the user has seen the developer)

- **Architect**, about 87 lines: `### Order`, `### Design`, `### Amendment` from the step files' architect halves and `amend.md`'s architect section. Entry adds `.claude/MEMORY.md` to the first batch when it exists. `amend.md` keeps its lead half.
- **Analyst**, about 103 lines: `### Outline` and `### Deep pass` from the researching steps' analyst halves; the outline section's format goes to `documenting/templates/report.md` as an optional section. Tools lose the six Jira write tools; the ticketing sentence goes (the intake becomes ticketing's pull in step 4). Entry adds `.claude/MEMORY.md`.
- **Reviewer**: `### Review` holds the per-scope reading order. Entry drops `step:` and reads `summary.json`'s `checklists`, opening exactly those. The pull request incident notes leave; "noise" becomes "skip a finding the project's own gates already reject; name the gate once on the `Checked:` line" (bundle 4.3). Constraints say Write and Edit are for the memory folder only. Memories `send-review-by-message` and `new-next-action-check-band` are deleted.

## Decisions

- **D-1 Two work items, developer first.** The user's rule from the refactor (`first-verb-review-before-the-rest`) and bundle 5 both say so; the developer also carries the new skill and the new rule, so the other three follow a proven pattern.
- **D-2 The brief's fields (`purpose:`, `in scope:`, `out of scope:`) land with D4, not here.** The Entry check ties Entry to what `picket next` sends; the brief procedure and its send fields are D4's (step 5). Adding the fields to Entry now would fail the check or need a send field nothing fills.
- **D-3 The lane skills keep their lead half; their step files lose only the agent half.** Rewriting the lead side is step 4's job under the skills test; here a step file's agent section is cut and replaced by nothing, since the agent now carries it.
- **D-4 `implementing` is written in bundle 2's shape from the start.** It is a new file, so it never enters the skills test's `PENDING` lists.
- **D-5 `literal-criterion-misses-go-to-amendment` moves with `reviewing` in step 4.** D8 puts it in `reviewing/SKILL.md`'s verdict rule, which step 4 rewrites; moving it twice gains nothing.

## Migration

1. Bench baseline: `lane:fast`, `order-07`, `research-11`, `gate-13` on the plugin build, once each; worst case $84 from the task budgets (step 5's `--max-usd` does not exist yet, so each task's `budget_usd` is the cap). Runs only on the user's go.
2. Work item A, the developer: `implementing` skill, `tests` rule, shell, `prove.md` citers, `phase-loop.md`, `BLOCK_FIELDS.expedited`, Entry check, the two memories deleted once their sentences land.
3. The converted developer shell and `implementing/SKILL.md` are shown to the user.
4. Work item B: architect, analyst, reviewer, `amend.md`, the step files' agent halves, `report.md`'s outline section, the two reviewer memories deleted. `PENDING` ends empty.
5. Bench after step 3 is folded into the after-step-4 run unless the user asks for both.

## Risks

- The developer's spawn load moves from 11.0 KB to about 11.2 KB (bundle 3's estimate); the gain is one Read fewer and no paste. If the bench shows more re-reads, the skill's `## Rules` is the place to cut.
- Lane skills between steps 3 and 4 still tell the lead to paste sections that no longer exist. Each lane step file is edited here only to drop the agent half, and the lead follows `picket next`'s `send` already, so the window is a stale sentence, not a broken flow.
- The `tests` rule adds about 600 characters to every injection; the rules hook goes to about 8,300 of 10,000.

## Affects

`src/agents/*.md`, `src/skills/implementing/` (new), `src/rules/tests.md` (new), `src/templates/claude-block.md`, `src/skills/shared/procedures/{prove,phase-loop,amend}.md`, `src/skills/expediting/{SKILL.md,steps/10-check.md}`, `src/skills/debugging/steps/30-diagnose.md`, `src/skills/{ordering,designing,researching}/steps/*.md` (agent halves only), `src/skills/documenting/templates/report.md`, `src/lib/shared/work/block.mts`, `test/repo/agents.test.mjs`, `test/repo/references.test.mjs`, `.claude/agent-memory/picket-{developer,reviewer}/`.

## Open questions

- **OQ-1** Bench baseline before work item A: run it now (worst case $84), or skip the before run and compare against the last recorded results?
