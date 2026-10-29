---
name: new-skill-checklist
description: Adding a skill touches more than its folder - the plugin-layout test hard-codes the skill count, besides plugin.json, routing cases and the skills reference page
metadata:
  type: project
---

A new skill folder fails `npm test` in five places unless each is updated: the skill list in the plugin manifest, a routing case in the description cases file, a section and a table row in the skills reference page, the "Use when" and line budgets in the timing test, and a hard-coded count of skill folders in the plugin-layout repo test (17 became 18 when picket:implementing landed, 2026-10-29). The first four were in that order's plan; the count was not, and only the full run caught it.

**Why:** the developer conversion (item A) passed every src-only check, then failed the full run on the count alone.

**How to apply:** when a phase adds or removes a skill, grep the repo tests for the current skill count before staging. See [[verbs-import-only-shared]] for another test that only the full product step runs.
