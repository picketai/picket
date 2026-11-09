---
name: admit-corpus-before-after
description: How to check an admit signal change keeps the labelled corpus answers unchanged, base against head, without touching the repo
metadata:
  type: reference
---

For "corpus answers unchanged" criteria on `src/lib/shared/admission/*`: `git archive <base> src | tar -x -C <scratch>/base`, then a scratch `.mts` that dynamically imports `<dir>/src/lib/shared/admission/{lane,signals}.mts` and `<dir>/src/lib/shared/config.mjs`, and runs each entry of the base `admit-labelled.test.json` (sliced to the base count) through `laneOf(signalsOf(req, mentionedPaths(req, (p) => existsSync(join(resolve("bench","fixture"), p))), [], DEFAULT_SECURITY_PATHS), {fast:{max_files:3}})` (mentionedPaths takes an exists callback, not a directory). Run with `node --experimental-strip-types` from the repo root (fixture is `bench/fixture` relative to cwd) and diff the two outputs. Same probe file with a list of edge sentences shows behaviour shifts base vs head. Targeted tests: `node --experimental-strip-types --test` on the admission test files plus `bench/test/tasks.test.mjs` (63 tests, under a second).

Related: [[dist-on-disk-can-be-stale]], [[picket-verify-runs-npm-test]]
