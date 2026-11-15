---
name: declared-run-checks-need-picket-drive
description: picket verify's check:T-x.y for a frontmatter `drive: command:` reads only rows from `picket drive --run`; a plain Bash run stays "not run"
metadata:
  type: reference
---

`picket verify <id> <n>` matches a declared run check against drive-log rows whose source is `picket drive` and whose `run` equals the declared command exactly. Running the command in Bash (even verbatim) logs a `kind: drive` row without that source, so the check reads `not run`.

Run it as `picket drive --run "<exact declared command>" --work <id> --phase <n>`; the row records exit code and each declared `contains` string. Related: [[drive-needs-fresh-dist]].
