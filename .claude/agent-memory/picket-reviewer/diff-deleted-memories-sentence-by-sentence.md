---
name: diff-deleted-memories-sentence-by-sentence
description: When a work item deletes agent memories because their rules moved into a shell, check every sentence of each memory landed, not only the headline rule
metadata:
  type: feedback
---

When an item deletes a memory "once its sentences land" in an agent shell, read the deleted file from `git diff --cached` and find each of its sentences in the new text. Plan criteria usually check only the headline sentence. In 20261029 item A, the escalated `git rm` rule landed, but "stage without the deleted path" did not, and the shell's own `git add -A -- <touched paths>` step then walks straight into the failure that memory recorded.

**Why:** a lost operational fact in a memory has no test guarding it, and once the file is deleted nothing points back to it.

**How to apply:** in cumulative reviews, grade the S row on every sentence of the memory. A missing one is FAIL with a Minor companion finding that cites the shell step it now contradicts.
