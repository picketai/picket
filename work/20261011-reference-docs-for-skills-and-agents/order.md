---
kind: order
lane: order
title: Reference docs for skills and agents
date: 2026-10-11
audience: developer
sources: [work/20261011-reference-docs-for-skills-and-agents/request.md, docs/how-to.md, README.md, core/agents/*.md, core/skills/*/SKILL.md, test/markdown-paths.test.mjs, test/names-picket.test.mjs, package.json]
phases:
  - n: 1
    files: [docs/agents.md, docs/how-to.md, README.md]
    greps:
      - path: docs/agents.md
        pattern: '^## picket:analyst\b'
      - path: docs/agents.md
        pattern: '^## picket:architect\b'
      - path: docs/agents.md
        pattern: '^## picket:developer\b'
      - path: docs/agents.md
        pattern: '^## picket:reviewer\b'
      - path: docs/how-to.md
        pattern: '\]\(agents\.md\)'
      - path: README.md
        pattern: '\]\(docs/agents\.md\)'
    tests: true
    drive: false
  - n: 2
    files: [docs/skills.md, docs/how-to.md, README.md]
    greps:
      - path: docs/skills.md
        pattern: '^## picket:expediting\b'
      - path: docs/skills.md
        pattern: '^## picket:ordering\b'
      - path: docs/skills.md
        pattern: '^## picket:designing\b'
      - path: docs/skills.md
        pattern: '^## picket:researching\b'
      - path: docs/skills.md
        pattern: '^## picket:inspecting\b'
      - path: docs/skills.md
        pattern: '^## picket:resuming\b'
      - path: docs/skills.md
        pattern: '^## picket:consulting\b'
      - path: docs/skills.md
        pattern: '^## picket:understanding\b'
      - path: docs/skills.md
        pattern: '^## picket:proofreading\b'
      - path: docs/skills.md
        pattern: '^## picket:ticketing\b'
      - path: docs/skills.md
        pattern: '^## picket:summarizing\b'
      - path: docs/skills.md
        pattern: '^## picket:branching\b'
      - path: docs/skills.md
        pattern: '^## picket:documenting\b'
      - path: docs/skills.md
        pattern: '^## picket:reviewing\b'
      - path: docs/skills.md
        pattern: '^## picket:benchmarking\b'
      - path: docs/how-to.md
        pattern: '\]\(skills\.md\)'
      - path: README.md
        pattern: '\]\(docs/skills\.md\)'
    tests: true
    drive: false
---
# Order: Reference docs for skills and agents

## Problem

`docs/how-to.md` teaches install and the daily loop, but a new user who meets `picket:architect` in a gate packet or sees `/picket:ticketing` in the Quick reference has nowhere to learn what that piece does and when it runs. The request asks for short, user-facing reference documents: per skill and per agent, what it does, how a user reaches it, and where it fits. Docs only: no change to `core/`, tests or config. The new Markdown is scanned by `test/markdown-paths.test.mjs` and `test/names-picket.test.mjs`, so `npm test` must stay green.

## Decisions

### D-001: Two reference files, one section per item
**Decision:** Create `docs/agents.md` (4 entries) and `docs/skills.md` (15 entries), each with one `## picket:<name>` heading per item, so every item has a stable anchor such as `docs/skills.md#picketticketing`. Each file opens with two or three sentences saying what the kind is and a summary table (one row per item: name, one-line purpose, how you reach it), then the entries. Size caps keep them shorter than the how-to (297 lines): `docs/agents.md` at most 110 lines, `docs/skills.md` at most 230 lines.
**Instead of:** a folder per kind with one file per item (19 files): each entry is 6 to 12 lines, so 19 small files add navigation and link upkeep with no content gain; heading anchors already give per-item links.
**Risks:**
- **RISK-001** A summary table and the entries below it drift apart in later edits. Mitigation: the table row carries only name, one line and the entry point; all detail lives in the entry.

