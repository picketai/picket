---
name: picket-verify-runs-npm-test
description: picket verify <id> <n> runs the full npm test for its tests must_have; looping it over phases in a review exceeds the 120 s Bash timeout
metadata:
  type: reference
---

`picket verify <id> <n>` checks `tests: true` by running `npm test` (about 70 s here). Looping it over six phases in one Bash call timed out and moved to the background (2026-11-02), and a cumulative review must not run the full suite anyway.

**How to apply:** check greps from the design's `phases:` frontmatter by hand with Grep, and trust the developer blocks plus the summary's `mutation` for the test run. Related: [[dist-on-disk-can-be-stale]].
