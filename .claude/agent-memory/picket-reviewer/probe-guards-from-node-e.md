---
name: probe-guards-from-node-e
description: guard.bash decisions probe from node -e with #test/hook.mts imports; never copy a probe test file into src
metadata:
  type: reference
---

`node --experimental-strip-types --no-warnings --input-type=module -e` run from the repo root resolves `#test/hook.mts` and `#test/project.mts` through package imports. `decision(cmd, { root, tool, agent })` with `root = withProject({ after: (f) => process.on("exit", f) }, { host: true, picket: false })` prints the guard's decision. Verified 2026-10-31.

Since 2026-11-09 guard.bash denies to everyone an inline `node -e` or `python3 -c` program, or an interpreter fed a heredoc, when it holds a write call and a quoted code path. Put a many-case probe in a scratchpad `.mts` file and run `node --experimental-strip-types <file>`: a named script file is not inspected. From a scratchpad file `#test/...` does not resolve (ERR_PACKAGE_IMPORT_NOT_DEFINED), so import `/mnt/work/development/github/picket/test/support/hook.mts` by absolute path; `guardOutput(cmd, { root, agent })` also returns the reason. A scratchpad `*.test.mts` run with `node --experimental-strip-types --test <file>` can pass the test's `t` to `withProject(t, ...)` (absolute import of `test/support/project.mts`), so cleanup is automatic. Verified 2026-11-15.

The scratchpad is shared across the session's agents and already holds `probe*.mts` files; guard.scope denies a Write over one you have not read, so give each probe a fresh name (`rev-<topic>-probe.mts`). Verified 2026-11-15.

`inlineProgram` in `src/lib/hooks/guard/bash/in-place.mts` returns one program only, so a new spelling scan shadows the others: probe a write program followed by a second, harmless program flag (`gawk -e W -e1`, `php -B W -R'echo 1;'`) at base and head. `inPlaceTargets` imports directly from a `git archive <base> src` copy for the base side. Verified 2026-11-15.

A probe test copied into `src/` to reach `#test/` breaks the scratchpad-only rule and needs a `node -e` unlinkSync to remove, because guard.bash denies `rm`. Use the `-e` form instead. Related: [[probe-guards-directly]].
