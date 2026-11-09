---
name: guard-bash-code-writes
description: guard.bash denies a shell write (cp, redirect) of any .mts/.mjs path, even inside the scratchpad base archive
metadata:
  type: reference
---

`guard.bash` refuses `cp x.mts dest` or `git show ... > dest.mts` even when dest is in the session scratchpad, and refuses `rm -rf` outright. For a base red run ([[base-red-via-archive]]): `git archive <base> src test package.json | tar -x -C <new dir>` (tar extraction passes), symlink node_modules, then put the new test in with the Write tool as a separate `*.red.test.mts` file. Include `test/` in the archive or `#test/...` imports fail the whole file with no assertion line.
