---
name: replay-labels-by-family-block
description: Replay drives check "contains" anywhere in output; attribute a label to its family block with awk before trusting it
metadata:
  type: reference
---

`node scripts/replay-rejected.mjs <rev> <test>` prints every failing test's diff, so a label in a drive's `contains` can come from the "as written" block (a probe) instead of the family block D-006 promises. Check with:
`awk -v p="<label>" '/is open under/ {hdr=$0} index($0,p) {print hdr " :: " $0}' out.txt | sort -u`
Write the output to the scratchpad, never the repo. Do not put `git stash` in a probe command: the classifier denies it.
