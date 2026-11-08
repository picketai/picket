---
name: machine-node-and-test-runs
description: Windows host has no Node 22 (nvm 20.11.1, 24.22.1); parallel test probes fail when dist is rebuilt meanwhile; Linux host greps the binary with /usr/bin/grep; picket check runs the full npm test; mods step green since 43ee39c
metadata:
  type: reference
---

Seen 2026-10-23 (item 06 design):

- nvm under the APPDATA nvm folder holds v12, v14, v18, v20.11.1 and v24.22.1, no Node 22. A Node 22 floor check needs `npx -y node@22.x` (npm listed 22.23.4) or CI; see [[fake-node-version]] for faking an old version instead.
- A parallel `node --test` over the test folder took 33.2 s on 16 cores, budgets alone 2.8 s. Seven spawn tests failed with "Cannot find module dist/bin/picket.mjs" because another agent rebuilt the dist folder during the run (no test rebuilds it). Rerun before blaming parallelism.
- To check whether the src folder runs without a build, copy it and package.json into the scratchpad, apply the import change there, and import every module with a probe file written by the Write tool (guard.bash refuses an .mjs written through a shell heredoc and compound commands holding rm).

Seen 2026-11-08 on the Linux host (/mnt/work path): `grep` resolves to ugrep, which refuses long `.{0,N}` patterns on the Claude binary ("exceeds complexity limits"); use `LC_ALL=C /usr/bin/grep -a -o`. `git` is not on the agent shell's PATH, so `picket preflight` reports "not a git repository" though the folder is one. Copying the built dist folder into the scratchpad was denied by the permission prompt, so plugin layout probes there need the user.

By 2026-11-08 later, `/usr/bin/git` is on the agent PATH. `picket check <id>` runs the whole `npm test`, build included, so it rewrites dist under other agents.

Until 43ee39c (2026-11-08) `npm test` failed on the Linux host in its `mods` step only: 25 status pane and band tests, because the status fixtures use `D:/` roots, which are relative on Linux (see [[mod-engine-api-facts]]). Since 43ee39c the whole `npm test` passes there, so a criterion that `npm test` passes can be met again.
