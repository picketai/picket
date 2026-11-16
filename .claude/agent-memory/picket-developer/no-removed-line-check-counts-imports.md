---
name: no-removed-line-check-counts-imports
description: order criteria "git diff <base> -- <tests> | grep -c '^-[^-]'" exits 1 only if no base line changed; widening an import line counts as removed
metadata:
  type: project
---

Guard orders pin existing tests with `git diff <base> -- <test files> | grep -c '^-[^-]'` expecting exit 1. Adding a name to an existing `import { a } from "./x.mts"` line rewrites it and fails the check (seen 2026-11-16).

**Why:** the grep counts any removed line, including a rewritten import.

**How to apply:** in a pinned test file, add a new import on its own line (`import { b } from "./x.mts";`) and only append tests; never reword a test name or line there.
