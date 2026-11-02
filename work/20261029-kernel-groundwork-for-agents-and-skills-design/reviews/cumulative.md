## Review: 20261029-kernel-groundwork-for-agents-and-skills-design · cumulative

APPROVED: every sentence of the request has code and a test behind it, all 63 plan criteria and 8 decisions hold, and the one finding is a Minor.

Requirements: PASS (12)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "an action text map read by the status band and inject.state" | request.md:1 | PASS | src/lib/shared/work/action-text.mts:9, src/mods/status/hooks/band.ts:85, src/lib/hooks/inject/state/index.mts:17; inject/state test "words each item's next step" |
| S-2 | "verdict rows gain session" | request.md:1 | PASS | src/lib/shared/route/route.mts:32-36; verdict hook test T-2.5 |
| S-3 | "the verdict hook saves reviewer blocks to work/<id>/reviews/<scope>.md" | request.md:1 | PASS | src/lib/hooks/route/verdict/index.mts:56-60,70; src/lib/shared/work/reviews.mts:25 |
| S-4 | "the review summary gains checklists" | request.md:1 | PASS | src/lib/shared/review-checklists.mts:41; src/lib/verbs/summary/index.mts:76,82 |
| S-5 | "summary --save" | request.md:1 | PASS | src/lib/verbs/summary/index.mts:85; summary test "--save writes the same value" |
| S-6 | "preflight saves its warn lines" | request.md:1 | PASS | src/lib/verbs/preflight/index.mts:43-53 |
| S-7 | "NEXT_ACTIONS gains fix_findings and amend" | request.md:1 | PASS | action-text.mts:1; src/lib/shared/work/next-step.mts:60-83 |
| S-8 | "picket next builds a send list (spawn or continue, message text)" | request.md:1 | PASS | src/lib/shared/work/send.mts:37-43,125; next-view.mts:34 |
| S-9 | "a new picket reply verb applies a gate reply" | request.md:1 | PASS | src/lib/verbs/reply/index.mts:98-112; reply/table.mts:63 |
| S-10 | "picket packet prints its own text fence" | request.md:1 | PASS | src/lib/verbs/packet/index.mts:17-19,27 |
| S-11 | "guard.block bounces a picket agent turn that ends without a block" | request.md:1 | PASS | src/lib/hooks/guard/block/index.mts:61-68,74; test/hooks/guard.block.test.mjs |
| S-12 | "No agent, skill, rule or CLAUDE.md text changes." | request.md:1 | PASS | `git diff --stat d281956 HEAD -- src/agents src/skills src/rules src/output-styles CLAUDE.md` is empty |
Alignment: PASS (63)
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-7 with S-12: src/skills/shared/procedures/cumulative-review.md:36 still says that after a cumulative CHANGES REQUIRED, `picket next` says `review_cumulative` or `resolve_rejections`. It now says `fix_findings` (or `amend`), and no lane table has a row for either. Until the skills item lands, the lead running the current procedure meets an action its table does not name. Is that window acceptable?
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/shared/work/next-view.mts:34: every `NextView` now carries `send`, but `picket set` (src/lib/verbs/set/index.mts:32), `open` and `source pick` call `readNext` without a session, so their `next.send` always says `Agent`, even for a live instance. No skill reads those sends yet. Once one does, a lead following `set`'s output after `status=open` would respawn a live developer or architect. Pass `ctx.session` there, or drop `send` from those results.
Classes: none
Checked: band and inject.state wording before and after for every action, with the existing band asserts unchanged. The amend, findings and rejection order in allApprovedStep and blockStep. Liveness when a phase review row has `scope: null`. A fix_findings PHASE DONE on an approved phase, which lands in N.fixes.md with no stray commit. Reply letters gated by the offered options. The lead-only refusal for reply. The route move is byte-identical apart from imports. D-007 covers the readOnly flag that summary and preflight keep while they write.

APPROVED
