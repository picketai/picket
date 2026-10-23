---
name: literal-criterion-misses-go-to-amendment
description: When code beats a plan criterion's literal bound (line-count floor, "same test count", over-broad grep), grade it FAIL/UNCLEAR and route through the D-### that states it
metadata:
  type: feedback
---

A criterion like "index.tsx has 100 to 170 lines" that the code misses on the good side (95, 66 lines of wiring) still fails literally; the reviewer contract forbids APPROVED past it. Do not ask the developer to pad code. Grade the T row FAIL, find the decision that states the same bound (07a: D-006), report `Decisions: DRIFT` plus `AMENDMENT NEEDED: D-00x`, and say the fix is the amendment, no code change. Group the other literal misses (over-broad grep hitting an unrelated same-name function at base, "same passing count" after added tests) into the same amendment as UNCLEAR.

**Why:** item 07a's phases 4 and 5 ran under a run grant with no checkpoint review; the developer flagged the floors in the blocks but nobody amended the plan, so the cumulative review was the first gate.

**How to apply:** in cumulative reviews, read each phase block's `Decisions:` line for "under T-x.y", "not padded", "also lists"; those are self-reported literal misses to grade. See [[phase-block-overwritten-by-fix]].
