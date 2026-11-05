---
name: guard-false-positives
description: guard.comments reads `**Label:**` lines inside template literals as comments; guard.bash denies `git config` even in a scratch repo
metadata:
  type: reference
---

Two hook denials that are not about the code's meaning:

- `guard.comments` counts a source line that starts with `**` (for example a bold block label `**Red:** x` inside a multi-line template literal) as a block-comment line. Build such fixtures from an array of strings or a helper (`bold("Red", "x")`) so no source line starts with `**`.
- `guard.bash` calls `git config` destructive, also inside a scratchpad repo. Skip it: the global git identity is enough for scratch commits. Shell writes to code files (`echo x > src/a.js`) are also denied; create them with the Write tool.

See [[scratch-drive-root]].
