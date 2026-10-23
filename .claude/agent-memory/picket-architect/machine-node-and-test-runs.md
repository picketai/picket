---
name: machine-node-and-test-runs
description: This Windows machine has no Node 22 (nvm holds 20.11.1 and 24.22.1); parallel test probes fail when another agent rebuilds dist meanwhile; scratch-copy probe for src imports
metadata:
  type: reference
---

Seen 2026-10-23 (item 06 design):

- nvm under the APPDATA nvm folder holds v12, v14, v18, v20.11.1 and v24.22.1, no Node 22. A Node 22 floor check needs `npx -y node@22.x` (npm listed 22.23.4) or CI; see [[fake-node-version]] for faking an old version instead.
- A parallel `node --test` over the test folder took 33.2 s on 16 cores, budgets alone 2.8 s. Seven spawn tests failed with "Cannot find module dist/bin/picket.mjs" because another agent rebuilt the dist folder during the run (no test rebuilds it). Rerun before blaming parallelism.
- To check whether the src folder runs without a build, copy it and package.json into the scratchpad, apply the import change there, and import every module with a probe file written by the Write tool (guard.bash refuses an .mjs written through a shell heredoc and compound commands holding rm).
