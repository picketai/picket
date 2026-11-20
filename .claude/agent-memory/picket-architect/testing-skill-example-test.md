---
name: testing-skill-example-test
description: src/lib/verbs/test/skill-examples.test.mts parses only note, classify and ask examples from testing/steps and pins that verb set; a card with covers [] parses and keeps its fingerprint
metadata:
  type: reference
---

Checked 2026-11-20 (item 20261120-tester-records-defects-fixed-ones-counted):

- `src/lib/verbs/test/skill-examples.test.mts` finds commands in `src/skills/testing/steps/*.md` with regexes naming only `note|classify|ask`, asserts that exact verb set, and parses each with the verb's own `parse`. A new `picket test` verb shown in the steps is unchecked until the test's map, regexes and `FREE_TEXT_FLAGS` gain it; `parseArgs(words, stdin)` takes a stdin function for a verb that reads steps. A heredoc example (`<<'EOF'`) throws in its shell-quote parse, so keep checked examples inline.
- `writeScenario` of a header with `covers: []` writes `covers: []`, and `parseScenario` reads it back with no problems (`COVER` is checked with `every`).

Related: [[new-skill-touchpoints]], [[verify-grep-patterns]].
