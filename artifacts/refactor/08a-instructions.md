# 08a: Instructions

Status: approved (2026-10-22).

The instructions (17 skills in 80 Markdown files, 4 agents, 5 rules, the output style) get one owner per fact, a `skills/shared/procedures/` folder for the steps several skills and agents share, step names a test can check, and three decisions moved into the kernel or settled: the options at a stall come from `picket next`, the kernel renders the irreversible `[i]` option, and em dashes are banned with no protocol exception. The larger separation of agents from skill files is follow-up F-1, after this refactor.

Item 08 is split in two: 08a the instructions, 08b the docs.

## Today

### Steps shared across skills live inside one lane

References to another skill's step files:

| From | To |
|---|---|
| `designing` | `ordering/steps/20-phase.md` (2), `30-gate.md` (2), `40-review.md` (4), `reviewing/steps/60-crosscheck.md` |
| `debugging` | `expediting/steps/20-prove.md` (2) |
| `ordering` | `designing/steps/40-amend.md`, `reviewing/steps/10-alignment.md`, `reviewing/steps/15-traced.md` |
| `resuming` | `ordering/steps/30-gate.md` |
| agents | `analyst.md` to `researching/steps/10-outline.md`; `architect.md` to `ordering/steps/10-order.md`, `designing/steps/10-design.md`, `designing/steps/40-amend.md`; `developer.md` to `ordering/steps/20-phase.md`, `expediting/steps/20-prove.md`; `reviewer.md` to `reviewing/steps/15-traced.md` |

Following the design lane end to end means reading three skill folders, against `.claude/rules/harness-authoring.md:18` ("SKILL.md to steps/ or templates/, never further"). `ordering/steps/20-phase.md` hard-codes `artifact: work/<id>/order.md`, which is wrong when the design lane reuses it.

### Facts in several places, some stale

- `rules/work-items.md:5`: "`state.yaml` carries only `id`, `lane`, `title`, `status`, `created`, `updated`, and `blocked_reason`" and "Change it through `picket state` and `picket route`". The kernel accepts 12 fields (`work.mjs:98`: also `branch`, `run_through`, `source`, `base`, `session`), and `picket state` only reads; `picket set` writes.
- `skills/reviewing/SKILL.md:7-10` names triggers that exist nowhere else: "All Phases Complete", `CROSS_CHECK_REQUESTED`, `/cross-check`.
- `skills/understanding/SKILL.md:3` says "the consultant, analyst, and architect read it"; there is no consultant agent.
- The prose rule is in `rules/prose.md` and again at length in `output-styles/custom.md`; they drift (`prose.md:9` "a B2 reader", `custom.md:45` "a B2/C1 reader").
- The Jira intake paragraph is identical in `ordering/steps/10-order.md:12` and `designing/steps/10-design.md:10`. The drive and `picket check` paragraphs are in `developer.md` and `expediting/steps/30-check.md`. The caps are in `rules/work-items.md:15`, `architect.md` and `ordering/steps/10-order.md`. The amendment format is in `rules/work-items.md:13`, `architect.md` and `designing/steps/40-amend.md`.
- The line "Paths cited here…" opens all 17 `SKILL.md` files, including ones that cite none.

### Step names

`understanding` uses `01/02/03`; `expediting` keeps steps 1 to 3 inside `SKILL.md` and has files `20` and `30` only; `designing` has 10, 15, 20, 40; `reviewing/steps/` holds checklists numbered by load tier, not steps run in order.

### The three open decisions

- Options after a third cumulative `CHANGES REQUIRED`: `ordering/SKILL.md:46` says `[c] continue with a fresh developer · [d] redesign · [x] abandon`, `ordering/steps/40-review.md:36` says `[x] accept as is`; the kernel offers `[c] continue · [x] abandon` for any blocked item (`next.mjs:27`).
- The irreversible option: `designing/SKILL.md:46` tells the lead to add a `⚠ irreversible` line and an `[i]` option; the kernel renders neither, while `emit.ledger.mjs:55` already counts `[i] confirm` as a gate.
- The finding separator: `reviewing/SKILL.md:87-90` defines `- [Severity] path:line — what, why, fix` and calls the em dash "the protocol separator and the only place one appears"; `reviewer.md:56-57` repeats it; `pr.mjs:161` parses it; `rules/prose.md` bans dashes everywhere.

## Target

### Layout

