---
name: target-directory-spelling-drops-name
description: sourcePathSpellings respells "cp a {source}/f" as "cp --target-directory={source} a", which writes {source}/a, not f
metadata:
  type: project
---

The `sourceCommands` grammar's source path spellings family (test/support/variants.mts) turns `cp a {source}/name` into `cp --target-directory={source} a`. That command writes `{source}/a`, not `name`. The respelling only keeps its meaning when the whole folder is protected (sources, `.picket/state/data`).

**Why:** in phase 2 of 20261119-agents-cannot-forge-picket-state-by-bash, the work item closure stayed open on that spelling until the seeds kept the record's basename (`cp /tmp/waivers.jsonl {source}/waivers.jsonl`) and records.mts learned -t/--target-directory.

**How to apply:** when a closure guards single files inside a folder that is not protected as a whole, give its cp/mv seeds a source operand whose basename is the guarded name.
