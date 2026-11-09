---
kind: report
title: Consistency, determinism and performance since v1.0.0-alpha.5
date: 2026-11-09
audience: developer
sources: work/20261109-consistency-determinism-performance-since-alpha-/request.md, .claude/rules/harness-authoring.md, test/timing/budgets.test.mjs, CLAUDE.md, git log and git diff v1.0.0-alpha.5..HEAD for src/lib/shared/git.mts, src/lib/util/git.mts, src/lib/shared/review-summary.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/stall.mts, src/lib/shared/work/block.mts, src/lib/shared/work/send.mts, src/lib/shared/work/attention.mts, src/lib/shared/host-sessions.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/plan.mts, src/lib/shared/commit-message.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/signals.mts, src/lib/shared/ledger.mts, src/lib/shared/install.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/emit/statusline/index.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/verbs/list/index.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/audit.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/init/init.mjs, src/mods/status/hooks/watch.ts, src/mods/status/hooks/work-pane.ts, src/mods/status/hooks/session-files.ts, src/mods/status/hooks/sessions.ts, src/mods/status/hooks/pane-actions.ts, src/mods/status/hooks/index.tsx, src/agents/architect.md, src/agents/reviewer.md, src/skills/expediting/SKILL.md, src/skills/reviewing/SKILL.md, src/skills/reviewing/steps/pr.md, src/templates/claude-block.md, bench/schema/ledger-v2.schema.json, bench/run.mjs, bench/report.mjs
confidence: medium
---
# Report: Consistency, determinism and performance since v1.0.0-alpha.5

## Summary
The kernel did not regress on determinism: the new routing, stall counting and commit paths are pure functions of the verdict, reply and marker files, and `commitOwned` still uses literal pathspecs (R-005, R-008). [VERIFIED] The consistency gaps are at the seams: two definitions of a live session (R-009), a status pane that refreshes on a signature that omits inputs of its rows (R-010), a floating `alpha` dist tag in the marketplace entry `init` writes (R-012), and a documented CLAUDE.md budget that the test does not enforce (R-001). [VERIFIED] Performance costs are small today (hook cold test passes, `picket list` over 182 items took 91 ms, a full-history `rev-list` over 733 commits took 2 ms) but several paths scale with history or item count (R-002, R-003, R-011, R-016). [VERIFIED] No bench run covers the contract changes made since 2026-11-02, so end to end cost and pass rate are unmeasured (R-014). [INFERRED]

## Context
Scope as understood: find regressions in consistency, determinism and performance in the 81 commits v1.0.0-alpha.5..HEAD (kernel, hooks, agents, skills, status mods) and name what needs adjusting, without changing code or redesigning the benchmark. Read: the diffs of the files listed in `sources`, plus the full current text of `src/lib/hooks/route/verdict/index.mts`, `src/lib/util/git.mts` and the status mod files named above. Measured: `node --test test/timing/budgets.test.mjs` (8 pass), `picket list`, `git rev-list`. Not read: `src/mods/status/hooks/pane.tsx` (498 lines, rendering only), the other skills' one-line frontmatter edits, test files beyond the budget test, work item records. `npm test` and `bench` were not run.

## Structure
The range touches 117 kernel files (src/lib), about 50 mod files, 13 skill files, 2 agent shells and 40 test files. Flows that changed: routing (`route.verdict` hook, `route` verb, `next-step`, `stall`), phase commit (`commit-message`, `route/commit`, `git.commitOwned`), review summary (`review-summary`, own-commit lookup), admission (`lane`, `signals`), install (`init`, `install`, status line copy), accounting (`cost`, `close/audit`, `ledger`), and the status mod's work pane (`list` verb rows, `host-sessions`, `session-files`).