```
src/skills/
  shared/
    procedures/
      phase-loop.md          from ordering/steps/20-phase.md, lane-neutral (artifact from picket state)
      gate.md                from ordering/steps/30-gate.md
      cumulative-review.md   from ordering/steps/40-review.md, checkpoint included
      prove.md               from expediting/steps/20-prove.md, with the drive and picket check paragraphs
      amend.md               from designing/steps/40-amend.md
      jira-intake.md         the paragraph in 10-order.md and 10-design.md
  ordering/      SKILL.md  steps/10-order.md
  designing/     SKILL.md  steps/10-design.md  15-migration.md  20-crosscheck.md
  expediting/    SKILL.md  steps/10-check.md
  understanding/ SKILL.md  steps/10-prepare.md  20-interview.md  30-capture.md
  reviewing/     SKILL.md  checklists/10-alignment.md ... 60-crosscheck.md     renamed from steps/
  ...
src/agents/      analyst.md  architect.md  developer.md  reviewer.md
src/rules/       prose.md  comments.md  work-items.md  security-paths.md  untrusted.md
src/output-styles/custom.md
```

A folder under `skills/` without a `SKILL.md` is not a skill: a copy of `core/` with `skills/shared/procedures/phase-loop.md` added passed `claude plugin validate --strict` and still listed `Skills (17)`, without `shared`.

Both lanes' dispatch tables point at the same procedures:

```
| `implement_phase`, later phases  | `shared/procedures/phase-loop.md` |
| `approve_phase` by user          | `shared/procedures/gate.md` |
| `review_cumulative` by reviewer  | `shared/procedures/cumulative-review.md` |
```

### Who may reference what

| File | May reference |
|---|---|
| a `SKILL.md`, or a skill's step | its own `steps/`, `templates/`, `references/`, `checklists/`; `skills/shared/procedures/` |
| a procedure | `documenting` templates only |
| an agent | `skills/shared/procedures/`; files of a skill it preloads (`reviewer.md` to `reviewing/checklists/`); a lane step only as "the file your message's `step:` line names" |

The lane sections still reach agents pasted into the lead's message, as today. Moving agents off skill files entirely (`agents/shared/**/*.md`) is F-1, a separate work item after this refactor.

### One owner per fact

| Fact | Owner | Every other copy becomes |
|---|---|---|
| Prose rules (dashes, plain English, examples, lead with the answer) | `rules/prose.md` | `output-styles/custom.md` opens with "The prose rule applies" and keeps only what is the lead's: tangents, one recommendation, when to break the rules, the pre-send check, scope |
| State fields, who writes state, caps, the amendment format | `rules/work-items.md` | a pointer from `architect.md`, `10-order.md`, `amend.md` |
| Options at a gate, a block or a stall | the kernel (`nextStep`, 04a) | "print the options `picket next` returns" |
| Review summary fields, the findings cap, the finding line | `skills/reviewing/SKILL.md` | a pointer from `reviewer.md` and `cumulative-review.md` |
| Jira intake; drive and `picket check` | `jira-intake.md`; `prove.md` | a pointer |

### Q1: the kernel computes the stall options

`nextStep` (04a) gains the cases the lane skills count by hand today:

| Situation | `action` | `options` |
|---|---|---|
| a third cumulative `CHANGES REQUIRED` since the last approval | `resolve_rejections` | `[c] continue with a fresh developer`, `[d] redesign`, `[x] abandon` |
| blocked by `PHASE STALLED`, by a third `DRIFT DETECTED`, or by a third amendment round, in the order or design lane | `resolve_block` | the same three |
| blocked otherwise, or in the fast or research lane | `resolve_block` | `[c] continue`, `[x] abandon` |

There is no "accept as is": it would pass a change the reviewer rejected; the user can still approve a phase directly. The skills print the options `picket next` returns and map each reply; no skill writes an option list. Chosen by the user on 2026-10-22.

### Q2: the kernel renders the irreversible option

When a done phase's `own_gate.kind` is `irreversible`, `nextStep` returns `options: ["[i] confirm the irreversible step", "[x] reject: <why>"]` with no `[a]` and no run offer, and `picket packet` adds the line `irreversible: phase <n> carries an irreversible step`. The lead's reply `[i]` routes as `approved`, like `[a]`. `designing/SKILL.md:46` drops its by-hand instruction. `emit.ledger`'s gate detection (`[i] confirm`) now matches what is printed. Chosen by the user on 2026-10-22.

### Q4: no em dash anywhere

```
- [Major] src/fees.ts:42: Late fees round half-down. The tariff table rounds half-up, so 12.345 bills 12.34 instead of 12.35. Round with Math.round on cents.
- [Minor] src/fees.ts: Two date libraries in one file. ...
```

