---
name: probe-attached-open-in-fallback
description: in-place guard probes for attached programs starting with open( and for wrapped echo; what still passes after 20261116
metadata:
  type: reference
---

`WRITE_CALL`'s `\bopen` finds no word boundary inside a whole flag word (`-weopen(`), so a check that tests `writeCall` on the whole word misses an attached program that starts with `open(`. Probe `perl -we'open(F,">src/a.pl")'`, `ruby -we'open("src/a.rb","w")'` and `python3 -Ec"open('src/a.py','w')"` on any change to `programText` in `src/lib/hooks/guard/bash/in-place.mts`. These passed until the 20261116 fix (`attachedPrograms`); `command echo`, `env echo` and `{ echo; }` piped into python3 passed until `visibleText` began to read any word of a segment.

Still passing as of 2026-11-16, both pre-existing: `echo '<write>' | bash -c python3` (a `bash -c` payload gets only its own stdin texts, `codeWritesInside` in payloads.mts) and `deno eval` with `Deno.writeTextFileSync` (outside the row's forms). Related: [[probe-guards-from-node-e]].
