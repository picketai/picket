# 16: The remaining skills

Status: approved (2026-10-30).

Step 4, last group, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: the frontmatter and section shape of bundle 2 for the seven skills no earlier group touched, `debugging`, `explaining`, `inspecting`, `proofreading`, `resuming`, `summarizing` and `ticketing`. Three unconverted skills wait for their own step 5 items: `benchmarking` (D9 moves it out of the product), `branching` (D5 rebuilds it on `picket worktree`) and `understanding` (D4 merges it into `consulting`).

## Today

| Fact | Value |
|---|---|
| Skills test | `UNCONVERTED_SKILLS` lists these 7 plus the 3 above in the `frontmatter` and `sections` `PENDING` lists; `names`, `headers`, `lists` and `repeats` are already empty |
| Frontmatter | each sets `user-invocable: true`; usage lines (`/picket:<skill> …`) sit in `description`; only `summarizing` sets `disable-model-invocation` |
| Sections | `## Rules that hold throughout`, `## Four rules that outrank every check`, `## Step 0`, `## Levels`, `## Routing`, `## Layout`, `## Repositories`, `## Template, first match wins` and others; `inspecting` and `resuming` have `## Steps` only |
| Ticketing | `--pull <KEY> --story` landed with the lane skills item; its `## Routing` table and `## Layout` remain |

## Target

For each of the seven:

- Frontmatter: `description` says what the skill does; `when_to_use` takes the trigger phrases; `argument-hint` on `debugging`, `explaining`, `proofreading`, `resuming`, `summarizing`, `ticketing` (bundle 6's list, less the three deferred skills); `disable-model-invocation: true` stays on `summarizing` only; `user-invocable: true` goes. `description` plus `when_to_use` stay within 1,536 characters, and `descriptions.test.mjs` routes on both.
- Body: a purpose paragraph, `## Steps` as one ordered list (each item the step itself or "read `steps/<name>.md`" with its trigger), `## Rules` (the "rules that hold throughout", the levels, the routing table, the template order, the character limit), `## Output` (the block or reply shape). Layout blocks go: a skill cites its own files where a step needs them.
- `UNCONVERTED_SKILLS` shrinks to `benchmarking`, `branching`, `understanding`.

## Decisions

- **D-1 Three skills wait for their own items.** Reshaping `benchmarking`, `branching` and `understanding` now would be rewritten by D9, D5 and D4 within days.
- **D-2 No behaviour changes.** This group moves text between headings and frontmatter fields; any rule that reads wrong once moved is a finding for the review, not a rewrite here.

## Migration

1. `debugging`, `explaining`, `proofreading` (the skills with steps).
2. `inspecting`, `resuming`, `summarizing`, `ticketing`.

## Risks

- Moving trigger phrases from `description` to `when_to_use` changes what the routing test scores; it reads both fields since the lane skills item (D-004 there), so the share should hold. A drop below 95 % is fixed in the phrases, not the threshold.

## Affects

`src/skills/{debugging,explaining,inspecting,proofreading,resuming,summarizing,ticketing}/SKILL.md` and their steps, `test/repo/skills.test.mjs`, `test/repo/description-cases.json` if a case needs a phrase, `docs/reference/skills.md`.

## Open questions

None.
