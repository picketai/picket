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

**How to apply:** read these before designing next actions, sends, gate replies or mod imports. Related: [[zone-and-root-facts]], [[block-format-couplings]], [[verify-grep-patterns]].
