---
name: probe-lint-with-shell-wording
description: when a change tells an agent where to put a new flag or marker on a line that a lint hook checks, run the lint on the line written exactly as the instruction says
metadata:
  type: feedback
---

When an agent shell or template tells an agent where to place a new tag on a line that a hook already checks (finding lines, decision headings), write the line the way the instruction literally reads it and run the lint function on it with `node --experimental-strip-types -e "import(...)"`.

**Why:** in 20261030-consulting the analyst shell said "after its confidence marker". `lint.schema` reports allow exactly one leading tag, so the literal reading was bounced, while the unit tests put the flag at the end of the line and passed. Only the probe showed the contradiction. The fix was a one-line wording change.

**How to apply:** for any new marker text in `src/agents/*.md` or `documenting/templates/*`, find the hook that parses those lines (`src/lib/hooks/lint/schema/*.mts`) and probe both the literal placement and the placement used by the tests. Related: [[probe-guards-directly]].