The location ends with a colon; the rest follows the prose rule. `reviewing/SKILL.md` and `reviewer.md` drop "the protocol separator" sentence; `rules/prose.md` keeps its ban with no exception. `pullrequest post` parses `path:line: text` and `path: text`, and still reads a line with `—` after the location if it meets one, but nothing Picket writes contains one. The 59 em and en dashes in `skills/ticketing/templates/` and `examples/` go. Chosen by the user on 2026-10-22.

### Checks in `npm test`

Next to the budget and Markdown-path tests:

1. A step or checklist file is named `NN-<name>.md` with a two-digit prefix, unique and ascending in its folder.
2. References follow the table "Who may reference what".
3. Every `picket <verb>` in a Markdown file names a verb in `VERB_NAMES` (item 03), with its subverb when it is a group.
4. No em or en dash in any Markdown file under `src/skills`, `src/agents`, `src/rules`, `src/output-styles`, `docs/`, or in `README.md`.
5. Procedures and step files stay within the 80-line step budget.

The "Paths cited here…" line goes from the 17 `SKILL.md` files; check 2 makes it unnecessary.

## Decisions

### I-1: Item 08 splits into 08a instructions and 08b docs

### I-2: `skills/shared/procedures/` holds what two or more skills or agents share
Six procedures, listed above; each lane skill keeps only its own steps. The user chose this location over a `procedures/` folder at the plugin root.

### I-3: One owner per fact
As in the table; the other copies become pointers.

### I-4: The kernel computes the options at a stall (Q1)
`resolve_rejections` and lane-aware `resolve_block` options in `nextStep`; no "accept as is".

### I-5: The kernel renders the irreversible `[i]` option (Q2)
In `nextStep` and `picket packet`; `[i]` routes as `approved`.

### I-6: No em dash, no protocol exception (Q4)
The finding line ends its location with a colon; the parser reads an old dash but never writes one.

### I-7: Reference and naming checks run in `npm test`
The five checks above; the boilerplate line goes.

### I-8: Stale facts corrected
`work-items.md` lists the 12 state fields and names `picket set` as the writer; the reviewing triggers name what exists (`picket next` actions and scopes); `understanding` names the analyst and the architect.

### I-9: Agents keep their current reach for now
Procedures, preloaded skills, and the step file their message names; F-1 removes this after the refactor.

## Migration

### Phase 1: decisions in the kernel
- `nextStep` (04a): `resolve_rejections`, lane-aware `resolve_block`, the `[i]` options; `picket packet` adds the irreversible line. Tests for each row of the Q1 table and for an irreversible phase.
- `pullrequest post`: the colon form, the old dash still read; tests for both.

### Phase 2: the instructions
- `skills/shared/procedures/` from the six sources; the dispatch tables in `ordering`, `designing`, `expediting`, `debugging`, `resuming` point at them; the source files go.
- `reviewing/steps/` becomes `reviewing/checklists/`; `understanding` steps renumber; `expediting`'s check becomes `steps/10-check.md`.
- One owner per fact; `custom.md` shrinks to the lead's parts; the stale facts; the boilerplate line.
- The finding line in `reviewing/SKILL.md` and `reviewer.md`; the ticketing templates and examples without dashes.
- Agent fallbacks become "the file your message's `step:` line names".

### Phase 3: the checks
- The five checks in `npm test`; the bench's fast-lane run against the baseline after the contract change, as `harness-authoring.md` asks (`node bench/run.mjs --harness plugin --tasks lane:fast --runs 1`).

## Risks

- R-1: moving step files changes the paths the lead pastes into agents' messages mid-item. Items open during the change keep working: the agent reads the file its message names, and the old paths stay valid until phase 2 lands in one commit.
- R-2: `CLAUDE.md` is at 2047 of 2048 bytes; nothing here adds to it, and the `harness-authoring` path line shortens (`core/**` to `src/**`).
- R-3: lanes behave the same, but the prompts change; the bench comparison in phase 3 is the check.

## Affects

- 04a: `nextStep` gains `resolve_rejections`, lane-aware `resolve_block` options, and the irreversible options.
- 04d: `pullrequest post` parses the colon form.
- 05: `emit.ledger`'s gate detection keeps `[i] confirm`.
- 08b: the docs describe the lanes once and point at the skills.
- F-1: agents off skill files, `agents/shared/**/*.md`.

## Open questions

None.
