---
name: phase-block-overwritten-by-fix
description: A later fix commit can overwrite work/<id>/phases/N.block.md; read a phase's evidence at its own phase commit
metadata:
  type: feedback
---

A fix landed after phase N (for example a lead's corpus fix) can rewrite the phase block under work/<id>/phases/, so the block at HEAD describes the fix and loses the phase's driven evidence. Seen in 04d: 2.block.md at HEAD held 2e8ccac's corpus rename; the transcript comparison and emit.ledger drive were only in `git show 077a6f1:…/phases/2.block.md`.

**Why:** grading driven criteria (T-N.x "Driven", "scratch comparison") from the HEAD block alone would mark them unproven.

**How to apply:** when a block's Files line does not match the phase's touch set, read it with `git log --format=%h -- work/<id>/phases/N.block.md` and `git show <sha>:…`. Also: plan grep criteria can hit plan-mandated content (a corpus fixture of work/ documents, an import of `src/lib/util/process.mts` matching `process\.`); judge those by intent, but a hit from a name the developer chose freely is a FAIL. See [[review-summary-drops-claude-paths]].
