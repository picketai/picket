---
name: reply-is-lead-only
description: guard.bash denies `picket reply` to agents, even in a scratch project; gate replies can only be unit-tested by the developer
metadata:
  type: project
---

`picket reply` is a lead-only verb, and guard.bash denies it to the developer even against a scratch umbrella under the scratchpad.

**Why:** reply records the user's approval, so the guard classes it lead-only per verb (VERB_NAMES `leadOnly`).

**How to apply:** when a phase changes reply forms (a new gate such as `create_worktrees`), drive `picket next` and `picket packet` for real and cover the reply itself with unit tests through `verb.run`; say so on the `Verified:` line. `picket worktree --record` is not lead-only and can stand in to record a branch. See [[scratch-drive-root]].