## Findings
- **R-001** [VERIFIED] The authoring rule says CLAUDE.md is at most 2048 bytes; the test enforces 2560 and the file is 2352 bytes, so the stated budget is exceeded and no test fails. The test line is unchanged since alpha.5, so this is standing drift, not new. `.claude/rules/harness-authoring.md:5`, `test/timing/budgets.test.mjs:15`.
- **R-002** [INFERRED] `itemBase` lists every commit on HEAD (`rev-list --reverse HEAD`) to find an item's oldest own commit, so cost grows with history. Measured 2 ms at 733 commits, so not a problem now. `src/lib/shared/review-summary.mts` (`itemBase`).
- **R-003** [VERIFIED] `ownedParts` and `rootOwned` spawn `git show`/`git diff --numstat` once per own commit plus once for dirty paths, so git processes grow with commits per item. Large items with many fix commits pay most. `src/lib/shared/review-summary.mts` (`ownedParts`, `rootOwned`).
- **R-004** [INFERRED] `isAfter` compares timestamps with `Date.parse`; rows written in the same millisecond tie, so an amendment answer is not read as newer than its review. `src/lib/shared/work/next-step.mts` (`isAfter`, `planAmendStep`).
- **R-005** [VERIFIED] Not a regression. `stageCommit` calls `git add` through `gitStrict`, which prepends `--literal-pathspecs`, so the outline's concern is withdrawn. `src/lib/shared/git.mts:179`.
- **R-006** [VERIFIED] `picket list` rows grew from 6 to 16 fields and read the host `sessions` folder once per call; measured 91 ms for 182 items. Cost is per item plus per registry file. `src/lib/verbs/list/index.mts`, `src/lib/shared/host-sessions.mts`.
- **R-007** [VERIFIED] The new `emit.statusline` SessionStart hook is under the 200 ms cold budget; the timing test starts every `dist/hooks/*.mjs` and passed. `test/timing/budgets.test.mjs:80`, `dist/hooks/emit.statusline.mjs`.
- **R-008** [VERIFIED] Stall logic stays deterministic. Counting moved to `stall.mts`: only AMENDED rows that answer a DRIFT or STALLED row count toward three, and `resolveBlockStep` keeps the phased-lane guard that `isStalled` dropped. `src/lib/shared/work/stall.mts`, `src/lib/shared/work/next-step.mts`, `src/lib/shared/route/plan.mts`.
- **R-009** [VERIFIED] "Live session" has two definitions. The kernel's `liveSessionIds` accepts every registry file with a `sessionId`; the mod's `liveSessions` also requires `info.cwd === root`. The same session can read `working` in `picket list` and not live in the pane. `src/lib/shared/host-sessions.mts:25`, `src/mods/status/hooks/session-files.ts` (`liveSessions`). [ARCHITECT REVIEW NEEDED]
- **R-010** [INFERRED] The pane reloads rows only when the mtimes of `state.yaml` and `verdicts.jsonl` of non-closed items change; `attention` also depends on the live session registry and on reply and marker files, so a session ending or a reply can leave rows stale until the 15 s forced refresh with the pane open, or indefinitely with it closed. `src/mods/status/hooks/watch.ts`, `src/mods/status/hooks/pane-actions.ts:86`. [ARCHITECT REVIEW NEEDED]
- **R-011** [VERIFIED] `listSessions` reads each transcript title one after another; a cache miss reads up to 4 MB or spawns `node -e` for larger files, the cache key includes mtime so an active session re-reads every turn, and the cache map is never trimmed. Pane refresh runs every 15 s. `src/mods/status/hooks/session-files.ts` (`titles`, `transcriptTitle`), `src/mods/status/hooks/index.tsx:13`.
- **R-012** [VERIFIED] `init` writes the marketplace entry with `version: "alpha"`, a dist tag, so two installs on different days can get different plugin code. `src/lib/shared/install.mts` (`INSTALL.marketplace`), `src/lib/verbs/init/init.mjs` (`marketplaceStep`). [STRATEGIC REVIEW NEEDED]
- **R-013** [VERIFIED] Commit handling is stricter and has one silent path. A missing or non Conventional `Commit:` line now refuses approval (the old fallback title is gone), and `route.verdict` returns nothing for a first stop with a bad commit line, relying on `guard.block` to bounce it. If `guard.block` does not run, the verdict is dropped without a message. `src/lib/shared/route/commit.mts`, `src/lib/hooks/route/verdict/index.mts` (`isBouncedForCommit`), `src/lib/hooks/guard/block/index.mts`. [ARCHITECT REVIEW NEEDED]
- **R-014** [VERIFIED] `bench/results/baseline-trunk.json` dates from 2026-10-11 and the newest fast-lane run is 2026-11-02; since then admission returned `pending`, the commit check, the amendment gate and the token accounting landed. `bench/schema/ledger-v2.schema.json:38` still lists `cost_usd` per row, which the ledger no longer writes. `bench/results/`, `.claude/rules/harness-authoring.md:15`.
- **R-015** [VERIFIED] A request that names a file but passes no `--touched` now returns `lane: pending` instead of `fast`, so every fast item costs one more admit call and model turn; the answer is deterministic. `src/lib/shared/admission/lane.mts` (`smallChangeResult`).
- **R-016** [VERIFIED] `close` reads the whole ledger twice (`auditLine`, `newRepeats`) and every item's verdict log once (`repeatedClasses`), so close cost grows with ledger size and item count. Repeat reporting also depends on close order, since classes reported at other closes are skipped. `src/lib/verbs/close/close.mts` (`close`, `newRepeats`).
- **R-017** [VERIFIED] The audit line's `wall` is last row minus first row of the item's ledger rows, so idle days between sessions count as work time. `src/lib/verbs/close/audit.mts` (`wallPart`).
- **R-018** [VERIFIED] Block parsing is now one function for the hook, the commit and the summary (plain, bold and bulleted labels, `none.`), which removes a former inconsistency between `guard.block` and `parseBlock`. `src/lib/shared/work/block.mts`, `src/lib/hooks/guard/block/index.mts`.

## Dependencies and relationships
`route.verdict` and `guard.block` both call `blockCommitProblem`, so one check serves two hooks and the commit. The mod calls `picket list` and `picket next --latest` as child processes, so kernel row shape (`ListRowView`) is a contract between `src/lib/shared/views.mts` and the mod. `init` depends on the `claude` CLI for plugin install and uninstall.

## Risks and unknowns
- [UNKNOWN] End to end effect on fast-lane pass rate and tokens per task; no bench run after 2026-11-02.
- [UNKNOWN] Whether `npm test` passes on trunk; not run.
- [UNKNOWN] Pane render cost in `pane.tsx` and real Claude Code engine timing for `$.fs` calls.
- [UNKNOWN] Whether `guard.block` always runs before `route.verdict` (R-013); hook order is set by the host.
- [ASSUMPTION] Items with fewer than 800 commits and 200 work folders are representative of current use for the timings above.
- [ASSUMPTION] The tracked diff was read per file; skill frontmatter-only edits were not read in full.

## Recommendations
- Decide which budget is authoritative for CLAUDE.md (R-001) and align rule and test.
- Decide one definition of a live session for kernel and mod (R-009) and what the pane refresh must watch (R-010).
- Decide whether the marketplace entry pins a version (R-012).
- Offer the fast lane comparison named in the authoring rule before the next release (R-014).

## Glossary
- **Attention**: a work item's state for the pane: needs-you, working, open or closed; computed in `src/lib/shared/work/attention.mts`.
- **Pending lane**: the admission answer when a small change has no touch set yet.
