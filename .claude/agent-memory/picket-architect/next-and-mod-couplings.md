---
name: next-and-mod-couplings
description: Facts behind next/route flow that a design touching picket next, the status band or gate replies must respect (checked 2026-10-29 for the kernel groundwork design)
metadata:
  type: reference
---

Checked 2026-10-29 at 576f2cc while designing work/20261029-kernel-groundwork-for-agents-and-skills-design:

- The status mod can import only the files `MOD_LIB_SHARED` in `scripts/build.mjs` copies (format, views, palette); a copied file must import nothing outside that list, or the built mod breaks. `next-step.mts` cannot be imported by the band.
- A user `rejected` verdict only clears the run grant (the `rejection` effect in the route service's plan module), so `picket next` keeps saying `approve_phase` while the developer fixes.
- The verdict hook passes the `AMENDMENT NEEDED` line as `reason`; before that design, only a drift kept it (as `blocked_reason`), and verdict rows stored no reason.
- `findVerdict` matches every `VERDICTS` key at the start of a turn's last line, lead turns included, so a new lowercase user verdict risks routing stray prose.
- The guard classes verbs by `readOnly` per verb, not per flag (only `verify` is special-cased in `src/lib/hooks/guard/bash/kernel.mts`).
- `docs/reference/cli.md` headings are `## picket <verb>`; a new verb or usage change needs `npm run docs`.
- The layer rule in `test/repo/conventions.test.mjs` forbids one verb importing another (hooks may import a verb's index); a service two verbs need belongs in `src/lib/shared/`. Route moved there in that design's phase 7 (D-008 r2), so cite route modules by name, not path.
- Claude Code renames an Agent spawn whose name is already taken in the session (`cumulative-reviewer-2`, `-3` seen 2026-10-29), so a send to a bare role name can reach an earlier item's live instance. Item B's design (work/20261029-convert-architect-analyst-and-reviewer-item-b-de, D-001) names instances `<tag>-<role>` per item; `bareAgentName` parses that prefix form, not a suffix tag.
- Checked 2026-10-29 (work/20261029-documenting-and-consulting-skills-picket-name): the research gate never routes. `picket reply` refused research items, the lead closes on `a`, and the user `approved` effect (`phaseApproved` in the route plan module) throws without a `work/<id>/phases/N.done` marker, which research items never get. `picket close` commits only `work/<id>/` plus `--touched`, so anything a research verdict writes elsewhere must be recorded (that design put `published` on the verdict row). No `artifacts/reports/*.md` carried `kind: report` then.

Checked 2026-10-30 (work/20261030-worktrees-through-the-kernel-design):

- `applyChanges` in the route service writes the `approved` marker and state before `commitPhase` runs, and `commitPhase` turns a commit error into an output line, so a failed umbrella commit still leaves the phase approved.
- The guard's `verify` special case (`verifyRunsNoProjectCode` in `src/lib/hooks/guard/bash/kernel.mts`) classifies only the umbrella's detected test command; anything that makes `verify` run another command must change it in the same phase.
- `.claude/settings.json` allows `Bash(git add *)`; `git -C <dir> add` does not match that prefix, and `picket init` writes no permissions.
- `reply` handles only `GATE_ACTIONS` (`approve_phase`, `resolve_block`, `resolve_rejections`); `resolve_sources` is answered by `picket source pick`, not `reply`.

Checked 2026-11-01 (work/20261101-checkpoint-changes-required-gets-a-fix-step):

- A routed verdict with no phase falls back to `currentPhase`, the first unapproved phase, so a fix on an already approved phase (checkpoint findings) must carry a `phase:` line or the PHASE DONE marks the next, unstarted phase done.
- The status mod's band test (`src/mods/status/hooks/band.test.ts`) pins the `ACTION_TEXT` strings; changing one touches it.

**How to apply:** read these before designing next actions, sends, gate replies or mod imports. Related: [[zone-and-root-facts]], [[block-format-couplings]], [[verify-grep-patterns]].
