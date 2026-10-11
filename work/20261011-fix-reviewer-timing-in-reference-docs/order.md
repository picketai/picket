---
kind: order
lane: order
title: Fix reviewer timing in reference docs
date: 2026-10-11
audience: developer
sources: [work/20261011-fix-reviewer-timing-in-reference-docs/request.md, core/lib/next.mjs, core/skills/ordering/steps/40-review.md, core/skills/designing/SKILL.md, core/skills/expediting/SKILL.md, core/agents/developer.md, docs/agents.md, docs/skills.md]
phases:
  - n: 1
    files: [docs/agents.md, docs/skills.md, core/agents/developer.md, core/agents/reviewer.md]
    greps:
      - path: docs/agents.md
        pattern: '6 or more phases'
      - path: docs/agents.md
        pattern: 'a checkpoint, final or pull request review'
      - path: docs/skills.md
        pattern: 'checkpoint reviews in the design lane'
      - path: core/agents/developer.md
        pattern: 'Spawned by the ordering\s+and\s+designing\s+skills;'
      - path: core/agents/reviewer.md
        pattern: 'Spawned by the ordering,\s+designing\s+and\s+reviewing\s+skills;'
    tests: true
    drive: false
---
# Order: Fix reviewer timing in reference docs

## Problem

The cumulative review of 20261011-reference-docs-for-skills-and-agents found two wrong claims about when the reviewer runs. `docs/agents.md:42` says the reviewer runs checkpoints in the order and design lanes. `docs/skills.md:131` says it loads its checklist "for every phase". Neither is true. `core/lib/next.mjs:20` sets `HEAVY` to `design` only. `core/lib/next.mjs:63` schedules `review_checkpoint` only for a design plan of 6 or more phases, before phase `ceil(n/2)+1`: a 6-phase plan gets one checkpoint, before phase 4. No action reviews each phase. The third fix is OQ-001 of that item, which the user has settled. `core/agents/developer.md:5` says the expediting skill spawns the developer, but `core/skills/expediting/SKILL.md:17` says the fast lane spawns no agent.

## Decisions

### D-001: Describe the reviewer by what `picket next` schedules
**Decision:** The two docs describe the reviewer's runs in the order `core/lib/next.mjs` gives them. In the design lane: the plan cross-check, then a checkpoint review for plans of 6 or more phases, held before the phase after the midpoint. In both lanes: one final review of the whole change by a fresh reviewer after every phase is approved. Pull request reviews are unchanged. At `docs/agents.md:44`, "a phase, final or pull request review" becomes "a checkpoint, final or pull request review". That keeps the verdict sentence true, because a checkpoint ends with `APPROVED` or `CHANGES REQUIRED` (`core/skills/ordering/steps/40-review.md:27-33`). The 6-phase threshold already appears in `docs/skills.md:45`, so both files use the same number.
**Instead of:** Dropping checkpoints from both docs and leaving the design-lane entry to explain them. The agents page is where a user learns when the reviewer runs, so leaving out one of its runs would make that page wrong in another way.
**Risks:**
- **RISK-001** Someone later changes the threshold in `next.mjs`, and the docs fall out of date again. Mitigation: none in this item. The number now appears twice in the docs (`docs/skills.md:45` and `docs/agents.md`), and both places sit next to the word "checkpoint", so a search finds them.

### D-002: Make the developer description match its body
**Decision:** The `description` in `core/agents/developer.md` says "Spawned by the ordering and designing skills". It also replaces "commits" with "stages the phase for your approval". Step 5 of the agent's own body says "Stage the phase, do not commit it", and the request's goal is a description that matches the behaviour. Only the frontmatter `description` changes. The body, the tools and the model stay as they are. The file stays well under the 120-line agent budget in `test/budgets.test.mjs:15`.
**Instead of:** Fixing only the word "expediting", as the request names it. "commits" sits in the same sentence and is just as wrong, and a second work item for one word costs more than including it here.
**Risks:**
- **RISK-002** Claude Code uses the agent description when it picks an agent, and a changed description could change how the agent is chosen. Mitigation: the lanes always spawn the developer by type (`picket:developer`), never by matching the description, so the choice of agent does not change.

