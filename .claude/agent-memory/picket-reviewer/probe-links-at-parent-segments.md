---
name: probe-links-at-parent-segments
description: For any remover that "never follows a link", probe a junction at a parent folder (.picket, .claude), not only at the leaf it deletes
metadata:
  type: feedback
---

A remover that checks `lstat(path).isSymbolicLink()` on the path it deletes still deletes through a linked parent. Item 07b's `picket uninstall` unlinked a linked `.picket/state` or `work/` correctly, but with `.picket` itself a junction it deleted the target's `config.json` and `.picket/state/` recursively, and with `.claude` a junction it deleted the target's `settings.json`.

**Why:** the developer's block claimed "links are unlinked, never followed" from leaf-only tests; the plan said "Removal never follows a link out of the root".

**How to apply:** in temp folders, make junctions (`symlinkSync(target, path, "junction")` from `node --input-type=module -e`) at every segment between root and the deleted path, run the remover with fake exec and prompt, and list the target after. See [[probe-guards-directly]].
