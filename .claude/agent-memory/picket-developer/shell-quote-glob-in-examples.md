---
name: shell-quote-glob-in-examples
description: skill-examples.test.mts shellWords throws a plain Error on unquoted ?, * or > in an example line, not a UsageError
metadata:
  type: project
---

`src/lib/verbs/test/skill-examples.test.mts` splits example lines with the vendored shell-quote parser, so an unquoted `error?` comes back as a glob op and `shellWords` throws a plain Error before any verb parse runs.

**Why:** a refusal test that expects UsageError fails with "Received Error" when the unquoted text holds a glob or redirect character.

**How to apply:** keep `?`, `*`, `>` and `|` out of the unquoted words of a test line in that file. See [[mod-validator-rules]].
