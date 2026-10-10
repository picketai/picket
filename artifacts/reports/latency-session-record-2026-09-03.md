# Latency session — what changed and what to check (written 2026-09-03)

Working session of 2026-09-02/03 on harness latency and cost. Companion running
state: `tmp/latency-worklog.md`. Check back **on or after 2026-09-17**, once the
host project (`D:\workspace\development`) has run a couple of weeks on the new
contract. Prerequisite for any check: the host's `.claude` tree has actually been
synced with these commits — verify that first, or every number below is stale.

## The changes (11 commits, oldest first, each revertible alone)

| Commit | Change |
|---|---|
| 9c24229 | telemetry: drop SubagentStop events that mirror the lead's turn (68 false teammate rows on the host ledger); report.mjs dedupes historical mirrors |
| 8deadad | lint.write enforces the report template's finding caps; template gains ≤120 words/finding (line cap alone was gameable: 523 of 977 host findings were single-line, one at 390 words) |
| e2be6d2 | Design Record template (`templates/design-record.md`): decisions + phases in ONE file in `artifacts/plans/`; `filename.mjs design` type; ADR/plan templates demoted to standing/legacy |
| 392871e | lint.write revision protocol: D-### body change vs git HEAD requires a bumped `(rN)` marker + Revision log line; markers never regress; decisions withdrawn, never deleted |
| ca8e3b5 | architect: Design mode writes one record; A13 cross-check by counted thresholds (≥4 phases, security path, `[IRREVERSIBLE]`, schema/migration); Amendment mode revises in place; supersession/consolidation kept only for legacy pairs |
| 3f8720b | reviewer: model detected mechanically (`## Decisions` = record, `**Governing ADR:**` = legacy); single-file cross-check; no chain-union ever on records |
| f39415b | asset registries (preflight/selfcheck/tokens.*) reworded for both models; `(rN)` + `## Revision log` registered |
| a8553fe | CLAUDE.md: `## Cross-Check` thresholds, in-place amendment protocol, ownership rows (adr/ = standing + frozen legacy; plans/ = records + legacy plans) |
| 8fea4d7 | stops: developer's `**Run offer:**` line names the grantable batch at every phase gate; team lead ends turns only at user gates (mechanical verdict relays route same-turn); PushNotification at genuine gates |
| 0a6d285 | tiering: sonnet reviewer when the record's `Thresholds:` line shows none tripped; sonnet for legacy consolidation folds |
| 7234dcb | `branching` deferred: read at implement.md's worktree gate instead of injected into every developer spawn (−18.5KB/spawn) |

Deliberate continuity: classification tokens (`ADR_AMENDED`/`PLAN_UPDATED`),
"ADR-alignment" section name, `RECONCILE WITH ADR:`, and the `adr-` memory prefix
keep their historical names — telemetry, hooks, and the memory-kind registry key
on them. Legacy pairs are never converted; open chains close under the old rules.

## Baselines to compare against (measured 2026-09-02/03, host project)

- Ledger: 46 sessions, 11,284 turns, 12.5M output tokens. After mirror-dedupe:
  20 real timed teammate turns.
- Recent gate telemetry: cross-checks 3 (DRIFT 1/3), reviews 2 (CHANGES REQUIRED 0/2),
  amendments 4 (all PLAN_UPDATED).
- Reviewer-memory history (~30 chains, 2026-05→09): ≥9 chains with a DRIFT round
  (~30%), ≥11 with a CHANGES REQUIRED round (~35%).
- ADR churn: 180 files, 96 supersession deltas (53%); depths to r10.
- Wall-clock decomposition (session 766c4c44): model-active 17% of effective wall;
  average user stop ≈ 4 min (81 short gaps = 179 min; 17 away-gaps of 5–30 min
  = 223 min); ~112 lead stops in one working day.
- Autonomous stretches: 81% pure generation; tool steps ≈ 1.6 s; builds/tests noise.
- Reports: mean 30.2KB; findings p50 80 words, ~40% over 100; caps ignored at a
  flat rate for 3 months.

## Predictions (theory — falsifiable)

- **Middle band** (no threshold tripped): time-to-first-reviewable ~halves
  (10–15 → 5–8 min); user stops per feature ~6 → 2–3; tokens −20–40%.
- **Heavy band**: ~1 waived delta re-check per amended feature; no chain-union
  reads; elapsed −15–25% on amended features, ~0 on clean ones (by design).
- Gate catch power unchanged: cumulative CHANGES REQUIRED rate stays ≈ 35%;
  cross-checks that DO fire keep a material DRIFT rate.

## The checklist (run after 2026-09-17)

Run `node .claude/telemetry/report.mjs D:/workspace/development/.claude/telemetry/ledger.jsonl`
plus the scripts noted below.

1. **DRIFT on SELF_CHECKED records — the kill metric.** Any cumulative review that
   emits `ARCHITECT AMENDMENT NEEDED:` against a record that skipped its
   cross-check (`SELF_CHECKED`) means the thresholds missed a class of drift.
   One instance → inspect; two+ → add the missing condition (first candidate:
   external-contract changes, per the A9b history). This is the only result that
   should roll anything back.
2. **Cross-check fire rate and yield.** Expect most records to emit `SELF_CHECKED`
   (middle band) and fired cross-checks to keep DRIFT ≥ ~15–30%. DRIFT 0/N with
   N ≥ 5 → thresholds still too wide; consider narrowing. Every fired check
   ALIGNED-with-zero-findings is a wasted round trip to count.
3. **Cumulative CHANGES REQUIRED rate.** Baseline ~35%. A jump confined to
   record-based plans → the removed pre-phase gate was load-bearing after all.
4. **Amendment shape.** Zero new `-rN` files for records (lint should make this
   impossible — a violation is a hook bug); revision-log entries per record mostly
   ≤2; `M5a` waivers actually occurring (grep architect outputs for
   `SELF_CHECKED (delta)`).
5. **Stops per feature.** Re-run the gap decomposition
   (`scratchpad decompose2.mjs`, or rebuild: band gaps between ledger events,
   exclude >30 min) on a post-change session: lead stops per completed plan
   should drop toward 2–3 from ~6; away-gap minutes should shrink if the
   PushNotification habit works. Also grep developer summaries for
   `**Run offer:**` uptake — offers rendered vs runs granted.
6. **Report caps.** `node .claude/hooks/lint.write.mjs --all --root D:/workspace/development`
   → over-cap finding count on NEW reports should be ~0 (baseline: 168 historical).
7. **Telemetry sanity.** report.mjs header shows a mirrored-rows-dropped count for
   the old lines only; no new mirrors accumulate. Teammate turn counts now real.
8. **Tiering visibility.** Sonnet model ids appearing on reviewer subagent rows
   for no-threshold records; developer stays opus.

## Open questions carried forward

- Analyst stage cost: still unmeasured (reports are ~5% of output tokens, but the
  ingestion passes' time share is unknown).
- CLAUDE.md teammate-core split: deliberately NOT done (smallest win, highest
  drift risk). Revisit only if spawn cost shows up in the new numbers.
- Run-grant rework risk: watch for rejection rounds caused by a flaw found after
  a granted run advanced past it (tighten run eligibility if it appears).