### D-002: Fixed entry shape, skills grouped by how a user meets them
**Decision:** Every entry has the same three parts, in prose, not bullets: one sentence on what it does; **How you reach it** (the exact slash command with its arguments from the SKILL.md `/picket:...` line, or two or three trigger phrases, or for an agent the skills that spawn it); **Where it fits** (main session or teammate agent, which lanes, what it writes and never writes, and for an agent its model and closing verdict tokens). `docs/skills.md` keeps every entry at `##` so the headings stay uniform; the summary table carries a Group column, and entries appear in group order: the four lanes (expediting, ordering, designing, researching), commands you run (inspecting, resuming, consulting, understanding, proofreading, ticketing, summarizing, branching), used by agents and also callable by you (documenting, reviewing), and for Picket contributors (benchmarking).
**Instead of:** alphabetical order: a new user reading top to bottom would meet `picket:benchmarking` first, a skill that only works inside the Picket repository.
**Risks:**
- **RISK-002** A skill with two uses lands in a group that hides one (reviewing is the reviewer's checklist and also `/picket:reviewing <pull request URL>`). Mitigation: its entry names both uses in **How you reach it**.

### D-003: Facts come from the shipped files, in user words
**Decision:** Every claim in an entry is checked against that item's `SKILL.md` or agent file (frontmatter and body) in this commit, not against the how-to or memory. Where an agent's `description` conflicts with the skill that drives the behaviour, the skill body wins and the conflict is an open question (see OQ-001). The text says "Picket", never "harness"; it names no step file, hook internals or kernel action names (`write_artifact`, `CROSS_CHECK_REQUESTED`), since a user never opens them. Every backticked path either exists in this repository or carries a `<placeholder>` segment (`work/<id>/research.md`, `artifacts/reports/<slug>.md`), because `test/markdown-paths.test.mjs` fails on any other.
**Instead of:** reusing each `description` field verbatim: those are written for the model (trigger lists, internal tokens), not for a person reading once.
**Risks:**
- **RISK-003** A host-project path such as `.picket/extensions/house-style/` is backticked and fails the path test. Mitigation: write it with a placeholder or outside backticks; never extend the test's `ELSEWHERE` list in this work item.

### D-004: Link where the terms first appear
**Decision:** In `docs/how-to.md`, the "What you get" paragraph that names the four agents and the skills gains one sentence linking `[the agents](agents.md)` and `[the skills](skills.md)`. `README.md` gains the same pointer in the sentence block next to its how-to link (line 5). Each phase adds only the link to the file it creates, so each phase ships complete.
**Instead of:** a "Further reading" section at the end of the how-to: a new user meets the words "agents" and "skills" in "What you get", so the link belongs there.

## Scope

**In:** `docs/agents.md` and `docs/skills.md` (new); one sentence each in `docs/how-to.md` and `README.md`.

**Out:** any edit under `core/`, `test/` or `.picket/`; fixing the developer description (OQ-001); the rules, hooks, output style and the `picket` verbs; translating or restructuring the how-to.

## Phase 1: Agents reference

**Touch set:**
- `docs/agents.md`: new file, four entries
- `core/agents/analyst.md`: source of analyst facts
- `core/agents/architect.md`: source of architect facts
- `core/agents/developer.md`: source of developer facts
- `core/agents/reviewer.md`: source of reviewer facts
- `core/skills/expediting/SKILL.md`: confirms fast lane spawns none
- `docs/how-to.md`: link sentence in "What you get"
- `README.md`: link next to the how-to link

**Changes:** Write `docs/agents.md` to D-001, D-002 and D-003. The opening says the agents are teammates the lead (the main Claude Code session) spawns for a work item, each with its own context, continued rather than respawned, and that the user never calls one directly. Facts verified for this order, to be re-checked in the files:

| Agent | Spawned by | Writes | Model | Ends with |
|---|---|---|---|---|
| analyst | researching | `work/<id>/research.md`, `.claude/PROJECT-MAP.md`, standalone reports | sonnet | `REPORT WRITTEN` |
| architect | ordering, designing | `work/<id>/order.md` or `work/<id>/design.md` only | opus | `ARTIFACT WRITTEN`, `AMENDED` |
| developer | ordering, designing | code and tests inside the phase touch set; stages, never commits | opus | `PHASE DONE`, `PHASE STALLED` |
| reviewer | ordering, designing, `/picket:reviewing <pull request URL>` | nothing (read-only) | sonnet | `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED` |

The reviewer entry says the final cumulative review uses a fresh reviewer that has not seen the earlier verdicts. The developer entry says the fast lane does not use it (OQ-001). Then add the D-004 link sentence for agents only. Stage only the three touch-set files under `docs/` and `README.md`; `CLAUDE.md` and `core/bin/picket.mjs` hold the user's own uncommitted edits and stay unstaged.

**Done when:**
- **T-1.1** `docs/agents.md` has exactly four `## picket:` headings: analyst, architect, developer, reviewer, in that order.
- **T-1.2** Each entry states what the agent does, which skills spawn it, what it may write, its model and its closing verdict tokens, matching the table above and the agent files.
- **T-1.3** `docs/agents.md` is at most 110 lines and `grep -ci harness docs/agents.md` prints 0.
- **T-1.4** `docs/how-to.md` links `agents.md` from the "What you get" section and `README.md` links `docs/agents.md`.
- **T-1.5** `npm test` passes, including `test/markdown-paths.test.mjs` and `test/names-picket.test.mjs`.
- **T-1.6** `git diff --cached --name-only` lists only `docs/agents.md`, `docs/how-to.md` and `README.md`.

## Phase 2: Skills reference

**Touch set:**
- `docs/skills.md`: new file, fifteen entries
- `core/skills/expediting/SKILL.md`: fast lane facts
- `core/skills/ordering/SKILL.md`: order lane facts
- `core/skills/designing/SKILL.md`: design lane facts
- `core/skills/researching/SKILL.md`: research lane facts
- `core/skills/inspecting/SKILL.md`: status command facts
- `core/skills/resuming/SKILL.md`: resume command facts
- `core/skills/consulting/SKILL.md`: strategy discussion facts
- `core/skills/understanding/SKILL.md`: questioning session facts
- `core/skills/proofreading/SKILL.md`: proofreading facts
- `core/skills/ticketing/SKILL.md`: Jira ticket facts
- `core/skills/summarizing/SKILL.md`: PR description facts
- `core/skills/branching/SKILL.md`: worktree facts
- `core/skills/documenting/SKILL.md`: template registry facts
- `core/skills/reviewing/SKILL.md`: checklist and PR review
- `core/skills/benchmarking/SKILL.md`: contributor-only bench facts
- `package.json`: confirms `bench/` is not shipped
- `docs/how-to.md`: link sentence in "What you get"
- `README.md`: link next to the how-to link

**Changes:** Write `docs/skills.md` to D-001, D-002 and D-003, entries in the D-002 order. The opening says a skill is a set of instructions Claude loads on a trigger phrase or a `/picket:<name>` command, and that the four lane skills start on their own from `picket admit`. Entry points verified for this order: `/picket:inspecting [<work-id>]`; `/picket:resuming [<work-id>]`; `/picket:consulting`; `/picket:understanding <plan, design, or idea>`; `/picket:proofreading <path or pasted text>`; `/picket:ticketing [--pull|--create|--update] [--story|--change|--bug|--debt|--spike|--epic] <text or key>`; `/picket:summarizing [branch or repo hint]` (user-invoked only, never started by Claude); `/picket:branching <branch>`, `--list`, `--remove <branch>`; `/picket:documenting <kind> <subject> [--export]`; `/picket:reviewing <pull request URL>` (posts to the PR only after `p`). Fit facts: consulting, understanding and the fast lane run in the main session with no agent; ticketing needs the Atlassian MCP server and confirms every write; understanding writes resolved terms to `.claude/MEMORY.md`; documenting is preloaded on the analyst and architect; branching is for a multi-repo umbrella and the developer reads it at a first phase; benchmarking runs `bench/`, which exists only in the Picket repository and is not in the npm package, and spends real API budget. Then add the D-004 link sentence for skills. Stage only the three phase files; leave `CLAUDE.md` and `core/bin/picket.mjs` unstaged.

**Done when:**
- **T-2.1** `docs/skills.md` has exactly fifteen `## picket:` headings, one per folder under `core/skills/`, in the D-002 order.
- **T-2.2** Every entry for a user-callable skill shows the `/picket:<name>` form with the arguments its SKILL.md gives; each lane entry names who works and where it stops for the user.
- **T-2.3** The summary table has one row per skill with a group matching D-002.
- **T-2.4** `docs/skills.md` is at most 230 lines and `grep -ci harness docs/skills.md` prints 0.
- **T-2.5** `docs/how-to.md` links `skills.md` from the "What you get" section and `README.md` links `docs/skills.md`.
- **T-2.6** `npm test` passes, including `test/markdown-paths.test.mjs` and `test/names-picket.test.mjs`.
- **T-2.7** `git diff --cached --name-only` lists only `docs/skills.md`, `docs/how-to.md` and `README.md`.

## Open questions

- **OQ-001** `core/agents/developer.md` says it is "Spawned by the ordering, designing and expediting skills", but `core/skills/expediting/SKILL.md:17` says the fast lane spawns no agent. Which is meant? Owner: user. Fallback: the docs follow the expediting skill (no developer in the fast lane); correcting the agent description is a separate change outside this docs-only item.

## Revision log
