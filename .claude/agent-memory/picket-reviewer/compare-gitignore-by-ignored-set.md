---
name: compare-gitignore-by-ignored-set
description: To prove a .gitignore rewrite ignores the same files, diff git ls-files -o -i --directory under the old and new file; process substitution fails on Windows
metadata:
  type: reference
---

`git ls-files -o -i --directory --exclude-from=<file>` lists what one ignore file ignores in the current checkout. Write `git show <base>:.gitignore` and `git show HEAD:.gitignore` to the scratchpad and diff the two lists (item 09, 2026-10-24). `--exclude-from=<(git show ...)` fails in Git Bash here ("cannot use /proc/.../fd/63 as an exclude file"). A directory entry replacing per-file entries shows as a list difference with the same effective set; check the folder's contents to confirm.

**How to apply:** any review of a `.gitignore` regroup. Related: [[probe-guards-directly]].
