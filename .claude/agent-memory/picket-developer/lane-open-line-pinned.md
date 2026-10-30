---
name: lane-open-line-pinned
description: test/cli/lane-check.test.mjs pins the exact `picket open` line in each lane's open step; editing that line breaks npm test
metadata:
  type: project
---

`test/cli/lane-check.test.mjs` (OPEN_STEPS) matches the `picket open --lane <lane> --title "<six-word title>" ... --request - <<'PICKET_REQUEST_END'` line in `ordering/steps/open.md`, `designing/steps/open.md`, `researching/steps/outline.md` and `expediting/SKILL.md`. Since 2026-10-30 it allows `--flag "<x>"` pairs between `--title` and `--request`.

**Why:** a plan touch set for the lane open steps rarely lists this test, so a flag added to the line fails `npm test` outside the touch set.

**How to apply:** when a phase changes a lane's `picket open` line, update the regex in that test in the same phase and name it under Decisions. Related: [[new-skill-checklist]].
