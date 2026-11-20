---
name: picket-check-timeout
description: picket check runs npm test for about 150 s; a bare REPL $ call moves it to the background at 120 s
metadata:
  type: project
---

`TMPDIR=/tmp picket check` takes about 150 s on this machine (seen 2026-11-20). In the REPL, a bare $ call moved it to the background at 120 s. A loop polling its output file then hit the 600 s script wall-clock limit.

**Why:** a background check and the polling loop that followed cost two extra turns in one phase.

**How to apply:** run it as `$\`TMPDIR=/tmp picket check\`.timeout(590000)` and give the REPL call `timeout: 600000`. Do the same for `picket verify <id> <n>`, which runs npm test as well.
