---
name: rejected-tree-locations
description: How to find the git tree a Se4 review rejected, for replay-rejected criteria; which old trees lack interpreters.mts or runRefusal
metadata:
  type: reference
---

The tree a review rejected is findable from the item's own history (checked 2026-11-16 on seven items):

- Cumulative review: fixes land in the item's `chore: close ...` commit, so the rejected tree is that commit's parent (`git log -1 --format=%p <close>`).
- Checkpoint review at phase N: the phase N commit is already in history; its fix lands in the next phase commit. So the rejected tree is the phase N commit. A second checkpoint round's code was never committed.
- Match verdict times (`verdicts.jsonl` ts, UTC) against commit times (+02:00) to place a review between commits.

Old trees lack today's exports: `src/lib/hooks/guard/bash/interpreters.mts` is absent at affc4412 and earlier; `runRefusal` is absent in bench/lib/spend.mjs before 4c50a8dd. A closure test that statically imports a missing export dies with a SyntaxError that names no spelling, so a replay criterion must also require a named label.

Probing a guard at an old tree: `git archive <rev> | tar -x -C <scratch>/<rev>`, then a .mts probe written with Write that dynamically imports `<scratch>/<rev>/src/...` and the current `test/support/variants.mts` families. Related: [[transcript-facts]], [[guard-bash-probe-paths]].