### D-003: Make the reviewer description list the reviews the kernel schedules
**Decision:** The frontmatter `description` of `core/agents/reviewer.md` drops "reviews a phase". It lists the reviews that actually happen: the cross-check of a design record (`ALIGNED` or `DRIFT DETECTED`), the checkpoint review of a design plan of 6 or more phases, the review of the whole change after every phase is approved, and a pull request review (`APPROVED` or `CHANGES REQUIRED`). The spawn list becomes "Spawned by the ordering, designing and reviewing skills", because `core/skills/reviewing/SKILL.md:105` spawns `picket:reviewer` for a pull request. The body stays as it is, including its `phase <n>` scope and line 61. The file has 63 lines, well under the 120-line agent budget.
**Instead of:** Also rewording the body's review scopes. The user asked only for the description, and the body's scopes are procedure that the reviewing skill's step files rely on.
**Risks:**
- **RISK-003** The description is longer and, as a folded block, could wrap so that a grep misses it. Mitigation: the frontmatter grep allows any whitespace between words.

## Scope

**In:**
- `docs/agents.md` lines 42 and 44
- `docs/skills.md` line 131
- the `description` of `core/agents/developer.md`
- the `description` of `core/agents/reviewer.md` (OQ-001, resolved)

**Out:**
- every other sentence in the docs
- the body of `core/agents/reviewer.md`
- `core/lib/next.mjs` and every skill or step file
- `CLAUDE.md` and `core/bin/picket.mjs`, which hold the user's uncommitted edits and stay unstaged

## Phase 1: Correct reviewer timing and developer description

**Touch set:**
- `docs/agents.md`: reviewer entry, lines 42 and 44
- `docs/skills.md`: reviewing entry, line 131
- `core/agents/developer.md`: frontmatter description, lines 4 to 6
- `core/lib/next.mjs`: checkpoint rule, lines 20 and 61-64 (read only)
- `core/skills/ordering/steps/40-review.md`: checkpoint verdicts (read only)
- `core/skills/designing/SKILL.md`: 6-phase threshold, line 48 (read only)
- `core/skills/expediting/SKILL.md`: no spawn, line 17 (read only)
- `core/agents/reviewer.md`: frontmatter description, lines 4 to 7
- `core/skills/reviewing/SKILL.md`: pull request spawn, line 105 (read only)

**Changes:**
- At `docs/agents.md:42`, replace "In the order and design lanes it reviews phases at checkpoints and, once every phase is approved, the whole change." with two facts. First, in the design lane a plan of 6 or more phases gets a checkpoint review before the phase after the midpoint. Second, in the order and design lanes, once every phase is approved, a fresh reviewer reviews the whole change.
- At `docs/agents.md:44`, change "a phase, final or pull request review" to "a checkpoint, final or pull request review".
- At `docs/skills.md:131`, replace "for every phase, plan and final review in the order and design lanes" with: for the plan cross-check and checkpoint reviews in the design lane, and for the final review in both lanes.
- Rewrite the `description` of `core/agents/developer.md` according to D-002. Keep the folded `>` block form.
- Rewrite the `description` of `core/agents/reviewer.md` according to D-003. Keep the folded `>` block form and leave the body as it is.
- Stage only the four edited files.

**Done when:**
- **T-1.1** `docs/agents.md` says that checkpoint reviews are design lane only and need a plan of 6 or more phases. It no longer says the reviewer runs checkpoints in the order lane.
- **T-1.2** `docs/agents.md` says "a checkpoint, final or pull request review ends with `APPROVED` or `CHANGES REQUIRED`".
- **T-1.3** `grep -c "every phase, plan" docs/skills.md` prints 0, and the reviewing entry names the plan cross-check and checkpoint reviews (design lane) and the final review (both lanes).
- **T-1.4** `grep -c expediting core/agents/developer.md` prints 0, the description says "Spawned by the ordering and designing skills", and it says the developer stages the phase rather than committing it.
- **T-1.5** `npm test` passes, including `test/budgets.test.mjs`, `test/names-picket.test.mjs` and `test/markdown-paths.test.mjs`.
- **T-1.6** `git diff --cached --name-only` lists only `docs/agents.md`, `docs/skills.md`, `core/agents/developer.md` and `core/agents/reviewer.md`.
- **T-1.7** The `description` of `core/agents/reviewer.md` no longer contains "reviews a phase". It names the design-record cross-check, the checkpoint review of design plans of 6 or more phases, the whole-change review and pull request reviews, and it says "Spawned by the ordering, designing and reviewing skills".

## Open questions

- **OQ-001** [resolved 2026-10-11 by the user: fix the reviewer description; see D-003] `core/agents/reviewer.md:5` says it "reviews a phase or the whole branch". The kernel schedules no per-phase review, only the checkpoint and the cumulative review.

## Revision log

- 2026-10-11: D-003 (r1): added; the user resolved OQ-001, so phase 1 now also fixes the reviewer description and T-1.6 lists four files.
