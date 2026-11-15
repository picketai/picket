---
name: probe-declared-checks-pure
description: declared-checks and check-correction are pure; probe readChecks/compareChecks/correctCheckPath from node -e with strip-types, no scratch item needed
metadata:
  type: reference
---

`src/lib/shared/work/declared-checks.mts` (readChecks, compareChecks) and `check-correction.mts` (correctCheckPath) take plain values. To probe them, run `node --experimental-strip-types --no-warnings --input-type=module -e` at the repo root and dynamic-import the `.mts` files. Build the record text inline and parse it with `util/yaml-lite.mts` `frontmatter`. No work item or drive log is needed.

The npm test `mods` step (claude plugin validate) is red at the base here, so a plan criterion that says "npm test passes" fails literally. See [[plugin-validate-fails-in-subagent]] and [[mods-tests-red-on-2-1-319]].
