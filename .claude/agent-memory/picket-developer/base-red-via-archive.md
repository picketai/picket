---
name: base-red-via-archive
description: To prove a new test fails on a base commit without stash or checkout, extract the base with git archive into the scratchpad
metadata:
  type: reference
---

guard.bash denies stash, checkout and worktree-style commands, and shell writes to code paths in the repo. To show "fails on base <sha>": `git archive <sha> | tar -x -C <scratch>/base`, cp the new test files into it, link node_modules with `cmd //c "mklink /J node_modules D:\workspace\github\AISpec\node_modules"`, then run `node --test <file>` there. Record the cleanup with `picket leave`.

An order can be amended between phases of a granted run (new decisions, a larger touch set). Re-read the phase section at each phase, not only the touch set.
