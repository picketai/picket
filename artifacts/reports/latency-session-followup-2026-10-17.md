# Latency session follow-up (run 2026-10-17)

This is the checklist from `artifacts/reports/latency-session-record-2026-09-03.md`, run on 2026-10-17 against the host project `D:\workspace\development`. It was due after 2026-09-17 and had not been run before.

## Answer

Nothing needs rolling back and no major change is required. Three results missed the predictions: the reviewers catch less, time to first reviewable output did not halve, and run grants are no longer used. The kill rule stands at "inspect" (one instance, not two).

## The harness changed under the checklist

The record measured the September 2026 Design Record contract. That contract ran on the host only from 2026-09-03 13:09 UTC (first telemetry from the new hook) to 2026-09-14 06:40 UTC (host commit 0fc8eaf). The reworked harness then ran until 2026-10-09 (`.claude/ledger/`), and Picket from 2026-10-11 (`.picket/state/ledger.jsonl`, 509 rows to 2026-10-16). The September window holds one feature, record 00085 (later split into 00086), so most items are measured through their closest equivalent in the current lanes.

## Results by item

| # | Item | Data | Verdict | Numbers |
|---|---|---|---|---|
| 1 | DRIFT on SELF_CHECKED records (kill metric) | window; Picket | old metric has no cases; equivalent measured | 0 SELF_CHECKED records (00085 had 7 to 8 phases, so its check fired). Equivalent: 1 order-lane item (rc-7509) got a cumulative CHANGES REQUIRED, then D-003 (r3) and D-004 (r3) |
| 2 | Cross-check fire rate and yield | window; Picket | measured | window: fired 1 of 1, DRIFT in 2 of 5 rounds. Picket: design checked 7 of 7, order 0 of 11; DRIFT on 1 of 7 items (14%, just under the 15 to 30% band) |
| 3 | Cumulative CHANGES REQUIRED rate | all eras | equivalent measured | baseline about 35%. 00085: 1 of 1. Rework: 0 of 24. Picket: 2 of 16 (13%); any review 4 of 17 (24%); design 3 of 7, order 1 of 10 |
| 4 | Amendment shape | all eras | measured | 0 new `-rN` files in every era. Revision log lines: 00085 and 00086 have 5 each; Picket at most 2 on order 9 of 10 and design 3 of 6 (max 14). 0 `SELF_CHECKED (delta)` waivers |
| 5 | Stops per feature | rework; Picket | equivalent measured | user-gate stops per item: Picket order 2.3 (median 2), design 10.5, against about 6. Average user stop 4.1 min baseline, 4.7 window, 5.4 Picket. Away-gap share 55%, 72%, 77% |
| 6 | Report caps | window; rework | measured | window: 3 new reports, 0 of 83 findings over cap, median 55 words (baseline 80). Rework: 9 of 118 over cap. The 168 historical over-cap findings remain. Picket has no research reports yet |
| 7 | Telemetry sanity | all | measured, defects found | 77 mirrored rows dropped, none new. But the mirror filter dropped every teammate row after the sync: 0 teammate and 0 verdict rows from 09-04 to 09-11 while 00085 ran at least 6 reviews. Rework turn durations are broken (max 337 h). Picket: 1 mirrored row |
| 8 | Tiering visibility | window; Picket | equivalent measured | window reviewer on opus (correct, thresholds tripped). Picket: cross-checks and checkpoints on sonnet, cumulative reviews on opus, developer on opus 72 of 72 turns |

## Predictions

The middle band met its stops prediction in the order lane (2.3 per item against 2 to 3) but missed time to first reviewable: the order-lane median is 12.3 min (n=10) against a predicted 5 to 8. The token prediction has no per-feature baseline; as a rough sign, median total tokens per order item fell from 72M in the rework era to 27M under Picket. The heavy band shows 0.2 re-checks per amended design (1 of 5). Gate catch power diverged: the cumulative CHANGES REQUIRED rate is 13%, not 35%, and the rework era's 0 of 24 ran its cumulative reviews on sonnet.

## The item 1 instance

The rc-7509 cumulative reviewer found a missing concurrency decision (two overlapping paid deliveries can both commit an extension) and one exception path that broke D-003 (r2). The change committed a paid extension that is never undone, which is close to the design lane's irreversible trigger. One instance means inspect. If a second appears, the condition to add is that paid or never-undone commits route to the design lane, the record's own first candidate.

## Open questions carried forward

Analyst cost: in the rework era the analyst took 3.3% of output tokens and 97 minutes over 30 turns; Picket has run no research items on the host yet. Spawn cost: subagent turns write 300k to 480k cache tokens each, against 40k for the lead, so the teammate-core split is worth revisiting. Run-grant risk: in the window, phase 4 of 00085 was rejected inside a granted run and the cumulative review faulted phases 5 and 6, which also ran under a grant; the rework era had 0 of 6; Picket has had no grants (0 of 74 offers taken).

## Follow-ups

1. Picket's ledger records subagent output tokens far too low (an architect turn shows about 560) because the subagent transcripts record small totals. Agent token figures are unreliable until this is fixed.
2. Picket checks report caps only in template text; the record found prose-only caps ignored at a flat rate.
3. Re-measure the order-lane catch rate on a longer window; n=10 is small.

## Assumptions and gaps

The sync time comes from the telemetry, because host commits are batched. Time to first reviewable runs from work item creation to the first PHASE DONE. Stops are attributed to the nearest earlier row in the same session carrying a work id; 28 rework-era gates could not be attributed. A user rejection is counted apart from reviewer catch power. No ledger covers 09-11 15:22 to 09-15 08:35 (five work items of 09-14), rework-era turn durations are unreliable, 3 of 11 window transcripts are gone, Picket reviewer memory is empty, and ALIGNED cross-checks with zero findings were not counted.
