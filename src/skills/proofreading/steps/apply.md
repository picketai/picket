# Proofreading: apply mode

Triggered by "apply", "fix them", "just do it", or a subset such as "apply the L0s".

1. Apply accepted findings only, one edit per finding, as exact-span replacements. Never reflow a paragraph you were not asked to change; never restructure the document.
2. Never apply an L3. On "apply everything", apply L0 to L2 and list the L3 items again as still open.
3. A file under `work/<id>/` belongs to the agent that wrote it: hand the accepted findings to that agent through the lane skill instead of editing. Any other file is edited in place.
4. After applying, re-run the pass 1 mechanical sweeps on the result and report the new counts. An edit that introduces a defect is the common failure here.
5. Pasted text with no file: deliver the corrected document in one fenced block with nothing else inside the fence.
6. Append to `references/recurring-errors.md` any defect class this document repeated three or more times, or that has now appeared in two different documents.
