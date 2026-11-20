---
name: usage-error-name-is-error
description: UsageError (src/lib/util/args.mts) keeps name "Error"; assert.throws with {name: UsageError.name} fails
metadata:
  type: project
---

`UsageError` does not set its own `name`, so `assert.throws(fn, { name: UsageError.name, message })` fails with name "Error".

**Why:** found 2026-11-18 writing a classify parse test.
**How to apply:** assert with a validator, `(error) => error instanceof UsageError && error.message === usage`, or pass the class alone.
