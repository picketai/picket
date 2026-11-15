---
name: reproduce-red-in-scratch-copy
description: Check a "fails on the base code" criterion without touching the repo, by running tests in a scratch copy with one file swapped
metadata:
  type: reference
---

To check a red-proof criterion such as "with X.mts restored from <base>, test T fails", work in a scratch copy:
`git archive HEAD src test package.json tsconfig.json | tar -x -C <scratch>`, then `ln -s <repo>/node_modules <scratch>/node_modules`,
then `git archive <base> <path> | tar -x -C <scratch>` to swap in the base file, and run `node --test --test-name-pattern=... <file>` from the scratch folder.
`#test/` imports resolve there. This uses no shell redirection, and `guard.bash` allows it. Put HEAD's file back the same way.
test/cli tests run against the repo's dist; check that dist is newer than HEAD before you trust them.

Related: [[admit-corpus-before-after]], [[node-test-prints-spec-not-tap]]
