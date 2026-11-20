---
name: reply-is-lead-only
description: guard.bash denies every lead-only verb (reply, comment, waive, uninstall, data) to agents, even in a scratch project and inside drive --run; the developer covers them by verb tests
metadata:
  type: project
---

`picket reply`, `comment`, `waive`, `uninstall` and the whole `picket data` group are lead-only. guard.bash denies them to the developer even against a scratch project under the scratchpad, under any launcher (`node dist/bin/picket.mjs`, npx), and inside `picket drive --run "..."`.

**Why:** these verbs record the user's approval, or act on their word, so the guard classes them lead-only per verb (VERB_NAMES `leadOnly`, which a group entry can carry too).

**How to apply:** drive `picket next` and `picket packet` for real. Cover the lead-only verb itself with unit tests through `verb.run`. The guard's denial counts as a live drive of the guard. Say so on the `Verified:` line. `picket worktree --record` is not lead-only and can stand in to record a branch. See [[scratch-drive-root]].
